import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { calculateRateAdjustment } from "./calculate-rate-adjustment";

describe("calculateRateAdjustment", () => {
  it("calculates a positive rate in basis points", () => {
    const result = calculateRateAdjustment({
      baseAmountSen: 10_000,
      rateBasisPoints: 600,
    });

    expect(result).toEqual({
      baseAmountSen: 10_000,
      rateBasisPoints: 600,
      roundingMode: "half_up",
      computedAmountSen: 600,
      effectiveAmountSen: 600,
      overrideDifferenceSen: 0,
      source: "calculated",
    });
  });

  it("rounds half a sen up by default", () => {
    const result = calculateRateAdjustment({
      baseAmountSen: 101,
      rateBasisPoints: 5_000,
    });

    expect(result.computedAmountSen).toBe(51);
  });

  it("supports rounding down", () => {
    const result = calculateRateAdjustment({
      baseAmountSen: 101,
      rateBasisPoints: 5_000,
      roundingMode: "down",
    });

    expect(result.computedAmountSen).toBe(50);
  });

  it("supports rounding up", () => {
    const result = calculateRateAdjustment({
      baseAmountSen: 101,
      rateBasisPoints: 5_000,
      roundingMode: "up",
    });

    expect(result.computedAmountSen).toBe(51);
  });

  it("rounds negative discounts by magnitude", () => {
    const result = calculateRateAdjustment({
      baseAmountSen: 101,
      rateBasisPoints: -5_000,
    });

    expect(result.computedAmountSen).toBe(-51);
  });

  it("uses a manual printed-amount override", () => {
    const result = calculateRateAdjustment({
      baseAmountSen: 101,
      rateBasisPoints: 5_000,
      manualAmountSen: 50,
    });

    expect(result.computedAmountSen).toBe(51);
    expect(result.effectiveAmountSen).toBe(50);
    expect(result.overrideDifferenceSen).toBe(-1);
    expect(result.source).toBe("manual_override");
  });

  it("preserves an explicit zero override", () => {
    const result = calculateRateAdjustment({
      baseAmountSen: 10_000,
      rateBasisPoints: 600,
      manualAmountSen: 0,
    });

    expect(result.effectiveAmountSen).toBe(0);
    expect(result.overrideDifferenceSen).toBe(-600);
    expect(result.source).toBe("manual_override");
  });

  it("rejects an override with the opposite sign", () => {
    expect(() =>
      calculateRateAdjustment({
        baseAmountSen: 10_000,
        rateBasisPoints: 600,
        manualAmountSen: -600,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "ADJUSTMENT_OVERRIDE_SIGN_MISMATCH",
      }),
    );
  });

  it.each([
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])(
    "rejects invalid calculation base: %s",
    (baseAmountSen) => {
      expect(() =>
        calculateRateAdjustment({
          baseAmountSen,
          rateBasisPoints: 600,
        }),
      ).toThrowError(
        expect.objectContaining<Partial<BillingDomainError>>({
          code: "INVALID_ADJUSTMENT_BASE",
        }),
      );
    },
  );

  it.each([
    0,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])(
    "rejects invalid rate: %s",
    (rateBasisPoints) => {
      expect(() =>
        calculateRateAdjustment({
          baseAmountSen: 10_000,
          rateBasisPoints,
        }),
      ).toThrowError(
        expect.objectContaining<Partial<BillingDomainError>>({
          code: "INVALID_RATE",
        }),
      );
    },
  );

  it("rejects calculation outside the safe-integer range", () => {
    expect(() =>
      calculateRateAdjustment({
        baseAmountSen: Number.MAX_SAFE_INTEGER,
        rateBasisPoints: 20_000,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "UNSAFE_CALCULATION",
      }),
    );
  });

  it("preserves the sign of generated rates", () => {
    fc.assert(
      fc.property(
        fc.integer({
          min: 0,
          max: 1_000_000_000,
        }),
        fc.integer({
          min: 1,
          max: 100_000,
        }),
        fc.boolean(),
        (baseAmountSen, magnitude, isDiscount) => {
          const rateBasisPoints = isDiscount
            ? -magnitude
            : magnitude;

          const result = calculateRateAdjustment({
            baseAmountSen,
            rateBasisPoints,
          });

          expect(
            Number.isSafeInteger(
              result.computedAmountSen,
            ),
          ).toBe(true);

          if (baseAmountSen === 0) {
            expect(result.computedAmountSen).toBe(0);
          } else if (isDiscount) {
            expect(result.computedAmountSen).toBeLessThanOrEqual(
              0,
            );
          } else {
            expect(
              result.computedAmountSen,
            ).toBeGreaterThanOrEqual(0);
          }
        },
      ),
    );
  });

  it("calculates the example receipt adjustments", () => {
    const itemSubtotalSen = 17_200;

    const serviceCharge =
      calculateRateAdjustment({
        baseAmountSen:
          itemSubtotalSen,
        rateBasisPoints: 1_000,
      });

    const sst =
      calculateRateAdjustment({
        baseAmountSen:
          itemSubtotalSen,
        rateBasisPoints: 600,
      });

    expect(
      serviceCharge.computedAmountSen,
    ).toBe(1_720);

    expect(
      sst.computedAmountSen,
    ).toBe(1_032);

    expect(
      itemSubtotalSen +
      serviceCharge.effectiveAmountSen +
      sst.effectiveAmountSen -
      2,
    ).toBe(19_950);
  });
});