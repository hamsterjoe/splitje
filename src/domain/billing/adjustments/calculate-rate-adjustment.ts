import { BillingDomainError } from "../errors";
import type {
  CalculateRateAdjustmentInput,
  RateAdjustmentResult,
  RateRoundingMode,
} from "../types";

const BASIS_POINT_DENOMINATOR = BigInt(10_000);

function isProvided(
  value: number | null | undefined,
): value is number {
  return value !== null && value !== undefined;
}

function calculateRoundedMagnitude(
  numerator: bigint,
  roundingMode: RateRoundingMode,
): bigint {
  const quotient =
    numerator / BASIS_POINT_DENOMINATOR;

  const remainder =
    numerator % BASIS_POINT_DENOMINATOR;

  if (remainder === BigInt(0)) {
    return quotient;
  }

  if (roundingMode === "down") {
    return quotient;
  }

  if (roundingMode === "up") {
    return quotient + BigInt(1);
  }

  const shouldRoundUp =
    remainder * BigInt(2) >=
    BASIS_POINT_DENOMINATOR;

  return shouldRoundUp
    ? quotient + BigInt(1)
    : quotient;
}

export function calculateRateAdjustment(
  input: CalculateRateAdjustmentInput,
): RateAdjustmentResult {
  const {
    baseAmountSen,
    rateBasisPoints,
    manualAmountSen,
  } = input;

  const roundingMode =
    input.roundingMode ?? "half_up";

  if (
    !Number.isSafeInteger(baseAmountSen) ||
    baseAmountSen < 0
  ) {
    throw new BillingDomainError(
      "INVALID_ADJUSTMENT_BASE",
      "The adjustment base must be a non-negative safe integer in sen.",
    );
  }

  if (
    !Number.isSafeInteger(rateBasisPoints) ||
    rateBasisPoints === 0
  ) {
    throw new BillingDomainError(
      "INVALID_RATE",
      "The adjustment rate must be a non-zero integer number of basis points.",
    );
  }

  if (
    roundingMode !== "down" &&
    roundingMode !== "half_up" &&
    roundingMode !== "up"
  ) {
    throw new BillingDomainError(
      "INVALID_RATE",
      "The adjustment rounding mode is invalid.",
    );
  }

  if (
    isProvided(manualAmountSen) &&
    !Number.isSafeInteger(manualAmountSen)
  ) {
    throw new BillingDomainError(
      "INVALID_ADJUSTMENT_OVERRIDE",
      "The manual adjustment amount must be a safe integer in sen.",
    );
  }

  if (
    isProvided(manualAmountSen) &&
    ((rateBasisPoints > 0 &&
      manualAmountSen < 0) ||
      (rateBasisPoints < 0 &&
        manualAmountSen > 0))
  ) {
    throw new BillingDomainError(
      "ADJUSTMENT_OVERRIDE_SIGN_MISMATCH",
      "The manual adjustment amount must have the same sign as the rate.",
    );
  }

  const numerator =
    BigInt(baseAmountSen) *
    BigInt(Math.abs(rateBasisPoints));

  const roundedMagnitude =
    calculateRoundedMagnitude(
      numerator,
      roundingMode,
    );

  if (
    roundedMagnitude >
    BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new BillingDomainError(
      "UNSAFE_CALCULATION",
      "The calculated adjustment exceeds the safe-integer range.",
    );
  }

  const magnitudeSen = Number(roundedMagnitude);

  const computedAmountSen =
    magnitudeSen === 0
      ? 0
      : rateBasisPoints > 0
        ? magnitudeSen
        : -magnitudeSen;

  const hasManualOverride = isProvided(
    manualAmountSen,
  );

  const effectiveAmountSen = hasManualOverride
    ? manualAmountSen
    : computedAmountSen;

  const overrideDifferenceSen =
    effectiveAmountSen - computedAmountSen;

  return {
    baseAmountSen,
    rateBasisPoints,
    roundingMode,
    computedAmountSen,
    effectiveAmountSen,
    overrideDifferenceSen,
    source: hasManualOverride
      ? "manual_override"
      : "calculated",
  };
}