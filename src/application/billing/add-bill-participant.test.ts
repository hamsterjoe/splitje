import {
    describe,
    expect,
    it,
    vi,
  } from "vitest";
  
  import {
    addBillParticipant,
    type AddBillParticipantDependencies,
  } from "./add-bill-participant";
  
  const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";
  
  const participantId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";
  
  function createDependencies(): AddBillParticipantDependencies {
    return {
      addBillParticipantRecord: vi
        .fn()
        .mockResolvedValue({
          success: true,
          participantId,
        }),
    };
  }
  
  describe("addBillParticipant", () => {
    it("adds a trimmed placeholder participant", async () => {
      const dependencies = createDependencies();
  
      const result = await addBillParticipant(
        {
          billId,
          displayName: "  Amanda  ",
        },
        dependencies,
      );
  
      expect(result).toEqual({
        success: true,
        participantId,
      });
  
      expect(
        dependencies.addBillParticipantRecord,
      ).toHaveBeenCalledWith({
        billId,
        displayName: "Amanda",
      });
    });
  
    it("rejects an invalid bill ID before persistence", async () => {
      const dependencies = createDependencies();
  
      const result = await addBillParticipant(
        {
          billId: "not-a-uuid",
          displayName: "Amanda",
        },
        dependencies,
      );
  
      expect(result.success).toBe(false);
  
      if (
        result.success ||
        result.error.type !== "validation_error"
      ) {
        throw new Error(
          "Expected a validation error.",
        );
      }
  
      expect(result.error.issues).toContainEqual({
        path: "billId",
        message: "Bill ID must be a valid UUID.",
      });
  
      expect(
        dependencies.addBillParticipantRecord,
      ).not.toHaveBeenCalled();
    });
  
    it("rejects a blank participant name", async () => {
      const dependencies = createDependencies();
  
      const result = await addBillParticipant(
        {
          billId,
          displayName: "   ",
        },
        dependencies,
      );
  
      expect(result.success).toBe(false);
  
      if (
        result.success ||
        result.error.type !== "validation_error"
      ) {
        throw new Error(
          "Expected a validation error.",
        );
      }
  
      expect(result.error.issues).toContainEqual({
        path: "displayName",
        message: "Enter a participant name.",
      });
  
      expect(
        dependencies.addBillParticipantRecord,
      ).not.toHaveBeenCalled();
    });
  
    it("returns a safe persistence error", async () => {
      const dependencies = createDependencies();
  
      vi.mocked(
        dependencies.addBillParticipantRecord,
      ).mockResolvedValue({
        success: false,
      });
  
      const result = await addBillParticipant(
        {
          billId,
          displayName: "Amanda",
        },
        dependencies,
      );
  
      expect(result).toEqual({
        success: false,
        error: {
          type: "database_error",
          code: "ADD_BILL_PARTICIPANT_FAILED",
          message:
            "Unable to add this person. Please try again.",
        },
      });
    });
  });