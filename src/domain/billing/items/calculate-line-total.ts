import { BillingDomainError } from "../errors";
import type {
  CalculateLineTotalInput,
  LineTotalResult,
} from "../types";

function isProvided(
  value: number | null | undefined,
): value is number {
  return value !== null && value !== undefined;
}

export function calculateLineTotal(
  input: CalculateLineTotalInput,
): LineTotalResult {
  const {
    quantity,
    unitPriceSen,
    manualLineTotalSen,
  } = input;

  if (
    !Number.isSafeInteger(quantity) ||
    quantity <= 0
  ) {
    throw new BillingDomainError(
      "INVALID_QUANTITY",
      "Item quantity must be a positive safe integer.",
    );
  }

  if (
    !Number.isSafeInteger(unitPriceSen) ||
    unitPriceSen < 0
  ) {
    throw new BillingDomainError(
      "INVALID_UNIT_PRICE",
      "Unit price must be a non-negative safe integer in sen.",
    );
  }

  if (
    isProvided(manualLineTotalSen) &&
    (!Number.isSafeInteger(manualLineTotalSen) ||
      manualLineTotalSen < 0)
  ) {
    throw new BillingDomainError(
      "INVALID_LINE_TOTAL_OVERRIDE",
      "A manual line-total override must be a non-negative safe integer in sen.",
    );
  }

  const computedLineTotalBigInt =
    BigInt(quantity) * BigInt(unitPriceSen);

  if (
    computedLineTotalBigInt >
    BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new BillingDomainError(
      "UNSAFE_CALCULATION",
      "The calculated line total exceeds the safe-integer range.",
    );
  }

  const computedLineTotalSen = Number(
    computedLineTotalBigInt,
  );

  const hasManualOverride = isProvided(
    manualLineTotalSen,
  );

  const effectiveLineTotalSen = hasManualOverride
    ? manualLineTotalSen
    : computedLineTotalSen;

  const overrideDifferenceSen =
    effectiveLineTotalSen - computedLineTotalSen;

  return {
    quantity,
    unitPriceSen,
    computedLineTotalSen,
    effectiveLineTotalSen,
    overrideDifferenceSen,
    source: hasManualOverride
      ? "manual_override"
      : "calculated",
  };
}