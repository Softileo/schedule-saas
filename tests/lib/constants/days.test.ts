/**
 * Days Constants Tests
 *
 * Testy dla stałych dni tygodnia.
 */

import { describe, it, expect } from "vitest";
import {
    DAY_KEYS,
    DAY_KEY_MAP,
    DAY_NAMES_SHORT,
    DAY_NAMES_FULL,
    DAY_NAMES_FULL_SUNDAY_FIRST,
    DAYS_OF_WEEK,
    DAY_NAMES_MAP,
    DAY_NAMES_FULL_MAP,
    dayIndexToKey,
    dayKeyToIndex,
} from "@/lib/constants/days";

describe("constants/days", () => {
    // =========================================================================
    // DAY_KEYS
    // =========================================================================
    describe("DAY_KEYS", () => {
        it("should have 7 days", () => {
            expect(DAY_KEYS.length).toBe(7);
        });

        it("should start with sunday (index 0 = Date.getDay())", () => {
            expect(DAY_KEYS[0]).toBe("sunday");
        });

        it("should have monday at index 1", () => {
            expect(DAY_KEYS[1]).toBe("monday");
        });

        it("should end with saturday", () => {
            expect(DAY_KEYS[6]).toBe("saturday");
        });

        it("should contain all weekday names", () => {
            expect(DAY_KEYS).toContain("monday");
            expect(DAY_KEYS).toContain("tuesday");
            expect(DAY_KEYS).toContain("wednesday");
            expect(DAY_KEYS).toContain("thursday");
            expect(DAY_KEYS).toContain("friday");
            expect(DAY_KEYS).toContain("saturday");
            expect(DAY_KEYS).toContain("sunday");
        });
    });

    // =========================================================================
    // DAY_KEY_MAP
    // =========================================================================
    describe("DAY_KEY_MAP", () => {
        it("should map 0 to sunday", () => {
            expect(DAY_KEY_MAP[0]).toBe("sunday");
        });

        it("should map 1 to monday", () => {
            expect(DAY_KEY_MAP[1]).toBe("monday");
        });

        it("should map 6 to saturday", () => {
            expect(DAY_KEY_MAP[6]).toBe("saturday");
        });

        it("should be consistent with DAY_KEYS", () => {
            for (let i = 0; i <= 6; i++) {
                expect(DAY_KEY_MAP[i]).toBe(DAY_KEYS[i]);
            }
        });
    });

    // =========================================================================
    // DAY_NAMES_SHORT
    // =========================================================================
    describe("DAY_NAMES_SHORT", () => {
        it("should have 7 entries", () => {
            expect(DAY_NAMES_SHORT.length).toBe(7);
        });

        it("should start with Nd (niedziela - index 0)", () => {
            expect(DAY_NAMES_SHORT[0]).toBe("Nd");
        });

        it("should have Pn at index 1 (poniedziałek)", () => {
            expect(DAY_NAMES_SHORT[1]).toBe("Pn");
        });

        it("should end with Sb (sobota)", () => {
            expect(DAY_NAMES_SHORT[6]).toBe("Sb");
        });

        it("should be in Polish", () => {
            expect(DAY_NAMES_SHORT).toContain("Śr"); // Środa
            expect(DAY_NAMES_SHORT).toContain("Cz"); // Czwartek
        });
    });

    // =========================================================================
    // DAY_NAMES_FULL
    // =========================================================================
    describe("DAY_NAMES_FULL", () => {
        it("should have 7 entries", () => {
            expect(DAY_NAMES_FULL.length).toBe(7);
        });

        it("should start with Poniedziałek (Polish week starts Monday)", () => {
            expect(DAY_NAMES_FULL[0]).toBe("Poniedziałek");
        });

        it("should end with Niedziela", () => {
            expect(DAY_NAMES_FULL[6]).toBe("Niedziela");
        });

        it("should contain all Polish day names", () => {
            expect(DAY_NAMES_FULL).toContain("Wtorek");
            expect(DAY_NAMES_FULL).toContain("Środa");
            expect(DAY_NAMES_FULL).toContain("Czwartek");
            expect(DAY_NAMES_FULL).toContain("Piątek");
            expect(DAY_NAMES_FULL).toContain("Sobota");
        });
    });

    // =========================================================================
    // DAY_NAMES_FULL_SUNDAY_FIRST
    // =========================================================================
    describe("DAY_NAMES_FULL_SUNDAY_FIRST", () => {
        it("should have 7 entries", () => {
            expect(DAY_NAMES_FULL_SUNDAY_FIRST.length).toBe(7);
        });

        it("should start with Niedziela (index 0 = Date.getDay())", () => {
            expect(DAY_NAMES_FULL_SUNDAY_FIRST[0]).toBe("Niedziela");
        });

        it("should have Poniedziałek at index 1", () => {
            expect(DAY_NAMES_FULL_SUNDAY_FIRST[1]).toBe("Poniedziałek");
        });

        it("should be consistent with DAY_KEYS", () => {
            expect(DAY_NAMES_FULL_SUNDAY_FIRST[0]).toBe("Niedziela"); // sunday
            expect(DAY_NAMES_FULL_SUNDAY_FIRST[6]).toBe("Sobota"); // saturday
        });
    });

    // =========================================================================
    // DAYS_OF_WEEK
    // =========================================================================
    describe("DAYS_OF_WEEK", () => {
        it("should have 7 entries", () => {
            expect(DAYS_OF_WEEK.length).toBe(7);
        });

        it("should start with Monday (Polish week standard)", () => {
            expect(DAYS_OF_WEEK[0].key).toBe("monday");
            expect(DAYS_OF_WEEK[0].value).toBe(1);
        });

        it("should end with Sunday", () => {
            expect(DAYS_OF_WEEK[6].key).toBe("sunday");
            expect(DAYS_OF_WEEK[6].value).toBe(0);
        });

        it("should have required properties for each day", () => {
            DAYS_OF_WEEK.forEach((day) => {
                expect(day).toHaveProperty("value");
                expect(day).toHaveProperty("key");
                expect(day).toHaveProperty("label");
                expect(day).toHaveProperty("fullLabel");
                expect(typeof day.value).toBe("number");
            });
        });

        it("should have values matching Date.getDay()", () => {
            const monday = DAYS_OF_WEEK.find((d) => d.key === "monday");
            const sunday = DAYS_OF_WEEK.find((d) => d.key === "sunday");
            const saturday = DAYS_OF_WEEK.find((d) => d.key === "saturday");

            expect(monday?.value).toBe(1);
            expect(sunday?.value).toBe(0);
            expect(saturday?.value).toBe(6);
        });
    });

    // =========================================================================
    // DAY_NAMES_MAP
    // =========================================================================
    describe("DAY_NAMES_MAP", () => {
        it("should map English keys to Polish short names", () => {
            expect(DAY_NAMES_MAP.monday).toBe("Pon");
            expect(DAY_NAMES_MAP.tuesday).toBe("Wt");
            expect(DAY_NAMES_MAP.wednesday).toBe("Śr");
            expect(DAY_NAMES_MAP.thursday).toBe("Czw");
            expect(DAY_NAMES_MAP.friday).toBe("Pt");
            expect(DAY_NAMES_MAP.saturday).toBe("Sob");
            expect(DAY_NAMES_MAP.sunday).toBe("Nd");
        });

        it("should have all 7 keys", () => {
            expect(Object.keys(DAY_NAMES_MAP).length).toBe(7);
        });
    });

    // =========================================================================
    // DAY_NAMES_FULL_MAP
    // =========================================================================
    describe("DAY_NAMES_FULL_MAP", () => {
        it("should map English keys to Polish full names", () => {
            expect(DAY_NAMES_FULL_MAP.monday).toBe("Poniedziałek");
            expect(DAY_NAMES_FULL_MAP.tuesday).toBe("Wtorek");
            expect(DAY_NAMES_FULL_MAP.wednesday).toBe("Środa");
            expect(DAY_NAMES_FULL_MAP.sunday).toBe("Niedziela");
        });

        it("should have all 7 keys", () => {
            expect(Object.keys(DAY_NAMES_FULL_MAP).length).toBe(7);
        });
    });

    // =========================================================================
    // dayIndexToKey
    // =========================================================================
    describe("dayIndexToKey", () => {
        it("should convert 0 to sunday", () => {
            expect(dayIndexToKey(0)).toBe("sunday");
        });

        it("should convert 1 to monday", () => {
            expect(dayIndexToKey(1)).toBe("monday");
        });

        it("should convert 6 to saturday", () => {
            expect(dayIndexToKey(6)).toBe("saturday");
        });

        it("should handle overflow with modulo", () => {
            expect(dayIndexToKey(7)).toBe("sunday"); // 7 % 7 = 0
            expect(dayIndexToKey(8)).toBe("monday"); // 8 % 7 = 1
        });
    });

    // =========================================================================
    // dayKeyToIndex
    // =========================================================================
    describe("dayKeyToIndex", () => {
        it("should convert sunday to 0", () => {
            expect(dayKeyToIndex("sunday")).toBe(0);
        });

        it("should convert monday to 1", () => {
            expect(dayKeyToIndex("monday")).toBe(1);
        });

        it("should convert saturday to 6", () => {
            expect(dayKeyToIndex("saturday")).toBe(6);
        });

        it("should be inverse of dayIndexToKey", () => {
            for (let i = 0; i <= 6; i++) {
                const key = dayIndexToKey(i);
                expect(dayKeyToIndex(key)).toBe(i);
            }
        });
    });
});
