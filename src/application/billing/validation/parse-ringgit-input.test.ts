import {
    describe,
    expect,
    it,
  } from "vitest";
  
  import { parseRinggitInput } from "./parse-ringgit-input";
  
  describe("parseRinggitInput", () => {
    it.each([
      ["12", 1_200],
      ["12.5", 1_250],
      ["12.50", 1_250],
      ["0.05", 5],
      ["0", 0],
      ["12.", 1_200],
      ["  42.90  ", 4_290],
    ])(
      "parses %s as %i sen",
      (input, expectedSen) => {
        expect(
          parseRinggitInput(input),
        ).toEqual({
          success: true,
          amountSen: expectedSen,
        });
      },
    );
  
    it.each([
      "",
      " ",
      ".",
      "-1",
      "12.345",
      "RM 12.50",
      "1,000.00",
      "twelve",
    ])(
      "rejects invalid monetary input: %s",
      (input) => {
        expect(
          parseRinggitInput(input),
        ).toEqual({
          success: false,
          message:
            "Enter an amount with no more than 2 decimal places.",
        });
      },
    );
  
    it("rejects non-string input", () => {
      expect(
        parseRinggitInput(12.5),
      ).toEqual({
        success: false,
        message:
          "Enter an amount with no more than 2 decimal places.",
      });
    });
  
    it("accepts the PostgreSQL integer maximum", () => {
      expect(
        parseRinggitInput(
          "21474836.47",
        ),
      ).toEqual({
        success: true,
        amountSen: 2_147_483_647,
      });
    });
  
    it("rejects values exceeding PostgreSQL integer storage", () => {
      expect(
        parseRinggitInput(
          "21474836.48",
        ),
      ).toEqual({
        success: false,
        message: "Amount is too large.",
      });
    });
  
    it("rejects excessively long input before BigInt conversion", () => {
      expect(
        parseRinggitInput(
          "999999999999999999999",
        ),
      ).toEqual({
        success: false,
        message: "Amount is too large.",
      });
    });
  });