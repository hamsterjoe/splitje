import {
    describe,
    expect,
    it,
    vi,
  } from "vitest";
  
  import {
    getOwnerBill,
    type GetOwnerBillDependencies,
    type OwnerBill,
  } from "./get-owner-bill";
  
  const billId =
    "9a714df0-1303-4fe8-9f9c-f0b7d5136627";
  
  const ownerParticipantId =
    "8b2c046a-26cd-46c1-a476-e4e775839365";
  
  const ownerBill: OwnerBill = {
    id: billId,
    merchantName: "Restaurant A",
    receiptDate: "2026-07-19",
    currency: "MYR",
    printedTotalSen: 12_450,
    status: "draft",
    rowVersion: 0,
    createdAt: "2026-07-19T08:00:00.000Z",
    updatedAt: "2026-07-19T08:00:00.000Z",
    finalisedAt: null,
    archivedAt: null,
    participants: [
      {
        id: ownerParticipantId,
        displayName: "Jeff",
        linkedUserId:
          "7adf5a86-16db-4b58-b71d-40c890ea0924",
        isOwner: true,
        sortOrder: 0,
        colorToken: null,
        createdAt: "2026-07-19T08:00:00.000Z",
        updatedAt: "2026-07-19T08:00:00.000Z",
      },
    ],
  };
  
  function createDependencies(): GetOwnerBillDependencies {
    return {
      getOwnerBillRecord: vi
        .fn()
        .mockResolvedValue({
          success: true,
          bill: ownerBill,
        }),
    };
  }
  
  describe("getOwnerBill", () => {
    it("returns an owner-accessible bill", async () => {
      const dependencies = createDependencies();
  
      const result = await getOwnerBill(
        billId,
        dependencies,
      );
  
      expect(result).toEqual({
        success: true,
        bill: ownerBill,
      });
  
      expect(
        dependencies.getOwnerBillRecord,
      ).toHaveBeenCalledWith(billId);
    });
  
    it("returns not found for an invalid bill ID", async () => {
      const dependencies = createDependencies();
  
      const result = await getOwnerBill(
        "not-a-uuid",
        dependencies,
      );
  
      expect(result).toEqual({
        success: false,
        error: {
          type: "not_found",
        },
      });
  
      expect(
        dependencies.getOwnerBillRecord,
      ).not.toHaveBeenCalled();
    });
  
    it("returns not found when RLS exposes no bill", async () => {
      const dependencies = createDependencies();
  
      vi.mocked(
        dependencies.getOwnerBillRecord,
      ).mockResolvedValue({
        success: true,
        bill: null,
      });
  
      const result = await getOwnerBill(
        billId,
        dependencies,
      );
  
      expect(result).toEqual({
        success: false,
        error: {
          type: "not_found",
        },
      });
    });
  
    it("returns a safe database error", async () => {
      const dependencies = createDependencies();
  
      vi.mocked(
        dependencies.getOwnerBillRecord,
      ).mockResolvedValue({
        success: false,
      });
  
      const result = await getOwnerBill(
        billId,
        dependencies,
      );
  
      expect(result).toEqual({
        success: false,
        error: {
          type: "database_error",
          code: "GET_OWNER_BILL_FAILED",
          message:
            "Unable to load the bill. Please try again.",
        },
      });
    });
  });