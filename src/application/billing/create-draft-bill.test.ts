import {
    describe,
    expect,
    it,
    vi,
  } from "vitest";
  
  import {
    createDraftBill,
    type CreateDraftBillDependencies,
  } from "./create-draft-bill";
  
  function createDependencies(): CreateDraftBillDependencies {
    return {
      ensureOwnerSession: vi
        .fn()
        .mockResolvedValue({
          success: true,
          userId: "anonymous-user",
          createdAnonymousSession: true,
        }),
  
      createDraftBillRecord: vi
        .fn()
        .mockResolvedValue({
          success: true,
          billId: "bill-a",
          ownerParticipantId:
            "participant-owner",
        }),
    };
  }
  
  describe("createDraftBill", () => {
    it("creates a draft bill for an anonymous owner", async () => {
      const dependencies = createDependencies();
  
      const result = await createDraftBill(
        {
          ownerDisplayName: "  Jeff  ",
          merchantName: "  Restaurant A  ",
          printedTotalSen: 10_000,
        },
        dependencies,
      );
  
      expect(result).toEqual({
        success: true,
        billId: "bill-a",
        ownerParticipantId:
          "participant-owner",
        createdAnonymousSession: true,
      });
  
      expect(
        dependencies.createDraftBillRecord,
      ).toHaveBeenCalledWith({
        ownerDisplayName: "Jeff",
        merchantName: "Restaurant A",
        printedTotalSen: 10_000,
      });
    });
  
    it("converts a blank merchant name to null", async () => {
      const dependencies = createDependencies();
  
      await createDraftBill(
        {
          ownerDisplayName: "Jeff",
          merchantName: "   ",
          printedTotalSen: 0,
        },
        dependencies,
      );
  
      expect(
        dependencies.createDraftBillRecord,
      ).toHaveBeenCalledWith({
        ownerDisplayName: "Jeff",
        merchantName: null,
        printedTotalSen: 0,
      });
    });
  
    it("returns validation errors before creating a session", async () => {
      const dependencies = createDependencies();
  
      const result = await createDraftBill(
        {
          ownerDisplayName: "",
          merchantName: null,
          printedTotalSen: 10.5,
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
  
      expect(result.error.issues.length).toBeGreaterThan(
        0,
      );
  
      expect(
        dependencies.ensureOwnerSession,
      ).not.toHaveBeenCalled();
  
      expect(
        dependencies.createDraftBillRecord,
      ).not.toHaveBeenCalled();
    });
  
    it("stops when the owner session cannot be created", async () => {
      const dependencies = createDependencies();
  
      vi.mocked(
        dependencies.ensureOwnerSession,
      ).mockResolvedValue({
        success: false,
        error: {
          code: "ANONYMOUS_SIGN_IN_FAILED",
          message:
            "Unable to start an anonymous owner session.",
        },
      });
  
      const result = await createDraftBill(
        {
          ownerDisplayName: "Jeff",
          merchantName: null,
          printedTotalSen: 0,
        },
        dependencies,
      );
  
      expect(result).toEqual({
        success: false,
        error: {
          type: "authentication_error",
          code: "ANONYMOUS_SIGN_IN_FAILED",
          message:
            "Unable to start an anonymous owner session.",
        },
      });
  
      expect(
        dependencies.createDraftBillRecord,
      ).not.toHaveBeenCalled();
    });
  
    it("returns a safe database error", async () => {
      const dependencies = createDependencies();
  
      vi.mocked(
        dependencies.createDraftBillRecord,
      ).mockResolvedValue({
        success: false,
      });
  
      const result = await createDraftBill(
        {
          ownerDisplayName: "Jeff",
          merchantName: null,
          printedTotalSen: 0,
        },
        dependencies,
      );
  
      expect(result).toEqual({
        success: false,
        error: {
          type: "database_error",
          code: "CREATE_DRAFT_BILL_FAILED",
          message:
            "Unable to create the bill. Please try again.",
        },
      });
    });
  
    it("reports when an existing session was reused", async () => {
      const dependencies = createDependencies();
  
      vi.mocked(
        dependencies.ensureOwnerSession,
      ).mockResolvedValue({
        success: true,
        userId: "existing-user",
        createdAnonymousSession: false,
      });
  
      const result = await createDraftBill(
        {
          ownerDisplayName: "Jeff",
          merchantName: null,
          printedTotalSen: 0,
        },
        dependencies,
      );
  
      expect(result.success).toBe(true);
  
      if (!result.success) {
        throw new Error(
          "Expected bill creation to succeed.",
        );
      }
  
      expect(
        result.createdAnonymousSession,
      ).toBe(false);
    });
  });