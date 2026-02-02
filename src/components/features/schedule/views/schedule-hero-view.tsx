"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { isSunday, getDaysInMonth } from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/utils/logger";
import {
    isTradingSunday,
    checkEmployeeAbsence,
    createShiftsByDateMap,
    formatDateToISO,
    getCoverageGapDetails,
} from "@/lib/core/schedule/utils";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import { DAY_KEY_MAP } from "@/lib/constants/days";
import type { LocalShift, OpeningHours } from "@/types";
import type {
    Employee,
    ShiftTemplate,
    PublicHoliday,
    OrganizationSettings,
    EmployeeAbsence,
    ShiftTemplateAssignment,
} from "@/types";
import type { ScheduleViolation } from "@/lib/hooks/use-schedule-violations";
import { EmployeesPanel } from "../components/employees-panel";
import { EmployeeStatsDialog } from "../components/employee-stats-dialog";

// Wydzielone komponenty
import {
    HeroDayHeader,
    HeroDayCell,
    TemplateSelector,
    ShiftLegend,
    DaySummary,
    EmployeeRowMemo,
    type ShiftStat,
    ShiftSwapDialog,
    AddAbsenceDialog,
    AbsenceManagementDialog,
} from "../components/hero";
import { createClient } from "@/lib/supabase/client"; // Added
import { getReplacementSuggestions } from "@/lib/services/schedule-suggestions"; // Added

// Stałe wymiarów
const DAY_WIDTH = 72;

interface ScheduleHeroViewProps {
    year: number;
    month: number;
    holidays: PublicHoliday[];
    holidaysMap: Map<string, PublicHoliday>;
    employees: Employee[];
    localShifts: LocalShift[];
    activeShifts: LocalShift[];
    sortedShiftTemplates: ShiftTemplate[];
    organizationSettings: OrganizationSettings | null;
    employeeAbsences: EmployeeAbsence[];
    templateAssignments: ShiftTemplateAssignment[];
    employeeHoursMap: Map<string, { scheduled: number; required: number }>;
    employeeAbsenceInfo: Map<
        string,
        { type: string; days: number; paidHours: number } | null
    >;
    filteredEmployeeIds: Set<string>;
    scheduleId: string;
    violations: ScheduleViolation[];
    onFilterChange: (ids: Set<string>) => void;
    onRemoveShift: (shiftId: string) => void;
    onUpdateShift: (shiftId: string, updates: Partial<LocalShift>) => void;
    onAddShift: (shift: LocalShift) => void;
    checkViolationForCell: (
        employeeId: string,
        date: string,
        startTime: string,
        endTime: string,
    ) => boolean;
    onAbsenceAdded?: () => void;
}

