import {
    describe,
    expect,
    it,
} from "vitest";

import { calculateOwnerBillItemAllocationStates } from "./calculate-owner-bill-item-allocation-states";
import type { OwnerBillItem } from "./get-owner-bill";

const firstParticipantId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

const secondParticipantId =
    "7adf5a86-16db-4b58-b71d-40c890ea0924";

function createItem(
    overrides: Partial<OwnerBillItem>,
): OwnerBillItem {
    return {
        id: "61aab4ba-1d80-41df-a157-a2daf831df6a",
        description: "Nasi Lemak",
        quantity: 1,
        unitPriceSen: 1_000,
        manualLineTotalSen: null,
        lineTotalSen: 1_000,
        allocations: [],
        sortOrder: 0,
        createdAt:
            "2026-07-19T08:05:00.000Z",
        updatedAt:
            "2026-07-19T08:05:00.000Z",
        ...overrides,
    };
}

describe(
    "calculateOwnerBillItemAllocationStates",
    () => {
        it("marks an item without allocations as unassigned", () => {
            const item = createItem({});

            const states =
                calculateOwnerBillItemAllocationStates(
                    { items: [item] },
                );

            expect(states[item.id])
                .toMatchObject({
                    itemTotalSen: 1_000,
                    allocatedSen: 0,
                    remainingSen: 1_000,
                    state: "unassigned",
                });
        });

        it("marks a partially allocated item as partially assigned", () => {
            const item = createItem({
                allocations: [
                    {
                        id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                        participantId:
                            firstParticipantId,
                        allocationType:
                            "custom",
                        amountSen: 400,
                        quantityShare: null,
                        percentageBasisPoints:
                            null,
                        remainderSen: 0,
                        createdAt:
                            "2026-07-19T08:06:00.000Z",
                        updatedAt:
                            "2026-07-19T08:06:00.000Z",
                    },
                ],
            });

            const states =
                calculateOwnerBillItemAllocationStates(
                    { items: [item] },
                );

            expect(states[item.id])
                .toMatchObject({
                    itemTotalSen: 1_000,
                    allocatedSen: 400,
                    remainingSen: 600,
                    state:
                        "partially_assigned",
                });
        });

        it("marks a fully allocated item as fully assigned", () => {
            const item = createItem({
                allocations: [
                    {
                        id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                        participantId:
                            firstParticipantId,
                        allocationType:
                            "equal",
                        amountSen: 500,
                        quantityShare: null,
                        percentageBasisPoints:
                            null,
                        remainderSen: 0,
                        createdAt:
                            "2026-07-19T08:06:00.000Z",
                        updatedAt:
                            "2026-07-19T08:06:00.000Z",
                    },
                    {
                        id: "a715ef81-d7da-4997-b0e7-98dd5d16bded",
                        participantId:
                            secondParticipantId,
                        allocationType:
                            "equal",
                        amountSen: 500,
                        quantityShare: null,
                        percentageBasisPoints:
                            null,
                        remainderSen: 0,
                        createdAt:
                            "2026-07-19T08:06:01.000Z",
                        updatedAt:
                            "2026-07-19T08:06:01.000Z",
                    },
                ],
            });

            const states =
                calculateOwnerBillItemAllocationStates(
                    { items: [item] },
                );

            expect(states[item.id])
                .toMatchObject({
                    itemTotalSen: 1_000,
                    allocatedSen: 1_000,
                    remainingSen: 0,
                    state: "fully_assigned",
                });
        });

        it("rejects allocations that exceed the item total", () => {
            const item = createItem({
                allocations: [
                    {
                        id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                        participantId:
                            firstParticipantId,
                        allocationType:
                            "custom",
                        amountSen: 1_001,
                        quantityShare: null,
                        percentageBasisPoints:
                            null,
                        remainderSen: 0,
                        createdAt:
                            "2026-07-19T08:06:00.000Z",
                        updatedAt:
                            "2026-07-19T08:06:00.000Z",
                    },
                ],
            });

            expect(() =>
                calculateOwnerBillItemAllocationStates(
                    { items: [item] },
                ),
            ).toThrowError(
                /cannot exceed the item total/,
            );
        });
    },
);
