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

export interface SignedWeightedAllocation {
  participantId: ParticipantId;
  weight: number;
  baseAmountSen: Sen;
  remainderAmountSen: -1 | 0 | 1;
  amountSen: Sen;
}

export interface SignedWeightedAllocationResult {
  totalSen: Sen;
  totalWeight: number;
  allocatedTotalSen: Sen;
  allocations: SignedWeightedAllocation[];
  remainderParticipantIds: ParticipantId[];
}

export type AdjustmentAllocationState =
  | "unassigned"
  | "partially_assigned"
  | "fully_assigned";

export interface AdjustmentAllocationInput {
  participantId: ParticipantId;
  amountSen: Sen;
}

export interface AdjustmentAllocationSummary {
  adjustmentAmountSen: Sen;
  allocatedSen: Sen;
  remainingSen: Sen;
  state: AdjustmentAllocationState;
  allocations: AdjustmentAllocationInput[];
}

export interface ParticipantItemAllocation {
  itemId: string;
  participantId: ParticipantId;
  amountSen: Sen;
}

export interface ParticipantAdjustmentAllocation {
  adjustmentId: string;
  participantId: ParticipantId;
  type: BillAdjustmentType;
  amountSen: Sen;
}

export interface ParticipantAdjustmentTotals {
  discountSen: Sen;
  serviceChargeSen: Sen;
  taxSen: Sen;
  roundingSen: Sen;
  otherSen: Sen;
  totalSen: Sen;
}

export interface ParticipantFinancialSummary {
  participantId: ParticipantId;
  itemSubtotalSen: Sen;
  adjustments: ParticipantAdjustmentTotals;
  finalAmountSen: Sen;
}

export interface ParticipantFinancialSummaryResult {
  participantSummaries: ParticipantFinancialSummary[];
  itemAllocatedTotalSen: Sen;
  adjustmentAllocatedTotalSen: Sen;
  finalAllocatedTotalSen: Sen;
  hasNegativeParticipantTotal: boolean;
}

export type BillFinalisationBlocker =
  | "no_items"
  | "receipt_not_reconciled"
  | "source_totals_mismatch"
  | "items_not_fully_assigned"
  | "adjustments_not_fully_assigned"
  | "participant_totals_mismatch"
  | "assignment_total_mismatch"
  | "negative_participant_total";

export interface BillFinancialState {
  canFinalise: boolean;
  blockingReasons: BillFinalisationBlocker[];

  calculatedReceiptTotalSen: Sen;
  participantFinalTotalSen: Sen;
  assignmentDifferenceSen: Sen;

  itemAllocatedSen: Sen;
  itemUnassignedSen: Sen;

  adjustmentAllocatedSen: Sen;
  adjustmentUnassignedSen: Sen;
}

export type LineTotalSource =
  | "calculated"
  | "manual_override";

export interface CalculateLineTotalInput {
  quantity: number;
  unitPriceSen: Sen;
  manualLineTotalSen?: Sen | null;
}

export interface LineTotalResult {
  quantity: number;
  unitPriceSen: Sen;
  computedLineTotalSen: Sen;
  effectiveLineTotalSen: Sen;
  overrideDifferenceSen: Sen;
  source: LineTotalSource;
}

export interface PercentageAllocationInput {
  participantId: ParticipantId;
  percentageBasisPoints: number;
}

export interface PercentageAllocation {
  participantId: ParticipantId;
  percentageBasisPoints: number;
  baseAmountSen: Sen;
  remainderAmountSen: 0 | 1;
  amountSen: Sen;
}

export interface PercentageAllocationResult {
  totalSen: Sen;
  percentageTotalBasisPoints: number;
  allocatedTotalSen: Sen;
  unassignedSen: Sen;
  allocations: PercentageAllocation[];
  remainderParticipantIds: ParticipantId[];
}

export interface QuantityAllocationInput {
  participantId: ParticipantId;
  quantity: number;
}

export interface QuantityAllocation {
  participantId: ParticipantId;
  quantity: number;
  baseAmountSen: Sen;
  remainderAmountSen: 0 | 1;
  amountSen: Sen;
}

export interface QuantityAllocationResult {
  totalSen: Sen;
  itemQuantity: number;
  assignedQuantity: number;
  unassignedQuantity: number;
  allocatedTotalSen: Sen;
  unassignedSen: Sen;
  allocations: QuantityAllocation[];
  remainderParticipantIds: ParticipantId[];
}

export interface BillCalculationItem {
  itemId: string;
  lineTotalSen: Sen;
  allocations: ItemAllocationInput[];
}

export interface BillCalculationAdjustment {
  adjustmentId: string;
  type: BillAdjustmentType;
  amountSen: Sen;
  allocations: AdjustmentAllocationInput[];
}

export interface BillCalculationInput {
  printedTotalSen: Sen;
  participantIds: ParticipantId[];
  items: BillCalculationItem[];
  adjustments: BillCalculationAdjustment[];
}

export type IdentifiedItemAllocationSummary =
  ItemAllocationSummary & {
    itemId: string;
  };

export type IdentifiedAdjustmentAllocationSummary =
  AdjustmentAllocationSummary & {
    adjustmentId: string;
    type: BillAdjustmentType;
  };

export interface BillCalculationResult {
  receipt: ReceiptReconciliationResult;
  itemStates: IdentifiedItemAllocationSummary[];
  adjustmentStates: IdentifiedAdjustmentAllocationSummary[];
  participantResult: ParticipantFinancialSummaryResult;
  financialState: BillFinancialState;
}