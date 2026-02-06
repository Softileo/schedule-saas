import { NextRequest, NextResponse } from "next/server";

/**
 * Generuje szablon grafiku pracy w formacie CSV
 * GET /api/schedule/template/csv?month=2&year=2026&employees=5
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || "2026", 10);
    const month = parseInt(
        searchParams.get("month") || String(new Date().getMonth() + 1),
        10,
    );
    const employeeCount = parseInt(searchParams.get("employees") || "5", 10);

    if (isNaN(year) || year < 2020 || year > 2030) {
        return NextResponse.json(
            { error: "Nieprawidłowy rok" },
            { status: 400 },
        );
    }
    if (isNaN(month) || month < 1 || month > 12) {
        return NextResponse.json(
            { error: "Nieprawidłowy miesiąc" },
            { status: 400 },
        );
    }
    if (isNaN(employeeCount) || employeeCount < 1 || employeeCount > 50) {
        return NextResponse.json(
            { error: "Nieprawidłowa liczba pracowników (1-50)" },
            { status: 400 },
        );
    }

    const MONTH_NAMES = [
        "Styczeń",
        "Luty",
        "Marzec",
        "Kwiecień",
        "Maj",
        "Czerwiec",
        "Lipiec",
        "Sierpień",
        "Wrzesień",
        "Październik",
        "Listopad",
        "Grudzień",
    ];
    const DAY_NAMES = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

    const monthName = MONTH_NAMES[month - 1];
    const daysInMonth = new Date(year, month, 0).getDate();

    // BOM for UTF-8 Excel compatibility
    const BOM = "\uFEFF";

    // Build header row
    const headers = ["Pracownik"];
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dayName = DAY_NAMES[date.getDay()];
        headers.push(`${d} ${dayName}`);
    }
    headers.push("Suma godzin");

    // Build employee rows
    const rows: string[][] = [];
    for (let e = 1; e <= employeeCount; e++) {
        const row = [`Pracownik ${e}`];
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month - 1, d);
            const dayOfWeek = date.getDay();
            // Mark weekends
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                row.push("W");
            } else {
                row.push("");
            }
        }
        row.push(""); // Suma godzin - empty for user to fill
        rows.push(row);
    }

    // Build CSV content
    const csvLines: string[] = [];
    // Title row
    csvLines.push(`Grafik pracy - ${monthName} ${year}`);
    csvLines.push(headers.map(escapeCSV).join(";"));
    rows.forEach((row) => {
        csvLines.push(row.map(escapeCSV).join(";"));
    });

    const csvContent = BOM + csvLines.join("\r\n");
    const filename = `grafik-pracy-${monthName.toLowerCase()}-${year}.csv`;

    return new NextResponse(csvContent, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}

function escapeCSV(value: string): string {
    if (value.includes(";") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
