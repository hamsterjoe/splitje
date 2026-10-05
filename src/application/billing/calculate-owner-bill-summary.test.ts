import {
    describe,
    expect,
    it,
} from "vitest";

import { calculateOwnerBillSummary } from "./calculate-owner-bill-summary";
import type {
    OwnerBill,
    OwnerBillAdjustment,
    OwnerBillItem,
    OwnerBillItemAllocation,
    OwnerBillParticipant,
} from "./get-owner-bill";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const ownerId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

const friendId =
    "7adf5a86-16db-4b58-b71d-40c890ea0924";

let idCounter = 0;

function nextId(): string {
    idCounter += 1;

    return `00000000-0000-4000-8000-${idCounter
        .toString()
        .padStart(12, "0")}`;
}

function createParticipant(
    id: string,
    displayName: string,
    isOwner: boolean,
    sortOrder: number,
): OwnerBillParticipant {
    return {
        id,
        displayName,
        linkedUserId: null,
        isOwner,
        sortOrder,
        colorToken: null,
        createdAt:
            "2026-07-19T08:00:00.000Z",
        updatedAt:
            "2026-07-19T08:00:00.000Z",
    };
}

function createAllocation(
    participantId: string,
    amountSen: number,
): OwnerBillItemAllocation {
    return {
        id: nextId(),
        participantId,
        allocationType: "entire",
        amountSen,
        quantityShare: null,
        percentageBasisPoints: null,
        remainderSen: 0,
        createdAt:
            "2026-07-19T08:06:00.000Z",
        updatedAt:
            "2026-07-19T08:06:00.000Z",
    };
}

function createItem(
    description: string,
    lineTotalSen: number,
    assignments: Array<
        readonly [participantId: string, amountSen: number]
    >,
): OwnerBillItem {
    const itemId = nextId();

    return {
        id: itemId,
        description,
        quantity: 1,
        unitPriceSen: lineTotalSen,
        manualLineTotalSen: null,
        lineTotalSen,
        allocations: assignments.map(
            ([participantId, amountSen]) =>
                createAllocation(
                    participantId,
                    amountSen,
                ),
        ),
        sortOrder: 0,
        createdAt:
            "2026-07-19T08:05:00.000Z",
        updatedAt:
            "2026-07-19T08:05:00.000Z",
    };
}

function createAdjustment(
    type: OwnerBillAdjustment["type"],
    amountSen: number,
): OwnerBillAdjustment {
    return {
        id: nextId(),
        type,
        label: type,
        amountSen,
        calculationMethod:
            type === "rounding"
                ? "fixed"
                : "rate",
        rateBasisPoints: null,
        roundingMode: null,
        calculationBaseMode: null,
        amountSource: "calculated",
        appliesToAllItems: true,
        applicableItemIds: [],
        sortOrder: 0,
        createdAt:
            "2026-07-19T08:10:00.000Z",
        updatedAt:
            "2026-07-19T08:10:00.000Z",
    };
}

function createBill(
    overrides: Partial<OwnerBill>,
): OwnerBill {
    return {
        id: billId,
        merchantName: "Yoshinari",
        receiptDate: "2026-07-19",
        currency: "MYR",
        printedTotalSen: 0,
        status: "draft",
        rowVersion: 0,
        createdAt:
            "2026-07-19T08:00:00.000Z",
        updatedAt:
            "2026-07-19T08:00:00.000Z",
        finalisedAt: null,
        archivedAt: null,
        participants: [
            createParticipant(
                ownerId,
                "Jeff",
                true,
                0,
            ),
            createParticipant(
                friendId,
                "Aina",
                false,
                1,
            ),
        ],
        items: [],
        adjustments: [],
        ...overrides,
    };
}

function yoshinariBill(): OwnerBill {
    return createBill({
        printedTotalSen: 19_950,
        items: [
            createItem(
                "Today’s Omakase set",
                7_600,
                [[ownerId, 7_600]],
            ),
            createItem(
                "Mentai Onigiri",
                1_200,
                [[friendId, 1_200]],
            ),
            createItem(
                "Wagyu Roast Beef Don",
                3_200,
                [[friendId, 3_200]],
            ),
            createItem(
                "Houji-cha",
                400,
                [[ownerId, 400]],
            ),
            createItem(
                "Curry Udon",
                2_400,
                [[friendId, 2_400]],
            ),
            createItem(
                "Nabeyaki Kitsune Udon",
                2_400,
                [[friendId, 2_400]],
            ),
        ],
        adjustments: [
            createAdjustment(
                "service_charge",
                1_720,
            ),
            createAdjustment("tax", 1_032),
            createAdjustment(
                "rounding",
                -2,
            ),
        ],
    });
}

