import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    setBillItemAllocations,
    type SetBillItemAllocationsDependencies,
} from "./set-bill-item-allocations";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const itemId =
    "61aab4ba-1d80-41df-a157-a2daf831df6a";

const firstParticipantId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

const secondParticipantId =
    "7adf5a86-16db-4b58-b71d-40c890ea0924";

function createDependencies():
    SetBillItemAllocationsDependencies {
    return {
        setBillItemAllocationsRecord:
            vi
                .fn()
                .mockResolvedValue({
                    success: true,
                    itemId,
                }),
    };
}

describe("setBillItemAllocations", () => {
    it("assigns an item to the selected participants", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId,
                    itemId,
                    participantIds: [
                        firstParticipantId,
                        secondParticipantId,
                    ],
                },
                dependencies,
            );

        expect(result).toEqual({
            success: true,
            itemId,
        });

        expect(
            dependencies
                .setBillItemAllocationsRecord,
        ).toHaveBeenCalledWith({
            billId,
            itemId,
            participantIds: [
                firstParticipantId,
                secondParticipantId,
            ],
        });
    });

    it("deduplicates participant IDs", async () => {
        const dependencies =
            createDependencies();

        await setBillItemAllocations(
            {
                billId,
                itemId,
                participantIds: [
                    firstParticipantId,
                    firstParticipantId,
                    secondParticipantId,
                ],
            },
            dependencies,
        );

        expect(
            dependencies
                .setBillItemAllocationsRecord,
        ).toHaveBeenCalledWith({
            billId,
            itemId,
            participantIds: [
                firstParticipantId,
                secondParticipantId,
            ],
        });
    });

    it("clears an assignment when no participants are selected", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId,
                    itemId,
                    participantIds: [],
                },
                dependencies,
            );

        expect(result).toEqual({
            success: true,
            itemId,
        });

        expect(
            dependencies
                .setBillItemAllocationsRecord,
        ).toHaveBeenCalledWith({
            billId,
            itemId,
            participantIds: [],
        });
    });

    it("rejects an invalid bill ID", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId: "not-a-uuid",
                    itemId,
                    participantIds: [
                        firstParticipantId,
                    ],
                },
                dependencies,
            );

        expect(result).toEqual({
            success: false,
            error: {
                type: "validation_error",
                issues: [
                    {
                        path: "billId",
                        message:
                            "Bill ID must be a valid UUID.",
                    },
                ],
            },
        });

        expect(
            dependencies
                .setBillItemAllocationsRecord,
        ).not.toHaveBeenCalled();
    });

    it("rejects an invalid participant ID", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId,
                    itemId,
                    participantIds: [
                        firstParticipantId,
                        "not-a-uuid",
                    ],
                },
                dependencies,
            );

        expect(result).toEqual({
            success: false,
            error: {
                type: "validation_error",
                issues: [
                    {
                        path: "participantIds.1",
                        message:
                            "Participant IDs must be valid UUIDs.",
                    },
                ],
            },
        });

        expect(
            dependencies
                .setBillItemAllocationsRecord,
        ).not.toHaveBeenCalled();
    });

    it("returns a safe database error when the record fails", async () => {
        const dependencies =
            createDependencies();

        vi.mocked(
            dependencies
                .setBillItemAllocationsRecord,
        ).mockResolvedValue({
            success: false,
        });

        const result =
            await setBillItemAllocations(
                {
                    billId,
                    itemId,
                    participantIds: [
                        firstParticipantId,
                    ],
                },
                dependencies,
            );

        expect(result).toEqual({
            success: false,
            error: {
                type: "database_error",
                code:
                    "SET_BILL_ITEM_ALLOCATIONS_FAILED",
                message:
                    "Unable to update this assignment. Please try again.",
            },
        });
    });
});
