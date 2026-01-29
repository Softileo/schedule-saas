import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format, getDay } from "date-fns";
import type { SchedulePDFData } from "./pdf-types";
import { lightenColor, chunkEmployeesCustom } from "./pdf-utils";
import { MONTH_NAMES, formatTime } from "@/lib/utils/date-helpers";
import { createHolidaysMap, isTradingSunday } from "@/lib/core/schedule/utils";
import {
    registerPDFFont,
    generateDaysInMonth,
    getActiveShifts,
    createShiftGetter,
    getCellBackgroundColor,
    renderLegend,
} from "./pdf-shared";
import { renderTableHeaderRow } from "./pdf-renderers";

// Wywołaj rejestrację fontu
registerPDFFont();

// Pastelowa, minimalistyczna paleta - jak design /grafik
const COLORS = {
    // Tło
    pageBg: "#ffffff",

    // Nagłówek - pastelowy, delikatny
    headerBg: "#f8fafc",

    // Tła dni specjalnych - delikatne pastele
    bgHoliday: "#fef2f2", // bardzo delikatny czerwony
    bgWeekend: "#f8fafc", // slate-50
    bgTradingSunday: "#effff2", // bardzo delikatny niebieski

    // Tekst
    textDark: "#1e293b",
    textMuted: "#64748b",
    textLight: "#94a3b8",
    white: "#ffffff",

    // Bordery - bardzo delikatne
    border: "#e2e8f0",
    borderLight: "#8f8f8f",
};

const styles = StyleSheet.create({
    page: {
        paddingTop: 20,
        paddingBottom: 10,
        paddingHorizontal: 30,
        fontFamily: "Roboto",
        backgroundColor: COLORS.pageBg,
    },

    // --- NAGŁÓWEK (nieco bardziej kompaktowy, by zyskać miejsce) ---
    header: {
        marginBottom: 15,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.textDark,
        paddingLeft: 10,
        height: 40, // Stała wysokość nagłówka
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        height: "100%",
    },

    headerLeft: {
        justifyContent: "center",
    },

    headerRight: {
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: "100%",
        width: 100,
    },
    headerTitle: {
        fontSize: 18, // Nieco mniejszy font
        fontWeight: 700,
        color: COLORS.textDark,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 8,
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: 1.2,
        marginTop: 2,
    },
    headerMonth: {
        position: "absolute",
        right: 0,
        top: 5,
        fontSize: 12,
        fontWeight: 700,
        color: COLORS.textLight,
    },

    // --- TABELA ---
    tableContainer: {
        width: "100%",
    },
    headerRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        paddingBottom: 4,
        height: 20,
        alignItems: "center",
    },
    employeeHeaderCell: {
        width: 100,
    },
    employeeHeaderText: {
        fontSize: 7,
        fontWeight: 700,
        color: COLORS.textMuted,
    },
    dayHeaderCell: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.bgWeekend,
    },
    dayHeaderNumber: {
        fontSize: 8,
        fontWeight: 700,
        color: COLORS.textDark,
    },
    dayHeaderName: {
        fontSize: 5,
        fontWeight: 700,
        color: COLORS.textDark,
        textTransform: "uppercase",
    },

    // --- WIERSZE (Klucz do zmieszczenia 13 osób) ---
    dataRow: {
        flexDirection: "row",
        height: 30,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        alignItems: "stretch",
    },
    employeeCell: {
        width: 100,
        flexDirection: "row",
        alignItems: "center",
    },
    employeeDot: {
        width: 3,
        height: 12,
        borderRadius: 1,
        marginRight: 3,
    },
    employeeName: {
        fontSize: 7.5,
        fontWeight: 700,
        color: COLORS.textDark,
    },

    // --- KOMÓRKA ZMIANY ---
    shiftCell: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 0.5,
    },
    shiftPill: {
        width: "95%",
        height: "70%",
        borderRadius: 4,
        borderWidth: 0.5,
        justifyContent: "center",
        alignItems: "center",
    },
    shiftTimeStart: {
        fontSize: 5.5,
        fontWeight: 700,
    },
    shiftTimeEnd: {
        fontSize: 5.5,
        marginTop: 0.5,
        fontWeight: 700,
    },

    // --- LEGENDA ---
    legend: {
        marginTop: 10,
        flexDirection: "row",
        gap: 15,
        height: 15,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 2,
    },
    legendText: {
        fontSize: 6.5,
        color: COLORS.textMuted,
    },
    footer: {
        position: "absolute",
        bottom: 15,
        right: 30,
    },
    footerText: {
        fontSize: 7,
        color: COLORS.textLight,
    },
});