describe("calculateOwnerBillSummary", () => {
    it("splits the Yoshinari receipt and is ready to finalise", () => {
        const result =
            calculateOwnerBillSummary(
                yoshinariBill(),
            );

        expect(
            result.receipt.isReconciled,
        ).toBe(true);

        const summaryByParticipant =
            new Map(
                result.participantResult.participantSummaries.map(
                    (summary) => [
                        summary.participantId,
                        summary,
                    ],
                ),
            );

        const ownerSummary =
            summaryByParticipant.get(
                ownerId,
            );
        const friendSummary =
            summaryByParticipant.get(
                friendId,
            );

        expect(
            ownerSummary,
        ).toMatchObject({
            itemSubtotalSen: 8_000,
            adjustments: {
                serviceChargeSen: 800,
                taxSen: 480,
            },
        });

        expect(
            friendSummary,
        ).toMatchObject({
            itemSubtotalSen: 9_200,
            adjustments: {
                serviceChargeSen: 920,
                taxSen: 552,
            },
        });

        const roundingTotal =
            (ownerSummary?.adjustments
                .roundingSen ?? 0) +
            (friendSummary?.adjustments
                .roundingSen ?? 0);

        expect(roundingTotal).toBe(-2);
        expect(
            ownerSummary?.adjustments
                .roundingSen,
        ).toBeLessThanOrEqual(0);
        expect(
            friendSummary?.adjustments
                .roundingSen,
        ).toBeLessThanOrEqual(0);

        expect(
            result.participantResult
                .finalAllocatedTotalSen,
        ).toBe(19_950);

        expect(
            result.financialState
                .canFinalise,
        ).toBe(true);
        expect(
            result.financialState
                .blockingReasons,
        ).toEqual([]);
    });

    it("blocks finalisation when items are only partially assigned", () => {
        const bill = yoshinariBill();

        bill.items = bill.items.map(
            (item) =>
                item.description ===
                "Today’s Omakase set"
                    ? item
                    : {
                          ...item,
                          allocations: [],
                      },
        );

        const result =
            calculateOwnerBillSummary(bill);

        expect(
            result.financialState
                .canFinalise,
        ).toBe(false);
        expect(
            result.financialState
                .blockingReasons,
        ).toContain(
            "items_not_fully_assigned",
        );
        expect(
            result.financialState
                .blockingReasons,
        ).toContain(
            "assignment_total_mismatch",
        );
        expect(
            result.financialState
                .itemUnassignedSen,
        ).toBe(9_600);

        const summaryByParticipant =
            new Map(
                result.participantResult.participantSummaries.map(
                    (summary) => [
                        summary.participantId,
                        summary,
                    ],
                ),
            );

        // The only assigned base belongs to the owner, so every
        // adjustment lands on them proportionally.
        expect(
            summaryByParticipant.get(ownerId)
                ?.finalAmountSen,
        ).toBe(7_600 + 1_720 + 1_032 - 2);
        expect(
            summaryByParticipant.get(
                friendId,
            )?.finalAmountSen,
        ).toBe(0);
    });

    it("leaves adjustments unallocated when nothing is assigned", () => {
        const bill = createBill({
            printedTotalSen: 9_320,
            items: [
                createItem(
                    "Nasi Lemak",
                    7_600,
                    [],
                ),
            ],
            adjustments: [
                createAdjustment(
                    "service_charge",
                    1_720,
                ),
            ],
        });

        const result =
            calculateOwnerBillSummary(bill);

        expect(
            result.financialState
                .canFinalise,
        ).toBe(false);
        expect(
            result.financialState
                .blockingReasons,
        ).toContain(
            "items_not_fully_assigned",
        );
        expect(
            result.financialState
                .blockingReasons,
        ).toContain(
            "adjustments_not_fully_assigned",
        );
        expect(
            result.financialState
                .itemUnassignedSen,
        ).toBe(7_600);
        expect(
            result.financialState
                .adjustmentUnassignedSen,
        ).toBe(1_720);
    });

    it("reports only the no-items blocker for an empty bill", () => {
        const result =
            calculateOwnerBillSummary(
                createBill({}),
            );

        expect(
            result.financialState
                .blockingReasons,
        ).toEqual(["no_items"]);
        expect(
            result.financialState
                .canFinalise,
        ).toBe(false);
    });
});
