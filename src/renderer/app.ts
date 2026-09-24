/// <reference path="../preload/global.d.ts" />

import { AllocationEngine } from '../shared/allocation-engine.js';
import { createDefaultState } from '../shared/defaults.js';
import type { PersistedState, RentalProperty, UtilityKind } from '../shared/models.js';

const root = (() => {
  const element = document.querySelector<HTMLElement>('#app');
  if (!element) throw new Error('Elemento principal não encontrado.');
  return element;
})();

const engine = new AllocationEngine();
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const utilityLabel: Record<UtilityKind, string> = { energy: 'Energia elétrica' };

const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
const number = (value: string): number => Math.max(0, Number(value.replace(',', '.')) || 0);

class RateioApp {
  private state: PersistedState = createDefaultState();
  private saveStatus = 'Nova sessão — sem imóveis cadastrados';
  private exportingPdf = false;
  private pdfMessage = '';
  private pdfError = false;

  async initialize(): Promise<void> {
    this.state = createDefaultState();
    this.render();
  }

  private scheduleSave(): void {
    this.saveStatus = 'Alterações aplicadas nesta sessão';
  }

  private newProperty(name: string): RentalProperty {
    return {
      id: crypto.randomUUID(),
      name: name.trim(),
      active: true,
      energy: { included: true, reading: { previous: 0, current: 0 } }
    };
  }

  private renderBill(utility: UtilityKind): string {
    const bill = this.state.draft.bills[utility];
    return `
      <section class="panel">
        <div class="bill-header"><h2 class="panel-title">${utilityLabel[utility]}</h2><span class="utility-tag">kWh</span></div>
        <div class="grid two">
          <label class="field">Concessionária<input data-update="bill" data-utility="${utility}" data-field="provider" value="${escapeHtml(bill.provider)}" /></label>
          <label class="field">Nº da conta / medidor<input data-update="bill" data-utility="${utility}" data-field="accountNumber" value="${escapeHtml(bill.accountNumber)}" /></label>
          <label class="field">Valor total da fatura (R$)<input data-update="bill" data-utility="${utility}" data-field="totalAmount" type="number" min="0" step="0.01" value="${bill.totalAmount}" /></label>
          <label class="field">Consumo total (kWh)<input data-update="bill" data-utility="${utility}" data-field="totalConsumption" type="number" min="0" step="0.01" value="${bill.totalConsumption}" /></label>
        </div>
        <div class="fees">
          <h4>Taxas fixas — divididas igualmente entre imóveis ativos</h4>
          ${bill.fixedFees.map((fee) => `<div class="fee-row"><span>${escapeHtml(fee.description)}</span><b>${currency.format(fee.amount)}</b><button class="btn btn-danger btn-square" data-action="remove-fee" data-utility="${utility}" data-fee-id="${fee.id}" aria-label="Remover taxa">×</button></div>`).join('') || '<div class="panel-hint">Nenhuma taxa fixa cadastrada.</div>'}
          <div class="add-fee">
            <input data-new-fee-description="${utility}" placeholder="Descrição da taxa" aria-label="Descrição da taxa" />
            <input data-new-fee-amount="${utility}" type="number" min="0" step="0.01" value="0" placeholder="Valor" aria-label="Valor da taxa" />
            <button class="btn btn-soft btn-square" data-action="add-fee" data-utility="${utility}" aria-label="Adicionar taxa">+</button>
          </div>
        </div>
      </section>`;
  }

  private renderRule(property: RentalProperty, utility: UtilityKind): string {
    const rule = property[utility];
    return `
      <div class="rule">
        <strong>${utilityLabel[utility]}</strong>
        <label class="check"><input data-update="included" data-property-id="${property.id}" data-utility="${utility}" type="checkbox" ${rule.included ? 'checked' : ''} /> Participa desta conta</label>
        <div class="reading">
          <label>Anterior<input data-update="reading" data-property-id="${property.id}" data-utility="${utility}" data-reading="previous" type="number" min="0" step="0.01" value="${rule.reading?.previous ?? 0}" /></label>
          <label>Atual<input data-update="reading" data-property-id="${property.id}" data-utility="${utility}" data-reading="current" type="number" min="0" step="0.01" value="${rule.reading?.current ?? 0}" /></label>
          <small>kWh</small>
        </div>
      </div>`;
  }

