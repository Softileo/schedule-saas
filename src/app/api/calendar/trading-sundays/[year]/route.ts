import { NextRequest, NextResponse } from "next/server";
import { calculateTradingSundays } from "@/lib/api/holidays";
import { logger } from "@/lib/utils/logger";

/**
 * Generuje plik ICS z niedzielami handlowymi
 * GET /api/calendar/trading-sundays/[year]
 */

interface RouteParams {
    params: Promise<{ year: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const { year: yearStr } = await params;
    const year = parseInt(yearStr, 10);

    // Walidacja roku
    if (isNaN(year) || year < 2020 || year > 2030) {
        return NextResponse.json(
            { error: "Nieprawidłowy rok. Dozwolone: 2020-2030" },
            { status: 400 },
        );
    }

    try {
        const tradingSundays = calculateTradingSundays(year);
        const icsContent = generateICSContent(tradingSundays, year);

        return new NextResponse(icsContent, {
            status: 200,
            headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": `attachment; filename="niedziele-handlowe-${year}.ics"`,
            },
        });
    } catch (error) {
        logger.error("Error generating trading sundays calendar:", error);
        return NextResponse.json(
            { error: "Błąd generowania kalendarza" },
            { status: 500 },
        );
    }
}

/**
 * Generuje zawartość pliku ICS
 */
function generateICSContent(dates: string[], year: number): string {
    const now = new Date();
    const timestamp = formatICSDate(now);

    const events = dates.map((dateStr, index) => {
        const date = new Date(dateStr);
        const startDate = formatICSDateOnly(date);

        // Wydarzenie całodniowe - następny dzień jako DTEND
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        const endDateStr = formatICSDateOnly(endDate);

        const reason = getReasonForTradingSunday(dateStr);
        const uid = `niedziele-handlowe-${year}-${index + 1}@calenda.pl`;

        return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${timestamp}
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${endDateStr}
SUMMARY:Niedziela handlowa
DESCRIPTION:${reason}. Sklepy otwarte.
LOCATION:Polska
CATEGORIES:Niedziela handlowa
TRANSP:TRANSPARENT
END:VEVENT`;
    });

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Calenda//Niedziele Handlowe ${year}//PL
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Niedziele handlowe ${year}
X-WR-CALDESC:Kalendarz niedziel handlowych w Polsce - ${year}
${events.join("\n")}
END:VCALENDAR`;
}

/**
 * Formatuje datę do formatu ICS (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
    return date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
}

/**
 * Formatuje datę tylko (YYYYMMDD) dla wydarzeń całodniowych
 */
function formatICSDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
}

/**
 * Zwraca powód dla którego dana niedziela jest handlowa
 */
function getReasonForTradingSunday(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth();

    if (month === 0) {
        return "Ostatnia niedziela stycznia";
    }
    if (month === 2 || month === 3) {
        return "Niedziela przed Wielkanocą";
    }
    if (month === 5) {
        return "Ostatnia niedziela czerwca";
    }
    if (month === 7) {
        return "Ostatnia niedziela sierpnia";
    }
    if (month === 11) {
        return "Przedświąteczna niedziela grudnia";
    }
    return "Niedziela handlowa";
}
