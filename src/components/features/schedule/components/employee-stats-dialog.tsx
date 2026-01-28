"use client";

import { useMemo } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollBar } from "@/components/ui/scroll-area";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import type { Employee, LocalShift, EmployeeAbsence } from "@/types";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import {
    getShiftTimeType,
    getShiftHours,
    getDayOfWeek,
} from "@/lib/scheduler/scheduler-utils";
import { checkEmployeeAbsence } from "@/lib/core/schedule/utils";

interface EmployeeStatsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employees: Employee[];
    shifts: LocalShift[];
    absences: EmployeeAbsence[];
    year: number;
    month: number;
}

interface EmployeeStats {
    employeeId: string;
    totalShifts: number;
    totalHours: number;
    morningShifts: number;
    afternoonShifts: number;
    eveningShifts: number;
    saturdayShifts: number;
    sundayShifts: number;
    shiftCounts: Map<string, number>; // "06:00-14:00" -> count
    employmentType: string;
    vacationDays: number; // Urlop wypoczynkowy
    sickDays: number; // Chorobowe
    otherAbsenceDays: number; // Inne
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
    full: "Pełny etat",
    "3/4": "3/4 etatu",
    "1/2": "1/2 etatu",
    "1/4": "1/4 etatu",
    "1/8": "1/8 etatu",
};

const EMPLOYMENT_TYPE_ORDER = ["full", "3/4", "1/2", "1/4", "1/8"];

