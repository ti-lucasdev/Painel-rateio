export type UtilityKind = 'energy';

export interface FixedFee {
  id: string;
  description: string;
  amount: number;
}

export interface MeterReading {
  previous: number;
  current: number;
}

export interface PropertyUtilityRule {
  /** Permite excluir o imóvel de uma conta sem excluí-lo do cadastro. */
  included: boolean;
  reading: MeterReading;
}

export interface RentalProperty {
  id: string;
  name: string;
  active: boolean;
  energy: PropertyUtilityRule;
}

export interface UtilityBill {
  provider: string;
  accountNumber: string;
  totalAmount: number;
  totalConsumption: number;
  fixedFees: FixedFee[];
}

export interface SettlementDraft {
  referenceMonth: string;
  readingDate: string;
  properties: RentalProperty[];
  bills: Record<UtilityKind, UtilityBill>;
}

export interface PropertyUtilityResult {
  consumption: number;
  variableAmount: number;
  fixedAmount: number;
  totalAmount: number;
  allocationLabel: string;
}

export interface PropertyResult {
  property: RentalProperty;
  energy: PropertyUtilityResult;
  totalAmount: number;
}

export interface UtilitySummary {
  rate: number;
  fixedFeesTotal: number;
  variableAmount: number;
}

export interface SettlementResult {
  properties: PropertyResult[];
  summaries: Record<UtilityKind, UtilitySummary>;
  warnings: string[];
}

export interface PersistedState {
  schemaVersion: 1;
  draft: SettlementDraft;
}
