import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  GetOwnerBillRecordResult,
  OwnerBillItem,
  OwnerBillParticipant,
} from "../../../application/billing/get-owner-bill";
import type { Database } from "../database.types";

export async function getOwnerBillRecord(
  supabase: SupabaseClient<Database>,
  billId: string,
): Promise<GetOwnerBillRecordResult> {
  const { data, error } = await supabase
    .from("bills")
    .select(`
    id,
    merchant_name,
    receipt_date,
    currency,
    printed_total_sen,
    status,
    row_version,
    created_at,
    updated_at,
    finalised_at,
    archived_at,
    participants (
      id,
      display_name,
      linked_user_id,
      is_owner,
      sort_order,
      color_token,
      created_at,
      updated_at
    ),
    bill_items (
      id,
      description,
      quantity,
      unit_price_sen,
      manual_line_total_sen,
      line_total_sen,
      sort_order,
      created_at,
      updated_at
    )
  `)
    .eq("id", billId)
    .maybeSingle();

  if (error) {
    return {
      success: false,
    };
  }

  if (data === null) {
    return {
      success: true,
      bill: null,
    };
  }

  const participants: OwnerBillParticipant[] =
    data.participants
      .map((participant) => ({
        id: participant.id,
        displayName: participant.display_name,
        linkedUserId: participant.linked_user_id,
        isOwner: participant.is_owner,
        sortOrder: participant.sort_order,
        colorToken: participant.color_token,
        createdAt: participant.created_at,
        updatedAt: participant.updated_at,
      }))
      .sort(compareParticipants);

  const items: OwnerBillItem[] =
    data.bill_items
      .map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPriceSen: item.unit_price_sen,
        manualLineTotalSen:
          item.manual_line_total_sen,
        lineTotalSen: item.line_total_sen,
        sortOrder: item.sort_order,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }))
      .sort(compareItems);

  return {
    success: true,
    bill: {
      id: data.id,
      merchantName: data.merchant_name,
      receiptDate: data.receipt_date,
      currency: data.currency,
      printedTotalSen: data.printed_total_sen,
      status: data.status,
      rowVersion: data.row_version,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      finalisedAt: data.finalised_at,
      archivedAt: data.archived_at,
      participants,
      items,
    },
  };
}

function compareParticipants(
  left: OwnerBillParticipant,
  right: OwnerBillParticipant,
): number {
  const sortOrderDifference =
    left.sortOrder - right.sortOrder;

  if (sortOrderDifference !== 0) {
    return sortOrderDifference;
  }

  const creationTimeDifference =
    left.createdAt.localeCompare(right.createdAt);

  if (creationTimeDifference !== 0) {
    return creationTimeDifference;
  }

  return left.id.localeCompare(right.id);
}

function compareItems(
  left: OwnerBillItem,
  right: OwnerBillItem,
): number {
  const sortOrderDifference =
    left.sortOrder - right.sortOrder;

  if (sortOrderDifference !== 0) {
    return sortOrderDifference;
  }

  const creationTimeDifference =
    left.createdAt.localeCompare(
      right.createdAt,
    );

  if (creationTimeDifference !== 0) {
    return creationTimeDifference;
  }

  return left.id.localeCompare(right.id);
}