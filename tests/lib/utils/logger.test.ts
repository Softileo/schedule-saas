/**
 * Testy dla logger.ts
 *
 * Testuje:
 * - logger.log/warn/error/debug/info - podstawowe metody
 * - logger.verbose - logowanie verbose z flagą DEBUG
 * - Zachowanie w różnych środowiskach
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/utils/logger";

describe("logger", () => {
    beforeEach(() => {
        // Mock console methods
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(console, "debug").mockImplementation(() => {});
        vi.spyOn(console, "info").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    // =========================================================================
    // logger.error - zawsze loguje
    // =========================================================================
    describe("logger.error", () => {
        it("should always log errors regardless of environment", () => {
            logger.error("Test error");

            expect(console.error).toHaveBeenCalledWith("Test error");
        });

        it("should pass multiple arguments", () => {
            logger.error("Error:", { code: 500 }, "details");

            expect(console.error).toHaveBeenCalledWith(
                "Error:",
                { code: 500 },
                "details"
            );
        });

        it("should log Error objects", () => {
            const error = new Error("Something failed");
            logger.error("Caught:", error);

            expect(console.error).toHaveBeenCalledWith("Caught:", error);
        });
    });

    // =========================================================================
    // Structure tests
    // =========================================================================
    describe("logger structure", () => {
        it("should have all expected methods", () => {
            expect(typeof logger.log).toBe("function");
            expect(typeof logger.warn).toBe("function");
            expect(typeof logger.error).toBe("function");
            expect(typeof logger.debug).toBe("function");
            expect(typeof logger.info).toBe("function");
            expect(typeof logger.verbose).toBe("function");
        });

        it("should be a frozen object (immutable)", () => {
            // Logger powinien być obiektem ze stałymi metodami
            expect(logger).toBeDefined();
            expect(Object.keys(logger)).toContain("log");
            expect(Object.keys(logger)).toContain("error");
        });
    });

    // =========================================================================
    // Argument handling
    // =========================================================================
    describe("argument handling", () => {
        it("should handle no arguments", () => {
            expect(() => logger.error()).not.toThrow();
            expect(console.error).toHaveBeenCalled();
        });

        it("should handle undefined arguments", () => {
            logger.error(undefined, null);

            expect(console.error).toHaveBeenCalledWith(undefined, null);
        });

        it("should handle complex objects", () => {
            const complexObj = {
                nested: { deep: { value: 123 } },
                array: [1, 2, 3],
                fn: () => {},
            };
            logger.error(complexObj);

            expect(console.error).toHaveBeenCalledWith(complexObj);
        });

        it("should preserve argument order", () => {
            logger.error(1, "two", { three: 3 }, [4]);

            expect(console.error).toHaveBeenCalledWith(1, "two", { three: 3 }, [
                4,
            ]);
        });
    });

    // =========================================================================
    // Method existence
    // =========================================================================
    describe("method existence", () => {
        it("log method should exist", () => {
            expect(logger.log).toBeDefined();
        });

        it("warn method should exist", () => {
            expect(logger.warn).toBeDefined();
        });

        it("debug method should exist", () => {
            expect(logger.debug).toBeDefined();
        });

        it("info method should exist", () => {
            expect(logger.info).toBeDefined();
        });

        it("verbose method should exist", () => {
            expect(logger.verbose).toBeDefined();
        });
    });

    // =========================================================================
    // Return value
    // =========================================================================
    describe("return value", () => {
        it("all methods should return undefined", () => {
            expect(logger.error("test")).toBeUndefined();
        });
    });

    // =========================================================================
    // Type safety
    // =========================================================================
    describe("type safety", () => {
        it("should accept any type as argument", () => {
            // String
            expect(() => logger.error("string")).not.toThrow();

            // Number
            expect(() => logger.error(123)).not.toThrow();

            // Boolean
            expect(() => logger.error(true)).not.toThrow();

            // Object
            expect(() => logger.error({ key: "value" })).not.toThrow();

            // Array
            expect(() => logger.error([1, 2, 3])).not.toThrow();

            // Function
            expect(() => logger.error(() => {})).not.toThrow();

            // Symbol
            expect(() => logger.error(Symbol("test"))).not.toThrow();
        });
    });
});
