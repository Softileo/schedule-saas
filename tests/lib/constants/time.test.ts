/**
 * Time Constants Tests
 *
 * Testy dla stałych czasowych.
 */

import { describe, it, expect } from "vitest";
import {
    DEFAULT_SHIFT_TIME,
    DEFAULT_OPENING_HOURS,
    DEFAULT_WEEKEND_HOURS,
    DEFAULT_WEEKLY_OPENING_HOURS,
    createDayHours,
    MS_PER_DAY,
    MS_PER_HOUR,
    MS_PER_MINUTE,
} from "@/lib/constants/time";

describe("constants/time", () => {
    // =========================================================================
    // DEFAULT_SHIFT_TIME
    // =========================================================================
    describe("DEFAULT_SHIFT_TIME", () => {
        it("should have START at 08:00", () => {
            expect(DEFAULT_SHIFT_TIME.START).toBe("08:00");
        });

        it("should have END at 16:00", () => {
            expect(DEFAULT_SHIFT_TIME.END).toBe("16:00");
        });

        it("should represent 8-hour workday", () => {
            const start = parseInt(DEFAULT_SHIFT_TIME.START.split(":")[0]);
            const end = parseInt(DEFAULT_SHIFT_TIME.END.split(":")[0]);
            expect(end - start).toBe(8);
        });
    });

    // =========================================================================
    // DEFAULT_OPENING_HOURS
    // =========================================================================
    describe("DEFAULT_OPENING_HOURS", () => {
        it("should have OPEN at 09:00", () => {
            expect(DEFAULT_OPENING_HOURS.OPEN).toBe("09:00");
        });

        it("should have CLOSE at 21:00", () => {
            expect(DEFAULT_OPENING_HOURS.CLOSE).toBe("21:00");
        });

        it("should represent 12-hour business day", () => {
            const open = parseInt(DEFAULT_OPENING_HOURS.OPEN.split(":")[0]);
            const close = parseInt(DEFAULT_OPENING_HOURS.CLOSE.split(":")[0]);
            expect(close - open).toBe(12);
        });
    });

    // =========================================================================
    // DEFAULT_WEEKEND_HOURS
    // =========================================================================
    describe("DEFAULT_WEEKEND_HOURS", () => {
        it("should have OPEN at 10:00", () => {
            expect(DEFAULT_WEEKEND_HOURS.OPEN).toBe("10:00");
        });

        it("should have CLOSE at 18:00", () => {
            expect(DEFAULT_WEEKEND_HOURS.CLOSE).toBe("18:00");
        });

        it("should be shorter than weekday hours", () => {
            const weekendOpen = parseInt(
                DEFAULT_WEEKEND_HOURS.OPEN.split(":")[0]
            );
            const weekendClose = parseInt(
                DEFAULT_WEEKEND_HOURS.CLOSE.split(":")[0]
            );
            const weekdayOpen = parseInt(
                DEFAULT_OPENING_HOURS.OPEN.split(":")[0]
            );
            const weekdayClose = parseInt(
                DEFAULT_OPENING_HOURS.CLOSE.split(":")[0]
            );

            const weekendDuration = weekendClose - weekendOpen;
            const weekdayDuration = weekdayClose - weekdayOpen;

            expect(weekendDuration).toBeLessThan(weekdayDuration);
        });
    });

    // =========================================================================
    // DEFAULT_WEEKLY_OPENING_HOURS
    // =========================================================================
    describe("DEFAULT_WEEKLY_OPENING_HOURS", () => {
        it("should have all 7 days defined", () => {
            expect(DEFAULT_WEEKLY_OPENING_HOURS).toHaveProperty("monday");
            expect(DEFAULT_WEEKLY_OPENING_HOURS).toHaveProperty("tuesday");
            expect(DEFAULT_WEEKLY_OPENING_HOURS).toHaveProperty("wednesday");
            expect(DEFAULT_WEEKLY_OPENING_HOURS).toHaveProperty("thursday");
            expect(DEFAULT_WEEKLY_OPENING_HOURS).toHaveProperty("friday");
            expect(DEFAULT_WEEKLY_OPENING_HOURS).toHaveProperty("saturday");
            expect(DEFAULT_WEEKLY_OPENING_HOURS).toHaveProperty("sunday");
        });

        it("should have weekdays enabled", () => {
            expect(DEFAULT_WEEKLY_OPENING_HOURS.monday.enabled).toBe(true);
            expect(DEFAULT_WEEKLY_OPENING_HOURS.tuesday.enabled).toBe(true);
            expect(DEFAULT_WEEKLY_OPENING_HOURS.wednesday.enabled).toBe(true);
            expect(DEFAULT_WEEKLY_OPENING_HOURS.thursday.enabled).toBe(true);
            expect(DEFAULT_WEEKLY_OPENING_HOURS.friday.enabled).toBe(true);
        });

        it("should have saturday enabled", () => {
            expect(DEFAULT_WEEKLY_OPENING_HOURS.saturday.enabled).toBe(true);
        });

        it("should have sunday disabled", () => {
            expect(DEFAULT_WEEKLY_OPENING_HOURS.sunday.enabled).toBe(false);
        });

        it("should use default opening hours for weekdays", () => {
            expect(DEFAULT_WEEKLY_OPENING_HOURS.monday.open).toBe(
                DEFAULT_OPENING_HOURS.OPEN
            );
            expect(DEFAULT_WEEKLY_OPENING_HOURS.monday.close).toBe(
                DEFAULT_OPENING_HOURS.CLOSE
            );
        });

        it("should use weekend hours for sunday", () => {
            expect(DEFAULT_WEEKLY_OPENING_HOURS.sunday.open).toBe(
                DEFAULT_WEEKEND_HOURS.OPEN
            );
            expect(DEFAULT_WEEKLY_OPENING_HOURS.sunday.close).toBe(
                DEFAULT_WEEKEND_HOURS.CLOSE
            );
        });
    });

    // =========================================================================
    // createDayHours
    // =========================================================================
    describe("createDayHours", () => {
        it("should create day hours with enabled=true", () => {
            const hours = createDayHours(true);
            expect(hours.enabled).toBe(true);
        });

        it("should create day hours with enabled=false", () => {
            const hours = createDayHours(false);
            expect(hours.enabled).toBe(false);
        });

        it("should use default opening hours when not specified", () => {
            const hours = createDayHours(true);
            expect(hours.open).toBe(DEFAULT_OPENING_HOURS.OPEN);
            expect(hours.close).toBe(DEFAULT_OPENING_HOURS.CLOSE);
        });

        it("should use custom open time", () => {
            const hours = createDayHours(true, "10:00");
            expect(hours.open).toBe("10:00");
            expect(hours.close).toBe(DEFAULT_OPENING_HOURS.CLOSE);
        });

        it("should use custom open and close times", () => {
            const hours = createDayHours(true, "10:00", "18:00");
            expect(hours.open).toBe("10:00");
            expect(hours.close).toBe("18:00");
        });

        it("should return correct structure", () => {
            const hours = createDayHours(true, "09:00", "21:00");
            expect(hours).toEqual({
                enabled: true,
                open: "09:00",
                close: "21:00",
            });
        });
    });

    // =========================================================================
    // MS_PER_* constants
    // =========================================================================
    describe("time constants in milliseconds", () => {
        it("should have correct MS_PER_MINUTE", () => {
            expect(MS_PER_MINUTE).toBe(60 * 1000);
            expect(MS_PER_MINUTE).toBe(60000);
        });

        it("should have correct MS_PER_HOUR", () => {
            expect(MS_PER_HOUR).toBe(60 * 60 * 1000);
            expect(MS_PER_HOUR).toBe(3600000);
        });

        it("should have correct MS_PER_DAY", () => {
            expect(MS_PER_DAY).toBe(24 * 60 * 60 * 1000);
            expect(MS_PER_DAY).toBe(86400000);
        });

        it("should have correct relationships", () => {
            expect(MS_PER_HOUR).toBe(MS_PER_MINUTE * 60);
            expect(MS_PER_DAY).toBe(MS_PER_HOUR * 24);
        });
    });
});