interface PDFTemplateColorfulProps {
    data: SchedulePDFData;
}

export function PDFTemplateColorful({ data }: PDFTemplateColorfulProps) {
    const {
        organizationName,
        year,
        month,
        employees,
        shifts,
        holidays,
        organizationSettings,
    } = data;

    const daysInMonth = generateDaysInMonth(year, month);
    const holidaysMap = createHolidaysMap(holidays);
    const activeShifts = getActiveShifts(data);
    const dayColumnWidth = (842 - 48 - 90) / daysInMonth.length;
    const getShiftForDay = createShiftGetter(shifts);

    const getCellBgColor = (day: Date): string => {
        return getCellBackgroundColor(
            day,
            holidays,
            organizationSettings,
            COLORS,
        );
    };

    const employeePages = chunkEmployeesCustom(employees, 15, 17);
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
                    {/* Nagłówek - tylko na pierwszej stronie */}
                    {pageIndex === 0 && (
                        <View style={styles.header}>
                            <View style={styles.headerContent}>
                                <View style={styles.headerLeft}>
                                    <Text style={styles.headerTitle}>
                                        {organizationName}
                                    </Text>
                                    <Text style={styles.headerSubtitle}>
                                        Grafik pracy
                                    </Text>
                                </View>
                                <View style={styles.headerRight}>
                                    <Text style={styles.headerMonth}>
                                        {MONTH_NAMES[month - 1]} {year}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Tabela */}
                    <View style={styles.tableContainer}>
                        {renderTableHeaderRow(
                            daysInMonth,
                            dayColumnWidth,
                            getCellBgColor,
                            styles,
                        )}

                        {pageEmployees.map((employee) => {
                            const employeeColor = employee.color || "#6366f1";

                            return (
                                <View key={employee.id} style={styles.dataRow}>
                                    <View style={styles.employeeCell}>
                                        <View
                                            style={[
                                                styles.employeeDot,
                                                {
                                                    backgroundColor:
                                                        employeeColor,
                                                },
                                            ]}
                                        />
                                        <Text style={styles.employeeName}>
                                            {employee.first_name}{" "}
                                            {employee.last_name.charAt(0)}.
                                        </Text>
                                    </View>
                                    {daysInMonth.map((day) => {
                                        const dateStr = format(
                                            day,
                                            "yyyy-MM-dd",
                                        );
                                        const shift = getShiftForDay(
                                            employee.id,
                                            dateStr,
                                        );
                                        const bgColor = getCellBgColor(day);
                                        const shiftColor =
                                            shift?.color || employeeColor;

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
                                                        style={[
                                                            styles.shiftPill,
                                                            {
                                                                backgroundColor:
                                                                    lightenColor(
                                                                        shiftColor,
                                                                        92,
                                                                    ),
                                                                borderColor:
                                                                    lightenColor(
                                                                        shiftColor,
                                                                        70,
                                                                    ),
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.shiftTimeStart,
                                                                {
                                                                    color: shiftColor,
                                                                },
                                                            ]}
                                                        >
                                                            {formatTime(
                                                                shift.start_time,
                                                            )}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.shiftTimeEnd,
                                                                {
                                                                    color: shiftColor,
                                                                },
                                                            ]}
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
                            );
                        })}
                    </View>

                    {/* Legenda */}
                    {pageIndex === 0 && renderLegend(styles, COLORS)}

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
