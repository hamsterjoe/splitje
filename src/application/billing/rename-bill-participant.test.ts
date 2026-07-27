import { describe, expect, it, vi } from "vitest";

import {
  renameBillParticipant,
  type RenameBillParticipantDependencies,
} from "./rename-bill-participant";

const billId = "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const participantId = "8b2c046a-26cd-46c1-a476-e4e775839365";

function createDependencies(): RenameBillParticipantDependencies {
  return {
    renameBillParticipantRecord: vi.fn().mockResolvedValue({
      success: true,
      participantId,
    }),
  };
}

describe("renameBillParticipant", () => {
  it("renames a participant with a trimmed name", async () => {
    const dependencies = createDependencies();

    const result = await renameBillParticipant(
      {
        billId,
        participantId,
        displayName: "  Amanda Lee  ",
      },
      dependencies,
    );

    expect(result).toEqual({
      success: true,
      participantId,
    });

    expect(dependencies.renameBillParticipantRecord).toHaveBeenCalledWith({
      billId,
      participantId,
      displayName: "Amanda Lee",
    });
  });

  it("rejects an invalid participant ID", async () => {
    const dependencies = createDependencies();

    const result = await renameBillParticipant(
      {
        billId,
        participantId: "not-a-uuid",
        displayName: "Amanda",
      },
      dependencies,
    );

    expect(result.success).toBe(false);

    if (result.success || result.error.type !== "validation_error") {
      throw new Error("Expected a validation error.");
    }

    expect(result.error.issues).toContainEqual({
      path: "participantId",
      message: "Participant ID must be a valid UUID.",
    });

    expect(dependencies.renameBillParticipantRecord).not.toHaveBeenCalled();
  });

  it("rejects a blank participant name", async () => {
    const dependencies = createDependencies();

    const result = await renameBillParticipant(
      {
        billId,
        participantId,
        displayName: "   ",
      },
      dependencies,
    );

    expect(result.success).toBe(false);

    if (result.success || result.error.type !== "validation_error") {
      throw new Error("Expected a validation error.");
    }

    expect(result.error.issues).toContainEqual({
      path: "displayName",
      message: "Enter a participant name.",
    });

    expect(dependencies.renameBillParticipantRecord).not.toHaveBeenCalled();
  });

  it("rejects a participant name over 100 characters", async () => {
    const dependencies = createDependencies();

    const result = await renameBillParticipant(
      {
        billId,
        participantId,
        displayName: "A".repeat(101),
      },
      dependencies,
    );

    expect(result.success).toBe(false);

    if (result.success || result.error.type !== "validation_error") {
      throw new Error("Expected a validation error.");
    }

    expect(result.error.issues).toContainEqual({
      path: "displayName",
      message: "Participant name cannot exceed 100 characters.",
    });

    expect(dependencies.renameBillParticipantRecord).not.toHaveBeenCalled();
  });

  it("returns a safe persistence error", async () => {
    const dependencies = createDependencies();

    vi.mocked(dependencies.renameBillParticipantRecord).mockResolvedValue({
      success: false,
    });

    const result = await renameBillParticipant(
      {
        billId,
        participantId,
        displayName: "Amanda",
      },
      dependencies,
    );

    expect(result).toEqual({
      success: false,
      error: {
        type: "database_error",
        code: "RENAME_BILL_PARTICIPANT_FAILED",
        message: "Unable to rename this person. Please try again.",
      },
    });
  });
});
