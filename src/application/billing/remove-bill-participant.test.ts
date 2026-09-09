import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    removeBillParticipant,
    type RemoveBillParticipantDependencies,
} from "./remove-bill-participant";

const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const participantId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";

function createDependencies():
    RemoveBillParticipantDependencies {
    return {
        removeBillParticipantRecord:
            vi
                .fn()
                .mockResolvedValue({
                    success: true,
                    participantId,
                }),
    };
}

describe("removeBillParticipant", () => {
    it("removes a participant", async () => {
        const dependencies =
            createDependencies();

        const result =
            await removeBillParticipant(
                {
                    billId,
                    participantId,
                },
                dependencies,
            );

        expect(result).toEqual({
            success: true,
            participantId,
        });

        expect(
            dependencies
                .removeBillParticipantRecord,
        ).toHaveBeenCalledWith({
            billId,
            participantId,
        });
    });

    it("rejects an invalid bill ID", async () => {
        const dependencies =
            createDependencies();

        const result =
            await removeBillParticipant(
                {
                    billId: "not-a-uuid",
                    participantId,
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
                .removeBillParticipantRecord,
        ).not.toHaveBeenCalled();
    });

    it("rejects an invalid participant ID", async () => {
        const dependencies =
            createDependencies();

        const result =
            await removeBillParticipant(
                {
                    billId,
                    participantId: "not-a-uuid",
                },
                dependencies,
            );

        expect(result).toEqual({
            success: false,
            error: {
                type: "validation_error",
                issues: [
                    {
                        path: "participantId",
                        message:
                            "Participant ID must be a valid UUID.",
                    },
                ],
            },
        });

        expect(
            dependencies
                .removeBillParticipantRecord,
        ).not.toHaveBeenCalled();
    });

    it("returns a safe database error when the record fails", async () => {
        const dependencies =
            createDependencies();

        vi.mocked(
            dependencies
                .removeBillParticipantRecord,
        ).mockResolvedValue({
            success: false,
        });

        const result =
            await removeBillParticipant(
                {
                    billId,
                    participantId,
                },
                dependencies,
            );

        expect(result).toEqual({
            success: false,
            error: {
                type: "database_error",
                code:
                    "REMOVE_BILL_PARTICIPANT_FAILED",
                message:
                    "Unable to remove this person. Please try again.",
            },
        });
    });
});
