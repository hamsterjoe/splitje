import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { BillingDomainError } from "../errors";
import { calculateLineTotal } from "./calculate-line-total";

describe("calculateLineTotal", () => {
  it("calculates quantity multiplied by unit price", () => {
    const result = calculateLineTotal({
      quantity: 3,
      unitPriceSen: 1_250,
    });

    expect(result).toEqual({
      quantity: 3,
      unitPriceSen: 1_250,
      computedLineTotalSen: 3_750,
      effectiveLineTotalSen: 3_750,
      overrideDifferenceSen: 0,
      source: "calculated",
    });
  });

  it("uses a manual line-total override", () => {
    const result = calculateLineTotal({
      quantity: 3,
      unitPriceSen: 1_250,
      manualLineTotalSen: 3_700,
    });

    expect(result).toEqual({
      quantity: 3,
      unitPriceSen: 1_250,
      computedLineTotalSen: 3_750,
      effectiveLineTotalSen: 3_700,
      overrideDifferenceSen: -50,
      source: "manual_override",
    });
  });

  it("preserves an explicit zero-sen override", () => {
    const result = calculateLineTotal({
      quantity: 2,
      unitPriceSen: 500,
      manualLineTotalSen: 0,
    });

    expect(result.effectiveLineTotalSen).toBe(0);
    expect(result.overrideDifferenceSen).toBe(-1_000);
    expect(result.source).toBe("manual_override");
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid quantity: %s",
    (quantity) => {
      expect(() =>
        calculateLineTotal({
          quantity,
          unitPriceSen: 100,
        }),
      ).toThrowError(
        expect.objectContaining<Partial<BillingDomainError>>({
          code: "INVALID_QUANTITY",
        }),
      );
    },
  );

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid unit price: %s",
    (unitPriceSen) => {
      expect(() =>
        calculateLineTotal({
          quantity: 1,
          unitPriceSen,
        }),
      ).toThrowError(
        expect.objectContaining<Partial<BillingDomainError>>({
          code: "INVALID_UNIT_PRICE",
        }),
      );
    },
  );

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid override: %s",
    (manualLineTotalSen) => {
      expect(() =>
        calculateLineTotal({
          quantity: 1,
          unitPriceSen: 100,
          manualLineTotalSen,
        }),
      ).toThrowError(
        expect.objectContaining<Partial<BillingDomainError>>({
          code: "INVALID_LINE_TOTAL_OVERRIDE",
        }),
      );
    },
  );

  it("rejects multiplication outside the safe-integer range", () => {
    expect(() =>
      calculateLineTotal({
        quantity: 2,
        unitPriceSen: Number.MAX_SAFE_INTEGER,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "UNSAFE_CALCULATION",
      }),
    );
  });

  it("calculates generated line totals exactly", () => {
    fc.assert(
      fc.property(
        fc.integer({
          min: 1,
          max: 10_000,
        }),
        fc.integer({
          min: 0,
          max: 1_000_000,
        }),
        (quantity, unitPriceSen) => {
          const result = calculateLineTotal({
            quantity,
            unitPriceSen,
          });

          expect(result.computedLineTotalSen).toBe(
            quantity * unitPriceSen,
          );

          expect(result.effectiveLineTotalSen).toBe(
            result.computedLineTotalSen,
          );

          expect(result.overrideDifferenceSen).toBe(0);
          expect(result.source).toBe("calculated");
        },
      ),
    );
  });
});