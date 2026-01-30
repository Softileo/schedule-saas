// test_hours.js - Test dopasowania godzin do etatu
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
            absences: [
                // Jan ma 1 dzień urlopu - przy 12h zmianie to 148h zamiast 160h
                {
                    start_date: "2026-02-10",
                    end_date: "2026-02-10",
                    type: "vacation",
                },
            ],
            template_assignments: [],
        },
        {
            id: "emp-2",
            name: "Anna Nowak",
            email: "anna@test.pl",
            contract_type: "full",
            weekly_hours: 40,
            max_hours: 48,
            preferences: {},
            absences: [],
            template_assignments: [],
        },
        {
            id: "emp-3",
            name: "Piotr W",
            email: "piotr@test.pl",
            contract_type: "three_quarter",
            weekly_hours: 32,
            max_hours: 40,
            preferences: {},
            absences: [
                // Piotr ma 2 dni urlopu - przy 12h zmianie to 128h - 24h = 104h
                {
                    start_date: "2026-02-05",
                    end_date: "2026-02-06",
                    type: "vacation",
                },
            ],
            template_assignments: [],
        },
    ],
    templates: [
        {
            id: "shift-1",
            name: "Dzienna",
            start_time: "08:00",
            end_time: "20:00",
            break_minutes: 30,
            days_of_week: ["mon", "tue", "wed", "thu", "fri"],
            is_weekend: false,
            min_employees: 1,
            max_employees: 3,
            color: "#FF5733",
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
        "2026-02-23",
        "2026-02-24",
        "2026-02-25",
        "2026-02-26",
        "2026-02-27",
    ],
    saturday_days: ["2026-02-07", "2026-02-14", "2026-02-21", "2026-02-28"],
    trading_sundays: [],
    year: 2026,
    month: 2,
};

const testData = {
    input: inputData,
    config: {
        timeout_ms: 30000,
    },
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

console.log("🧪 Test dopasowania godzin do etatu...\n");

const req = http.request(options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
        data += chunk;
    });

    res.on("end", () => {
        try {
            const result = JSON.parse(data);

            console.log(
                "Response (truncated):",
                JSON.stringify(result, null, 2).slice(0, 500),
            );

            console.log(
                `📊 Quality Score: ${result.data?.metrics?.fitness?.toFixed(1) || "N/A"}%`,
            );
            console.log(
                `📅 Wygenerowanych zmian: ${result.data?.shifts?.length || 0}`,
            );

            // Oblicz godziny na pracownika
            const hoursByEmployee = {};
            const shiftsByEmployee = {};

            for (const shift of result.data?.shifts || []) {
                const empId = shift.employee_id;
                if (!hoursByEmployee[empId]) {
                    hoursByEmployee[empId] = 0;
                    shiftsByEmployee[empId] = [];
                }

                // Oblicz czas trwania zmiany
                const [startH, startM] = shift.start_time
                    .split(":")
                    .map(Number);
                const [endH, endM] = shift.end_time.split(":").map(Number);

                let hours = endH - startH + (endM - startM) / 60;
                if (hours < 0) hours += 24; // Nocna zmiana

                // Odejmij przerwę
                const breakMinutes = shift.break_minutes || 0;
                hours -= breakMinutes / 60;

                hoursByEmployee[empId] += hours;
                shiftsByEmployee[empId].push({
                    date: shift.date,
                    start: shift.start_time,
                    end: shift.end_time,
                    hours: hours,
                });
            }

            console.log("\n📈 GODZINY NA PRACOWNIKA:");

            // Średnia długość zmiany (dla obliczenia godzin urlopu)
            const avgShiftHours = 11.5; // 12h - 30min przerwy

            // Funkcja do obliczania liczby dni urlopu
            const countVacationDays = (absences) => {
                let days = 0;
                for (const abs of absences || []) {
                    const start = new Date(abs.start_date);
                    const end = new Date(abs.end_date);
                    days +=
                        Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                }
                return days;
            };

            // Oblicz cele z uwzględnieniem urlopu
            const targets = {};
            for (const emp of inputData.employees) {
                const baseTarget = emp.weekly_hours * 4;
                const vacationDays = countVacationDays(emp.absences);
                const vacationHours = vacationDays * avgShiftHours;
                targets[emp.id] = Math.max(0, baseTarget - vacationHours);
            }

            for (const [empId, hours] of Object.entries(hoursByEmployee)) {
                const target = targets[empId] || 160;
                const diff = hours - target;
                const emp = inputData.employees.find((e) => e.id === empId);
                const name = emp?.name || empId;
                const vacationDays = countVacationDays(emp?.absences);

                const status =
                    Math.abs(diff) <= 0.5
                        ? "✅"
                        : Math.abs(diff) <= 2
                          ? "⚠️"
                          : "❌";
                console.log(
                    `  ${status} ${name}: ${hours.toFixed(1)}h (cel: ${target.toFixed(1)}h${vacationDays > 0 ? `, urlop: ${vacationDays}d` : ""}, diff: ${diff > 0 ? "+" : ""}${diff.toFixed(1)}h)`,
                );
            }

            // Pokaż przykładowe zmiany z różnymi czasami
            console.log("\n📋 PRZYKŁADOWE ZMIANY (różne czasy końca):");
            for (const [empId, shifts] of Object.entries(shiftsByEmployee)) {
                const uniqueEnds = [...new Set(shifts.map((s) => s.end))];
                if (uniqueEnds.length > 1) {
                    console.log(`  ${empId}:`);
                    for (const end of uniqueEnds) {
                        const count = shifts.filter(
                            (s) => s.end === end,
                        ).length;
                        console.log(`    - Koniec o ${end}: ${count} zmian`);
                    }
                }
            }
        } catch (e) {
            console.error("❌ Błąd parsowania:", e.message);
            console.log("Raw response:", data.slice(0, 500));
        }
    });
});

req.on("error", (e) => {
    console.error(`❌ Błąd połączenia: ${e.message}`);
});

req.write(postData);
req.end();
