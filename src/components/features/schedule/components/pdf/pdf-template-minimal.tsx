import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";
import {
    format,
    eachDayOfInterval,
    startOfMonth,
    endOfMonth,
    getDay,
} from "date-fns";
import type { SchedulePDFData } from "./pdf-types";
import { getDayName, chunkArray } from "./pdf-utils";
import { formatTime } from "@/lib/utils/date-helpers";
import { MONTH_NAMES } from "@/lib/utils/date-helpers";
import { createHolidaysMap, isTradingSunday } from "@/lib/core/schedule/utils";

// Rejestracja fontu
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

// Ultra minimalistyczna paleta - tylko szarości
const COLORS = {
    black: "#000000",
    darkGray: "#374151",
    gray: "#9ca3af",
    lightGray: "#e5e7eb",
    veryLightGray: "#f9fafb",
    white: "#ffffff",

    // Dni specjalne - bardzo subtelne
    bgHoliday: "#fef2f2",
    bgWeekend: "#f9fafb",
    bgTradingSunday: "#eff6ff",
};

const styles = StyleSheet.create({
    page: {
        padding: 28,
        fontFamily: "Roboto",
        fontSize: 8,
        backgroundColor: COLORS.white,
    },

    // Header - absolutny minimalizm
    header: {
        marginBottom: 24,
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
    },
    title: {
        fontSize: 22,
        fontWeight: 700,
        color: COLORS.black,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 9,
        color: COLORS.gray,
        marginTop: 2,
    },
    monthYear: {
        fontSize: 10,
        color: COLORS.gray,
        letterSpacing: 1,
    },

    // Table - bez ramek
    table: {
        display: "flex",
        flexDirection: "column",
    },

    // Header row - tylko podkreślenie
    headerRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
        borderBottomStyle: "solid",
        paddingBottom: 8,
        marginBottom: 4,
    },
    employeeHeaderCell: {
        width: 100,
    },
    employeeHeaderText: {
        fontSize: 7,
        color: COLORS.gray,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    dayHeaderCell: {
        alignItems: "center",
        justifyContent: "flex-end",
    },
    dayNumber: {
        fontSize: 10,
        fontWeight: 700,
        color: COLORS.darkGray,
    },
    dayName: {
        fontSize: 5,
        color: COLORS.gray,
        marginTop: 2,
        textTransform: "uppercase",
    },

    // Data rows
    dataRow: {
        flexDirection: "row",
        minHeight: 26,
        alignItems: "center",
    },

    // Employee cell
    employeeCell: {
        width: 100,
        paddingVertical: 6,
    },
    employeeName: {
        fontSize: 7,
        color: COLORS.darkGray,
    },

    // Shift cell
    shiftCell: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
    },

    // Shift - tylko tekst, bez niczego więcej
    shiftContent: {
        alignItems: "center",
    },
    shiftTimeStart: {
        fontSize: 6,
        fontWeight: 700,
        color: COLORS.darkGray,
        textAlign: "center",
    },
    shiftTimeEnd: {
        fontSize: 5,
        color: COLORS.gray,
        textAlign: "center",
        marginTop: 1,
    },

    // Legend - dyskretna
    legend: {
        marginTop: 20,
        flexDirection: "row",
        gap: 16,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 1,
    },
    legendText: {
        fontSize: 6,
        color: COLORS.gray,
    },

    // Footer
    footer: {
        position: "absolute",
        bottom: 24,
        left: 28,
        right: 28,
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    footerText: {
        fontSize: 7,
        color: COLORS.gray,
    },
});

interface PDFTemplateMinimalProps {
    data: SchedulePDFData;
}

const EMPLOYEES_PER_PAGE = 16;

