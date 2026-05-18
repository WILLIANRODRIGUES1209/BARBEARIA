import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import twilio from "twilio";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use URL encoding for Twilio Webhooks
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

  // POST /api/whatsapp
  app.post("/api/whatsapp", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured in Secrets");
      }

      const from = req.body.From; // e.g. 'whatsapp:+123456789'
      const body = req.body.Body; // the text message
      const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER || "";

      // Ensure it's from the admin (a basic security check if we only want admin to log expenses)
      // Though for now, we process it generally.
      
      console.log(`Received message from ${from}: ${body}`);

      // We'll use Gemini to parse the message
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
      You are an AI assistant for a barbershop.
      The expected message might be about an expense, e.g., "gastei 50,00 em navalhas".
      If the user is registering an expense, extract the amount as a number and the description.
      If the user is saying something else, reply nicely.
      
      Message: "${body}"
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isExpense: {
                type: Type.BOOLEAN,
                description: "True if the user is declaring an expense"
              },
              amount: {
                type: Type.NUMBER,
                description: "The amount of the expense, ignoring currency symbols."
              },
              description: {
                type: Type.STRING,
                description: "A short description of what was purchased or the expense meaning."
              },
              replyText: {
                type: Type.STRING,
                description: "A helpful and conversational reply in Portuguese acknowledging the user's message or confirming the expense registration."
              }
            },
            required: ["isExpense", "replyText"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");

      if (result.isExpense && result.amount) {
        await supabase.from('transacoes').insert({
          tipo: "SAIDA",
          valor: result.amount,
          descricao: result.description || "Despesa via WhatsApp",
          data: new Date().toISOString()
        });
      }

      // Generate Twilio TwiML response
      const MessagingResponse = twilio.twiml.MessagingResponse;
      const twiml = new MessagingResponse();
      twiml.message(result.replyText || "Mensagem recebida.");

      res.writeHead(200, { "Content-Type": "text/xml" });
      res.end(twiml.toString());
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  });

  // API Route for sending WhatsApp notifications explicitly
  // e.g., called when a booking is created successfully on the frontend.
  app.post("/api/notify-booking", async (req, res) => {
    try {
      const { clientName, serviceName, date, time } = req.body;
      const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER;
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      if (!adminWhatsApp || !twilioAccountSid || !twilioAuthToken || !twilioPhone) {
        console.warn("Missing Twilio configuration, skipping notification.");
        return res.status(200).json({ success: true, warning: "Missing config" });
      }

      const client = twilio(twilioAccountSid, twilioAuthToken);
      const msg = `Novo agendamento!\nCliente: ${clientName}\nCorte: ${serviceName}\nHorário: ${date} às ${time}`;

      await client.messages.create({
        body: msg,
        from: `whatsapp:${twilioPhone}`,
        to: `whatsapp:${adminWhatsApp}`
      });

      res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // POST /api/agent/chat
  app.get("/api/debug-env", (req, res) => {
    res.json({
      geminiKey: process.env.GEMINI_API_KEY?.substring(0, 5) + '...',
      nodeEnv: process.env.NODE_ENV
    });
  });

  app.get("/api/debug-gemini", async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Test. Reply with "Hello"`;
      const response = await ai.models.generateContent({ model: "gemini-2.5-pro", contents: prompt });
      res.json({ text: response.text });
    } catch(e) {
      res.json({ error: String(e) });
    }
  });

  app.post("/api/agent/chat", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({ error: "Chave GEMINI_API_KEY não configurada. Por favor, adicione sua chave de API do Gemini no menu Configurações (Settings) > Segredos (Secrets) do projeto." });
      }

      console.log('GEMINI_API_KEY available?', !!process.env.GEMINI_API_KEY);
      const { message } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
      You are an AI assistant for a barbershop admin panel.
      The admin might say: "gastei 50 reais em navalhas" or something similar.
      If the admin is registering an expense (gastei, comprei, paguei), extract the amount as a number and a description.
      If the admin is registering an income (recebi, ganhei, entrou), register as income.
      
      Message: "${message}"
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isTransaction: {
                type: Type.BOOLEAN,
                description: "True if the user is declaring an expense or income"
              },
              transactionType: {
                type: Type.STRING,
                description: "Either 'EXPENSE' or 'INCOME'"
              },
              amount: {
                type: Type.NUMBER,
                description: "The amount, ignoring currency symbols."
              },
              description: {
                type: Type.STRING,
                description: "A short description of what the transaction is for."
              },
              replyText: {
                type: Type.STRING,
                description: "A helpful reply in Portuguese acknowledging the user's message."
              }
            },
            required: ["isTransaction", "replyText"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");

      if (result.isTransaction && result.amount) {
        await supabase.from('transacoes').insert({
          tipo: result.transactionType === 'INCOME' ? 'ENTRADA' : 'SAIDA',
          valor: result.amount,
          descricao: result.description || "Lançamento via Assistente",
          data: new Date().toISOString()
        });
      }

      res.status(200).json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Check if --host flag is passed
  const isHost = process.argv.includes('--host');

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: isHost ? true : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to 0.0.0.0 as required by the container environment.
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (isHost) {
      console.log(`Network access enabled (--host). Server listening on all interfaces (0.0.0.0).`);
    }
  });
}

startServer();
