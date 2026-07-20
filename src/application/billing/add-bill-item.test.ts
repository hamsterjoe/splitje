import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  addBillItem,
  type AddBillItemDependencies,
} from "./add-bill-item";

const billId =
  "9a714df0-1303-4fe8-9f9c-f0b7d5136627";

const itemId =
  "8b2c046a-26cd-46c1-a476-e4e775839365";

function createDependencies(): AddBillItemDependencies {
  return {
    addBillItemRecord: vi
      .fn()
      .mockResolvedValue({
        success: true,
        itemId,
      }),
  };
}

describe("addBillItem", () => {
  it("validates and calculates a manual item", async () => {
    const dependencies = createDependencies();

    const result = await addBillItem(
      {
        billId,
        description: "  Nasi Lemak  ",
        quantity: "3",
        unitPrice: "12.50",
      },
      dependencies,
    );

    expect(result).toEqual({
      success: true,
      itemId,
    });

    expect(
      dependencies.addBillItemRecord,
    ).toHaveBeenCalledWith({
      billId,
      description: "Nasi Lemak",
      quantity: 3,
      unitPriceSen: 1_250,
      lineTotalSen: 3_750,
    });
  });

  it("allows a zero-sen item", async () => {
    const dependencies = createDependencies();

    await addBillItem(
      {
        billId,
        description: "Complimentary water",
        quantity: "2",
        unitPrice: "0",
      },
      dependencies,
    );

    expect(
      dependencies.addBillItemRecord,
    ).toHaveBeenCalledWith({
      billId,
      description: "Complimentary water",
      quantity: 2,
      unitPriceSen: 0,
      lineTotalSen: 0,
    });
  });

  it("rejects a blank description", async () => {
    const dependencies = createDependencies();

    const result = await addBillItem(
      {
        billId,
        description: "   ",
        quantity: "1",
        unitPrice: "10.00",
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
      path: "description",
      message: "Enter an item description.",
    });

    expect(
      dependencies.addBillItemRecord,
    ).not.toHaveBeenCalled();
  });

  it.each([
    "0",
    "-1",
    "1.5",
    "quantity",
  ])(
    "rejects invalid quantity: %s",
    async (quantity) => {
      const dependencies =
        createDependencies();

      const result = await addBillItem(
        {
          billId,
          description: "Nasi Lemak",
          quantity,
          unitPrice: "10.00",
        },
        dependencies,
      );

      expect(result.success).toBe(false);

      if (
        result.success ||
        result.error.type !==
        "validation_error"
      ) {
        throw new Error(
          "Expected a validation error.",
        );
      }

      expect(
        result.error.issues,
      ).toContainEqual({
        path: "quantity",
        message:
          "Quantity must be a positive whole number.",
      });

      expect(
        dependencies.addBillItemRecord,
      ).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid ringgit input", async () => {
    const dependencies = createDependencies();

    const result = await addBillItem(
      {
        billId,
        description: "Nasi Lemak",
        quantity: "1",
        unitPrice: "12.345",
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
      path: "unitPrice",
      message:
        "Enter an amount with no more than 2 decimal places.",
    });

    expect(
      dependencies.addBillItemRecord,
    ).not.toHaveBeenCalled();
  });

  it("rejects a line total outside PostgreSQL integer storage", async () => {
    const dependencies = createDependencies();

    const result = await addBillItem(
      {
        billId,
        description: "Large item",
        quantity: "2",
        unitPrice: "21474836.47",
      },
      dependencies,
    );

    expect(result).toEqual({
      success: false,
      error: {
        type: "validation_error",
        issues: [
          {
            path: "unitPrice",
            message: "Line total is too large.",
          },
        ],
      },
    });

    expect(
      dependencies.addBillItemRecord,
    ).not.toHaveBeenCalled();
  });

  it("returns a safe persistence error", async () => {
    const dependencies = createDependencies();

    vi.mocked(
      dependencies.addBillItemRecord,
    ).mockResolvedValue({
      success: false,
    });

    const result = await addBillItem(
      {
        billId,
        description: "Nasi Lemak",
        quantity: "1",
        unitPrice: "12.50",
      },
      dependencies,
    );

    expect(result).toEqual({
      success: false,
      error: {
        type: "database_error",
        code: "ADD_BILL_ITEM_FAILED",
        message:
          "Unable to add this item. Please try again.",
      },
    });
  });
});