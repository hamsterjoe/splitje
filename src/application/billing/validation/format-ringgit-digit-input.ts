export function formatRinggitDigitInput(
    input: string,
): string {
    const extractedDigits =
        input.replace(/\D/g, "");

    const normalizedDigits =
        extractedDigits
            .replace(/^0+(?=\d)/, "") ||
        "0";

    const paddedDigits =
        normalizedDigits.padStart(3, "0");

    const wholeRinggit =
        paddedDigits.slice(0, -2);

    const sen = paddedDigits.slice(-2);

    return `${wholeRinggit}.${sen}`;
}