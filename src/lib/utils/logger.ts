/**
 * Environment-aware logger
 * Only logs in development mode
 */

const isDev = process.env.NODE_ENV === "development";

export const logger = {
    log: (...args: unknown[]) => {
        if (isDev) console.log(...args);
    },
    warn: (...args: unknown[]) => {
        if (isDev) console.warn(...args);
    },
    error: (...args: unknown[]) => {
        // Errors are always logged
        console.error(...args);
    },
    debug: (...args: unknown[]) => {
        if (isDev) console.debug(...args);
    },
    info: (...args: unknown[]) => {
        if (isDev) console.info(...args);
    },
    /**
     * Log only when explicitly needed (e.g., for debugging specific features)
     * Set NEXT_PUBLIC_DEBUG=true in .env to enable
     */
    verbose: (...args: unknown[]) => {
        if (isDev && process.env.NEXT_PUBLIC_DEBUG === "true") {
            console.log("[VERBOSE]", ...args);
        }
    },
};

export default logger;
