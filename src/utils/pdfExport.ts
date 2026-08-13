import { format, parseISO } from 'date-fns';

export interface DetailedServiceExport {
  id: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  valorServico: number;
  valorComissao: number;
  comissaoPercent?: number;
}

export interface ExportPdfOptions {
  barbeariaName?: string;
  barberName: string;
  periodLabel: string;
  comissaoPercent?: number;
  detailedServices: DetailedServiceExport[];
  totalCortes: number;
  totalBruto: number;
  totalComissao: number;
}

export function exportBarberReportPdf(options: ExportPdfOptions) {
  const {
    barbeariaName = 'Barbearia',
    barberName,
    periodLabel,
    comissaoPercent = 0,
    detailedServices,
    totalCortes,
    totalBruto,
    totalComissao
  } = options;

  const rowsHtml = detailedServices.map(item => {
    let dateFmt = item.date;
    try {
      if (item.date) {
        dateFmt = format(parseISO(item.date), 'dd/MM/yyyy');
      }
    } catch (e) {}

    return `
      <tr>
        <td>${dateFmt}</td>
        <td>${item.time || '--:--'}</td>
        <td style="font-weight: 600;">${item.clientName || 'Cliente'}</td>
        <td>${item.serviceName || 'Serviço'}</td>
        <td style="text-align: right;">R$ ${item.valorServico.toFixed(2)}</td>
        <td style="text-align: right; color: #15803d; font-weight: 700;">R$ ${item.valorComissao.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita popups no navegador para visualizar e baixar o PDF.');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Cortes - ${barberName}</title>
      <style>
        @page {
          size: A4;
          margin: 12mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background: #fff;
        }
        .header-banner {
          background-color: #0c0c0c;
          color: #fff;
          padding: 20px 24px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .header-title {
          color: #C5A059;
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 4px 0;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .header-subtitle {
          font-size: 13px;
          margin: 0 0 4px 0;
          color: #f3f4f6;
        }
        .header-meta {
          font-size: 11px;
          color: #9ca3af;
        }
        .cards-grid {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }
        .card {
          flex: 1;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 12px 16px;
          border-radius: 8px;
        }
        .card-title {
          font-size: 10px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .card-value {
          font-size: 18px;
          font-weight: 800;
          color: #111827;
        }
        .card-value.green {
          color: #15803d;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 11px;
        }
        th {
          background-color: #C5A059;
          color: #000;
          font-weight: 700;
          text-align: left;
          padding: 8px 10px;
          font-size: 10px;
          text-transform: uppercase;
        }
        th.right, td.right {
          text-align: right;
        }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #e5e7eb;
          color: #374151;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .footer {
          margin-top: 24px;
          text-align: center;
          font-size: 10px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 12px;
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #111; color: #fff; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #C5A059;">
        <span style="font-size: 13px; font-weight: 600;">📄 Relatório gerado com sucesso! Escolha "Salvar como PDF" ou Imprimir.</span>
        <button onclick="window.print()" style="background: #C5A059; color: #000; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px;">
          🖨️ Salvar PDF / Imprimir
        </button>
      </div>

      <div style="padding: 20px;">
        <div class="header-banner">
          <div class="header-title">${barbeariaName}</div>
          <div class="header-subtitle">Relatório de Atendimentos & Comissões — Barbeiro: <strong>${barberName}</strong></div>
          <div class="header-meta">Período: ${periodLabel} | Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
        </div>

        <div class="cards-grid">
          <div class="card">
            <div class="card-title">Total de Cortes</div>
            <div class="card-value">${totalCortes}</div>
          </div>
          <div class="card">
            <div class="card-title">Faturamento Bruto</div>
            <div class="card-value">R$ ${totalBruto.toFixed(2)}</div>
          </div>
          <div class="card">
            <div class="card-title">Total Comissão (${comissaoPercent}%)</div>
            <div class="card-value green">R$ ${totalComissao.toFixed(2)}</div>
          </div>
        </div>

        <h3 style="font-size: 13px; margin-bottom: 8px; color: #111;">Detalhamento dos Atendimentos (${detailedServices.length})</h3>
        
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Horário</th>
              <th>Cliente</th>
              <th>Serviço</th>
              <th class="right">Valor Serviço</th>
              <th class="right">Comissão</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="text-align: center; color: #9ca3af; padding: 20px;">Nenhum atendimento registrado neste período.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Relatório gerado por ${barbeariaName} em ${format(new Date(), 'dd/MM/yyyy HH:mm')}
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
