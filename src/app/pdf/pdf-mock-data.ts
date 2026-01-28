import { SchedulePDFData } from "@/components/features/schedule/components/pdf";

const generate160hShifts = (employees: any[]) => {
    const shifts: any[] = [];
    const workingDaysCount = 20; // 20 dni * 8h = 160h

    employees.forEach((emp, index) => {
        // Każdy pracownik zaczyna "offsetem", żeby grafiki nie były identyczne
        let shiftsAssigned = 0;
        let dayCounter = 1;

        while (shiftsAssigned < workingDaysCount && dayCounter <= 31) {
            const dateStr = `2024-05-${String(dayCounter).padStart(2, "0")}`;

            // Logika "wakacyjna": co 4 dni pracy, 2 dni wolnego (w uproszczeniu)
            // Dodatkowo przesuwamy start każdego pracownika o jego index
            if (
                (dayCounter + index) % 7 !== 0 &&
                (dayCounter + index) % 7 !== 6
            ) {
                shifts.push({
                    id: `shift-${emp.id}-${dayCounter}`,
                    employee_id: emp.id,
                    date: dateStr,
                    start_time: "08:00",
                    end_time: "16:00",
                    status: "unchanged",
                    color: null,
                });
                shiftsAssigned++;
            }
            dayCounter++;
        }
    });

    return shifts;
};