  private renderProperties(): string {
    const properties = this.state.draft.properties;
    if (properties.length === 0) return '';
    return `
      <div class="properties">
          ${properties.map((property) => `
            <div class="panel property-card">
              <div class="property-head">
                <label class="field property-name-field">Nome do inquilino / imóvel<input class="property-name" data-update="property-name" data-property-id="${property.id}" value="${escapeHtml(property.name)}" aria-label="Nome do inquilino / imóvel" /></label>
                <div class="actions property-actions">
                  <label class="check"><input data-update="property-active" data-property-id="${property.id}" type="checkbox" ${property.active ? 'checked' : ''} /> Ativo</label>
                  <button class="btn btn-danger" data-action="remove-property" data-property-id="${property.id}">Remover</button>
                </div>
              </div>
              <div class="utility-rules">${this.renderRule(property, 'energy')}</div>
            </div>`).join('')}
      </div>`;
  }

  private renderResults(): string {
    const result = engine.calculate(this.state.draft);
    const cards = result.properties.map(({ property, energy, totalAmount }) => `
      <article class="result-card">
        <div class="result-head"><div><strong>${escapeHtml(property.name)}</strong><div class="panel-hint">${this.state.draft.referenceMonth || 'Competência não informada'} · leitura em ${this.state.draft.readingDate || '—'}</div></div><strong class="result-total">${currency.format(totalAmount)}</strong></div>
        <div class="result-utilities">
          ${this.renderUtilityResult('Energia elétrica', energy, 'kWh')}
        </div>
      </article>`).join('');
    return `
      <section class="panel">
        <div class="bill-header"><h2 class="panel-title">Resultado do rateio</h2><button class="btn btn-soft no-print" data-action="print" ${this.exportingPdf || !this.state.draft.properties.length ? 'disabled' : ''}>${this.exportingPdf ? 'Gerando PDF...' : 'Gerar / abrir PDF'}</button></div>
        ${this.pdfMessage ? `<p class="pdf-message ${this.pdfError ? 'warning' : ''}" role="${this.pdfError ? 'alert' : 'status'}">${escapeHtml(this.pdfMessage)}</p>` : ''}
        <div class="metric-grid">
          <div class="metric"><span>Tarifa variável de energia</span><strong>${currency.format(result.summaries.energy.rate)}/kWh</strong></div>
        </div>
        ${result.warnings.map((warning) => `<div class="warning">${escapeHtml(warning)}</div>`).join('')}
        ${cards || '<p class="empty">Adicione e ative ao menos um imóvel para visualizar o resultado.</p>'}
      </section>`;
  }

  private renderUtilityResult(title: string, result: { consumption: number; variableAmount: number; fixedAmount: number; totalAmount: number; allocationLabel: string }, unit: string): string {
    return `<div class="result-utility"><h4>${title}</h4><p><span>Leituras</span><b>${escapeHtml(result.allocationLabel)}</b></p><p><span>Consumo</span><b>${decimal.format(result.consumption)} ${unit}</b></p><p><span>Variável</span><b>${currency.format(result.variableAmount)}</b></p><p><span>Taxas fixas</span><b>${currency.format(result.fixedAmount)}</b></p><p><span>Total</span><b>${currency.format(result.totalAmount)}</b></p></div>`;
  }

  private render(): void {
    root.innerHTML = `
      <div class="shell">
        <header class="topbar"><div class="brand-area"><h1 class="brand">Grupo Fit Seven - Salas Comerciais</h1><p class="subtitle">Rateio transparente de energia para os seus imóveis.</p><div class="header-add-property no-print"><span>Adicionar imóvel</span><div class="add-property"><input data-new-property-name placeholder="Nome do novo imóvel" aria-label="Nome do novo imóvel" /><button class="btn btn-primary" data-action="add-property">+ Adicionar</button></div></div></div><span class="status">${this.saveStatus}</span></header>
        <div class="layout">
          <div class="left-column no-print">
            <section class="panel">
              <h2 class="panel-title">Dados da competência</h2>
              <div class="grid two">
                <label class="field">Mês / ano de referência<input data-update="general" data-field="referenceMonth" maxlength="7" placeholder="MM/AAAA" value="${escapeHtml(this.state.draft.referenceMonth)}" /></label>
                <label class="field">Data da medição<input data-update="general" data-field="readingDate" maxlength="10" placeholder="DD/MM/AAAA" value="${escapeHtml(this.state.draft.readingDate)}" /></label>
              </div>
            </section>
            ${this.renderBill('energy')}
            ${this.renderProperties()}
            <button class="btn btn-primary calculate" data-action="calculate">Atualizar cálculo de rateio</button>
          </div>
          <div>${this.renderResults()}</div>
        </div>
      </div>`;
  }

