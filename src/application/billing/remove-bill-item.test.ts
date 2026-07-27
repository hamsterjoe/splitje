import { describe, expect, it, vi } from "vitest";

import {
  removeBillItem,
  type RemoveBillItemDependencies,
} from "./remove-bill-item";

const billId = "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const itemId = "8b2c046a-26cd-46c1-a476-e4e775839365";

function createDependencies(): RemoveBillItemDependencies {
  return {
    removeBillItemRecord: vi.fn().mockResolvedValue({
      success: true,
      itemId,
    }),
  };
}

describe("removeBillItem", () => {
  it("removes a validated item", async () => {
    const dependencies = createDependencies();

    const result = await removeBillItem(
      {
        billId,
        itemId,
      },
      dependencies,
    );

    expect(result).toEqual({
      success: true,
      itemId,
    });

    expect(dependencies.removeBillItemRecord).toHaveBeenCalledWith({
      billId,
      itemId,
    });
  });

  it("rejects an invalid bill ID", async () => {
    const dependencies = createDependencies();

    const result = await removeBillItem(
      {
        billId: "not-a-uuid",
        itemId,
      },
      dependencies,
    );

    expect(result.success).toBe(false);

    if (result.success || result.error.type !== "validation_error") {
      throw new Error("Expected a validation error.");
    }

    expect(result.error.issues).toContainEqual({
      path: "billId",
      message: "Bill ID must be a valid UUID.",
    });

    expect(dependencies.removeBillItemRecord).not.toHaveBeenCalled();
  });

  it("rejects an invalid item ID", async () => {
    const dependencies = createDependencies();

    const result = await removeBillItem(
      {
        billId,
        itemId: "not-a-uuid",
      },
      dependencies,
    );

    expect(result.success).toBe(false);

    if (result.success || result.error.type !== "validation_error") {
      throw new Error("Expected a validation error.");
    }

    expect(result.error.issues).toContainEqual({
      path: "itemId",
      message: "Item ID must be a valid UUID.",
    });

    expect(dependencies.removeBillItemRecord).not.toHaveBeenCalled();
  });

  it("returns a safe persistence error", async () => {
    const dependencies = createDependencies();

    vi.mocked(dependencies.removeBillItemRecord).mockResolvedValue({
      success: false,
    });

    const result = await removeBillItem(
      {
        billId,
        itemId,
      },
      dependencies,
    );

    expect(result).toEqual({
      success: false,
      error: {
        type: "database_error",
        code: "REMOVE_BILL_ITEM_FAILED",
        message: "Unable to remove this item. Please try again.",
      },
    });
  });
});
