export type BillingErrorCode =
  | "INVALID_TOTAL_SEN"
  | "NO_PARTICIPANTS"
  | "INVALID_PARTICIPANT_ID"
  | "DUPLICATE_PARTICIPANT_ID";

export class BillingDomainError extends Error {
  constructor(
    public readonly code: BillingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BillingDomainError";
  }
}