export function PDFTemplateMinimal({ data }: PDFTemplateMinimalProps) {
    const {
        organizationName,
        year,
        month,
        employees,
        shifts,
        holidays,
        organizationSettings,
    } = data;

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(new Date(year, month - 1)),
        end: endOfMonth(new Date(year, month - 1)),
    });

    const holidaysMap = createHolidaysMap(holidays);
    const activeShifts = shifts.filter((s) => s.status !== "deleted");
    const dayColumnWidth = (842 - 56 - 100) / daysInMonth.length;

    const getShiftForDay = (employeeId: string, date: string) => {
        return activeShifts.find(
            (s) => s.employee_id === employeeId && s.date === date,
        );
    };

    const getCellBgColor = (day: Date): string => {
        const dateStr = format(day, "yyyy-MM-dd");
        const holiday = holidaysMap.get(dateStr);
        const dayOfWeek = getDay(day);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isTrading =
            dayOfWeek === 0 && isTradingSunday(day, organizationSettings);

        if (holiday) return COLORS.bgHoliday;
        if (isTrading) return COLORS.bgTradingSunday;
        if (isWeekend) return COLORS.bgWeekend;
        return "transparent";
    };

    const employeePages = chunkArray(employees, EMPLOYEES_PER_PAGE);
    const totalPages = employeePages.length;

    return (
        <Document>
            {employeePages.map((pageEmployees, pageIndex) => (
                <Page
                    key={pageIndex}
                    size="A4"
                    orientation="landscape"
                    style={styles.page}
                >
                    {/* Nagłówek */}
                    {pageIndex === 0 && (
                        <View style={styles.header}>
                            <View style={styles.headerContent}>
                                <View>
                                    <Text style={styles.title}>
                                        {organizationName}
                                    </Text>
                                    <Text style={styles.subtitle}>
                                        Grafik pracy
                                    </Text>
                                </View>
                                <Text style={styles.monthYear}>
                                    {MONTH_NAMES[month - 1]} {year}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Tabela */}
                    <View style={styles.table}>
                        <View style={styles.headerRow}>
                            <View style={styles.employeeHeaderCell}>
                                <Text style={styles.employeeHeaderText}>
                                    Pracownik
                                </Text>
                            </View>
                            {daysInMonth.map((day) => {
                                const dateStr = format(day, "yyyy-MM-dd");
                                const bgColor = getCellBgColor(day);
                                return (
                                    <View
                                        key={dateStr}
                                        style={[
                                            styles.dayHeaderCell,
                                            { width: dayColumnWidth },
                                            bgColor !== "transparent"
                                                ? { backgroundColor: bgColor }
                                                : {},
                                        ]}
                                    >
                                        <Text style={styles.dayNumber}>
                                            {format(day, "d")}
                                        </Text>
                                        <Text style={styles.dayName}>
                                            {getDayName(day)}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        {pageEmployees.map((employee) => (
                            <View key={employee.id} style={styles.dataRow}>
                                <View style={styles.employeeCell}>
                                    <Text style={styles.employeeName}>
                                        {employee.first_name}{" "}
                                        {employee.last_name.charAt(0)}.
                                    </Text>
                                </View>
                                {daysInMonth.map((day) => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const shift = getShiftForDay(
                                        employee.id,
                                        dateStr,
                                    );
                                    const bgColor = getCellBgColor(day);

                                    return (
                                        <View
                                            key={dateStr}
                                            style={[
                                                styles.shiftCell,
                                                { width: dayColumnWidth },
                                                bgColor !== "transparent"
                                                    ? {
                                                          backgroundColor:
                                                              bgColor,
                                                      }
                                                    : {},
                                            ]}
                                        >
                                            {shift && (
                                                <View
                                                    style={styles.shiftContent}
                                                >
                                                    <Text
                                                        style={
                                                            styles.shiftTimeStart
                                                        }
                                                    >
                                                        {formatTime(
                                                            shift.start_time,
                                                        )}
                                                    </Text>
                                                    <Text
                                                        style={
                                                            styles.shiftTimeEnd
                                                        }
                                                    >
                                                        {formatTime(
                                                            shift.end_time,
                                                        )}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>

                    {/* Legenda - tylko na pierwszej stronie */}
                    {pageIndex === 0 && (
                        <View style={styles.legend}>
                            <View style={styles.legendItem}>
                                <View
                                    style={[
                                        styles.legendDot,
                                        { backgroundColor: COLORS.bgHoliday },
                                    ]}
                                />
                                <Text style={styles.legendText}>Święto</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View
                                    style={[
                                        styles.legendDot,
                                        { backgroundColor: COLORS.bgWeekend },
                                    ]}
                                />
                                <Text style={styles.legendText}>Zamknięte</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View
                                    style={[
                                        styles.legendDot,
                                        {
                                            backgroundColor:
                                                COLORS.bgTradingSunday,
                                        },
                                    ]}
                                />
                                <Text style={styles.legendText}>
                                    Niedziela handlowa
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Stopka */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            {pageIndex + 1} / {totalPages}
                        </Text>
                    </View>
                </Page>
            ))}
        </Document>
    );
}
