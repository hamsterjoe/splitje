export type ParsePercentageInputResult =
    | {
        success: true;
        basisPoints: number;
    }
    | {
        success: false;
        message: string;
    };

const MAX_BASIS_POINTS = 10_000n;

export function parsePercentageInput(
    input: unknown,
): ParsePercentageInputResult {
    if (typeof input !== "string") {
        return {
            success: false,
            message:
                "Enter a valid percentage.",
        };
    }

    const normalizedInput = input.trim();

    if (normalizedInput.length === 0) {
        return {
            success: false,
            message: "Enter a percentage.",
        };
    }

    if (
        !/^\d+(?:\.\d{0,2})?$/.test(
            normalizedInput,
        )
    ) {
        return {
            success: false,
            message:
                "Enter a valid percentage with no more than 2 decimal places.",
        };
    }

    const [
        wholePercentage,
        fractionalPercentage = "",
    ] = normalizedInput.split(".");

    const paddedFraction =
        fractionalPercentage.padEnd(
            2,
            "0",
        );

    const basisPoints =
        BigInt(wholePercentage) * 100n +
        BigInt(paddedFraction || "0");

    if (
        basisPoints >
        MAX_BASIS_POINTS
    ) {
        return {
            success: false,
            message:
                "Enter a percentage from 0 to 100.",
        };
    }

    return {
        success: true,
        basisPoints:
            Number(basisPoints),
    };
}