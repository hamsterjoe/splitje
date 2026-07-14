export type Sen = number;

export type ParticipantId = string;

export interface EqualAllocation {
  participantId: ParticipantId;
  baseAmountSen: Sen;
  remainderAmountSen: Sen;
  amountSen: Sen;
}

export interface EqualAllocationResult {
  totalSen: Sen;
  participantCount: number;
  allocatedTotalSen: Sen;
  allocations: EqualAllocation[];
  remainderParticipantIds: ParticipantId[];
}

export interface WeightedAllocationInput {
  participantId: ParticipantId;
  weight: number;
}

export interface WeightedAllocation {
  participantId: ParticipantId;
  weight: number;
  baseAmountSen: Sen;
  remainderAmountSen: 0 | 1;
  amountSen: Sen;
}

export interface WeightedAllocationResult {
  totalSen: Sen;
  totalWeight: number;
  allocatedTotalSen: Sen;
  allocations: WeightedAllocation[];
  remainderParticipantIds: ParticipantId[];
}

export type ItemAllocationState =
  | "unassigned"
  | "partially_assigned"
  | "fully_assigned";

export interface ItemAllocationInput {
  participantId: ParticipantId;
  amountSen: Sen;
}

export interface ItemAllocationSummary {
  itemTotalSen: Sen;
  allocatedSen: Sen;
  remainingSen: Sen;
  state: ItemAllocationState;
  allocations: ItemAllocationInput[];
}

export type BillAdjustmentType =
  | "discount"
  | "service_charge"
  | "tax"
  | "rounding"
  | "other";

export interface ReceiptItemAmount {
  itemId: string;
  lineTotalSen: Sen;
}

export interface ReceiptAdjustmentAmount {
  adjustmentId: string;
  type: BillAdjustmentType;
  amountSen: Sen;
}

export interface ReceiptReconciliationResult {
  printedTotalSen: Sen;
  itemSubtotalSen: Sen;
  adjustmentTotalSen: Sen;
  calculatedTotalSen: Sen;
  differenceSen: Sen;
  isReconciled: boolean;
  items: ReceiptItemAmount[];
  adjustments: ReceiptAdjustmentAmount[];
}