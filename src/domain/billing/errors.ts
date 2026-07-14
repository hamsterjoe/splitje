export type BillingErrorCode =
  | "INVALID_TOTAL_SEN"
  | "NO_PARTICIPANTS"
  | "INVALID_PARTICIPANT_ID"
  | "DUPLICATE_PARTICIPANT_ID"
  | "INVALID_WEIGHT"
  | "INVALID_ALLOCATION_AMOUNT"
  | "OVER_ALLOCATED_ITEM"
  | "INVALID_ITEM_ID"
  | "DUPLICATE_ITEM_ID"
  | "INVALID_ITEM_TOTAL"
  | "INVALID_ADJUSTMENT_ID"
  | "DUPLICATE_ADJUSTMENT_ID"
  | "INVALID_ADJUSTMENT_AMOUNT"
  | "NEGATIVE_CALCULATED_TOTAL"
  | "UNSAFE_CALCULATION";

export class BillingDomainError extends Error {
  constructor(
    public readonly code: BillingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BillingDomainError";
  }
}