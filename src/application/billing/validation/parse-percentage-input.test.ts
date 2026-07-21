import {
    describe,
    expect,
    it,
} from "vitest";

import { parsePercentageInput } from "./parse-percentage-input";

describe("parsePercentageInput", () => {
    it.each([
        ["0", 0],
        ["0.01", 1],
        ["1", 100],
        ["6", 600],
        ["6.5", 650],
        ["6.50", 650],
        ["6.25", 625],
        ["10", 1_000],
        ["100", 10_000],
        ["100.00", 10_000],
        ["  6.25  ", 625],
        ["6.", 600],
    ])(
        "parses %s as %i basis points",
        (input, expectedBasisPoints) => {
            expect(
                parsePercentageInput(input),
            ).toEqual({
                success: true,
                basisPoints:
                    expectedBasisPoints,
            });
        },
    );

    it.each([
        "",
        " ",
        "six",
        "6%",
        "-6",
        "+6",
        ".5",
        "6.123",
        "1,000",
        Number.NaN,
        null,
        undefined,
        {},
    ])(
        "rejects invalid input: %s",
        (input) => {
            expect(
                parsePercentageInput(input),
            ).toMatchObject({
                success: false,
            });
        },
    );

    it.each([
        "100.01",
        "101",
        "999999999999999999999",
    ])(
        "rejects an out-of-range percentage: %s",
        (input) => {
            expect(
                parsePercentageInput(input),
            ).toEqual({
                success: false,
                message:
                    "Enter a percentage from 0 to 100.",
            });
        },
    );

    it("does not use binary floating-point conversion", () => {
        expect(
            parsePercentageInput("6.29"),
        ).toEqual({
            success: true,
            basisPoints: 629,
        });
    });
});