export function ScheduleHeroView({
    year,
    month,
    // holidays - używane przez holidaysMap
    holidaysMap,
    employees,
    // localShifts - używane przez activeShifts
    activeShifts,
    sortedShiftTemplates,
    organizationSettings,
    employeeAbsences,
    templateAssignments,
    employeeHoursMap,
    employeeAbsenceInfo,
    filteredEmployeeIds,
    scheduleId,
    violations,
    onFilterChange,
    onRemoveShift,
    onUpdateShift,
    onAddShift,
    checkViolationForCell,
    onAbsenceAdded,
}: // mounted - komponent zawsze renderowany gdy widoczny
ScheduleHeroViewProps) {
    const [selectedCell, setSelectedCell] = useState<{
        employeeId: string;
        date: string;
        cellRect?: DOMRect;
    } | null>(null);
    const [swapDialogData, setSwapDialogData] = useState<{
        employee: Employee;
        shift: LocalShift;
        date: string;
    } | null>(null);
    const [absenceDialogData, setAbsenceDialogData] = useState<{
        employee: Employee;
        date: string;
        existingShift?: LocalShift | null;
    } | null>(null);

    // Debug: log absences when they change
    useEffect(() => {
        console.log("📊 ScheduleHeroView - employeeAbsences updated:", {
            count: employeeAbsences.length,
            absences: employeeAbsences,
        });
    }, [employeeAbsences]);
    const [selectedAbsenceData, setSelectedAbsenceData] = useState<{
        absence: EmployeeAbsence;
        employee: Employee;
        date: string;
    } | null>(null);
    const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Generuj wszystkie dni miesiąca
    const daysInMonth = useMemo(() => {
        const numDays = getDaysInMonth(new Date(year, month - 1));
        return Array.from(
            { length: numDays },
            (_, i) => new Date(year, month - 1, i + 1),
        );
    }, [year, month]);

    // Scroll do dzisiejszego dnia przy montowaniu
    useEffect(() => {
        if (!scrollContainerRef.current) return;
        const today = new Date();
        if (today.getMonth() + 1 === month && today.getFullYear() === year) {
            const scrollTo = (today.getDate() - 1) * DAY_WIDTH - 200;
            scrollContainerRef.current.scrollLeft = Math.max(0, scrollTo);
        }
    }, [month, year]);

    // Mapa zmian według daty
    const shiftsByDate = useMemo(
        () => createShiftsByDateMap(activeShifts, true),
        [activeShifts],
    );

    // Filtruj pracowników
    const filteredEmployees = useMemo(() => {
        if (filteredEmployeeIds.size === 0) return employees;
        return employees.filter((e) => filteredEmployeeIds.has(e.id));
    }, [employees, filteredEmployeeIds]);

    // Pobierz zmianę dla danego pracownika i dnia
    const getShiftForCell = useCallback(
        (employeeId: string, date: string): LocalShift | null => {
            const dayShifts = shiftsByDate.get(date) || [];
            return dayShifts.find((s) => s.employee_id === employeeId) || null;
        },
        [shiftsByDate],
    );

    // Pobierz kolor zmiany z szablonu
    const getShiftColor = useCallback(
        (shift: LocalShift): string | null => {
            if (shift.color) return shift.color;
            const matchingTemplate = sortedShiftTemplates.find(
                (t) =>
                    t.start_time === shift.start_time &&
                    t.end_time === shift.end_time,
            );
            return matchingTemplate?.color || null;
        },
        [sortedShiftTemplates],
    );

    // Pobierz szablony przypisane do pracownika
    const getTemplatesForEmployee = useCallback(
        (employeeId: string): ShiftTemplate[] => {
            const employeeAssignments = templateAssignments.filter(
                (a) => a.employee_id === employeeId,
            );
            if (employeeAssignments.length === 0) return sortedShiftTemplates;

            const assignedTemplateIds = new Set(
                employeeAssignments.map((a) => a.template_id),
            );
            return sortedShiftTemplates.filter((t) =>
                assignedTemplateIds.has(t.id),
            );
        },
        [templateAssignments, sortedShiftTemplates],
    );

    // Sprawdź czy dzień jest zamknięty
    const isDayClosed = useCallback(
        (date: Date): boolean => {
            const dateStr = formatDateToISO(date);
            if (holidaysMap.get(dateStr)) return true;
            if (isSunday(date)) {
                return !isTradingSunday(date, organizationSettings);
            }
            return false;
        },
        [holidaysMap, organizationSettings],
    );

    // Obsługa kliknięcia w komórkę
    const handleCellClick = useCallback(
        (employeeId: string, date: string, event: React.MouseEvent) => {
            const dayDate = new Date(date);

            if (isDayClosed(dayDate)) {
                const holiday = holidaysMap.get(date);
                toast.info(holiday ? holiday.name : "Niedziela niehandlowa", {
                    description: holiday
                        ? "Ten dzień jest dniem wolnym od pracy"
                        : "Sklep jest zamknięty w ten dzień",
                });
                return;
            }

            const absence = checkEmployeeAbsence(
                employeeId,
                date,
                employeeAbsences,
            );
            if (absence) {
                const employee = employees.find((e) => e.id === employeeId);
                if (employee) {
                    setSelectedAbsenceData({
                        absence,
                        employee,
                        date,
                    });
                }
                return;
            }

            const target = event.currentTarget as HTMLElement;
            const cellRect = target.getBoundingClientRect();
            setSelectedCell({ employeeId, date, cellRect });
        },
        [isDayClosed, holidaysMap, employeeAbsences, employees],
    );

    // Przypisanie zmiany z szablonu
    const assignShiftFromTemplate = useCallback(
        (template: ShiftTemplate) => {
            if (!selectedCell) return;

            const { employeeId, date } = selectedCell;
            const existingShift = getShiftForCell(employeeId, date);

            if (existingShift) {
                onUpdateShift(existingShift.id, {
                    start_time: template.start_time,
                    end_time: template.end_time,
                    break_minutes: template.break_minutes,
                    color: template.color,
                });
            } else {
                const newShift: LocalShift = {
                    id: `temp-${Date.now()}-${Math.random()}`,
                    schedule_id: scheduleId,
                    employee_id: employeeId,
                    date,
                    start_time: template.start_time,
                    end_time: template.end_time,
                    break_minutes: template.break_minutes,
                    notes: null,
                    color: template.color,
                    status: "new",
                };
                onAddShift(newShift);
            }
            setSelectedCell(null);
        },
        [selectedCell, scheduleId, onAddShift, onUpdateShift, getShiftForCell],
    );

    // Przypisanie zmiany z własnymi godzinami
    const assignCustomShift = useCallback(
        (startTime: string, endTime: string, breakMinutes: number) => {
            if (!selectedCell) return;

            const { employeeId, date } = selectedCell;
            const existingShift = getShiftForCell(employeeId, date);

            if (existingShift) {
                onUpdateShift(existingShift.id, {
                    start_time: startTime,
                    end_time: endTime,
                    break_minutes: breakMinutes,
                    color: null, // Brak koloru dla custom shift
                });
            } else {
                const newShift: LocalShift = {
                    id: `temp-${Date.now()}-${Math.random()}`,
                    schedule_id: scheduleId,
                    employee_id: employeeId,
                    date,
                    start_time: startTime,
                    end_time: endTime,
                    break_minutes: breakMinutes,
                    notes: null,
                    color: null,
                    status: "new",
                };
                onAddShift(newShift);
            }
            setSelectedCell(null);
        },
        [selectedCell, scheduleId, onAddShift, onUpdateShift, getShiftForCell],
    );

    // Usunięcie zmiany
    const handleRemoveShift = useCallback(() => {
        if (!selectedCell) return;
        const shift = getShiftForCell(
            selectedCell.employeeId,
            selectedCell.date,
        );
        if (shift) onRemoveShift(shift.id);
        setSelectedCell(null);
    }, [selectedCell, getShiftForCell, onRemoveShift]);

    // Zamiana zmian (gdy pracownik ma nieobecność)
    const handleSwapShifts = useCallback(
        (originalShift: LocalShift, replacementEmployeeId: string) => {
            // Usuń zmianę nieobecnego pracownika
            onRemoveShift(originalShift.id);

            // Jeśli zastępca miał już zmianę - możemy ją zamienić lub usunąć
            // Na razie po prostu przypisujemy nową zmianę zastępcy
            const newShift: LocalShift = {
                id: `temp-${Date.now()}-${Math.random()}`,
                schedule_id: scheduleId,
                employee_id: replacementEmployeeId,
                date: originalShift.date,
                start_time: originalShift.start_time,
                end_time: originalShift.end_time,
                break_minutes: originalShift.break_minutes,
                notes: originalShift.notes,
                color: originalShift.color,
                status: "new",
            };
            onAddShift(newShift);

            const replacementEmployee = employees.find(
                (e) => e.id === replacementEmployeeId,
            );
            toast.success("Zmiana przypisana", {
                description: `Zmiana została przypisana do ${
                    replacementEmployee
                        ? getEmployeeFullName(replacementEmployee)
                        : "pracownika"
                }`,
            });
        },
        [scheduleId, onRemoveShift, onAddShift, employees],
    );

    const handleAddAbsenceImmediately = useCallback(
        async (
            employeeId: string,
            date: string,
            existingShift?: LocalShift | null,
        ) => {
            const supabase = createClient();

            let originalShiftNote = "";
            if (existingShift) {
                originalShiftNote = `Shift: ${existingShift.start_time}-${
                    existingShift.end_time
                }|Break:${existingShift.break_minutes || 0}`;
            }

            const { error } = await supabase
                .from("employee_absences")
                .insert({
                    employee_id: employeeId,
                    organization_id: employees[0]?.organization_id,
                    absence_type: "vacation", // Correction: vacation_leave -> vacation as per DB enum
                    start_date: date,
                    end_date: date,
                    is_paid: true,
                    notes: originalShiftNote || null,
                })
                .select();

            if (error) {
                logger.error("Error adding absence:", error);
                toast.error("Błąd podczas dodawania nieobecności", {
                    description: error.message,
                });
                return;
            }

            if (existingShift) {
                // If shift is persisted (not temp), delete it from DB now too to avoid conflicts
                if (!existingShift.id.startsWith("temp-")) {
                    const { error: delError } = await supabase
                        .from("shifts")
                        .delete()
                        .eq("id", existingShift.id);

                    if (delError) {
                        logger.error("Error deleting shift:", delError);
                        // We continue even if delete fails, as local state invalidation will handle UI
                    }
                }
                onRemoveShift(existingShift.id);
            }

            toast.success("Dodano nieobecność");
            onAbsenceAdded?.();
            setSelectedCell(null);
        },
        [employees, onRemoveShift, onAbsenceAdded],
    );

    const handleDeleteAbsence = useCallback(
        async (absenceId: string) => {
            const supabase = createClient();
            const { error } = await supabase
                .from("employee_absences")
                .delete()
                .eq("id", absenceId);

            if (error) {
                toast.error("Błąd podczas usuwania nieobecności");
                return;
            }

            toast.success("Usunięto nieobecność");
            onAbsenceAdded?.();
            setSelectedAbsenceData(null);
        },
        [onAbsenceAdded],
    );

    const handleReplaceEmployee = useCallback(
        async (
            absence: EmployeeAbsence,
            replacementEmployeeId: string,
            sourceShift?: LocalShift,
        ) => {
            // Create new shift for replacement
            // Attempt to extract time from notes or just use default
            let startTime = "08:00";
            let endTime = "16:00";
            let breakMinutes = 0; // Default 0

            // Try parse from notes "Shift: HH:MM-HH:MM|Break:MM"
            if (absence.notes && absence.notes.startsWith("Shift: ")) {
                const parts1 = absence.notes.split("|");
                const timePart = parts1[0].replace("Shift: ", "").split("-");
                if (timePart.length === 2) {
                    startTime = timePart[0];
                    endTime = timePart[1];
                }
                if (parts1[1] && parts1[1].startsWith("Break:")) {
                    breakMinutes =
                        parseInt(parts1[1].replace("Break:", ""), 10) || 0;
                }
            } else if (absence.notes && absence.notes.startsWith("Shift: ")) {
                // Backward compatibility for notes without break
                const parts = absence.notes.replace("Shift: ", "").split("-");
                if (parts.length === 2) {
                    startTime = parts[0];
                    endTime = parts[1];
                }
            }

            // Get name of absent employee for the note
            const absentOne = employees.find(
                (e) => e.id === absence.employee_id,
            );
            const absentName = absentOne
                ? `${absentOne.first_name} ${absentOne.last_name}`
                : "Pracownika";

            const newShift: LocalShift = {
                id: `temp-${Date.now()}-${Math.random()}`,
                schedule_id: scheduleId,
                employee_id: replacementEmployeeId,
                date: absence.start_date,
                start_time: startTime,
                end_time: endTime,
                break_minutes: breakMinutes,
                notes: `Zastępstwo za: ${absentName}`,
                color: null,
                status: "new", // Represents a newly added shift
            };

            onAddShift(newShift);

            if (sourceShift) {
                // If we moved someone, remove their old shift
                // Or maybe we treat it as a swap?
                // Since we don't have atomic transaction here easily without backend,
                // client side removal is okay.
                onRemoveShift(sourceShift.id);
            }

            toast.success("Zastąpiono pracownika");
            setSelectedAbsenceData(null);
        },
        [scheduleId, onAddShift, onRemoveShift, employees],
    );

    // Scroll handlers
    const scrollLeft = useCallback(() => {
        scrollContainerRef.current?.scrollBy({
            left: -DAY_WIDTH * 7,
            behavior: "smooth",
        });
    }, []);

    const scrollRight = useCallback(() => {
        scrollContainerRef.current?.scrollBy({
            left: DAY_WIDTH * 7,
            behavior: "smooth",
        });
    }, []);

    // Funkcja do obliczania luk w pokryciu dla danego dnia
    const getCoverageInfoForDay = useCallback(
        (day: Date, dateStr: string) => {
            const holiday = holidaysMap.get(dateStr);
            const isTradingSun = isTradingSunday(day, organizationSettings);

            if (holiday || (isSunday(day) && !isTradingSun)) {
                return { hasGap: false, gaps: [], message: "" };
            }

            const openingHours =
                organizationSettings?.opening_hours as OpeningHours | null;
            if (!openingHours) return { hasGap: false, gaps: [], message: "" };

            const dayKey = DAY_KEY_MAP[day.getDay()];
            const dayHours = openingHours[dayKey];

            if (!dayHours?.enabled)
                return { hasGap: false, gaps: [], message: "" };

            const dayShifts = shiftsByDate.get(dateStr) || [];
            if (dayShifts.length === 0)
                return { hasGap: false, gaps: [], message: "" };

            return getCoverageGapDetails(
                dayShifts.map((s) => ({
                    start_time: s.start_time,
                    end_time: s.end_time,
                })),
                dayHours.open,
                dayHours.close,
            );
        },
        [holidaysMap, organizationSettings, shiftsByDate],
    );

    return (
        <div className="space-y-4">
            {/* Nawigacja scroll */}
            <div className="flex items-center justify-between gap-2">
                <EmployeesPanel
                    employees={employees}
                    employeeHoursMap={employeeHoursMap}
                    variant="filter-only"
                    filteredEmployeeIds={filteredEmployeeIds}
                    onShowStats={() => setIsStatsDialogOpen(true)}
                    onFilterChange={onFilterChange}
                />
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={scrollLeft}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={scrollRight}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Główna siatka grafiku */}
            <div className="border border-slate-200/80 rounded-2xl bg-white shadow-lg shadow-slate-200/50">
                <div className="flex">
                    {/* Sticky kolumna z pracownikami */}
                    <div className="shrink-0 bg-white z-20 border-r border-slate-200/80 w-45 sm:w-45 max-sm:w-24">
                        <div className="h-14 px-4 py-3 bg-linear-to-b from-slate-50 to-slate-100/50 border-b border-slate-200/80 flex items-center">
                            <span className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Pracownik
                            </span>
                        </div>

                        {filteredEmployees.map((employee) => {
                            const hours = employeeHoursMap.get(employee.id);
                            const absenceInfo = employeeAbsenceInfo.get(
                                employee.id,
                            );
                            const employeeViolations = violations.filter(
                                (v) => v.employeeId === employee.id,
                            );

                            // Calculate Shift Stats
                            const empShifts = activeShifts.filter(
                                (s) => s.employee_id === employee.id,
                            );
                            const statsMap = new Map<
                                string,
                                {
                                    count: number;
                                    color: string;
                                    label: string;
                                    times?: string[];
                                }
                            >();

                            empShifts.forEach((s) => {
                                // Znajdź template dla zmiany
                                const template = sortedShiftTemplates.find(
                                    (temp) =>
                                        temp.start_time === s.start_time &&
                                        temp.end_time === s.end_time,
                                );

                                let key: string;
                                let label: string;
                                let color: string;

                                if (template && template.color) {
                                    // Zmiana z szablonu - grupuj po szablonie
                                    key = `${s.start_time}-${s.end_time}`;
                                    label = `${s.start_time.slice(
                                        0,
                                        5,
                                    )}-${s.end_time.slice(0, 5)}`;
                                    color = template.color;
                                } else {
                                    // Custom shift - grupuj wszystkie pod "inne"
                                    key = "custom_shifts";
                                    label = "Inne";
                                    color = "#94a3b8";
                                }

                                if (!statsMap.has(key)) {
                                    statsMap.set(key, {
                                        count: 0,
                                        color,
                                        label,
                                        times: [],
                                    });
                                }
                                const stat = statsMap.get(key)!;
                                stat.count++;
                                // Dla custom shifts, zbieraj godziny
                                if (key === "custom_shifts") {
                                    const timeStr = `${s.start_time.slice(
                                        0,
                                        5,
                                    )}-${s.end_time.slice(0, 5)}`;
                                    if (!stat.times!.includes(timeStr)) {
                                        stat.times!.push(timeStr);
                                    }
                                }
                            });

                            const shiftStats: ShiftStat[] = Array.from(
                                statsMap.values(),
                            )
                                .sort((a, b) => a.label.localeCompare(b.label))
                                .map((s) => ({
                                    timeLabel:
                                        s.label === "Inne"
                                            ? `Inne: ${s.times?.join(", ") || ""}`
                                            : s.label,
                                    count: s.count,
                                    color: s.color,
                                }));

                            return (
                                <EmployeeRowMemo
                                    key={employee.id}
                                    employee={employee}
                                    scheduled={hours?.scheduled || 0}
                                    required={hours?.required || 0}
                                    shiftStats={shiftStats}
                                    absenceInfo={absenceInfo}
                                    violations={employeeViolations}
                                />
                            );
                        })}

                        <div className="h-auto min-h-12 px-3 py-2.5 flex items-center justify-center bg-linear-to-b from-slate-50/50 to-white">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Osób na zmianie
                            </span>
                        </div>
                    </div>

                    {/* Scrollowalna część z dniami */}
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 pb-3"
                    >
                        <div
                            style={{ minWidth: daysInMonth.length * DAY_WIDTH }}
                        >
                            {/* Nagłówki dni */}
                            <div className="flex h-14 bg-linear-to-b from-slate-50 to-slate-100/50 border-b border-slate-200/80">
                                {daysInMonth.map((day) => {
                                    const dateStr = formatDateToISO(day);
                                    return (
                                        <HeroDayHeader
                                            key={dateStr}
                                            day={day}
                                            width={DAY_WIDTH}
                                            holiday={holidaysMap.get(dateStr)}
                                            isDayClosed={isDayClosed(day)}
                                            coverageInfo={getCoverageInfoForDay(
                                                day,
                                                dateStr,
                                            )}
                                        />
                                    );
                                })}
                            </div>

                            {/* Wiersze z komórkami dla każdego pracownika */}
                            {filteredEmployees.map((employee, empIdx) => {
                                const employeeViolations = violations.filter(
                                    (v) => v.employeeId === employee.id,
                                );

                                return (
                                    <div
                                        key={employee.id}
                                        className="flex h-16 border-b border-slate-200/80"
                                    >
                                        {daysInMonth.map((day) => {
                                            const dateStr =
                                                formatDateToISO(day);
                                            const shift = getShiftForCell(
                                                employee.id,
                                                dateStr,
                                            );
                                            const isSelected =
                                                selectedCell?.employeeId ===
                                                    employee.id &&
                                                selectedCell?.date === dateStr;
                                            const isBottomHalf =
                                                empIdx >=
                                                Math.floor(
                                                    filteredEmployees.length /
                                                        2,
                                                );
                                            const employeeTemplates =
                                                getTemplatesForEmployee(
                                                    employee.id,
                                                );

                                            return (
                                                <div
                                                    key={dateStr}
                                                    className="relative"
                                                >
                                                    <HeroDayCell
                                                        day={day}
                                                        width={DAY_WIDTH}
                                                        shift={shift}
                                                        shiftColor={
                                                            shift
                                                                ? getShiftColor(
                                                                      shift,
                                                                  )
                                                                : null
                                                        }
                                                        isDayClosed={isDayClosed(
                                                            day,
                                                        )}
                                                        holiday={holidaysMap.get(
                                                            dateStr,
                                                        )}
                                                        isSelected={isSelected}
                                                        hasViolation={employeeViolations.some(
                                                            (v) =>
                                                                v.affectedDates?.includes(
                                                                    dateStr,
                                                                ),
                                                        )}
                                                        dayViolations={employeeViolations.filter(
                                                            (v) =>
                                                                v.affectedDates?.includes(
                                                                    dateStr,
                                                                ),
                                                        )}
                                                        absence={checkEmployeeAbsence(
                                                            employee.id,
                                                            dateStr,
                                                            employeeAbsences,
                                                        )}
                                                        onCellClick={(e) =>
                                                            handleCellClick(
                                                                employee.id,
                                                                dateStr,
                                                                e,
                                                            )
                                                        }
                                                        onAbsenceClick={() => {
                                                            const absence =
                                                                checkEmployeeAbsence(
                                                                    employee.id,
                                                                    dateStr,
                                                                    employeeAbsences,
                                                                );
                                                            if (absence) {
                                                                setSelectedAbsenceData(
                                                                    {
                                                                        absence,
                                                                        employee,
                                                                        date: dateStr,
                                                                    },
                                                                );
                                                            }
                                                        }}
                                                    />
                                                    {isSelected && (
                                                        <TemplateSelector
                                                            templates={
                                                                employeeTemplates
                                                            }
                                                            currentShift={shift}
                                                            position={
                                                                isBottomHalf
                                                                    ? "top"
                                                                    : "bottom"
                                                            }
                                                            checkViolation={(
                                                                template: ShiftTemplate,
                                                            ) =>
                                                                checkViolationForCell(
                                                                    employee.id,
                                                                    dateStr,
                                                                    template.start_time,
                                                                    template.end_time,
                                                                )
                                                            }
                                                            onSelectTemplate={
                                                                assignShiftFromTemplate
                                                            }
                                                            onSelectCustomTime={
                                                                assignCustomShift
                                                            }
                                                            onRemoveShift={
                                                                handleRemoveShift
                                                            }
                                                            onAddAbsence={() => {
                                                                handleAddAbsenceImmediately(
                                                                    employee.id,
                                                                    dateStr,
                                                                    shift,
                                                                );
                                                            }}
                                                            cellRect={
                                                                selectedCell?.cellRect
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}

                            {/* Podsumowanie zmian na dole */}
                            <div className="flex items-start justify-start h-auto min-h-12 bg-linear-to-b from-slate-50/30 to-white">
                                {daysInMonth.map((day) => {
                                    const dateStr = formatDateToISO(day);
                                    return (
                                        <DaySummary
                                            key={dateStr}
                                            width={DAY_WIDTH}
                                            dayShifts={
                                                shiftsByDate.get(dateStr) || []
                                            }
                                            isDayClosed={isDayClosed(day)}
                                            getShiftColor={getShiftColor}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statystyki pracowników */}
            <EmployeeStatsDialog
                open={isStatsDialogOpen}
                onOpenChange={setIsStatsDialogOpen}
                employees={employees}
                shifts={activeShifts}
                absences={employeeAbsences}
                year={year}
                month={month}
            />

            {/* Legenda szablonów zmian */}
            <ShiftLegend templates={sortedShiftTemplates} />

            {/* Kliknięcie poza zamyka dropdown */}
            {selectedCell && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSelectedCell(null)}
                />
            )}

            {/* Dialog zamiany zmian */}
            {swapDialogData && (
                <ShiftSwapDialog
                    open={!!swapDialogData}
                    onOpenChange={(open) => !open && setSwapDialogData(null)}
                    absentEmployee={swapDialogData.employee}
                    absentShift={swapDialogData.shift}
                    date={swapDialogData.date}
                    employees={employees}
                    allShifts={activeShifts}
                    employeeAbsences={employeeAbsences}
                    employeeHoursMap={employeeHoursMap}
                    checkViolationForCell={checkViolationForCell}
                    onSwapShifts={handleSwapShifts}
                />
            )}

            {/* Dialog zarządzania nieobecnością */}
            {selectedAbsenceData && (
                <AbsenceManagementDialog
                    open={!!selectedAbsenceData}
                    onOpenChange={(open) =>
                        !open && setSelectedAbsenceData(null)
                    }
                    absence={selectedAbsenceData.absence}
                    employee={selectedAbsenceData.employee}
                    date={selectedAbsenceData.date}
                    onDeleteAbsence={handleDeleteAbsence}
                    onReplaceEmployee={handleReplaceEmployee}
                    employees={employees}
                    activeShifts={activeShifts}
                    getSuggestions={(date, shifts, emps) => {
                        let targetShift: LocalShift | undefined;
                        // Try to parse target time from notes "Shift: 08:00-16:00"
                        if (
                            selectedAbsenceData.absence.notes?.startsWith(
                                "Shift: ",
                            )
                        ) {
                            const parts1 =
                                selectedAbsenceData.absence.notes.split("|");
                            const timePart = parts1[0]
                                .replace("Shift: ", "")
                                .split("-");

                            if (timePart.length === 2) {
                                let bk = 0;
                                if (
                                    parts1[1] &&
                                    parts1[1].startsWith("Break:")
                                ) {
                                    bk =
                                        parseInt(
                                            parts1[1].replace("Break:", ""),
                                            10,
                                        ) || 0;
                                }

                                targetShift = {
                                    start_time: timePart[0],
                                    end_time: timePart[1],
                                    id: "target_" + Math.random(),
                                    schedule_id: scheduleId,
                                    employee_id: "",
                                    date: date,
                                    break_minutes: bk,
                                    notes: null,
                                    color: null,
                                    status: "new",
                                };
                            }
                        }

                        return getReplacementSuggestions({
                            date,
                            targetShift,
                            employees: emps,
                            activeShifts: shifts,
                            employeeAbsences,
                            currentMonthShifts: activeShifts,
                            shiftTemplates: sortedShiftTemplates,
                            templateAssignments: templateAssignments,
                            employeeHoursMap: employeeHoursMap, // Pass explicit hours map!
                        });
                    }}
                />
            )}

            {/* Dialog dodawania nieobecności */}
            {absenceDialogData && (
                <AddAbsenceDialog
                    open={!!absenceDialogData}
                    onOpenChange={(open) => !open && setAbsenceDialogData(null)}
                    employee={absenceDialogData.employee}
                    organizationId={employees[0]?.organization_id || ""}
                    initialDate={new Date(absenceDialogData.date)}
                    existingShift={absenceDialogData.existingShift}
                    onRemoveShift={onRemoveShift}
                    onAbsenceAdded={() => {
                        onAbsenceAdded?.();
                    }}
                    onOpenSwapDialog={
                        absenceDialogData.existingShift
                            ? () => {
                                  const shift =
                                      absenceDialogData.existingShift!;
                                  setSwapDialogData({
                                      employee: absenceDialogData.employee,
                                      shift,
                                      date: absenceDialogData.date,
                                  });
                              }
                            : undefined
                    }
                />
            )}
        </div>
    );
}
