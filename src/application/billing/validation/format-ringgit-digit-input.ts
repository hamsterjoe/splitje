export function formatRinggitDigitInput(
    input: string,
): string {
    const extractedDigits =
        input.replace(/\D/g, "");

    /*
     * Retain one zero when the input contains only zeroes,
     * while removing redundant leading zeroes before other
     * digits.
     */
    const normalizedDigits =
        extractedDigits
            .replace(/^0+(?=\d)/, "") ||
        "0";

    /*
     * At least three digits are needed to represent one
     * whole-ringgit digit and two sen digits.
     */
    const paddedDigits =
        normalizedDigits.padStart(3, "0");

    const wholeRinggit =
        paddedDigits.slice(0, -2);

    const sen = paddedDigits.slice(-2);

    return `${wholeRinggit}.${sen}`;
}