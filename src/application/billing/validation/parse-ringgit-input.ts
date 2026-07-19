const POSTGRES_INTEGER_MAX =
  2_147_483_647n;

const INVALID_AMOUNT_MESSAGE =
  "Enter an amount with no more than 2 decimal places.";

export type ParseRinggitInputResult =
  | {
      success: true;
      amountSen: number;
    }
  | {
      success: false;
      message: string;
    };

export function parseRinggitInput(
  input: unknown,
): ParseRinggitInputResult {
  if (typeof input !== "string") {
    return {
      success: false,
      message: INVALID_AMOUNT_MESSAGE,
    };
  }

  const normalizedInput = input.trim();

  if (normalizedInput.length > 20) {
    return {
      success: false,
      message: "Amount is too large.",
    };
  }

  const amountMatch =
    /^(\d+)(?:\.(\d{0,2}))?$/.exec(
      normalizedInput,
    );

  if (amountMatch === null) {
    return {
      success: false,
      message: INVALID_AMOUNT_MESSAGE,
    };
  }

  const wholeRinggit = amountMatch[1];
  const fractionalSen =
    amountMatch[2] ?? "";

  const paddedFractionalSen =
    fractionalSen.padEnd(2, "0");

  const amountSen =
    BigInt(wholeRinggit) * 100n +
    BigInt(paddedFractionalSen);

  if (amountSen > POSTGRES_INTEGER_MAX) {
    return {
      success: false,
      message: "Amount is too large.",
    };
  }

  return {
    success: true,
    amountSen: Number(amountSen),
  };
}