export function EmployeeStatsDialog({
    open,
    onOpenChange,
    employees,
    shifts,
    absences,
    year,
    month,
}: EmployeeStatsDialogProps) {
    const stats = useMemo(() => {
        const statsMap = new Map<string, EmployeeStats>();

        // Initialize stats for all employees
        employees.forEach((emp) => {
            statsMap.set(emp.id, {
                employeeId: emp.id,
                totalShifts: 0,
                totalHours: 0,
                morningShifts: 0,
                afternoonShifts: 0,
                eveningShifts: 0,
                saturdayShifts: 0,
                sundayShifts: 0,
                shiftCounts: new Map(),
                employmentType: emp.employment_type || "full",
                vacationDays: 0,
                sickDays: 0,
                otherAbsenceDays: 0,
            });
        });

        // 1. Aggregate shifts
        shifts.forEach((shift) => {
            const stat = statsMap.get(shift.employee_id);
            if (!stat) return;

            const hours = getShiftHours({
                employee_id: shift.employee_id,
                date: shift.date,
                start_time: shift.start_time,
                end_time: shift.end_time,
                break_minutes: shift.break_minutes || 0,
            });
            const timeType = getShiftTimeType(shift.start_time);
            const dayOfWeek = getDayOfWeek(shift.date);

            // Shift summary text (e.g. "06:00-14:00")
            const shiftLabel = `${shift.start_time.slice(
                0,
                5,
            )}-${shift.end_time.slice(0, 5)}`;
            stat.shiftCounts.set(
                shiftLabel,
                (stat.shiftCounts.get(shiftLabel) || 0) + 1,
            );

            stat.totalShifts += 1;
            stat.totalHours += hours;

            if (timeType === "morning") stat.morningShifts += 1;
            else if (timeType === "afternoon") stat.afternoonShifts += 1;
            else if (timeType === "evening") stat.eveningShifts += 1;

            if (dayOfWeek === 6) stat.saturdayShifts += 1;
            if (dayOfWeek === 0) stat.sundayShifts += 1;
        });

        // 2. Aggregate absences
        // Iterate through all days of the month for each employee to check absences
        const daysInMonth = new Date(year, month, 0).getDate();

        employees.forEach((emp) => {
            const stat = statsMap.get(emp.id);
            if (!stat) return;

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month).padStart(
                    2,
                    "0",
                )}-${String(day).padStart(2, "0")}`;
                const absence = checkEmployeeAbsence(emp.id, dateStr, absences);

                if (absence) {
                    if (
                        absence.absence_type === "vacation" ||
                        absence.absence_type === "uz"
                    ) {
                        stat.vacationDays += 1;
                    } else if (absence.absence_type === "sick_leave") {
                        stat.sickDays += 1;
                    } else {
                        stat.otherAbsenceDays += 1;
                    }
                }
            }
        });

        return Array.from(statsMap.values());
    }, [employees, shifts, absences, year, month]);

    // Grouping
    const groupedStats = useMemo(() => {
        const groups = new Map<string, EmployeeStats[]>();

        // Initialize groups
        [...EMPLOYMENT_TYPE_ORDER, "other"].forEach((key) =>
            groups.set(key, []),
        );

        // Sort items by name first
        const sortedStats = [...stats].sort((a, b) => {
            const empA = employees.find((e) => e.id === a.employeeId);
            const empB = employees.find((e) => e.id === b.employeeId);
            const nameA = empA ? getEmployeeFullName(empA) : "";
            const nameB = empB ? getEmployeeFullName(empB) : "";
            return nameA.localeCompare(nameB);
        });

        // Distribute to groups
        sortedStats.forEach((stat) => {
            const type = stat.employmentType;
            if (EMPLOYMENT_TYPE_ORDER.includes(type)) {
                groups.get(type)?.push(stat);
            } else {
                groups.get("other")?.push(stat);
            }
        });

        return groups;
    }, [stats, employees]);

    // Calculate all unique shift types across all employees for columns
    const allShiftTypes = useMemo(() => {
        const types = new Set<string>();
        stats.forEach((stat) => {
            stat.shiftCounts.forEach((_, key) => types.add(key));
        });
        return Array.from(types).sort();
    }, [stats]);

    // Calculate totals for footer
    const totals = useMemo(() => {
        return stats.reduce(
            (acc, curr) => ({
                shifts: acc.shifts + curr.totalShifts,
                hours: acc.hours + curr.totalHours,
                morning: acc.morning + curr.morningShifts,
                afternoon: acc.afternoon + curr.afternoonShifts,
                evening: acc.evening + curr.eveningShifts,
                sat: acc.sat + curr.saturdayShifts,
                sun: acc.sun + curr.sundayShifts,
                vacation: acc.vacation + curr.vacationDays,
                sick: acc.sick + curr.sickDays,
            }),
            {
                shifts: 0,
                hours: 0,
                morning: 0,
                afternoon: 0,
                evening: 0,
                sat: 0,
                sun: 0,
                vacation: 0,
                sick: 0,
            },
        );
    }, [stats]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="sm:max-w-[70vw] w-full p-0 gap-0"
            >
                <SheetHeader className="px-6 py-4 border-b shrink-0 space-y-0">
                    <SheetTitle>Statystyki pracowników</SheetTitle>
                    <SheetDescription>
                        Podsumowanie czasu pracy i zmian w miesiącu {month}/
                        {year}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden min-h-0">
                    <ScrollAreaPrimitive.Root className="relative overflow-hidden h-full w-full bg-white">
                        <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
                            <div className="min-w-max pb-12">
                                <Table>
                                    <TableHeader className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm ring-1 ring-slate-100">
                                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                                            <TableHead className="w-[200px] sticky left-0 z-30 bg-white/95 backdrop-blur-sm pl-6 text-xs font-semibold text-slate-500 uppercase tracking-wider h-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] text-left">
                                                Pracownik
                                            </TableHead>
                                            <TableHead className="text-center w-15 h-10 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                Zmiany
                                            </TableHead>
                                            <TableHead className="text-center w-15 h-10 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                Godz.
                                            </TableHead>

                                            {/* Dynamic Shift Columns */}
                                            {allShiftTypes.map((type) => (
                                                <TableHead
                                                    key={type}
                                                    className="text-center w-15 h-10 px-1 text-xs font-medium text-slate-400 border-l border-dashed border-slate-100 whitespace-nowrap"
                                                >
                                                    {type}
                                                </TableHead>
                                            ))}

                                            <TableHead className="text-center w-15 h-10 text-xs font-semibold text-amber-600/70 uppercase tracking-wider border-l border-amber-100 bg-amber-50/50">
                                                Absencje
                                            </TableHead>
                                            <TableHead className="text-center w-15 h-10 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-l border-slate-100">
                                                Sob
                                            </TableHead>
                                            <TableHead className="text-center w-15 h-10 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-l border-slate-100">
                                                Ndz
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...groupedStats.entries()].map(
                                            ([type, groupStats]) => {
                                                if (groupStats.length === 0)
                                                    return null;

                                                return (
                                                    <>
                                                        {/* Group Header Separator */}
                                                        <TableRow
                                                            key={`header-${type}`}
                                                            className="hover:bg-transparent"
                                                        >
                                                            <TableCell className="sticky left-0 z-30 bg-slate-50/50 py-1.5 px-6 font-semibold text-[10px] text-indigo-500/80 uppercase tracking-widest border-y border-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] text-left">
                                                                {EMPLOYMENT_TYPE_LABELS[
                                                                    type
                                                                ] || "Inne"}
                                                            </TableCell>
                                                            <TableCell
                                                                colSpan={
                                                                    allShiftTypes.length +
                                                                    2
                                                                }
                                                                className="bg-slate-50/30 border-y border-slate-100"
                                                            />
                                                            <TableCell className="bg-amber-50/30 border-y border-amber-100" />
                                                            <TableCell className="bg-slate-50/50 border-y border-slate-100" />
                                                            <TableCell className="bg-slate-50/50 border-y border-slate-100" />
                                                        </TableRow>

                                                        {/* Employees in Group */}
                                                        {groupStats.map(
                                                            (stat) => {
                                                                const employee =
                                                                    employees.find(
                                                                        (e) =>
                                                                            e.id ===
                                                                            stat.employeeId,
                                                                    );
                                                                if (!employee)
                                                                    return null;

                                                                return (
                                                                    <TableRow
                                                                        key={
                                                                            stat.employeeId
                                                                        }
                                                                        className="hover:bg-slate-50/80 group border-b border-slate-50"
                                                                    >
                                                                        <TableCell className="sticky left-0 z-30 bg-white group-hover:bg-slate-50/80 py-2 pl-6 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] text-left">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate w-[160px]">
                                                                                    {getEmployeeFullName(
                                                                                        employee,
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center py-2">
                                                                            <span className="text-sm font-medium text-slate-600 bg-slate-100/50 px-2 py-0.5 rounded-full tabular-nums">
                                                                                {
                                                                                    stat.totalShifts
                                                                                }
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell className="text-center py-2">
                                                                            <span className="text-sm font-bold text-slate-700 bg-indigo-50/50 px-2 py-0.5 rounded-full tabular-nums">
                                                                                {stat.totalHours.toFixed(
                                                                                    0,
                                                                                )}

                                                                                h
                                                                            </span>
                                                                        </TableCell>

                                                                        {/* Dynamic Shift Counts */}
                                                                        {allShiftTypes.map(
                                                                            (
                                                                                type,
                                                                            ) => {
                                                                                const count =
                                                                                    stat.shiftCounts.get(
                                                                                        type,
                                                                                    );
                                                                                return (
                                                                                    <TableCell
                                                                                        key={
                                                                                            type
                                                                                        }
                                                                                        className="text-center py-2 border-l border-dashed border-slate-100"
                                                                                    >
                                                                                        {count ? (
                                                                                            <span className="text-sm font-medium text-slate-700 tabular-nums">
                                                                                                {
                                                                                                    count
                                                                                                }
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-slate-200 text-xs font-light">
                                                                                                ·
                                                                                            </span>
                                                                                        )}
                                                                                    </TableCell>
                                                                                );
                                                                            },
                                                                        )}

                                                                        <TableCell className="text-center py-2 border-l border-amber-100 bg-amber-50/20 group-hover:bg-amber-50/30 transition-colors">
                                                                            {stat.vacationDays >
                                                                                0 ||
                                                                            stat.sickDays >
                                                                                0 ? (
                                                                                <div className="flex items-center justify-center gap-1.5 direction-row">
                                                                                    {stat.vacationDays >
                                                                                        0 && (
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className="bg-white/80 text-amber-700 border-amber-200 hover:bg-white h-5 px-1.5 text-[10px] gap-0.5 font-medium shadow-sm"
                                                                                        >
                                                                                            <span className="font-bold tabular-nums">
                                                                                                {
                                                                                                    stat.vacationDays
                                                                                                }
                                                                                            </span>
                                                                                            <span className="opacity-70">
                                                                                                U
                                                                                            </span>
                                                                                        </Badge>
                                                                                    )}
                                                                                    {stat.sickDays >
                                                                                        0 && (
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className="bg-white/80 text-red-700 border-red-200 hover:bg-white h-5 px-1.5 text-[10px] gap-0.5 font-medium shadow-sm"
                                                                                        >
                                                                                            <span className="font-bold tabular-nums">
                                                                                                {
                                                                                                    stat.sickDays
                                                                                                }
                                                                                            </span>
                                                                                            <span className="opacity-70">
                                                                                                L4
                                                                                            </span>
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-amber-200/40 text-xs font-light">
                                                                                    -
                                                                                </span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center py-2 border-l border-slate-100 bg-slate-50/40 group-hover:bg-slate-50/60 transition-colors">
                                                                            {stat.saturdayShifts >
                                                                            0 ? (
                                                                                <span className="text-sm font-semibold text-slate-600 tabular-nums">
                                                                                    {
                                                                                        stat.saturdayShifts
                                                                                    }
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-slate-200 text-xs font-light">
                                                                                    -
                                                                                </span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center py-2 border-l border-slate-100 bg-slate-50/40 group-hover:bg-slate-50/60 transition-colors">
                                                                            {stat.sundayShifts >
                                                                            0 ? (
                                                                                <span className="text-sm font-semibold text-rose-600/80 tabular-nums">
                                                                                    {
                                                                                        stat.sundayShifts
                                                                                    }
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-slate-200 text-xs font-light">
                                                                                    -
                                                                                </span>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            },
                                                        )}
                                                    </>
                                                );
                                            },
                                        )}
                                    </TableBody>
                                    <TableFooter className="sticky bottom-0 z-30 shadow-[0_-8px_16px_rgba(0,0,0,0.05)] bg-white border-t border-slate-200">
                                        <TableRow className="hover:bg-transparent font-bold text-slate-900 border-0">
                                            <TableCell className="sticky left-0 z-30 bg-white py-3 pl-6 text-xs uppercase tracking-wider text-slate-500 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] border-t border-slate-200 text-left">
                                                RAZEM
                                            </TableCell>
                                            <TableCell className="text-center py-3 text-base border-t border-slate-200">
                                                {totals.shifts}
                                            </TableCell>
                                            <TableCell className="text-center py-3 text-base text-indigo-600 border-t border-slate-200">
                                                {totals.hours.toFixed(0)}h
                                            </TableCell>

                                            {/* Totals for each shift type if needed, or just empty cells */}
                                            {allShiftTypes.map((type) => (
                                                <TableCell
                                                    key={type}
                                                    className="border-l border-dashed border-slate-200 border-t bg-slate-50/30"
                                                />
                                            ))}

                                            <TableCell className="text-center py-3 text-xs font-bold border-l border-amber-200 border-t bg-amber-50/40">
                                                <div className="flex items-center justify-center gap-2">
                                                    {totals.vacation > 0 && (
                                                        <span className="text-amber-700">
                                                            {totals.vacation} U
                                                        </span>
                                                    )}
                                                    {totals.sick > 0 && (
                                                        <span className="text-red-700">
                                                            {totals.sick} L4
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-3 text-base text-slate-700 border-t border-slate-200 border-l border-slate-200 bg-slate-50/80">
                                                {totals.sat}
                                            </TableCell>
                                            <TableCell className="text-center py-3 text-base text-rose-600 border-t border-slate-200 border-l border-slate-200 bg-slate-50/80">
                                                {totals.sun}
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        </ScrollAreaPrimitive.Viewport>
                        <ScrollBar orientation="horizontal" />
                        <ScrollBar orientation="vertical" />
                        <ScrollAreaPrimitive.Corner />
                    </ScrollAreaPrimitive.Root>
                </div>
            </SheetContent>
        </Sheet>
    );
}