  private property(id: string): RentalProperty | undefined {
    return this.state.draft.properties.find((property) => property.id === id);
  }

  private async exportPdf(): Promise<void> {
    if (this.exportingPdf || !this.state.draft.properties.length) return;
    this.exportingPdf = true;
    this.pdfMessage = '';
    this.pdfError = false;
    this.render();
    try {
      const { filePath, openError } = await window.rateioApi.exportPdf(this.state.draft);
      this.pdfError = Boolean(openError);
      this.pdfMessage = openError
        ? `O PDF foi salvo em ${filePath}, mas não foi possível abrir o leitor padrão. Abra o arquivo com um aplicativo de PDF.`
        : `PDF salvo em ${filePath} e aberto no aplicativo padrão.`;
    } catch (error) {
      this.pdfError = true;
      this.pdfMessage = `Não foi possível gerar o PDF. ${error instanceof Error ? error.message : 'Tente novamente.'}`;
    } finally {
      this.exportingPdf = false;
      this.render();
    }
  }

  private onChange = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const update = target.dataset.update;
    if (!update) return;

    if (update === 'general') this.state.draft[target.dataset.field as 'referenceMonth' | 'readingDate'] = target.value;
    if (update === 'bill') {
      const bill = this.state.draft.bills[target.dataset.utility as UtilityKind];
      const field = target.dataset.field;
      if (field === 'totalAmount' || field === 'totalConsumption') bill[field] = number(target.value);
      if (field === 'provider' || field === 'accountNumber') bill[field] = target.value;
    }
    if (update === 'property-name') {
      const property = this.property(target.dataset.propertyId!);
      if (property) property.name = target.value.trim();
    }
    if (update === 'property-active') {
      const property = this.property(target.dataset.propertyId!);
      if (property && target instanceof HTMLInputElement) property.active = target.checked;
    }
    if (update === 'included') {
      const property = this.property(target.dataset.propertyId!);
      const utility = target.dataset.utility as UtilityKind;
      if (property && target instanceof HTMLInputElement) property[utility].included = target.checked;
    }
    if (update === 'reading') {
      const property = this.property(target.dataset.propertyId!);
      const utility = target.dataset.utility as UtilityKind;
      if (property) {
        property[utility].reading ??= { previous: 0, current: 0 };
        property[utility].reading![target.dataset.reading as 'previous' | 'current'] = number(target.value);
      }
    }
    this.scheduleSave();
    this.render();
  };

  private onClick = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLElement>('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'add-property') {
      const name = root.querySelector<HTMLInputElement>('[data-new-property-name]')?.value ?? '';
      this.state.draft.properties.push(this.newProperty(name));
    }
    if (action === 'remove-property') this.state.draft.properties = this.state.draft.properties.filter((property) => property.id !== button.dataset.propertyId);
    if (action === 'add-fee') {
      const utility = button.dataset.utility as UtilityKind;
      const description = root.querySelector<HTMLInputElement>(`[data-new-fee-description="${utility}"]`)?.value.trim() ?? '';
      const amount = number(root.querySelector<HTMLInputElement>(`[data-new-fee-amount="${utility}"]`)?.value ?? '0');
      if (description && amount > 0) this.state.draft.bills[utility].fixedFees.push({ id: crypto.randomUUID(), description, amount });
    }
    if (action === 'remove-fee') {
      const utility = button.dataset.utility as UtilityKind;
      this.state.draft.bills[utility].fixedFees = this.state.draft.bills[utility].fixedFees.filter((fee) => fee.id !== button.dataset.feeId);
    }
    if (action === 'print') void this.exportPdf();
    if (action !== 'print') {
      this.scheduleSave();
      this.render();
    }
  };

  bind(): void {
    root.addEventListener('change', this.onChange);
    root.addEventListener('click', this.onClick);
  }
}

const application = new RateioApp();
application.bind();
void application.initialize();
