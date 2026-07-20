import {
    describe,
    expect,
    it,
} from "vitest";

import { formatRinggitDigitInput } from "./format-ringgit-digit-input";

describe("formatRinggitDigitInput", () => {
    it("shifts typed digits from sen into ringgit", () => {
        let value = "0.00";

        value = formatRinggitDigitInput(
            `${value}1`,
        );
        expect(value).toBe("0.01");

        value = formatRinggitDigitInput(
            `${value}2`,
        );
        expect(value).toBe("0.12");

        value = formatRinggitDigitInput(
            `${value}5`,
        );
        expect(value).toBe("1.25");

        value = formatRinggitDigitInput(
            `${value}0`,
        );
        expect(value).toBe("12.50");
    });

    it("shifts digits right when backspacing", () => {
        let value = "12.50";

        value = formatRinggitDigitInput(
            value.slice(0, -1),
        );
        expect(value).toBe("1.25");

        value = formatRinggitDigitInput(
            value.slice(0, -1),
        );
        expect(value).toBe("0.12");

        value = formatRinggitDigitInput(
            value.slice(0, -1),
        );
        expect(value).toBe("0.01");

        value = formatRinggitDigitInput(
            value.slice(0, -1),
        );
        expect(value).toBe("0.00");
    });

    it.each([
        ["", "0.00"],
        ["0", "0.00"],
        ["1", "0.01"],
        ["12", "0.12"],
        ["125", "1.25"],
        ["1250", "12.50"],
        ["0001250", "12.50"],
    ])(
        "formats %s as %s",
        (input, expected) => {
            expect(
                formatRinggitDigitInput(input),
            ).toBe(expected);
        },
    );

    it("allows pasted formatted currency", () => {
        expect(
            formatRinggitDigitInput(
                "RM 123.45",
            ),
        ).toBe("123.45");
    });

    it("ignores non-numeric characters", () => {
        expect(
            formatRinggitDigitInput(
                "abc1x2y5z0",
            ),
        ).toBe("12.50");
    });
});