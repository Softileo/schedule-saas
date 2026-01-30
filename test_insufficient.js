// Test za mało pracowników
const http = require("http");

const inputData = {
    employees: [
        {
            id: "emp-1",
            name: "Jan Kowalski",
            email: "jan@test.pl",
            contract_type: "full",
            weekly_hours: 40,
            max_hours: 48,
            preferences: {},
            absences: [],
            template_assignments: [],
        },
    ],
    templates: [
        {
            id: "shift-1",
            name: "Zmiana A",
            start_time: "08:00",
            end_time: "20:00",
            break_minutes: 30,
            days_of_week: ["mon", "tue", "wed", "thu", "fri"],
            is_weekend: false,
            min_employees: 2,
            max_employees: 3,
            color: "#FF5733",
        },
        {
            id: "shift-2",
            name: "Zmiana B",
            start_time: "14:00",
            end_time: "22:00",
            break_minutes: 30,
            days_of_week: ["mon", "tue", "wed", "thu", "fri"],
            is_weekend: false,
            min_employees: 3,
            max_employees: 4,
            color: "#3366FF",
        },
    ],
    settings: {},
    holidays: [],
    work_days: [
        "2026-02-02",
        "2026-02-03",
        "2026-02-04",
        "2026-02-05",
        "2026-02-06",
        "2026-02-09",
        "2026-02-10",
        "2026-02-11",
        "2026-02-12",
        "2026-02-13",
        "2026-02-16",
        "2026-02-17",
        "2026-02-18",
        "2026-02-19",
        "2026-02-20",
    ],
    saturday_days: [],
    trading_sundays: [],
    year: 2026,
    month: 2,
};

const testData = {
    input: inputData,
    config: { timeout_ms: 10000 },
};

const postData = JSON.stringify(testData);

const options = {
    hostname: "localhost",
    port: 8080,
    path: "/api/generate",
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "X-API-Key": "schedule-saas-local-dev-2026",
    },
};

console.log("🧪 Test z za małą liczbą pracowników...\n");

const req = http.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
        data += chunk;
    });
    res.on("end", () => {
        const result = JSON.parse(data);
        console.log("Status HTTP:", res.statusCode);
        console.log("Response:", JSON.stringify(result, null, 2));

        if (!result.success && result.error) {
            console.log("\n✅ Prawidłowy komunikat błędu:");
            console.log("  ", result.error);
            if (result.details) {
                console.log("  Wymagane:", result.details.required_hours, "h");
                console.log("  Dostępne:", result.details.available_hours, "h");
                console.log("  Brakuje:", result.details.shortage, "h");
            }
        }
    });
});

req.on("error", (e) => console.error("Error:", e.message));
req.write(postData);
req.end();
