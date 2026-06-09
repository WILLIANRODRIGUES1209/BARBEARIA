import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import twilio from "twilio";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BMEN3HUR5xUr5CpMKnH-X4CnhjGmF9n05Kk4sDqXDqnJVpz7_47-u4Du6g44FPrTFS9QE5S79Wn4uPU5lzvnN_I";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "3dEyTRLuRYZv2frRqdYfoULaztwhd0goQtLdQMnu95A";

webpush.setVapidDetails(
  'mailto:contato@gestaopro.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// In-memory store for subscriptions, backed by a file
let subscriptions: any[] = [];
const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'subscriptions.json');

// Load subscriptions from file
try {
  if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
    subscriptions = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8'));
  }
} catch (e) {
  console.error('Error loading subscriptions', e);
}

// In-memory store for appointment device associations
let appointmentDevices: Map<string, string> = new Map();
let notified1h: Set<string> = new Set();
let notified2h: Set<string> = new Set();
const APP_STATE_FILE = path.join(process.cwd(), 'app_state.json');

try {
  if (fs.existsSync(APP_STATE_FILE)) {
    const stateFile = JSON.parse(fs.readFileSync(APP_STATE_FILE, 'utf-8'));
    if (stateFile.appointmentDevices) {
      appointmentDevices = new Map(Object.entries(stateFile.appointmentDevices));
    }
    if (stateFile.notified1h) {
      notified1h = new Set(stateFile.notified1h);
    }
    if (stateFile.notified2h) {
      notified2h = new Set(stateFile.notified2h);
    }
  }
} catch (e) {
  console.error("Error loading app state", e);
}

const saveAppState = () => {
  try {
    const stateObj = {
      appointmentDevices: Object.fromEntries(appointmentDevices),
      notified1h: Array.from(notified1h),
      notified2h: Array.from(notified2h)
    };
    fs.writeFileSync(APP_STATE_FILE, JSON.stringify(stateObj, null, 2));
  } catch(e) {
    console.error('Error saving app state', e);
  }
};

const saveSubscriptions = () => {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
  } catch(e) {
    console.error('Error saving subscriptions', e);
  }
};


