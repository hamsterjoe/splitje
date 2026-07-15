import { describe, expect, it } from "vitest";

import { BillingDomainError } from "../errors";
import { calculateOrderedRateAdjustments } from "./calculate-ordered-rate-adjustments";

describe("calculateOrderedRateAdjustments", () => {
  it("calculates SST after service charge", () => {
    const result = calculateOrderedRateAdjustments(
      10_000,
      [
        {
          adjustmentId: "service-charge",
          type: "service_charge",
          rateBasisPoints: 1_000,
          baseMode: "item_subtotal",
        },
        {
          adjustmentId: "sst",
          type: "tax",
          rateBasisPoints: 600,
          baseMode: "running_total",
        },
      ],
    );

    expect(result).toEqual({
      itemSubtotalSen: 10_000,
      adjustmentTotalSen: 1_660,
      finalTotalSen: 11_660,
      adjustments: [
        {
          adjustmentId: "service-charge",
          type: "service_charge",
          rateBasisPoints: 1_000,
          baseMode: "item_subtotal",
          calculationBaseSen: 10_000,
          roundingMode: "half_up",
          computedAmountSen: 1_000,
          effectiveAmountSen: 1_000,
          overrideDifferenceSen: 0,
          source: "calculated",
          runningTotalAfterSen: 11_000,
        },
        {
          adjustmentId: "sst",
          type: "tax",
          rateBasisPoints: 600,
          baseMode: "running_total",
          calculationBaseSen: 11_000,
          roundingMode: "half_up",
          computedAmountSen: 660,
          effectiveAmountSen: 660,
          overrideDifferenceSen: 0,
          source: "calculated",
          runningTotalAfterSen: 11_660,
        },
      ],
    });
  });

  it("can calculate tax from the original item subtotal", () => {
    const result = calculateOrderedRateAdjustments(
      10_000,
      [
        {
          adjustmentId: "service-charge",
          type: "service_charge",
          rateBasisPoints: 1_000,
          baseMode: "item_subtotal",
        },
        {
          adjustmentId: "sst",
          type: "tax",
          rateBasisPoints: 600,
          baseMode: "item_subtotal",
        },
      ],
    );

    expect(
      result.adjustments[1]?.calculationBaseSen,
    ).toBe(10_000);

    expect(
      result.adjustments[1]?.effectiveAmountSen,
    ).toBe(600);

    expect(result.finalTotalSen).toBe(11_600);
  });

  it("uses manual overrides in the running total", () => {
    const result = calculateOrderedRateAdjustments(
      10_000,
      [
        {
          adjustmentId: "service-charge",
          type: "service_charge",
          rateBasisPoints: 1_000,
          baseMode: "item_subtotal",
          manualAmountSen: 999,
        },
        {
          adjustmentId: "sst",
          type: "tax",
          rateBasisPoints: 600,
          baseMode: "running_total",
        },
      ],
    );

    expect(
      result.adjustments[0]?.computedAmountSen,
    ).toBe(1_000);

    expect(
      result.adjustments[0]?.effectiveAmountSen,
    ).toBe(999);

    expect(
      result.adjustments[1]?.calculationBaseSen,
    ).toBe(10_999);

    expect(
      result.adjustments[1]?.effectiveAmountSen,
    ).toBe(660);

    expect(result.finalTotalSen).toBe(11_659);
  });

  it("supports a discount before tax", () => {
    const result = calculateOrderedRateAdjustments(
      10_000,
      [
        {
          adjustmentId: "discount",
          type: "discount",
          rateBasisPoints: -1_000,
          baseMode: "item_subtotal",
        },
        {
          adjustmentId: "tax",
          type: "tax",
          rateBasisPoints: 600,
          baseMode: "running_total",
        },
      ],
    );

    expect(
      result.adjustments[0]?.effectiveAmountSen,
    ).toBe(-1_000);

    expect(
      result.adjustments[1]?.calculationBaseSen,
    ).toBe(9_000);

    expect(
      result.adjustments[1]?.effectiveAmountSen,
    ).toBe(540);

    expect(result.finalTotalSen).toBe(9_540);
  });

  it("returns the original subtotal when there are no adjustments", () => {
    const result = calculateOrderedRateAdjustments(
      10_000,
      [],
    );

    expect(result).toEqual({
      itemSubtotalSen: 10_000,
      adjustmentTotalSen: 0,
      finalTotalSen: 10_000,
      adjustments: [],
    });
  });

  it("rejects duplicate adjustment IDs", () => {
    expect(() =>
      calculateOrderedRateAdjustments(
        10_000,
        [
          {
            adjustmentId: "tax",
            type: "tax",
            rateBasisPoints: 600,
            baseMode: "item_subtotal",
          },
          {
            adjustmentId: "tax",
            type: "tax",
            rateBasisPoints: 800,
            baseMode: "running_total",
          },
        ],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "DUPLICATE_ADJUSTMENT_ID",
      }),
    );
  });

  it("rejects an adjustment sequence that makes the total negative", () => {
    expect(() =>
      calculateOrderedRateAdjustments(
        100,
        [
          {
            adjustmentId: "discount",
            type: "discount",
            rateBasisPoints: -20_000,
            baseMode: "item_subtotal",
          },
        ],
      ),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "NEGATIVE_CALCULATED_TOTAL",
      }),
    );
  });
});