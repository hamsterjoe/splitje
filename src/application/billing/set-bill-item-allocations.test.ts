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
    it("assigns an equal split among selected participants", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId,
                    itemId,
                    mode: "equal",
                    shares: [
                        {
                            participantId:
                                firstParticipantId,
                        },
                        {
                            participantId:
                                secondParticipantId,
                        },
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
            mode: "equal",
            shares: [
                {
                    participantId:
                        firstParticipantId,
                    quantityShare: null,
                    percentageBasisPoints:
                        null,
                    amountSen: null,
                },
                {
                    participantId:
                        secondParticipantId,
                    quantityShare: null,
                    percentageBasisPoints:
                        null,
                    amountSen: null,
                },
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
                mode: "equal",
                shares: [
                    {
                        participantId:
                            firstParticipantId,
                    },
                    {
                        participantId:
                            firstParticipantId,
                    },
                    {
                        participantId:
                            secondParticipantId,
                    },
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
            mode: "equal",
            shares: [
                {
                    participantId:
                        firstParticipantId,
                    quantityShare: null,
                    percentageBasisPoints:
                        null,
                    amountSen: null,
                },
                {
                    participantId:
                        secondParticipantId,
                    quantityShare: null,
                    percentageBasisPoints:
                        null,
                    amountSen: null,
                },
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
                    mode: "equal",
                    shares: [],
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
            mode: "equal",
            shares: [],
        });
    });

    it("parses quantity shares as whole numbers", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId,
                    itemId,
                    mode: "quantity",
                    shares: [
                        {
                            participantId:
                                firstParticipantId,
                            value: "2",
                        },
                        {
                            participantId:
                                secondParticipantId,
                            value: "1",
                        },
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
            mode: "quantity",
            shares: [
                {
                    participantId:
                        firstParticipantId,
                    quantityShare: 2,
                    percentageBasisPoints:
                        null,
                    amountSen: null,
                },
                {
                    participantId:
                        secondParticipantId,
                    quantityShare: 1,
                    percentageBasisPoints:
                        null,
                    amountSen: null,
                },
            ],
        });
    });

    it("rejects a non-numeric quantity", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId,
                    itemId,
                    mode: "quantity",
                    shares: [
                        {
                            participantId:
                                firstParticipantId,
                            value: "2",
                        },
                        {
                            participantId:
                                secondParticipantId,
                            value: "abc",
                        },
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
                        path: "shares.1.value",
                        message:
                            "Enter a whole-number quantity greater than zero.",
                    },
                ],
            },
        });

        expect(
            dependencies
                .setBillItemAllocationsRecord,
        ).not.toHaveBeenCalled();
    });

    it("parses percentages into basis points", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId,
                    itemId,
                    mode: "percentage",
                    shares: [
                        {
                            participantId:
                                firstParticipantId,
                            value: "60",
                        },
                        {
                            participantId:
                                secondParticipantId,
                            value: "40",
                        },
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
            mode: "percentage",
            shares: [
                {
                    participantId:
                        firstParticipantId,
                    quantityShare: null,
                    percentageBasisPoints:
                        6_000,
                    amountSen: null,
                },
                {
                    participantId:
                        secondParticipantId,
                    quantityShare: null,
                    percentageBasisPoints:
                        4_000,
                    amountSen: null,
                },
            ],
        });
    });

    it("rejects percentages that do not total 100%", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId,
                    itemId,
                    mode: "percentage",
                    shares: [
                        {
                            participantId:
                                firstParticipantId,
                            value: "60",
                        },
                        {
                            participantId:
                                secondParticipantId,
                            value: "30",
                        },
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
                        path: "shares",
                        message:
                            "Percentages must add up to exactly 100%.",
                    },
                ],
            },
        });

        expect(
            dependencies
                .setBillItemAllocationsRecord,
        ).not.toHaveBeenCalled();
    });

    it("parses custom amounts into sen", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId,
                    itemId,
                    mode: "custom",
                    shares: [
                        {
                            participantId:
                                firstParticipantId,
                            value: "12.50",
                        },
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
            mode: "custom",
            shares: [
                {
                    participantId:
                        firstParticipantId,
                    quantityShare: null,
                    percentageBasisPoints:
                        null,
                    amountSen: 1_250,
                },
            ],
        });
    });

    it("rejects a zero custom amount", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId,
                    itemId,
                    mode: "custom",
                    shares: [
                        {
                            participantId:
                                firstParticipantId,
                            value: "0.00",
                        },
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
                        path: "shares.0.value",
                        message:
                            "Enter an amount greater than zero.",
                    },
                ],
            },
        });

        expect(
            dependencies
                .setBillItemAllocationsRecord,
        ).not.toHaveBeenCalled();
    });

    it("rejects an invalid bill ID", async () => {
        const dependencies =
            createDependencies();

        const result =
            await setBillItemAllocations(
                {
                    billId: "not-a-uuid",
                    itemId,
                    mode: "equal",
                    shares: [
                        {
                            participantId:
                                firstParticipantId,
                        },
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
                    mode: "equal",
                    shares: [
                        {
                            participantId:
                                firstParticipantId,
                        },
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
