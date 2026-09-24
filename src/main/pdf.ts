import { BrowserWindow } from 'electron';
import { writeFile } from 'node:fs/promises';
import { AllocationEngine } from '../shared/allocation-engine.js';
import type { SettlementDraft } from '../shared/models.js';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const tariff = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]!);

export function renderSettlementPdf(draft: SettlementDraft): string {
  if (!draft.properties.length) throw new Error('Adicione ao menos um imóvel para gerar o PDF.');
  const result = new AllocationEngine().calculate(draft);
  const bill = draft.bills.energy;
  const pages = draft.properties.map((property, index) => {
    const allocation = result.properties.find((item) => item.property.id === property.id);
    const energy = allocation?.energy;
    const reading = property.energy.reading;
    const participates = property.active && property.energy.included;
    return `<section class="page">
      <header><div class="document-type">Demonstrativo de energia elétrica</div></header>
      <div class="unit"><div class="eyebrow">IMÓVEL / INQUILINO</div><h1>${escapeHtml(property.name || `Imóvel ${index + 1}`)}</h1></div>
      <div class="metadata">
        <div><span>Competência</span><strong>${escapeHtml(draft.referenceMonth || 'Não informada')}</strong></div>
        <div><span>Data da medição</span><strong>${escapeHtml(draft.readingDate || 'Não informada')}</strong></div>
        <div><span>Concessionária</span><strong>${escapeHtml(bill.provider || 'Não informada')}</strong></div>
        <div><span>Conta / medidor</span><strong>${escapeHtml(bill.accountNumber || 'Não informado')}</strong></div>
      </div>
      <h2>Consumo de energia</h2>
      <div class="metrics">
        <div><span>Consumo total da fatura</span><strong>${decimal.format(bill.totalConsumption)} <small>kWh</small></strong></div>
        <div class="highlight"><span>Consumo desta unidade</span><strong>${decimal.format(energy?.consumption ?? 0)} <small>kWh</small></strong></div>
      </div>
      <div class="readings"><div><span>Leitura anterior</span><strong>${decimal.format(reading.previous)} kWh</strong></div><div><span>Leitura atual</span><strong>${decimal.format(reading.current)} kWh</strong></div></div>
      <div class="tariff"><span>Tarifa variável de energia</span><strong>R$ ${tariff.format(result.summaries.energy.rate)} / kWh</strong></div>
      ${!participates ? `<p class="notice">${property.active ? 'Esta unidade não participa da conta de energia.' : 'Imóvel inativo: não participa deste rateio.'}</p>` : ''}
      <h2>Composição do valor</h2>
      <table><thead><tr><th>Descrição</th><th>Valor</th></tr></thead><tbody>
        <tr><td>Energia - parcela variável da unidade</td><td>${currency.format(energy?.variableAmount ?? 0)}</td></tr>
        <tr><td>Taxas fixas - parcela da unidade</td><td>${currency.format(energy?.fixedAmount ?? 0)}</td></tr>
      </tbody></table>
      <div class="total"><span>Total desta unidade</span><strong>${currency.format(allocation?.totalAmount ?? 0)}</strong></div>
      <p class="note">A parcela variável é rateada proporcionalmente ao consumo medido das unidades participantes. As taxas fixas são divididas igualmente entre essas unidades.</p>
      <footer><span></span><span>Página ${index + 1} de ${draft.properties.length}</span></footer>
    </section>`;
  }).join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Rateio de energia</title><style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #233448; font: 11pt 'Segoe UI', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { height: 266mm; display: flex; flex-direction: column; break-after: page; }
    .page:last-child { break-after: auto; }
    header { border-bottom: 3px solid #187f85; padding-bottom: 16px; }
    .brand { font-size: 15pt; font-weight: 750; color: #16334c; letter-spacing: .3px; }
    .document-type { margin-top: 5px; color: #617184; font-size: 10pt; }
    .unit { margin: 25px 0 20px; }
    .eyebrow { color: #187f85; font-size: 9pt; font-weight: 700; letter-spacing: 1px; }
    h1 { margin: 7px 0 0; font-size: 24pt; line-height: 1.15; overflow-wrap: anywhere; }
    .metadata { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; padding: 18px; border: 1px solid #dce4eb; border-radius: 8px; }
    .metadata span, .metrics span, .readings span { display: block; color: #617184; font-size: 9pt; margin-bottom: 5px; }
    .metadata strong { font-size: 10pt; overflow-wrap: anywhere; }
    h2 { font-size: 12pt; margin: 24px 0 12px; color: #16334c; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .metrics > div { padding: 17px; background: #f1f5f8; border-radius: 8px; }
    .metrics .highlight { background: #eaf5f2; }
    .metrics strong { font-size: 21pt; color: #16334c; }
    .metrics small { font-size: 11pt; font-weight: 500; }
    .readings { display: grid; grid-template-columns: 1fr 1fr; padding: 16px 18px; gap: 14px; }
    .readings strong { font-size: 11pt; }
    .tariff { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 15px 18px; border: 1px solid #aed1d0; border-radius: 8px; color: #12595d; }
    .tariff span { font-size: 10pt; }
    .tariff strong { font-size: 13pt; white-space: nowrap; }
    table { border-collapse: collapse; width: 100%; font-size: 10pt; }
    th { text-align: left; color: #617184; background: #f1f5f8; font-weight: 600; }
    th, td { padding: 13px 14px; border-bottom: 1px solid #dce4eb; }
    th:last-child, td:last-child { text-align: right; white-space: nowrap; }
    .total { background: #16334c; color: #fff; padding: 20px; margin-top: 14px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .total strong { font-size: 24pt; white-space: nowrap; }
    .note { font-size: 9pt; line-height: 1.5; color: #617184; margin: 14px 0; }
    .notice { font-size: 9pt; color: #795615; margin: 10px 0 0; }
    footer { margin-top: auto; border-top: 1px solid #dce4eb; padding-top: 12px; font-size: 8pt; color: #617184; display: flex; justify-content: space-between; }
  </style></head><body>${pages}</body></html>`;
}

export async function generateSettlementPdf(draft: SettlementDraft, filePath: string): Promise<void> {
  const html = renderSettlementPdf(draft);
  const printWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdf = await printWindow.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    await writeFile(filePath, pdf);
  } finally {
    printWindow.destroy();
  }
}
