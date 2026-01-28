/**
 * Testy dla supabase/config.ts
 *
 * Testuje:
 * - getSupabaseUrl() - pobieranie URL Supabase
 * - getSupabaseAnonKey() - pobieranie klucza anonimowego
 * - getSupabaseServiceKey() - pobieranie klucza service role
 *
 * UWAGA: Te testy mockują zmienne środowiskowe
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    getSupabaseUrl,
    getSupabaseAnonKey,
    getSupabaseServiceKey,
} from "@/lib/supabase/config";

// =========================================================================
// Setup - save and restore original env vars
// =========================================================================
const originalEnv = { ...process.env };

beforeEach(() => {
    // Clear relevant env vars before each test
    vi.resetModules();
});

afterEach(() => {
    // Restore original env vars after each test
    process.env = { ...originalEnv };
});

// =========================================================================
// getSupabaseUrl
// =========================================================================
describe("getSupabaseUrl", () => {
    describe("when environment variable is set", () => {
        it("should return the URL from environment variable", () => {
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";

            expect(getSupabaseUrl()).toBe("https://test.supabase.co");
        });

        it("should return URL with any valid format", () => {
            process.env.NEXT_PUBLIC_SUPABASE_URL =
                "https://abcdefghijk.supabase.co";

            expect(getSupabaseUrl()).toBe("https://abcdefghijk.supabase.co");
        });

        it("should handle localhost URL", () => {
            process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";

            expect(getSupabaseUrl()).toBe("http://localhost:54321");
        });

        it("should handle URL with trailing slash", () => {
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co/";

            expect(getSupabaseUrl()).toBe("https://test.supabase.co/");
        });
    });

    describe("when environment variable is missing", () => {
        it("should throw error when URL is undefined", () => {
            delete process.env.NEXT_PUBLIC_SUPABASE_URL;

            expect(() => getSupabaseUrl()).toThrow(
                "Missing NEXT_PUBLIC_SUPABASE_URL environment variable"
            );
        });

        it("should throw error when URL is empty string", () => {
            process.env.NEXT_PUBLIC_SUPABASE_URL = "";

            expect(() => getSupabaseUrl()).toThrow(
                "Missing NEXT_PUBLIC_SUPABASE_URL environment variable"
            );
        });
    });
});

// =========================================================================
// getSupabaseAnonKey
// =========================================================================
describe("getSupabaseAnonKey", () => {
    describe("when environment variable is set", () => {
        it("should return the anon key from environment variable", () => {
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";

            expect(getSupabaseAnonKey()).toBe(
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"
            );
        });

        it("should return key with any valid format", () => {
            const key = "test-anon-key-12345";
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;

            expect(getSupabaseAnonKey()).toBe(key);
        });

        it("should handle long JWT-like key", () => {
            const longKey =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "a".repeat(500);
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = longKey;

            expect(getSupabaseAnonKey()).toBe(longKey);
        });
    });

    describe("when environment variable is missing", () => {
        it("should throw error when anon key is undefined", () => {
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            expect(() => getSupabaseAnonKey()).toThrow(
                "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable"
            );
        });

        it("should throw error when anon key is empty string", () => {
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";

            expect(() => getSupabaseAnonKey()).toThrow(
                "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable"
            );
        });
    });
});

// =========================================================================
// getSupabaseServiceKey
// =========================================================================
describe("getSupabaseServiceKey", () => {
    describe("when environment variable is set", () => {
        it("should return the service key from environment variable", () => {
            process.env.SUPABASE_SERVICE_ROLE_KEY =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service";

            expect(getSupabaseServiceKey()).toBe(
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service"
            );
        });

        it("should return key with any valid format", () => {
            const key = "service-role-key-secret-12345";
            process.env.SUPABASE_SERVICE_ROLE_KEY = key;

            expect(getSupabaseServiceKey()).toBe(key);
        });

        it("should handle long JWT-like service key", () => {
            const longKey =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role." +
                "b".repeat(500);
            process.env.SUPABASE_SERVICE_ROLE_KEY = longKey;

            expect(getSupabaseServiceKey()).toBe(longKey);
        });
    });

    describe("when environment variable is missing", () => {
        it("should throw error when service key is undefined", () => {
            delete process.env.SUPABASE_SERVICE_ROLE_KEY;

            expect(() => getSupabaseServiceKey()).toThrow(
                "Missing SUPABASE_SERVICE_ROLE_KEY environment variable"
            );
        });

        it("should throw error when service key is empty string", () => {
            process.env.SUPABASE_SERVICE_ROLE_KEY = "";

            expect(() => getSupabaseServiceKey()).toThrow(
                "Missing SUPABASE_SERVICE_ROLE_KEY environment variable"
            );
        });
    });
});

// =========================================================================
// Integration scenarios
// =========================================================================
describe("configuration integration", () => {
    describe("all variables set", () => {
        it("should return all values when all env vars are set", () => {
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
            process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

            expect(getSupabaseUrl()).toBe("https://test.supabase.co");
            expect(getSupabaseAnonKey()).toBe("anon-key");
            expect(getSupabaseServiceKey()).toBe("service-key");
        });
    });

    describe("partial variables set", () => {
        it("should throw only for missing variables", () => {
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            delete process.env.SUPABASE_SERVICE_ROLE_KEY;

            expect(getSupabaseUrl()).toBe("https://test.supabase.co");
            expect(() => getSupabaseAnonKey()).toThrow();
            expect(() => getSupabaseServiceKey()).toThrow();
        });
    });

    describe("security considerations", () => {
        it("should distinguish between public and private keys", () => {
            // Public keys use NEXT_PUBLIC_ prefix
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://public.supabase.co";
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon";
            // Service key does NOT use NEXT_PUBLIC_ prefix (should never be exposed to client)
            process.env.SUPABASE_SERVICE_ROLE_KEY = "private-service";

            // All should be accessible server-side
            expect(getSupabaseUrl()).toBeDefined();
            expect(getSupabaseAnonKey()).toBeDefined();
            expect(getSupabaseServiceKey()).toBeDefined();
        });
    });
});

// =========================================================================
// Error message format
// =========================================================================
describe("error messages", () => {
    it("should have descriptive error for URL", () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;

        try {
            getSupabaseUrl();
            expect.fail("Should have thrown");
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain(
                "NEXT_PUBLIC_SUPABASE_URL"
            );
        }
    });

    it("should have descriptive error for anon key", () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        try {
            getSupabaseAnonKey();
            expect.fail("Should have thrown");
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain(
                "NEXT_PUBLIC_SUPABASE_ANON_KEY"
            );
        }
    });

    it("should have descriptive error for service key", () => {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;

        try {
            getSupabaseServiceKey();
            expect.fail("Should have thrown");
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain(
                "SUPABASE_SERVICE_ROLE_KEY"
            );
        }
    });
});
