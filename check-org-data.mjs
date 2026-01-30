import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Read .env.local manually
const envFile = readFileSync(".env.local", "utf8");
const env = {};
envFile.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join("=").trim();
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
);

const orgId = "95a58c48-70c9-4865-beb8-da95666cb267";

// Pobierz shift templates
const { data: templates, error } = await supabase
    .from("shift_templates")
    .select("id, name, start_time, end_time, min_employees, max_employees")
    .eq("organization_id", orgId)
    .order("start_time");

console.log("\n📋 SHIFT TEMPLATES:");
console.log(JSON.stringify(templates, null, 2));

// Pobierz scheduling rules
const { data: rules } = await supabase
    .from("scheduling_rules")
    .select("max_weekly_work_hours, max_daily_work_hours, max_consecutive_days")
    .eq("organization_id", orgId)
    .single();

console.log("\n📏 SCHEDULING RULES:");
console.log(JSON.stringify(rules, null, 2));

// Pobierz organization settings
const { data: settings } = await supabase
    .from("organization_settings")
    .select("enable_trading_sundays, trading_sundays_mode")
    .eq("organization_id", orgId)
    .single();

console.log("\n⚙️  ORGANIZATION SETTINGS:");
console.log(JSON.stringify(settings, null, 2));

process.exit(0);
