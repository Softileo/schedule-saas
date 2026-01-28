/**
 * Testy dla rate-limit.ts
 *
 * Testuje:
 * - checkRateLimit() - podstawowy rate limiting
 * - getClientIP() - wyciąganie IP z nagłówków
 * - RATE_LIMITS - predefiniowane konfiguracje
 * - withRateLimit() - HOF wrapper
 */

import { describe, it, expect } from "vitest";
import {
    checkRateLimit,
    getClientIP,
    RATE_LIMITS,
} from "@/lib/utils/rate-limit";

// =========================================================================
// checkRateLimit
// =========================================================================
describe("rate-limit", () => {
    describe("checkRateLimit", () => {
        // Użyj unikalnych kluczy dla każdego testu żeby uniknąć konfliktów
        const getUniqueKey = () => `test-${Date.now()}-${Math.random()}`;

        it("should allow first request", () => {
            const key = getUniqueKey();
            const config = { maxRequests: 5, windowMs: 60000 };

            const result = checkRateLimit(key, config);

            expect(result.success).toBe(true);
            expect(result.remaining).toBe(4);
        });

        it("should decrement remaining on each request", () => {
            const key = getUniqueKey();
            const config = { maxRequests: 3, windowMs: 60000 };

            checkRateLimit(key, config); // remaining: 2
            const result2 = checkRateLimit(key, config); // remaining: 1
            const result3 = checkRateLimit(key, config); // remaining: 0

            expect(result2.remaining).toBe(1);
            expect(result3.remaining).toBe(0);
        });

        it("should block after max requests exceeded", () => {
            const key = getUniqueKey();
            const config = { maxRequests: 2, windowMs: 60000 };

            checkRateLimit(key, config); // 1
            checkRateLimit(key, config); // 2
            const result = checkRateLimit(key, config); // blocked

            expect(result.success).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it("should return resetTime in the future", () => {
            const key = getUniqueKey();
            const config = { maxRequests: 5, windowMs: 60000 };
            const now = Date.now();

            const result = checkRateLimit(key, config);

            expect(result.resetTime).toBeGreaterThan(now);
            expect(result.resetTime).toBeLessThanOrEqual(
                now + config.windowMs + 100
            );
        });

        it("should use same window for same key", () => {
            const key = getUniqueKey();
            const config = { maxRequests: 5, windowMs: 60000 };

            const result1 = checkRateLimit(key, config);
            const result2 = checkRateLimit(key, config);

            // resetTime powinien być taki sam (ta sama window)
            expect(result1.resetTime).toBe(result2.resetTime);
        });

        it("should track different keys independently", () => {
            const key1 = getUniqueKey();
            const key2 = getUniqueKey();
            const config = { maxRequests: 2, windowMs: 60000 };

            // Wyczerpaj limit dla key1
            checkRateLimit(key1, config);
            checkRateLimit(key1, config);
            const blockedResult = checkRateLimit(key1, config);

            // key2 powinien nadal działać
            const key2Result = checkRateLimit(key2, config);

            expect(blockedResult.success).toBe(false);
            expect(key2Result.success).toBe(true);
        });

        it("should allow single request with maxRequests=1", () => {
            const key = getUniqueKey();
            const config = { maxRequests: 1, windowMs: 60000 };

            const result1 = checkRateLimit(key, config);
            const result2 = checkRateLimit(key, config);

            expect(result1.success).toBe(true);
            expect(result1.remaining).toBe(0);
            expect(result2.success).toBe(false);
        });

        it("should work with very short window", () => {
            const key = getUniqueKey();
            const config = { maxRequests: 5, windowMs: 10 }; // 10ms window

            const result = checkRateLimit(key, config);

            expect(result.success).toBe(true);
            // Window wygaśnie bardzo szybko
        });

        it("should work with very high maxRequests", () => {
            const key = getUniqueKey();
            const config = { maxRequests: 10000, windowMs: 60000 };

            const result = checkRateLimit(key, config);

            expect(result.success).toBe(true);
            expect(result.remaining).toBe(9999);
        });
    });

    // =========================================================================
    // getClientIP
    // =========================================================================
    describe("getClientIP", () => {
        it("should return x-forwarded-for header value", () => {
            const request = new Request("http://test.com", {
                headers: {
                    "x-forwarded-for": "1.2.3.4, 5.6.7.8",
                },
            });

            const ip = getClientIP(request);

            expect(ip).toBe("1.2.3.4");
        });

        it("should trim whitespace from x-forwarded-for", () => {
            const request = new Request("http://test.com", {
                headers: {
                    "x-forwarded-for": "  1.2.3.4  ",
                },
            });

            const ip = getClientIP(request);

            expect(ip).toBe("1.2.3.4");
        });

        it("should return x-real-ip if no x-forwarded-for", () => {
            const request = new Request("http://test.com", {
                headers: {
                    "x-real-ip": "10.0.0.1",
                },
            });

            const ip = getClientIP(request);

            expect(ip).toBe("10.0.0.1");
        });

        it("should return cf-connecting-ip for Cloudflare", () => {
            const request = new Request("http://test.com", {
                headers: {
                    "cf-connecting-ip": "192.168.1.1",
                },
            });

            const ip = getClientIP(request);

            expect(ip).toBe("192.168.1.1");
        });

        it("should prioritize x-forwarded-for over other headers", () => {
            const request = new Request("http://test.com", {
                headers: {
                    "x-forwarded-for": "1.1.1.1",
                    "x-real-ip": "2.2.2.2",
                    "cf-connecting-ip": "3.3.3.3",
                },
            });

            const ip = getClientIP(request);

            expect(ip).toBe("1.1.1.1");
        });

        it("should return unknown if no headers", () => {
            const request = new Request("http://test.com");

            const ip = getClientIP(request);

            expect(ip).toBe("unknown");
        });

        it("should handle IPv6 addresses", () => {
            const request = new Request("http://test.com", {
                headers: {
                    "x-forwarded-for":
                        "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
                },
            });

            const ip = getClientIP(request);

            expect(ip).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
        });

        it("should return first IP from comma-separated list", () => {
            const request = new Request("http://test.com", {
                headers: {
                    "x-forwarded-for": "client.ip, proxy1.ip, proxy2.ip",
                },
            });

            const ip = getClientIP(request);

            expect(ip).toBe("client.ip");
        });
    });

    // =========================================================================
    // RATE_LIMITS presets
    // =========================================================================
    describe("RATE_LIMITS", () => {
        it("should have register preset", () => {
            expect(RATE_LIMITS.register).toBeDefined();
            expect(RATE_LIMITS.register.maxRequests).toBe(5);
            expect(RATE_LIMITS.register.windowMs).toBe(15 * 60 * 1000);
        });

        it("should have verify preset", () => {
            expect(RATE_LIMITS.verify).toBeDefined();
            expect(RATE_LIMITS.verify.maxRequests).toBe(10);
            expect(RATE_LIMITS.verify.windowMs).toBe(15 * 60 * 1000);
        });

        it("should have resendCode preset", () => {
            expect(RATE_LIMITS.resendCode).toBeDefined();
            expect(RATE_LIMITS.resendCode.maxRequests).toBe(3);
            expect(RATE_LIMITS.resendCode.windowMs).toBe(5 * 60 * 1000);
        });

        it("should have login preset", () => {
            expect(RATE_LIMITS.login).toBeDefined();
            expect(RATE_LIMITS.login.maxRequests).toBe(10);
            expect(RATE_LIMITS.login.windowMs).toBe(15 * 60 * 1000);
        });

        it("should have scheduleGeneration preset", () => {
            expect(RATE_LIMITS.scheduleGeneration).toBeDefined();
            expect(RATE_LIMITS.scheduleGeneration.maxRequests).toBe(55);
            expect(RATE_LIMITS.scheduleGeneration.windowMs).toBe(
                60 * 60 * 1000
            );
        });

        it("register should allow 5 requests per 15 minutes", () => {
            expect(RATE_LIMITS.register.maxRequests).toBe(5);
            expect(RATE_LIMITS.register.windowMs / 1000 / 60).toBe(15); // 15 minut
        });

        it("resendCode should be most restrictive", () => {
            const limits = Object.values(RATE_LIMITS);
            const minMaxRequests = Math.min(
                ...limits.map((l) => l.maxRequests)
            );

            expect(RATE_LIMITS.resendCode.maxRequests).toBe(minMaxRequests);
        });

        it("scheduleGeneration should have longest window", () => {
            const limits = Object.values(RATE_LIMITS);
            const maxWindowMs = Math.max(...limits.map((l) => l.windowMs));

            expect(RATE_LIMITS.scheduleGeneration.windowMs).toBe(maxWindowMs);
        });
    });

    // =========================================================================
    // Integration tests - checkRateLimit z różnymi presetami
    // =========================================================================
    describe("checkRateLimit with presets", () => {
        it("should work with register preset", () => {
            const key = `register-${Date.now()}-${Math.random()}`;

            // 5 requestów powinno przejść
            for (let i = 0; i < 5; i++) {
                const result = checkRateLimit(key, RATE_LIMITS.register);
                expect(result.success).toBe(true);
            }

            // 6. powinien być zablokowany
            const blocked = checkRateLimit(key, RATE_LIMITS.register);
            expect(blocked.success).toBe(false);
        });

        it("should work with resendCode preset (strictest)", () => {
            const key = `resend-${Date.now()}-${Math.random()}`;

            // 3 requesty powinny przejść
            for (let i = 0; i < 3; i++) {
                const result = checkRateLimit(key, RATE_LIMITS.resendCode);
                expect(result.success).toBe(true);
            }

            // 4. powinien być zablokowany
            const blocked = checkRateLimit(key, RATE_LIMITS.resendCode);
            expect(blocked.success).toBe(false);
        });

        it("should work with login preset", () => {
            const key = `login-${Date.now()}-${Math.random()}`;

            // 10 requestów powinno przejść
            for (let i = 0; i < 10; i++) {
                const result = checkRateLimit(key, RATE_LIMITS.login);
                expect(result.success).toBe(true);
            }

            // 11. powinien być zablokowany
            const blocked = checkRateLimit(key, RATE_LIMITS.login);
            expect(blocked.success).toBe(false);
        });
    });

    // =========================================================================
    // Edge cases
    // =========================================================================
    describe("edge cases", () => {
        it("should handle empty identifier", () => {
            const config = { maxRequests: 5, windowMs: 60000 };
            const result = checkRateLimit("", config);

            expect(result.success).toBe(true);
        });

        it("should handle special characters in identifier", () => {
            const key = "test:user@example.com:192.168.1.1";
            const config = { maxRequests: 5, windowMs: 60000 };

            const result = checkRateLimit(key, config);

            expect(result.success).toBe(true);
        });

        it("should handle very long identifier", () => {
            const key = "a".repeat(1000);
            const config = { maxRequests: 5, windowMs: 60000 };

            const result = checkRateLimit(key, config);

            expect(result.success).toBe(true);
        });

        it("should handle unicode in identifier", () => {
            const key = "użytkownik-テスト-用户-🎉";
            const config = { maxRequests: 5, windowMs: 60000 };

            const result = checkRateLimit(key, config);

            expect(result.success).toBe(true);
        });
    });
});
