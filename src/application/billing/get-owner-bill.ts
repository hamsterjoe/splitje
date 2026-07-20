import { z } from "zod";
import { BillAdjustmentType } from "@/domain/billing/types";

const billIdSchema = z.string().uuid();

export interface OwnerBillParticipant {
  id: string;
  displayName: string;
  linkedUserId: string | null;
  isOwner: boolean;
  sortOrder: number;
  colorToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerBillItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceSen: number;
  manualLineTotalSen: number | null;
  lineTotalSen: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerBillAdjustment {
  id: string;
  type: BillAdjustmentType;
  label: string;
  amountSen: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerBill {
  id: string;
  merchantName: string | null;
  receiptDate: string | null;
  currency: string;
  printedTotalSen: number;
  status: string;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
  finalisedAt: string | null;
  archivedAt: string | null;
  participants: OwnerBillParticipant[];
  items: OwnerBillItem[];
}

export type GetOwnerBillRecordResult =
  | {
    success: true;
    bill: OwnerBill | null;
  }
  | {
    success: false;
  };

export interface GetOwnerBillDependencies {
  getOwnerBillRecord(
    billId: string,
  ): Promise<GetOwnerBillRecordResult>;
}

export type GetOwnerBillResult =
  | {
    success: true;
    bill: OwnerBill;
  }
  | {
    success: false;
    error:
    | {
      type: "not_found";
    }
    | {
      type: "database_error";
      code: "GET_OWNER_BILL_FAILED";
      message: string;
    };
  };

export async function getOwnerBill(
  input: unknown,
  dependencies: GetOwnerBillDependencies,
): Promise<GetOwnerBillResult> {
  const parsedBillId =
    billIdSchema.safeParse(input);

  if (!parsedBillId.success) {
    return {
      success: false,
      error: {
        type: "not_found",
      },
    };
  }

  const recordResult =
    await dependencies.getOwnerBillRecord(
      parsedBillId.data,
    );

  if (!recordResult.success) {
    return {
      success: false,
      error: {
        type: "database_error",
        code: "GET_OWNER_BILL_FAILED",
        message:
          "Unable to load the bill. Please try again.",
      },
    };
  }

  if (recordResult.bill === null) {
    return {
      success: false,
      error: {
        type: "not_found",
      },
    };
  }

  return {
    success: true,
    bill: recordResult.bill,
  };
}