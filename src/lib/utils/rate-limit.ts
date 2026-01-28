/**
 * Rate Limiter for API Routes
 *
 * Uses in-memory store with LRU eviction for serverless environments.
 * NOTE: For multi-instance production deployments, consider Redis/Upstash.
 * Current implementation works well for:
 * - Single instance deployments
 * - Vercel serverless (shared between warm instances)
 * - Development environments
 */

import { NextResponse } from "next/server";

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// LRU-like cache with max size to prevent memory leaks
const MAX_ENTRIES = 10000;
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Evict oldest entries when store exceeds max size
 */
function evictOldEntries(): void {
    if (rateLimitStore.size <= MAX_ENTRIES) return;

    const now = Date.now();
    // First pass: remove expired entries
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }

    // Second pass: remove oldest if still over limit
    if (rateLimitStore.size > MAX_ENTRIES) {
        const entriesToDelete = rateLimitStore.size - MAX_ENTRIES;
        let deleted = 0;
        for (const key of rateLimitStore.keys()) {
            if (deleted >= entriesToDelete) break;
            rateLimitStore.delete(key);
            deleted++;
        }
    }
}

// Clean up expired entries periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore.entries()) {
            if (entry.resetTime < now) {
                rateLimitStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

interface RateLimitConfig {
    /** Maximum number of requests allowed within the window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
}

interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetTime: number;
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., IP address, email)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now();
    const key = identifier;

    const entry = rateLimitStore.get(key);

    // If no entry or window expired, create new entry
    if (!entry || entry.resetTime < now) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + config.windowMs,
        });
        return {
            success: true,
            remaining: config.maxRequests - 1,
            resetTime: now + config.windowMs,
        };
    }

    // If within limits, increment counter
    if (entry.count < config.maxRequests) {
        entry.count++;
        evictOldEntries(); // Prevent memory leaks
        return {
            success: true,
            remaining: config.maxRequests - entry.count,
            resetTime: entry.resetTime,
        };
    }

    // Rate limit exceeded
    return {
        success: false,
        remaining: 0,
        resetTime: entry.resetTime,
    };
}

/**
 * Get client IP from request headers (handles proxies)
 */
export function getClientIP(request: Request): string {
    // Check common proxy headers
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }

    // Cloudflare
    const cfConnectingIp = request.headers.get("cf-connecting-ip");
    if (cfConnectingIp) {
        return cfConnectingIp;
    }

    return "unknown";
}

// Preset configurations
export const RATE_LIMITS = {
    /** Registration: 5 attempts per 15 minutes */
    register: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
    /** Verification: 10 attempts per 15 minutes */
    verify: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
    /** Resend code: 3 attempts per 5 minutes */
    resendCode: { maxRequests: 3, windowMs: 5 * 60 * 1000 },
    /** Login: 10 attempts per 15 minutes */
    login: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
    /** Password reset: 3 attempts per hour */
    passwordReset: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
    /** Schedule generation: 20 attempts per hour */
    scheduleGeneration: { maxRequests: 55, windowMs: 60 * 60 * 1000 },
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

interface WithRateLimitOptions {
    /** Key prefix for rate limit identifier */
    keyPrefix: string;
    /** Rate limit configuration from RATE_LIMITS */
    limit: RateLimitConfig;
    /** Custom error message (Polish) */
    errorMessage?: string;
}

/**
 * Higher-order function that wraps an API handler with rate limiting
 * @example
 * export const POST = withRateLimit({
 *   keyPrefix: 'register',
 *   limit: RATE_LIMITS.register,
 *   errorMessage: 'Zbyt wiele prób rejestracji.'
 * }, async (request) => {
 *   // handler logic
 * });
 */
export function withRateLimit(
    options: WithRateLimitOptions,
    handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
    const {
        keyPrefix,
        limit,
        errorMessage = "Zbyt wiele żądań. Spróbuj ponownie później.",
    } = options;

    return async (request: Request): Promise<Response> => {
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(`${keyPrefix}:${clientIP}`, limit);

        if (!rateLimit.success) {
            const retryAfter = Math.ceil(
                (rateLimit.resetTime - Date.now()) / 1000
            );
            return NextResponse.json(
                { error: errorMessage, retryAfter },
                {
                    status: 429,
                    headers: { "Retry-After": retryAfter.toString() },
                }
            );
        }

        return handler(request);
    };
}
