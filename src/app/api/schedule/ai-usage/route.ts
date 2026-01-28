import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { AI_GENERATION_LIMIT_PER_MONTH } from "@/lib/constants/ai";
import { getCurrentBillingPeriod } from "@/lib/scheduler/greedy";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get("organizationId");

        if (!organizationId) {
            return NextResponse.json(
                { error: "Missing organizationId" },
                { status: 400 },
            );
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { year, month } = getCurrentBillingPeriod();

        const { data, error } = await supabase
            .from("ai_generation_usage")
            .select("generation_count")
            .eq("organization_id", organizationId)
            .eq("year", year)
            .eq("month", month)
            .single();

        if (error && error.code !== "PGRST116") {
            logger.error(error);
            return NextResponse.json(
                { error: "Failed to fetch usage" },
                { status: 500 },
            );
        }

        const used = data?.generation_count ?? 0;

        return NextResponse.json({
            usage: used,
            limit: AI_GENERATION_LIMIT_PER_MONTH,
            remaining: Math.max(0, AI_GENERATION_LIMIT_PER_MONTH - used),
            period: { year, month },
        });
    } catch (err) {
        logger.error(err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const body = await request.json();
        const { organizationId } = body;

        if (!organizationId) {
            return NextResponse.json(
                { error: "Missing organizationId" },
                { status: 400 },
            );
        }

        const { year, month } = getCurrentBillingPeriod();

        const { data: existing } = await supabase
            .from("ai_generation_usage")
            .select("id, generation_count")
            .eq("organization_id", organizationId)
            .eq("year", year)
            .eq("month", month)
            .single();

        if (existing) {
            await supabase
                .from("ai_generation_usage")
                .update({
                    generation_count: existing.generation_count + 1,
                    last_generated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
        } else {
            await supabase.from("ai_generation_usage").insert({
                profile_id: user.id,
                organization_id: organizationId,
                year,
                month,
                generation_count: 1,
                last_generated_at: new Date().toISOString(),
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        logger.error(err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
