import { describe, it, expect } from "vitest";
import { calculateShiftHours } from "@/lib/utils/time-helpers";

describe("time-helpers", () => {
    describe("calculateShiftHours", () => {
        describe("basic calculations", () => {
            it("should calculate hours for standard day shift", () => {
                expect(calculateShiftHours("08:00", "16:00")).toBe(8);
            });

            it("should calculate hours for morning shift", () => {
                expect(calculateShiftHours("06:00", "14:00")).toBe(8);
            });

            it("should calculate hours for afternoon shift", () => {
                expect(calculateShiftHours("14:00", "22:00")).toBe(8);
            });

            it("should calculate hours for short shift", () => {
                expect(calculateShiftHours("09:00", "13:00")).toBe(4);
            });

            it("should handle minutes correctly", () => {
                expect(calculateShiftHours("08:30", "16:30")).toBe(8);
            });

            it("should handle partial hours", () => {
                expect(calculateShiftHours("08:00", "12:30")).toBe(4.5);
            });
        });

        describe("with break deduction", () => {
            it("should deduct 30 minute break", () => {
                expect(calculateShiftHours("08:00", "16:00", 30)).toBe(7.5);
            });

            it("should deduct 60 minute break", () => {
                expect(calculateShiftHours("08:00", "16:00", 60)).toBe(7);
            });

            it("should deduct 15 minute break", () => {
                expect(calculateShiftHours("08:00", "16:00", 15)).toBe(7.75);
            });

            it("should default to 0 break minutes", () => {
                expect(calculateShiftHours("08:00", "16:00")).toBe(8);
            });

            it("should not return negative hours when break exceeds shift", () => {
                expect(calculateShiftHours("08:00", "09:00", 120)).toBe(0);
            });
        });

        describe("overnight shifts (through midnight)", () => {
            it("should handle standard night shift", () => {
                expect(calculateShiftHours("22:00", "06:00")).toBe(8);
            });

            it("should handle night shift with break", () => {
                expect(calculateShiftHours("22:00", "06:00", 30)).toBe(7.5);
            });

            it("should handle late night to early morning", () => {
                expect(calculateShiftHours("23:00", "07:00")).toBe(8);
            });

            it("should handle midnight crossing", () => {
                expect(calculateShiftHours("20:00", "04:00")).toBe(8);
            });
        });

        describe("edge cases", () => {
            it("should handle zero duration shift", () => {
                expect(calculateShiftHours("08:00", "08:00")).toBe(0);
            });

            it("should handle very short shift", () => {
                expect(calculateShiftHours("08:00", "08:30")).toBe(0.5);
            });

            it("should handle full 24 hour shift", () => {
                expect(calculateShiftHours("00:00", "00:00")).toBe(0);
            });

            it("should handle shift starting at midnight", () => {
                expect(calculateShiftHours("00:00", "08:00")).toBe(8);
            });

            it("should handle shift ending at midnight", () => {
                expect(calculateShiftHours("16:00", "00:00")).toBe(8);
            });
        });
    });
});