async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use URL encoding for Twilio Webhooks
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

  // VAPID Public Key
  app.get("/api/vapid-public-key", (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // Subscribe to push notifications
  app.post("/api/subscribe", (req, res) => {
    const { subscription, role, deviceId } = req.body;
    // Remove if deviceId already exists
    subscriptions = subscriptions.filter(s => s.deviceId !== deviceId);
    subscriptions.push({ subscription, role, deviceId });
    saveSubscriptions();
    res.status(201).json({ success: true });
  });

  // Send a test notification
  app.post("/api/test-notification", async (req, res) => {
    const { title, message } = req.body;
    const payload = JSON.stringify({ title, body: message, icon: '/icon.svg' });
    
    let promises = [];
    let removed = false;
    for (let i = 0; i < subscriptions.length; i++) {
        const sub = subscriptions[i].subscription;
        promises.push(
            webpush.sendNotification(sub, payload).catch(err => {
                console.error("Error sending notification, removing subscription", err);
                subscriptions.splice(i, 1);
                i--;
                removed = true;
            })
        );
    }
    await Promise.allSettled(promises);
    if (removed) saveSubscriptions();
    res.status(200).json({ success: true });
  });

  // Helper to send push
  const sendPush = async (title: string, body: string, targetRole: string | null = null, targetDeviceId: string | null = null) => {
    const payload = JSON.stringify({ title, body, icon: '/icon.svg' });
    let promises = [];
    let removed = false;
    for (let i = 0; i < subscriptions.length; i++) {
        const subItem = subscriptions[i];
        
        if (targetRole && subItem.role !== targetRole) continue;
        if (targetDeviceId && subItem.deviceId !== targetDeviceId) continue;

        promises.push(
            webpush.sendNotification(subItem.subscription, payload).catch(err => {
                console.error("Error sending notification, removing subscription", err);
                subscriptions.splice(i, 1);
                i--;
                removed = true;
            })
        );
    }
    await Promise.allSettled(promises);
    if (removed) saveSubscriptions();
  };

  // Crons that run every minute
  setInterval(async () => {
    try {
      if (!supabaseUrl) return;

      const now = new Date();
      // Only fetch pending appointments within a short window centered around now (from 1 hour ago to 2 hours in the future)
      // This covers the 1-hour notification range perfectly while avoiding expensive full-table scans on a growing multi-tenant DB.
      const startWindow = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const endWindow = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('status', 'PENDENTE')
        .gte('data_hora', startWindow)
        .lte('data_hora', endWindow);
      
      if (data && data.length > 0) {
        data.forEach(appt => {
           const apptDate = new Date(appt.data_hora);
           const diffMinutes = (apptDate.getTime() - now.getTime()) / 60000;
           
           // Lembrete Anti-Esquecimento 1 hora
           const diffHours = diffMinutes / 60;
           
           if (diffHours >= 0.9 && diffHours <= 1.1 && !notified1h.has(appt.id)) {
               console.log("Sending 1 hour reminder for:", appt.cliente_nome);
               
               const hora = apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

               const deviceId = appointmentDevices.get(appt.id);
               
               if (deviceId) {
                 sendPush(
                   "Lembrete de Agendamento!", 
                   `Fala, ${appt.cliente_nome}! Tudo certo? Seu horário hoje às ${hora} está chegando. Se precisar remarcar, avise com antecedência.`,
                   "client",
                   deviceId
                 );
               } else {
                 // Try falling back to WhatsApp if they have it configured, or notify admin?
                 // But since it specifically said "no aplicativo", we just push.
                 // If the deviceId isn't stored in memory (e.g. server restarted), we won't be able to push to the client natively.
                 // In production, device_id would be saved in Supabase.
               }

               notified1h.add(appt.id);
               appt.notified_1h = true;
               saveAppState();
           }
        });
      }

      // Check daily routines at 20:00 exact
      // Using UTC time to BRT approximation, but since server time might vary, we should check in Sao_Paulo time
      const formatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const currentHm = formatter.format(now);
      
      if (currentHm === '20:00' && !global.notifiedEvening) {
         global.notifiedEvening = true;
         // Resumo do Dia Seguinte (Fechamento da Agenda)
         const amarraDeAmanha = new Date(now);
         amarraDeAmanha.setDate(amarraDeAmanha.getDate() + 1);
         const amarraString = amarraDeAmanha.toISOString().substring(0, 10);

         const { data: agendaAmanha } = await supabase.from('agendamentos')
            .select('*')
            .eq('status', 'PENDENTE')
            .like('data_hora', `${amarraString}%`)
            .order('data_hora', { ascending: true });

         if (agendaAmanha && agendaAmanha.length > 0) {
            const first = new Date(agendaAmanha[0].data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' });
            sendPush(
              "Fechamento da Agenda",
              `Sua agenda de amanhã está pronta! 📅 Você tem ${agendaAmanha.length} atendimentos confirmados. O primeiro começa às ${first} com ${agendaAmanha[0].cliente_nome}. Boa noite de descanso!`
            );
         }

         // Recorrência Otimizada - 15 days ago
         const fifteenDaysAgo = new Date(now);
         fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
         const fifteenString = fifteenDaysAgo.toISOString().substring(0, 10);

         const { data: concluded15Days } = await supabase.from('agendamentos')
            .select('*')
            .eq('status', 'CONCLUIDO')
            .like('data_hora', `${fifteenString}%`);

         if (concluded15Days && concluded15Days.length > 0) {
            // we should group by client ideally to not spam
            const sentClients = new Set();
            concluded15Days.forEach(a => {
               if(!sentClients.has(a.cliente_telefone)) {
                 sendPush(
                   "Tá na hora de cortar!",
                   `Fala, ${a.cliente_nome}! O visual já está completando 2 semanas, a régua já deve estar sumindo... 😂 Que tal garantir o seu horário para essa semana antes que a agenda lote?`
                 );
                 sentClients.add(a.cliente_telefone);
               }
            });
         }
      } else if (currentHm !== '20:00') {
         global.notifiedEvening = false;
      }

    } catch (e) {
      console.error(e);
    }
  }, 60000);

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

  // API Route for sending notifications explicitly
  // called when a booking is created successfully on the frontend.
  app.post("/api/notify-booking", async (req, res) => {
    try {
      const { clientName, serviceName, date, time, deviceId, appointmentId } = req.body;
      const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER;
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      if (appointmentId && deviceId) {
        appointmentDevices.set(appointmentId, deviceId);
        saveAppState();
      }

      const adminMsg = `Novo cliente na área! 🚀 ${clientName} agendou ${serviceName} para o dia ${date} às ${time}.`;
      const clientMsg = `Agendamento Confirmado! ✂️ Seu horário para ${serviceName} está garantido no dia ${date} às ${time}.`;

      // Send Push notification to Barber (role = 'admin')
      await sendPush("Novo Agendamento na Agenda", adminMsg, 'admin');

      // Send Push notification to Client (role = 'client', deviceId)
      if (deviceId) {
        await sendPush("Agendamento Confirmado", clientMsg, 'client', deviceId);
      }

      if (!adminWhatsApp || !twilioAccountSid || !twilioAuthToken || !twilioPhone) {
        console.warn("Missing Twilio configuration, skipping WhatsApp notification.");
        return res.status(200).json({ success: true, warning: "Missing config, Push sent." });
      }

      const client = twilio(twilioAccountSid, twilioAuthToken);

      await client.messages.create({
        body: adminMsg,
        from: `whatsapp:${twilioPhone}`,
        to: `whatsapp:${adminWhatsApp}`
      });

      res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // API Route for sending cancellation notifications
  app.post("/api/notify-cancel", async (req, res) => {
    try {
      const { clientName, date, time } = req.body;
      
      const adminMsg = `Atenção: O cliente ${clientName} cancelou o horário das ${time} do dia ${date}. Sua agenda abriu para esse período.`;
      
      await sendPush("Cancelamento de Última Hora", adminMsg, 'admin');

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

  const CONFIG_FILE = path.join(process.cwd(), 'barbearia_configs.json');

  const loadConfigs = () => {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      }
    } catch (e) {
      console.error('Error loading configs', e);
    }
    return {};
  };

  const saveConfigs = (configs: any) => {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2));
    } catch (e) {
      console.error('Error saving configs', e);
    }
  };

  app.get("/api/config", (req, res) => {
    const barbeariaId = req.query.barbeariaId as string || "default";
    const configs = loadConfigs();
    const config = configs[barbeariaId] || {
      lunchStart: "12:00",
      lunchEnd: "13:00",
      workEnd: "19:00",
      workStart: "08:00",
      logoUrl: ""
    };
    res.json(config);
  });

  app.post("/api/config", (req, res) => {
    const { barbeariaId, lunchStart, lunchEnd, workEnd, workStart, logoUrl } = req.body;
    const bid = barbeariaId || "default";
    const configs = loadConfigs();
    configs[bid] = {
      lunchStart: lunchStart || "12:00",
      lunchEnd: lunchEnd || "13:00",
      workEnd: workEnd || "19:00",
      workStart: workStart || "08:00",
      logoUrl: logoUrl || ""
    };
    saveConfigs(configs);
    res.status(200).json({ success: true, config: configs[bid] });
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
