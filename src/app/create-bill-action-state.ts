export type CreateBillField =
  | "ownerDisplayName"
  | "merchantName";

export interface CreateBillActionState {
  message: string | null;
  fieldErrors: Partial<
    Record<CreateBillField, string>
  >;
}

export const initialCreateBillActionState: CreateBillActionState =
  {
    message: null,
    fieldErrors: {},
  };