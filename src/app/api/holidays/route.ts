import { createClient } from "@/lib/supabase/server";
import { fetchHolidays } from "@/lib/api/holidays";
import { logger } from "@/lib/utils/logger";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api/response";
import type { Json } from "@/types";

// Cache TTL: 30 days in milliseconds
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isCacheValid(createdAt: string): boolean {
    const cacheDate = new Date(createdAt);
    const now = new Date();
    return now.getTime() - cacheDate.getTime() < CACHE_TTL_MS;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const countryCode = searchParams.get("country") || "PL";

    if (!year) {
        return apiError(
            ErrorCodes.INVALID_INPUT,
            "Parametr year jest wymagany",
            400
        );
    }

    const yearNum = parseInt(year);

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return apiError(ErrorCodes.INVALID_INPUT, "Nieprawidłowy rok", 400);
    }

    try {
        const supabase = await createClient();

        // Check cache with TTL validation
        const { data: cached } = await supabase
            .from("holidays_cache")
            .select("holidays, created_at")
            .eq("year", yearNum)
            .eq("country_code", countryCode)
            .single();

        if (cached?.created_at && isCacheValid(cached.created_at)) {
            return apiSuccess({
                holidays: cached.holidays,
                cached: true,
            });
        }

        // Fetch from API (cache expired or doesn't exist)
        const holidays = await fetchHolidays(yearNum, countryCode);

        // Upsert to cache (update timestamp for TTL)
        await supabase.from("holidays_cache").upsert({
            year: yearNum,
            country_code: countryCode,
            holidays: holidays as unknown as Json,
            created_at: new Date().toISOString(),
        });

        return apiSuccess({
            holidays,
            cached: false,
        });
    } catch (error) {
        logger.error("Error fetching holidays:", error);
        return apiError(
            ErrorCodes.INTERNAL_ERROR,
            "Wystąpił błąd podczas pobierania świąt",
            500
        );
    }
}