// --- ROZSZERZONE DANE TESTOWE (17 pracowników, ~50 zmian) ---
export const MOCK_DATA: SchedulePDFData = {
    organizationName: "Design Studio Creative",
    year: 2024,
    month: 5,
    employees: [
        {
            id: "1",
            first_name: "Anna",
            last_name: "Kowalska",
            color: "#ec4899",
        } as any,
        {
            id: "2",
            first_name: "Marek",
            last_name: "Nowak",
            color: "#3b82f6",
        } as any,
        {
            id: "3",
            first_name: "Krzysztof",
            last_name: "Zieliński",
            color: "#10b981",
        } as any,
        {
            id: "4",
            first_name: "Magdalena",
            last_name: "Wójcik",
            color: "#f59e0b",
        } as any,
        {
            id: "5",
            first_name: "Tomasz",
            last_name: "Mazur",
            color: "#6366f1",
        } as any,
        {
            id: "6",
            first_name: "Ewa",
            last_name: "Krawczyk",
            color: "#8b5cf6",
        } as any,
        {
            id: "7",
            first_name: "Piotr",
            last_name: "Adamczyk",
            color: "#06b6d4",
        } as any,
        {
            id: "8",
            first_name: "Karolina",
            last_name: "Dudek",
            color: "#f43f5e",
        } as any,
        {
            id: "9",
            first_name: "Paweł",
            last_name: "Zając",
            color: "#14b8a6",
        } as any,
        {
            id: "10",
            first_name: "Zofia",
            last_name: "Król",
            color: "#f97316",
        } as any,
        {
            id: "11",
            first_name: "Adam",
            last_name: "Wieczorek",
            color: "#4ade80",
        } as any,
        {
            id: "12",
            first_name: "Monika",
            last_name: "Wróbel",
            color: "#fb7185",
        } as any,
        {
            id: "13",
            first_name: "Robert",
            last_name: "Stępień",
            color: "#2dd4bf",
        } as any, {
            id: "1",
            first_name: "Anna",
            last_name: "Kowalska",
            color: "#ec4899",
        } as any,
        {
            id: "2",
            first_name: "Marek",
            last_name: "Nowak",
            color: "#3b82f6",
        } as any,
        {
            id: "3",
            first_name: "Krzysztof",
            last_name: "Zieliński",
            color: "#10b981",
        } as any,
        {
            id: "4",
            first_name: "Magdalena",
            last_name: "Wójcik",
            color: "#f59e0b",
        } as any,
        {
            id: "5",
            first_name: "Tomasz",
            last_name: "Mazur",
            color: "#6366f1",
        } as any,
        {
            id: "6",
            first_name: "Ewa",
            last_name: "Krawczyk",
            color: "#8b5cf6",
        } as any,
        {
            id: "7",
            first_name: "Piotr",
            last_name: "Adamczyk",
            color: "#06b6d4",
        } as any,
        {
            id: "8",
            first_name: "Karolina",
            last_name: "Dudek",
            color: "#f43f5e",
        } as any,
        {
            id: "9",
            first_name: "Paweł",
            last_name: "Zając",
            color: "#14b8a6",
        } as any,
        {
            id: "10",
            first_name: "Zofia",
            last_name: "Król",
            color: "#f97316",
        } as any,
        {
            id: "11",
            first_name: "Adam",
            last_name: "Wieczorek",
            color: "#4ade80",
        } as any,
        {
            id: "12",
            first_name: "Monika",
            last_name: "Wróbel",
            color: "#fb7185",
        } as any,
        {
            id: "13",
            first_name: "Robert",
            last_name: "Stępień",
            color: "#2dd4bf",
        } as any, {
            id: "1",
            first_name: "Anna",
            last_name: "Kowalska",
            color: "#ec4899",
        } as any,
        {
            id: "2",
            first_name: "Marek",
            last_name: "Nowak",
            color: "#3b82f6",
        } as any,
        {
            id: "3",
            first_name: "Krzysztof",
            last_name: "Zieliński",
            color: "#10b981",
        } as any,
        {
            id: "4",
            first_name: "Magdalena",
            last_name: "Wójcik",
            color: "#f59e0b",
        } as any,
        {
            id: "5",
            first_name: "Tomasz",
            last_name: "Mazur",
            color: "#6366f1",
        } as any,
        {
            id: "6",
            first_name: "Ewa",
            last_name: "Krawczyk",
            color: "#8b5cf6",
        } as any,
        {
            id: "7",
            first_name: "Piotr",
            last_name: "Adamczyk",
            color: "#06b6d4",
        } as any,
        {
            id: "8",
            first_name: "Karolina",
            last_name: "Dudek",
            color: "#f43f5e",
        } as any,
        {
            id: "9",
            first_name: "Paweł",
            last_name: "Zając",
            color: "#14b8a6",
        } as any,
        {
            id: "10",
            first_name: "Zofia",
            last_name: "Król",
            color: "#f97316",
        } as any,
        {
            id: "11",
            first_name: "Adam",
            last_name: "Wieczorek",
            color: "#4ade80",
        } as any,
        {
            id: "12",
            first_name: "Monika",
            last_name: "Wróbel",
            color: "#fb7185",
        } as any,
        {
            id: "13",
            first_name: "Robert",
            last_name: "Stępień",
            color: "#2dd4bf",
        } as any,
        {
            id: "14",
            first_name: "Katarzyna",
            last_name: "Woźniak",
            color: "#a855f7",
        } as any,
        {
            id: "15",
            first_name: "Jan",
            last_name: "Kwiatkowski",
            color: "#3b82f6",
        } as any,
        {
            id: "16",
            first_name: "Barbara",
            last_name: "Szymańska",
            color: "#e879f9",
        } as any,
        {
            id: "17",
            first_name: "Michał",
            last_name: "Kaczmarek",
            color: "#64748b",
        } as any,
    ],
    shifts: [
        ...(() => {
            const generatedShifts: any[] = [];
            const shiftWindows = [
                { start: "07:00", end: "15:00" },
                { start: "08:00", end: "16:00" },
                { start: "10:00", end: "18:00" },
                { start: "14:00", end: "22:00" },
            ];

            // Dla każdego z 17 pracowników
            for (let empIdx = 1; empIdx <= 17; empIdx++) {
                let shiftsForThisEmp = 0;
                const maxShifts = 20; // Celujemy w 160h (20 dni * 8h)

                // Przechodzimy przez dni maja (1-31)
                for (let day = 1; day <= 31; day++) {
                    // Warunki:
                    // 1. Prawdopodobieństwo ~65% na zmianę w dany dzień
                    // 2. Nie więcej niż 20 zmian na osobę
                    // 3. Losowe "dziury" (Math.random)
                    if (shiftsForThisEmp < maxShifts && Math.random() > 0.35) {
                        const window =
                            shiftWindows[
                                Math.floor(Math.random() * shiftWindows.length)
                            ];

                        generatedShifts.push({
                            id: `s-emp${empIdx}-d${day}`,
                            employee_id: String(empIdx),
                            date: `2024-05-${String(day).padStart(2, "0")}`,
                            start_time: window.start,
                            end_time: window.end,
                            status: "unchanged",
                            color: Math.random() > 0.9 ? "#f43f5e" : null, // Co 10-ta zmiana ma custom kolor
                        });

                        shiftsForThisEmp++;
                    }
                }
            }
            return generatedShifts;
        })(),
    ] as any,
    holidays: [
        { date: "2024-05-01", localName: "Święto Pracy" } as any,
        { date: "2024-05-03", localName: "Święto Konstytucji" } as any,
        { date: "2024-05-19", localName: "Zielone Świątki" } as any,
        { date: "2024-05-30", localName: "Boże Ciało" } as any,
    ],
    organizationSettings: {
        trading_sundays: ["2024-05-26"],
    } as any,
    shiftTemplates: [],
    employeeHours: new Map(),
};
