import ExcelJS from "exceljs";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { Employee, PublicHoliday } from "@/types";
import type { LocalShift } from "../../views/schedule-calendar-dnd";

export interface ExportData {
    organizationName: string;
    year: number;
    month: number;
    employees: Employee[];
    shifts: LocalShift[];
    holidays: PublicHoliday[];
}

export async function exportToExcel(data: ExportData) {
    const { organizationName, year, month, employees, shifts, holidays } = data;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Grafik");

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const lastColIndex = daysInMonth + 2;

    const COLOR_BLUE = "DDEBFF";
    const COLOR_SATURDAY = "E8F2E4";
    const COLOR_SUNDAY = "F2E4E4"; 
    const COLOR_HOLIDAY = "FFCECE";
    const COLOR_TOTAL_HOUR = "FFF2F2F2";

    // --- Pomocnicza funkcja do sprawdzania czy dzień jest świętem ---
    const isHoliday = (day: number) => {
        return holidays.some((h) => {
            const hDate = new Date(h.date);
            return (
                hDate.getDate() === day &&
                hDate.getMonth() === month - 1 &&
                hDate.getFullYear() === year
            );
        });
    };

    // --- 1. PRZYGOTOWANIE WIERSZY (kod bez zmian...) ---
    const monthYear = format(new Date(year, month - 1), "MMMM yyyy", {
        locale: pl,
    });
    const titleRowValues = new Array(lastColIndex).fill("");
    titleRowValues[0] = `Grafik - ${organizationName}`;
    titleRowValues[lastColIndex - 1] = monthYear;
    const titleRow = worksheet.addRow(titleRowValues);
    titleRow.height = 30;

    const dayNumbers = days.map((d) => String(d));
    worksheet.addRow(["Nazwisko, imię", ...dayNumbers, "Razem"]);

    const dayNames = days.map((d) => {
        const date = new Date(year, month - 1, d);
        const name = format(date, "eeeeee", { locale: pl });
        return name.charAt(0).toUpperCase() + name.slice(1);
    });
    worksheet.addRow(["", ...dayNames, ""]);

    employees.forEach((employee) => {
        const employeeShifts = shifts.filter(
            (s) => s.employee_id === employee.id && s.status !== "deleted",
        );
        let totalMinutes = 0;
        const rowValues = [
            `${employee.last_name} ${employee.first_name}`,
            ...days.map((day) => {
                const shift = employeeShifts.find(
                    (s) => new Date(s.date).getDate() === day,
                );
                if (!shift) return "";
                if (shift.notes && shift.notes.length <= 3)
                    return shift.notes.toUpperCase();

                const [sH, sM] = shift.start_time.split(":").map(Number);
                const [eH, eM] = shift.end_time.split(":").map(Number);
                let diff = eH * 60 + eM - (sH * 60 + sM);
                if (diff < 0) diff += 1440;
                totalMinutes += diff - (shift.break_minutes || 0);
                return `${shift.start_time.slice(0, 5)}\n${shift.end_time.slice(0, 5)}`;
            }),
            "",
        ];
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        rowValues[rowValues.length - 1] =
            mins > 0
                ? `${hours}:${mins.toString().padStart(2, "0")}`
                : `${hours}`;
        const row = worksheet.addRow(rowValues);
        row.height = 35;
    });

    // --- 2. SCALANIE (kod bez zmian...) ---
    worksheet.mergeCells(1, 1, 1, 5);
    worksheet.mergeCells(1, lastColIndex - 2, 1, lastColIndex);
    worksheet.mergeCells(2, 1, 3, 1);
    worksheet.mergeCells(2, lastColIndex, 3, lastColIndex);

    // --- 3. STYLIZACJA I KOLORY ---
    worksheet.getColumn(1).width = 25;
    for (let i = 2; i <= daysInMonth + 1; i++) {
        worksheet.getColumn(i).width = 6.5;
    }
    worksheet.getColumn(lastColIndex).width = 10;

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            row.eachCell((cell) => {
                cell.font = { bold: true, size: 12 };
                cell.alignment = { vertical: "middle" };
            });
            return;
        }

        row.eachCell((cell, colNumber) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
            cell.alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true,
            };

            if (colNumber === lastColIndex) {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: COLOR_TOTAL_HOUR },
                };
            } else if (colNumber > 1 && colNumber < lastColIndex) {
                const day = colNumber - 1;
                const date = new Date(year, month - 1, day);
                const dayOfWeek = date.getDay();
                const holiday = isHoliday(day); // Sprawdzenie czy to święto

                let fillColor = rowNumber <= 3 ? COLOR_BLUE : null;

                // LOGIKA KOLOROWANIA: Święta i Niedziele na czerwono, Soboty na zielono
                if (holiday) {
                    fillColor = COLOR_HOLIDAY;
                } else if (dayOfWeek === 0) {
                    fillColor = COLOR_SUNDAY;
                } else if (dayOfWeek === 6) {
                    fillColor = COLOR_SATURDAY;
                }

                if (fillColor) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: fillColor },
                    };
                }
            } else if (colNumber === 1 && rowNumber <= 3) {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: COLOR_BLUE },
                };
            }

            if (rowNumber <= 3) {
                cell.font = { bold: true, size: 9 };
            } else {
                cell.font = { size: 8.5 };
            }
        });
    });

    // Eksport pliku (kod bez zmian...)
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Grafik_${organizationName}_${monthYear}.xlsx`.replace(
        /\s+/g,
        "_",
    );
    a.click();
}
