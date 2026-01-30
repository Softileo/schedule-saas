import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, ".env.local");

let env = {};
try {
    const envFile = readFileSync(envPath, "utf8");
    envFile.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length) {
            env[key.trim()] = valueParts.join("=").trim();
        }
    });
} catch {
    // Try .env instead
    try {
        const envFile = readFileSync(join(__dirname, ".env"), "utf8");
        envFile.split("\n").forEach((line) => {
            const [key, ...valueParts] = line.split("=");
            if (key && valueParts.length) {
                env[key.trim()] = valueParts.join("=").trim();
            }
        });
    } catch {
        console.log("⚠️  Could not read .env files, using process.env");
        env = process.env;
    }
}

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const orgId = "95a58c48-70c9-4865-beb8-da95666cb267";

// Znajdź Weronikę
const { data: employees } = await supabase
    .from("employees")
    .select(
        "id, first_name, last_name, employment_type, custom_hours, is_active",
    )
    .eq("organization_id", orgId)
    .ilike("first_name", "Weronika%");

console.log("\n👤 WERONIKA SKÓRZEWSKA:");
if (employees && employees.length > 0) {
    console.log(JSON.stringify(employees, null, 2));

    const weronika = employees[0];
    console.log("\n📊 ANALIZA:");
    console.log(`Typ etatu: ${weronika.employment_type}`);
    console.log(`Custom hours: ${weronika.custom_hours}`);
    console.log(`Aktywna: ${weronika.is_active}`);

    // Oblicz docelowe godziny (norma stycznia 2026: 168h)
    const monthlyNorm = 168;
    const multipliers = {
        full: 1.0,
        three_quarter: 0.75,
        half: 0.5,
        one_third: 0.333,
    };

    if (weronika.employment_type === "custom") {
        console.log(
            `\n✅ Docelowe godziny: ${weronika.custom_hours}h (custom)`,
        );
    } else {
        const multiplier = multipliers[weronika.employment_type] || 1.0;
        const targetHours = monthlyNorm * multiplier;
        console.log(
            `\n✅ Docelowe godziny: ${targetHours}h (${weronika.employment_type}, norma: ${monthlyNorm}h)`,
        );
    }
} else {
    console.log("❌ Nie znaleziono Weroniki!");
}

process.exit(0);
