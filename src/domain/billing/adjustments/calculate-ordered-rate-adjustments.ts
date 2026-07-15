import { BillingDomainError } from "../errors";
import type {
  CalculatedOrderedRateAdjustment,
  OrderedRateAdjustmentInput,
  OrderedRateAdjustmentsResult,
  Sen,
} from "../types";
import { calculateRateAdjustment } from "./calculate-rate-adjustment";

function isInvalidId(id: string): boolean {
  return typeof id !== "string" || id.trim().length === 0;
}

function toSafeNumber(value: bigint): number {
  if (
    value < BigInt(Number.MIN_SAFE_INTEGER) ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new BillingDomainError(
      "UNSAFE_CALCULATION",
      "Ordered adjustment arithmetic exceeds the safe-integer range.",
    );
  }

  return Number(value);
}

export function calculateOrderedRateAdjustments(
  itemSubtotalSen: Sen,
  adjustments: OrderedRateAdjustmentInput[],
): OrderedRateAdjustmentsResult {
  if (
    !Number.isSafeInteger(itemSubtotalSen) ||
    itemSubtotalSen < 0
  ) {
    throw new BillingDomainError(
      "INVALID_ADJUSTMENT_BASE",
      "The item subtotal must be a non-negative safe integer in sen.",
    );
  }

  if (
    adjustments.some(({ adjustmentId }) =>
      isInvalidId(adjustmentId),
    )
  ) {
    throw new BillingDomainError(
      "INVALID_ADJUSTMENT_ID",
      "Adjustment IDs must be non-empty strings.",
    );
  }

  const adjustmentIds = adjustments.map(
    ({ adjustmentId }) => adjustmentId,
  );

  if (
    new Set(adjustmentIds).size !==
    adjustmentIds.length
  ) {
    throw new BillingDomainError(
      "DUPLICATE_ADJUSTMENT_ID",
      "Adjustment IDs must be unique within an ordered calculation.",
    );
  }

  let runningTotalBigInt = BigInt(itemSubtotalSen);

  const calculatedAdjustments: CalculatedOrderedRateAdjustment[] =
    [];

  for (const adjustment of adjustments) {
    if (
      adjustment.baseMode !== "item_subtotal" &&
      adjustment.baseMode !== "running_total"
    ) {
      throw new BillingDomainError(
        "INVALID_ADJUSTMENT_BASE_MODE",
        "The adjustment calculation base mode is invalid.",
      );
    }

    const calculationBaseSen =
      adjustment.baseMode === "item_subtotal"
        ? itemSubtotalSen
        : toSafeNumber(runningTotalBigInt);

    const rateResult = calculateRateAdjustment({
      baseAmountSen: calculationBaseSen,
      rateBasisPoints:
        adjustment.rateBasisPoints,
      roundingMode: adjustment.roundingMode,
      manualAmountSen:
        adjustment.manualAmountSen,
    });

    const nextRunningTotalBigInt =
      runningTotalBigInt +
      BigInt(rateResult.effectiveAmountSen);

    if (
      nextRunningTotalBigInt <
      BigInt(0)
    ) {
      throw new BillingDomainError(
        "NEGATIVE_CALCULATED_TOTAL",
        "An ordered adjustment cannot reduce the running total below zero.",
      );
    }

    const runningTotalAfterSen = toSafeNumber(
      nextRunningTotalBigInt,
    );

    calculatedAdjustments.push({
      adjustmentId: adjustment.adjustmentId,
      type: adjustment.type,
      rateBasisPoints:
        adjustment.rateBasisPoints,
      baseMode: adjustment.baseMode,
      calculationBaseSen,
      roundingMode: rateResult.roundingMode,
      computedAmountSen:
        rateResult.computedAmountSen,
      effectiveAmountSen:
        rateResult.effectiveAmountSen,
      overrideDifferenceSen:
        rateResult.overrideDifferenceSen,
      source: rateResult.source,
      runningTotalAfterSen,
    });

    runningTotalBigInt = nextRunningTotalBigInt;
  }

  const finalTotalSen = toSafeNumber(
    runningTotalBigInt,
  );

  const adjustmentTotalSen = toSafeNumber(
    runningTotalBigInt - BigInt(itemSubtotalSen),
  );

  return {
    itemSubtotalSen,
    adjustmentTotalSen,
    finalTotalSen,
    adjustments: calculatedAdjustments,
  };
}