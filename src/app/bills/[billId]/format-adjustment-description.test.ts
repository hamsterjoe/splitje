import {
    describe,
    expect,
    it,
} from "vitest";

import type { OwnerBillAdjustment } from "@/application/billing/get-owner-bill";

import { formatAdjustmentDescription } from "./format-adjustment-description";

const baseAdjustment: OwnerBillAdjustment = {
    id: "a715ef81-d7da-4997-b0e7-98dd5d16bded",
    type: "tax",
    label: "SST",
    amountSen: 1_032,
    calculationMethod: "rate",
    rateBasisPoints: 600,
    roundingMode: "half_up",
    calculationBaseMode:
        "item_subtotal",
    amountSource: "calculated",
    appliesToAllItems: true,
    applicableItemIds: [],
    sortOrder: 0,
    createdAt:
        "2026-07-23T08:00:00.000Z",
    updatedAt:
        "2026-07-23T08:00:00.000Z",
};

describe(
    "formatAdjustmentDescription",
    () => {
        it("describes an all-item percentage", () => {
            expect(
                formatAdjustmentDescription({
                    ...baseAdjustment,
                    rateBasisPoints: 1_000,
                }),
            ).toBe("10% of all items");
        });

        it("describes a selected-item percentage", () => {
            expect(
                formatAdjustmentDescription({
                    ...baseAdjustment,
                    appliesToAllItems: false,
                    applicableItemIds: [
                        "item-a",
                        "item-b",
                    ],
                }),
            ).toBe(
                "6% of 2 selected items",
            );
        });

        it("uses singular selected-item grammar", () => {
            expect(
                formatAdjustmentDescription({
                    ...baseAdjustment,
                    rateBasisPoints: 1_250,
                    appliesToAllItems: false,
                    applicableItemIds: [
                        "item-a",
                    ],
                }),
            ).toBe(
                "12.5% of 1 selected item",
            );
        });

        it("displays discount rates without a negative sign", () => {
            expect(
                formatAdjustmentDescription({
                    ...baseAdjustment,
                    type: "discount",
                    rateBasisPoints: -1_250,
                }),
            ).toBe(
                "12.5% of all items",
            );
        });

        it("describes a running-total rate", () => {
            expect(
                formatAdjustmentDescription({
                    ...baseAdjustment,
                    calculationBaseMode:
                        "running_total",
                }),
            ).toBe(
                "6% of running total",
            );
        });

        it("describes fixed and rounding adjustments", () => {
            expect(
                formatAdjustmentDescription({
                    ...baseAdjustment,
                    calculationMethod:
                        "fixed",
                    rateBasisPoints: null,
                    roundingMode: null,
                    calculationBaseMode:
                        null,
                    amountSource: "manual",
                }),
            ).toBe("Fixed amount");

            expect(
                formatAdjustmentDescription({
                    ...baseAdjustment,
                    type: "rounding",
                    calculationMethod:
                        "fixed",
                    rateBasisPoints: null,
                    roundingMode: null,
                    calculationBaseMode:
                        null,
                    amountSource: "manual",
                }),
            ).toBe(
                "Receipt rounding",
            );
        });

        it("handles missing rate metadata safely", () => {
            expect(
                formatAdjustmentDescription({
                    ...baseAdjustment,
                    rateBasisPoints: null,
                }),
            ).toBe(
                "Percentage adjustment",
            );
        });
    },
);