/**
 * Test integracji z Python API
 * Testuje endpoint /api/schedule/generate
 */

const API_URL = "http://localhost:3000/api/schedule/generate";

// Minimalne dane testowe
const testData = {
    year: 2026,
    month: 2,
    organizationId: "test-org-123",
    mode: "fast",
    templates: [
        {
            id: "template-1",
            name: "Poranna",
            color: "#FF5733",
            start_time: "08:00",
            end_time: "16:00",
            duration_hours: 8,
            employees_needed: 2,
        },
        {
            id: "template-2",
            name: "Popołudniowa",
            color: "#33FF57",
            start_time: "16:00",
            end_time: "22:00",
            duration_hours: 6,
            employees_needed: 1,
        },
    ],
    employees: [
        {
            id: "emp-1",
            name: "Jan Kowalski",
            weekly_hours: 40,
            contract_type: "full_time",
            absences: [],
        },
        {
            id: "emp-2",
            name: "Anna Nowak",
            weekly_hours: 40,
            contract_type: "full_time",
            absences: [],
        },
        {
            id: "emp-3",
            name: "Piotr Wiśniewski",
            weekly_hours: 30,
            contract_type: "part_time",
            absences: [],
        },
    ],
    settings: {
        min_employees_per_day: 2,
        max_hours_per_week: 48,
        allow_overtime: true,
        max_consecutive_days: 6,
    },
};

async function testAPI() {
    console.log("🧪 Testowanie API generowania grafiku...\n");
    console.log("📡 URL:", API_URL);
    console.log(
        "📊 Dane:",
        JSON.stringify(testData, null, 2).substring(0, 200) + "...\n",
    );

    try {
        const startTime = Date.now();

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(testData),
        });

        const duration = Date.now() - startTime;

        console.log("📥 Status:", response.status, response.statusText);
        console.log("⏱️  Czas odpowiedzi:", duration + "ms\n");

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Błąd:", errorText);
            return;
        }

        const result = await response.json();

        console.log("✅ Odpowiedź otrzymana!");
        console.log("\n📊 Wyniki:");
        console.log("  - Sukces:", result.success);

        if (result.data) {
            const { shifts, metrics, executionTimeMs, layersExecuted } =
                result.data;

            console.log("  - Wygenerowano zmian:", shifts?.length || 0);
            console.log("  - Czas wykonania:", executionTimeMs + "ms");
            console.log(
                "  - Użyte warstwy:",
                layersExecuted?.join(", ") || "brak",
            );

            if (metrics) {
                console.log("\n📈 Metryki:");
                console.log(
                    "  - Jakość:",
                    metrics.qualityPercent?.toFixed(1) + "%",
                );
                console.log("  - Fitness:", metrics.totalFitness?.toFixed(2));
                console.log("  - Pokryte dni:", metrics.coveredDays);

                if (metrics.warnings?.length > 0) {
                    console.log("\n⚠️  Ostrzeżenia:");
                    metrics.warnings.forEach((w) => console.log("  -", w));
                }
            }

            if (shifts && shifts.length > 0) {
                console.log("\n🗓️  Przykładowa zmiana:");
                const firstShift = shifts[0];
                console.log("  -", firstShift.employee_name);
                console.log("  -", firstShift.date);
                console.log(
                    "  -",
                    firstShift.start_time,
                    "-",
                    firstShift.end_time,
                );
            }
        } else if (result.error) {
            console.error("❌ Błąd w odpowiedzi:", result.error);
        }
    } catch (error) {
        console.error("❌ Błąd podczas testu:", error.message);
    }
}

testAPI();
