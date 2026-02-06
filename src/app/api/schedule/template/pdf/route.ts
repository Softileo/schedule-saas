import { NextRequest, NextResponse } from "next/server";

/**
 * Generuje szablon grafiku pracy w formacie PDF (HTML → druk)
 * GET /api/schedule/template/pdf?month=2&year=2026&employees=10
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || "2026", 10);
    const month = parseInt(
        searchParams.get("month") || String(new Date().getMonth() + 1),
        10,
    );
    const employeeCount = parseInt(searchParams.get("employees") || "10", 30);

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

    // Build day headers
    const dayHeaders: { day: number; name: string; isWeekend: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dayOfWeek = date.getDay();
        dayHeaders.push({
            day: d,
            name: DAY_NAMES[dayOfWeek],
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        });
    }

    const html = `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <title>Grafik pracy - ${monthName} ${year}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 9px;
            color: #1a1a1a;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #2563eb;
        }
        .header h1 {
            font-size: 18px;
            font-weight: 700;
            color: #1e3a5f;
        }
        .header p {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        th, td {
            border: 1px solid #cbd5e1;
            padding: 3px 2px;
            text-align: center;
            font-size: 8px;
            vertical-align: middle;
        }
        th {
            background: #f1f5f9;
            font-weight: 600;
            color: #334155;
        }
        th.weekend {
            background: #fee2e2;
            color: #dc2626;
        }
        td.weekend {
            background: #fef2f2;
            color: #b91c1c;
        }
        th.employee-col {
            width: 120px;
            text-align: left;
            padding-left: 6px;
        }
        td.employee-cell {
            text-align: left;
            padding-left: 6px;
            font-weight: 500;
        }
        th.sum-col {
            width: 45px;
            background: #dbeafe;
            color: #1d4ed8;
        }
        td.sum-cell {
            background: #eff6ff;
            font-weight: 600;
        }
        .day-num { display: block; font-size: 9px; font-weight: 700; }
        .day-name { display: block; font-size: 7px; font-weight: 400; }
        .footer {
            margin-top: 16px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #64748b;
        }
        .legend {
            margin-top: 10px;
            font-size: 8px;
            color: #64748b;
        }
        .signature-line {
            display: inline-block;
            width: 200px;
            border-bottom: 1px solid #94a3b8;
            margin-left: 8px;
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Grafik pracy — ${monthName} ${year}</h1>
        <p>Szablon do druku • calenda.pl</p>
    </div>

    <table>
        <thead>
            <tr>
                <th class="employee-col">Pracownik</th>
                ${dayHeaders.map((d) => `<th class="${d.isWeekend ? "weekend" : ""}"><span class="day-num">${d.day}</span><span class="day-name">${d.name}</span></th>`).join("")}
                <th class="sum-col">Σ h</th>
            </tr>
        </thead>
        <tbody>
            ${Array.from(
                { length: employeeCount },
                (_, i) => `
            <tr>
                <td class="employee-cell">${i + 1}.</td>
                ${dayHeaders.map((d) => `<td class="${d.isWeekend ? "weekend" : ""}">${d.isWeekend ? "" : ""}</td>`).join("")}
                <td class="sum-cell"></td>
            </tr>`,
            ).join("")}
        </tbody>
    </table>

    <div class="legend">
        Legenda: W = weekend/wolne &nbsp;|&nbsp; Wpisz symbole zmian lub godziny pracy w puste komórki
    </div>

    <div class="footer">
        <div>Sporządził/a: <span class="signature-line"></span></div>
        <div>Data: <span class="signature-line"></span></div>
    </div>

    <script>window.onload = () => window.print();</script>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
        },
    });
}
