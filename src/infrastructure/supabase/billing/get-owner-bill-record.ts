import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
    GetOwnerBillRecordResult,
    OwnerBillAdjustment,
    OwnerBillAdjustmentAmountSource,
    OwnerBillAdjustmentCalculationMethod,
    OwnerBillItem,
    OwnerBillParticipant,
} from "../../../application/billing/get-owner-bill";
import type { Database } from "../database.types";
import type { AdjustmentCalculationBaseMode, BillAdjustmentType, RateRoundingMode } from "@/domain/billing/types";

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
    ),
bill_adjustments (
  id,
  type,
  label,
  amount_sen,
  calculation_method,
  rate_basis_points,
  rounding_mode,
  calculation_base_mode,
  amount_source,
  applies_to_all_items,
  sort_order,
  created_at,
  updated_at,
  adjustment_applicable_items (
    item_id
  )
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

    const mappedAdjustments =
        data.bill_adjustments.map(
            (
                adjustment,
            ): OwnerBillAdjustment | null => {
                if (
                    !isBillAdjustmentType(
                        adjustment.type,
                    ) ||
                    !isOwnerBillAdjustmentCalculationMethod(
                        adjustment.calculation_method,
                    ) ||
                    !isNullableRateRoundingMode(
                        adjustment.rounding_mode,
                    ) ||
                    !isNullableAdjustmentCalculationBaseMode(
                        adjustment.calculation_base_mode,
                    ) ||
                    !isOwnerBillAdjustmentAmountSource(
                        adjustment.amount_source,
                    )
                ) {
                    return null;
                }

                return {
                    id: adjustment.id,
                    type: adjustment.type,
                    label: adjustment.label,
                    amountSen:
                        adjustment.amount_sen,
                    calculationMethod:
                        adjustment.calculation_method,
                    rateBasisPoints:
                        adjustment.rate_basis_points,
                    roundingMode:
                        adjustment.rounding_mode,
                    calculationBaseMode:
                        adjustment.calculation_base_mode,
                    amountSource:
                        adjustment.amount_source,
                    appliesToAllItems:
                        adjustment.applies_to_all_items,
                    applicableItemIds:
                        adjustment
                            .adjustment_applicable_items
                            .map(
                                (applicableItem) =>
                                    applicableItem.item_id,
                            )
                            .sort((left, right) =>
                                left.localeCompare(right),
                            ),
                    sortOrder:
                        adjustment.sort_order,
                    createdAt:
                        adjustment.created_at,
                    updatedAt:
                        adjustment.updated_at,
                };
            },
        );

    if (
        mappedAdjustments.some(
            (adjustment) =>
                adjustment === null,
        )
    ) {
        return {
            success: false,
        };
    }

    const adjustments =
        mappedAdjustments
            .filter(
                (
                    adjustment,
                ): adjustment is OwnerBillAdjustment =>
                    adjustment !== null,
            )
            .sort(compareAdjustments);

    const hasInvalidAdjustmentType =
        data.bill_adjustments.some(
            (adjustment) =>
                !isBillAdjustmentType(
                    adjustment.type,
                ),
        );

    if (hasInvalidAdjustmentType) {
        return {
            success: false,
        };
    }

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
            adjustments,
        },
    };
}

function compareAdjustments(
    left: OwnerBillAdjustment,
    right: OwnerBillAdjustment,
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

function isOwnerBillAdjustmentCalculationMethod(
    value: string,
): value is OwnerBillAdjustmentCalculationMethod {
    return (
        value === "fixed" ||
        value === "rate"
    );
}

function isNullableRateRoundingMode(
    value: string | null,
): value is RateRoundingMode | null {
    return (
        value === null ||
        value === "down" ||
        value === "half_up" ||
        value === "up"
    );
}

function isNullableAdjustmentCalculationBaseMode(
    value: string | null,
): value is
    | AdjustmentCalculationBaseMode
    | null {
    return (
        value === null ||
        value === "item_subtotal" ||
        value === "running_total"
    );
}

function isOwnerBillAdjustmentAmountSource(
    value: string,
): value is OwnerBillAdjustmentAmountSource {
    return (
        value === "manual" ||
        value === "calculated" ||
        value === "printed" ||
        value === "manual_override"
    );
}

function isBillAdjustmentType(
    value: string,
): value is BillAdjustmentType {
    return (
        value === "discount" ||
        value === "service_charge" ||
        value === "tax" ||
        value === "rounding" ||
        value === "other"
    );
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