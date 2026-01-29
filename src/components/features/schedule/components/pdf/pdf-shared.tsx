import { Font, View, Text } from "@react-pdf/renderer";
import {
    format,
    eachDayOfInterval,
    startOfMonth,
    endOfMonth,
    getDay,
} from "date-fns";
import { createHolidaysMap, isTradingSunday } from "@/lib/core/schedule/utils";
import { getDayName } from "./pdf-utils";
import type { SchedulePDFData } from "./pdf-types";
import type { PublicHoliday, OrganizationSettings } from "@/types";

// Wspólna rejestracja fontów dla wszystkich szablonów
export function registerPDFFont() {
    Font.register({
        family: "Roboto",
        fonts: [
            {
                src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
                fontWeight: 400,
            },
            {
                src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
                fontWeight: 700,
            },
        ],
    });
}

// Wspólna logika generowania dni w miesiącu
export function generateDaysInMonth(year: number, month: number) {
    return eachDayOfInterval({
        start: startOfMonth(new Date(year, month - 1)),
        end: endOfMonth(new Date(year, month - 1)),
    });
}

// Wspólna logika filtrowania aktywnych zmian
export function getActiveShifts(data: SchedulePDFData) {
    return data.shifts.filter((s) => s.status !== "deleted");
}

// Wspólna funkcja do pobierania zmiany dla pracownika w danym dniu
export function createShiftGetter(shifts: SchedulePDFData["shifts"]) {
    const activeShifts = shifts.filter((s) => s.status !== "deleted");
    return (employeeId: string, date: string) => {
        return activeShifts.find(
            (s) => s.employee_id === employeeId && s.date === date,
        );
    };
}

// Wspólna logika określania koloru tła komórki na podstawie dnia
export function getCellBackgroundColor(
    day: Date,
    holidays: PublicHoliday[],
    organizationSettings?: OrganizationSettings | null,
    colors?: {
        bgHoliday: string;
        bgWeekend: string;
        bgTradingSunday: string;
    },
): string {
    const dateStr = format(day, "yyyy-MM-dd");
    const holidaysMap = createHolidaysMap(holidays);
    const holiday = holidaysMap.get(dateStr);
    const dayOfWeek = getDay(day);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isTrading =
        organizationSettings &&
        dayOfWeek === 0 &&
        isTradingSunday(day, organizationSettings);

    if (colors) {
        if (holiday) return colors.bgHoliday;
        if (isTrading) return colors.bgTradingSunday;
        if (isWeekend) return colors.bgWeekend;
    }

    return "transparent";
}

// Interfejs dla konfiguracji kolumndy dzień
export interface DayColumnConfig {
    totalWidth: number; // Całkowita szerokość (np. 842 dla A4 landscape)
    leftMargin: number; // Margines lewy
    rightMargin: number; // Margines prawy
    employeeCellWidth: number; // Szerokość kolumny pracownika
    daysCount: number; // Liczba dni w miesiącu
}

// Wspólna funkcja do obliczania szerokości kolumny dnia
export function calculateDayColumnWidth(config: DayColumnConfig): number {
    const {
        totalWidth,
        leftMargin,
        rightMargin,
        employeeCellWidth,
        daysCount,
    } = config;
    return (
        (totalWidth - leftMargin - rightMargin - employeeCellWidth) / daysCount
    );
}

// Typ dla renderer'a header'a dnia
export interface DayHeaderData {
    day: Date;
    dateStr: string;
    bgColor: string;
    width: number;
}

// Typ dla renderer'a komórki zmiany
export interface ShiftCellData {
    dateStr: string;
    shift?: SchedulePDFData["shifts"][0];
    bgColor: string;
    width: number;
}

// Eksportuj helper do tworzenia mapy świąt dla wygody
export { createHolidaysMap, getDayName };

// Komponent legendy (wspólny dla wszystkich szablonów)
export function renderLegend(
    styles: {
        legend: any;
        legendItem: any;
        legendDot: any;
        legendText: any;
    },
    colors: {
        bgHoliday: string;
        bgWeekend: string;
        bgTradingSunday: string;
    },
) {
    return (
        <View style={styles.legend}>
            <View style={styles.legendItem}>
                <View
                    style={[
                        styles.legendDot,
                        { backgroundColor: colors.bgHoliday },
                    ]}
                />
                <Text style={styles.legendText}>Święto</Text>
            </View>
            <View style={styles.legendItem}>
                <View
                    style={[
                        styles.legendDot,
                        { backgroundColor: colors.bgWeekend },
                    ]}
                />
                <Text style={styles.legendText}>Zamknięte</Text>
            </View>
            <View style={styles.legendItem}>
                <View
                    style={[
                        styles.legendDot,
                        { backgroundColor: colors.bgTradingSunday },
                    ]}
                />
                <Text style={styles.legendText}>Niedziela handlowa</Text>
            </View>
        </View>
    );
}
