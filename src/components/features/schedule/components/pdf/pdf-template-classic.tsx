import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import {
    chunkEmployeesCustom,
    getDayBackgroundColor,
    getDayName,
} from "./pdf-utils";
import { formatTime } from "@/lib/utils/date-helpers";
import { MONTH_NAMES } from "@/lib/utils/date-helpers";
import { createHolidaysMap } from "@/lib/core/schedule/utils";
import { SchedulePDFData } from "./pdf-types";

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

const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontFamily: "Roboto",
        fontSize: 8,
        backgroundColor: "#ffffff",
    },
    header: {
        marginBottom: 15,
        borderBottom: "2px solid #1e293b",
        paddingBottom: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: 700,
        color: "#1e293b",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 10,
        color: "#64748b",
    },
    table: {
        display: "flex",
        flexDirection: "column",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderStyle: "solid",
    },
    headerRow: {
        flexDirection: "row",
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
        borderBottomStyle: "solid",
    },
    employeeHeaderCell: {
        width: 80,
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: "#cbd5e1",
        borderRightStyle: "solid",
        justifyContent: "center",
    },
    dayHeaderCell: {
        padding: 3,
        borderRightWidth: 1,
        borderRightColor: "#e2e8f0",
        borderRightStyle: "solid",
        alignItems: "center",
        justifyContent: "center",
    },
    dayNumber: {
        fontSize: 9,
        fontWeight: 700,
        color: "#1e293b",
    },
    dayName: {
        fontSize: 6,
        color: "#64748b",
        marginTop: 1,
    },
    dataRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        borderBottomStyle: "solid",
        minHeight: 24,
    },
    employeeCell: {
        width: 80,
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: "#cbd5e1",
        borderRightStyle: "solid",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
    },
    employeeName: {
        fontSize: 7,
        fontWeight: 700,
        color: "#334155",
    },
    shiftCell: {
        padding: 2,
        borderRightWidth: 1,
        borderRightColor: "#e2e8f0",
        borderRightStyle: "solid",
        alignItems: "center",
        justifyContent: "center",
    },
    shiftTime: {
        fontSize: 6,
        color: "#334155",
        textAlign: "center",
    },
    summarySection: {
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: "#cbd5e1",
        borderTopStyle: "solid",
        paddingTop: 10,
    },
    summaryTitle: {
        fontSize: 10,
        fontWeight: 700,
        color: "#1e293b",
        marginBottom: 8,
    },
    summaryTable: {
        display: "flex",
        flexDirection: "column",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderStyle: "solid",
    },
    summaryHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
        borderBottomStyle: "solid",
    },
    summaryDataRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        borderBottomStyle: "solid",
    },
    summaryCell: {
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: "#e2e8f0",
        borderRightStyle: "solid",
    },
    summaryHeaderText: {
        fontSize: 7,
        fontWeight: 700,
        color: "#334155",
    },
    summaryText: {
        fontSize: 7,
        color: "#475569",
    },
    legend: {
        marginTop: 10,
        flexDirection: "row",
        gap: 15,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    legendColor: {
        width: 12,
        height: 8,
        borderRadius: 2,
    },
    legendText: {
        fontSize: 6,
        color: "#64748b",
    },
    footer: {
        position: "absolute",
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        fontSize: 6,
        color: "#94a3b8",
    },
});

interface PDFTemplateClassicProps {
    data: SchedulePDFData;
}

export function PDFTemplateClassic({ data }: PDFTemplateClassicProps) {
    const {
        organizationName,
        year,
        month,
        employees,
        shifts,
        holidays,
        organizationSettings,
    } = data;

    // Generuj dni miesiąca
    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(new Date(year, month - 1)),
        end: endOfMonth(new Date(year, month - 1)),
    });

    // Mapa świąt
    const holidaysMap = createHolidaysMap(holidays);

    // Aktywne zmiany
    const activeShifts = shifts.filter((s) => s.status !== "deleted");

    // Oblicz szerokość kolumny
    const dayColumnWidth = (842 - 40 - 80) / daysInMonth.length;

    // Pobierz zmianę dla pracownika w danym dniu
    const getShiftForDay = (employeeId: string, date: string) => {
        return activeShifts.find(
            (s) => s.employee_id === employeeId && s.date === date,
        );
    };

    // Podziel pracowników na strony
    const employeePages = chunkEmployeesCustom(employees, 18, 20);
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
                            <Text style={styles.title}>
                                Grafik pracy - {MONTH_NAMES[month - 1]} {year}
                            </Text>
                            <Text style={styles.subtitle}>
                                {organizationName}
                            </Text>
                        </View>
                    )}

                    {/* Tabela grafiku */}
                    <View style={styles.table}>
                        {/* Nagłówek tabeli z dniami */}
                        <View style={styles.headerRow}>
                            <View style={styles.employeeHeaderCell}>
                                <Text style={styles.dayNumber}>Pracownik</Text>
                            </View>
                            {daysInMonth.map((day) => {
                                const dateStr = format(day, "yyyy-MM-dd");
                                const bgColor = getDayBackgroundColor(
                                    day,
                                    holidaysMap,
                                    organizationSettings,
                                );
                                return (
                                    <View
                                        key={dateStr}
                                        style={[
                                            styles.dayHeaderCell,
                                            {
                                                width: dayColumnWidth,
                                                backgroundColor: bgColor,
                                            },
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

                        {/* Wiersze pracowników dla tej strony */}
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
                                    const bgColor = getDayBackgroundColor(
                                        day,
                                        holidaysMap,
                                        organizationSettings,
                                    );
                                    return (
                                        <View
                                            key={dateStr}
                                            style={[
                                                styles.shiftCell,
                                                {
                                                    width: dayColumnWidth,
                                                    backgroundColor: bgColor,
                                                },
                                            ]}
                                        >
                                            {shift && (
                                                <Text style={styles.shiftTime}>
                                                    {formatTime(
                                                        shift.start_time,
                                                    )}
                                                    {"\n"}
                                                    {formatTime(shift.end_time)}
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>

                    {/* Legenda - na każdej stronie */}
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View
                                style={[
                                    styles.legendColor,
                                    { backgroundColor: "#fecaca" },
                                ]}
                            />
                            <Text style={styles.legendText}>Święto</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View
                                style={[
                                    styles.legendColor,
                                    { backgroundColor: "#f1f5f9" },
                                ]}
                            />
                            <Text style={styles.legendText}>Zamknięte</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View
                                style={[
                                    styles.legendColor,
                                    { backgroundColor: "#dbeafe" },
                                ]}
                            />
                            <Text style={styles.legendText}>
                                Niedziela handlowa
                            </Text>
                        </View>
                    </View>

                    {/* Stopka */}
                    <View style={styles.footer}>
                        <Text></Text>
                        <Text>
                            Strona {pageIndex + 1} z {totalPages}
                        </Text>
                    </View>
                </Page>
            ))}
        </Document>
    );
}
