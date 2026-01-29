import { View, Text } from "@react-pdf/renderer";
import { format } from "date-fns";
import { getDayName } from "./pdf-utils";

/**
 * Renderuje nagłówek tabeli z dniami miesiąca
 */
export function renderDayHeaderCells(
    daysInMonth: Date[],
    dayColumnWidth: number,
    getCellBgColor: (day: Date) => string,
    styles: {
        dayHeaderCell: any;
        dayHeaderNumber?: any;
        dayNumber?: any;
        dayHeaderName?: any;
        dayName?: any;
    },
) {
    return daysInMonth.map((day) => {
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
                <Text style={styles.dayHeaderNumber || styles.dayNumber}>
                    {format(day, "d")}
                </Text>
                <Text style={styles.dayHeaderName || styles.dayName}>
                    {getDayName(day)}
                </Text>
            </View>
        );
    });
}

/**
 * Renderuje nagłówek z nazwą "Pracownik"
 */
export function renderEmployeeHeaderCell(
    styles: {
        employeeHeaderCell: any;
        employeeHeaderText: any;
    },
    text: string = "Pracownik",
) {
    return (
        <View style={styles.employeeHeaderCell}>
            <Text style={styles.employeeHeaderText}>{text}</Text>
        </View>
    );
}

/**
 * Renderuje cały wiersz nagłówka tabeli (Pracownik + dni)
 */
export function renderTableHeaderRow(
    daysInMonth: Date[],
    dayColumnWidth: number,
    getCellBgColor: (day: Date) => string,
    styles: {
        headerRow: any;
        employeeHeaderCell: any;
        employeeHeaderText: any;
        dayHeaderCell: any;
        dayHeaderNumber?: any;
        dayNumber?: any;
        dayHeaderName?: any;
        dayName?: any;
    },
    employeeHeaderText: string = "Pracownik",
) {
    return (
        <View style={styles.headerRow}>
            {renderEmployeeHeaderCell(
                {
                    employeeHeaderCell: styles.employeeHeaderCell,
                    employeeHeaderText: styles.employeeHeaderText,
                },
                employeeHeaderText,
            )}
            {renderDayHeaderCells(
                daysInMonth,
                dayColumnWidth,
                getCellBgColor,
                styles,
            )}
        </View>
    );
}

/**
 * Renderuje komórkę z nazwiskiem pracownika
 */
export function renderEmployeeName(
    firstName: string,
    lastName: string,
    style: any,
) {
    return (
        <Text style={style}>
            {firstName} {lastName.charAt(0)}.
        </Text>
    );
}
