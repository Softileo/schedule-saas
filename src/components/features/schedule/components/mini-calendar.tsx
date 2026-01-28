"use client";

import { useState, useMemo } from "react";
import { format, isSunday, isSaturday, isToday, getDay } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DAY_NAMES_SHORT } from "@/lib/utils/date-helpers";
import {
    isTradingSunday,
    createShiftsByDateMap,
    sortShiftTemplatesByTime,
} from "@/lib/core/schedule/utils";
import { useCalendarDays } from "@/lib/hooks/use-calendar-days";
import { EmployeeAvatar } from "@/components/features/employees/employee-avatar";
import { X, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type {
    Employee,
    ShiftTemplate,
    PublicHoliday,
    OrganizationSettings,
} from "@/types";
import type { LocalShift } from "@/components/features/schedule";

interface MiniCalendarProps {
    year: number;
    month: number;
    holidays: PublicHoliday[];
    employees: Employee[];
    shifts: LocalShift[];
    shiftTemplates: ShiftTemplate[];
    organizationSettings: OrganizationSettings | null;
    onAddShift: (
        employeeId: string,
        date: string,
        template: ShiftTemplate
    ) => void;
    onRemoveShift: (shiftId: string) => void;
}

export function MiniCalendar({
    year,
    month,
    holidays,
    employees,
    shifts,
    shiftTemplates,
    organizationSettings,
    onAddShift,
    onRemoveShift,
}: MiniCalendarProps) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(true);

    // Generuj dni miesiąca
    const daysInMonth = useCalendarDays(year, month);

    // Mapa świąt
    const holidaysMap = useMemo(() => {
        const map = new Map<string, PublicHoliday>();
        holidays.forEach((h) => map.set(h.date, h));
        return map;
    }, [holidays]);

    // Aktywne zmiany (nie usunięte)
    const activeShifts = useMemo(
        () => shifts.filter((s) => s.status !== "deleted"),
        [shifts]
    );

    // OPTYMALIZACJA: Grupowanie zmian po dacie - O(n) zamiast O(n*m)
    const shiftsByDate = useMemo(
        () => createShiftsByDateMap(activeShifts),
        [activeShifts]
    );

    const dayNames = DAY_NAMES_SHORT;

    // Sortuj szablony od rana do wieczora
    const sortedTemplates = useMemo(
        () => sortShiftTemplatesByTime(shiftTemplates),
        [shiftTemplates]
    );

    // Zmiany dla wybranego dnia - OPTYMALIZACJA: O(1) lookup
    const selectedDayShifts = useMemo(
        () => (selectedDate ? shiftsByDate.get(selectedDate) || [] : []),
        [selectedDate, shiftsByDate]
    );

    // Grupuj zmiany według szablonu (po czasie rozpoczęcia/zakończenia)
    const shiftsGroupedByTemplate = useMemo(() => {
        if (!selectedDate) return [];

        const groups: {
            template: (typeof shiftTemplates)[0];
            shifts: typeof selectedDayShifts;
        }[] = [];

        sortedTemplates.forEach((template) => {
            const templateShifts = selectedDayShifts.filter(
                (s) =>
                    s.start_time === template.start_time &&
                    s.end_time === template.end_time
            );
            if (templateShifts.length > 0) {
                groups.push({ template, shifts: templateShifts });
            }
        });

        return groups;
    }, [selectedDate, selectedDayShifts, sortedTemplates]);

    // Pracownicy bez zmiany w wybranym dniu
    const availableEmployees = selectedDate
        ? employees.filter(
              (emp) =>
                  !activeShifts.some(
                      (s) => s.employee_id === emp.id && s.date === selectedDate
                  )
          )
        : [];

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <CollapsibleTrigger asChild>
                    <button className="w-full p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <span className="text-xs font-medium flex items-center gap-1 text-slate-700">
                            <Calendar size={12} className="text-red-500" />{" "}
                            <p>Kalendarz</p>
                        </span>
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="pb-2.5 space-y-2">
                        {/* Mini kalendarz */}
                        <div className="border border-slate-100  p-2">
                            {/* Nagłówki dni */}
                            <div className="grid grid-cols-7 gap-0.5 mb-1">
                                {dayNames.map((day, idx) => (
                                    <div
                                        key={day}
                                        className={cn(
                                            "text-center text-[9px] font-medium py-0.5",
                                            idx >= 5
                                                ? "text-slate-300"
                                                : "text-slate-400"
                                        )}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Dni miesiąca */}
                            <div className="grid grid-cols-7 gap-0.5">
                                {/* Puste komórki przed pierwszym dniem */}
                                {Array.from({
                                    length: (getDay(daysInMonth[0]) + 6) % 7,
                                }).map((_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}

                                {daysInMonth.map((day) => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const holiday = holidaysMap.get(dateStr);
                                    const isWeekendDay =
                                        isSaturday(day) || isSunday(day);
                                    const isTradingSun = isTradingSunday(
                                        day,
                                        organizationSettings
                                    );
                                    const isNonWorking =
                                        (isWeekendDay && !isTradingSun) ||
                                        !!holiday;
                                    // OPTYMALIZACJA: O(1) lookup zamiast O(n) filter
                                    const shiftsCount =
                                        shiftsByDate.get(dateStr)?.length || 0;
                                    const isCurrent = isToday(day);
                                    const isSelected = selectedDate === dateStr;

                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() =>
                                                setSelectedDate(
                                                    isSelected ? null : dateStr
                                                )
                                            }
                                            className={cn(
                                                "aspect-square rounded flex flex-col items-center justify-center relative transition-all text-[10px]",
                                                isNonWorking && "bg-slate-50",
                                                isCurrent &&
                                                    !isSelected &&
                                                    "ring-1 ring-blue-500 ring-inset",
                                                isSelected &&
                                                    "bg-slate-800 text-white",
                                                !isSelected &&
                                                    !isNonWorking &&
                                                    "hover:bg-slate-100",
                                                holiday &&
                                                    !isSelected &&
                                                    "bg-red-50"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "font-medium",
                                                    isNonWorking &&
                                                        !isSelected &&
                                                        "text-slate-400",
                                                    holiday &&
                                                        !isSelected &&
                                                        "text-red-400"
                                                )}
                                            >
                                                {format(day, "d")}
                                            </span>
                                            {shiftsCount > 0 && (
                                                <div className="absolute -bottom-0.5">
                                                    <div
                                                        className={cn(
                                                            "w-1 h-1 rounded-full",
                                                            isSelected
                                                                ? "bg-white/80"
                                                                : "bg-blue-500"
                                                        )}
                                                    />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Panel wybranego dnia */}
                        {selectedDate && (
                            <div className="border border-slate-100 rounded-lg p-2 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-medium text-slate-600">
                                        {format(
                                            new Date(selectedDate),
                                            "EEEE, d MMM",
                                            { locale: pl }
                                        )}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        {selectedDayShifts.length} zmian
                                    </span>
                                </div>

                                {/* Lista zmian pogrupowana według szablonów */}
                                {shiftsGroupedByTemplate.length > 0 && (
                                    <div className="space-y-2">
                                        {shiftsGroupedByTemplate.map(
                                            ({
                                                template,
                                                shifts: templateShifts,
                                            }) => (
                                                <div
                                                    key={template.id}
                                                    className="space-y-1"
                                                >
                                                    {/* Nagłówek szablonu */}
                                                    <div
                                                        className="flex items-center gap-1.5 px-1.5 py-1 rounded"
                                                        style={{
                                                            backgroundColor: `${
                                                                template.color ??
                                                                "#64748b"
                                                            }15`,
                                                        }}
                                                    >
                                                        <div
                                                            className="w-2 h-2 rounded-full shrink-0"
                                                            style={{
                                                                backgroundColor:
                                                                    template.color ??
                                                                    "#64748b",
                                                            }}
                                                        />
                                                        <span className="text-[10px] font-medium text-slate-700">
                                                            {template.start_time.slice(
                                                                0,
                                                                5
                                                            )}
                                                            -
                                                            {template.end_time.slice(
                                                                0,
                                                                5
                                                            )}
                                                        </span>
                                                        <span className="ml-auto text-[9px] font-medium text-slate-500">
                                                            {
                                                                templateShifts.length
                                                            }{" "}
                                                            os.
                                                        </span>
                                                    </div>
                                                    {/* Lista pracowników */}
                                                    <div className="pl-2 space-y-0.5">
                                                        {templateShifts.map(
                                                            (shift) => {
                                                                const employee =
                                                                    employees.find(
                                                                        (e) =>
                                                                            e.id ===
                                                                            shift.employee_id
                                                                    );
                                                                if (!employee)
                                                                    return null;

                                                                return (
                                                                    <div
                                                                        key={
                                                                            shift.id
                                                                        }
                                                                        className="flex items-center justify-between gap-1 p-0.5 rounded hover:bg-slate-50 group"
                                                                    >
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            <EmployeeAvatar
                                                                                employee={
                                                                                    employee
                                                                                }
                                                                                size="xxs"
                                                                                showName
                                                                                showFullName
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            onClick={() =>
                                                                                onRemoveShift(
                                                                                    shift.id
                                                                                )
                                                                            }
                                                                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-500 transition-opacity"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}

                                {/* Dodaj pracownika - pogrupowane według szablonów */}
                                {availableEmployees.length > 0 &&
                                    sortedTemplates.length > 0 && (
                                        <div className="pt-2 border-t border-slate-100 space-y-2">
                                            <p className="text-[9px] text-slate-400">
                                                Dodaj do zmiany:
                                            </p>
                                            {sortedTemplates.map((template) => (
                                                <div
                                                    key={template.id}
                                                    className="space-y-1"
                                                >
                                                    <div
                                                        className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px]"
                                                        style={{
                                                            backgroundColor: `${
                                                                template.color ??
                                                                "#64748b"
                                                            }10`,
                                                        }}
                                                    >
                                                        <div
                                                            className="w-1.5 h-1.5 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    template.color ??
                                                                    "#64748b",
                                                            }}
                                                        />
                                                        <span className="font-medium text-slate-600">
                                                            {template.start_time.slice(
                                                                0,
                                                                5
                                                            )}
                                                            -
                                                            {template.end_time.slice(
                                                                0,
                                                                5
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-0.5 pl-1">
                                                        {availableEmployees
                                                            .slice(0, 8)
                                                            .map((employee) => {
                                                                return (
                                                                    <button
                                                                        key={
                                                                            employee.id
                                                                        }
                                                                        onClick={() =>
                                                                            onAddShift(
                                                                                employee.id,
                                                                                selectedDate,
                                                                                template
                                                                            )
                                                                        }
                                                                        className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                                                                        title={`Dodaj ${
                                                                            employee.first_name
                                                                        } ${
                                                                            employee.last_name
                                                                        } do ${template.start_time.slice(
                                                                            0,
                                                                            5
                                                                        )}-${template.end_time.slice(
                                                                            0,
                                                                            5
                                                                        )}`}
                                                                    >
                                                                        <EmployeeAvatar
                                                                            employee={
                                                                                employee
                                                                            }
                                                                            size="micro"
                                                                        />
                                                                    </button>
                                                                );
                                                            })}
                                                        {availableEmployees.length >
                                                            8 && (
                                                            <span className="text-[8px] text-slate-400 self-center px-1">
                                                                +
                                                                {availableEmployees.length -
                                                                    8}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                {availableEmployees.length === 0 &&
                                    selectedDayShifts.length > 0 && (
                                        <p className="text-[9px] text-slate-400 text-center py-1">
                                            Wszyscy pracownicy mają już zmianę
                                        </p>
                                    )}

                                {selectedDayShifts.length === 0 &&
                                    availableEmployees.length === 0 && (
                                        <p className="text-[9px] text-slate-400 text-center py-1">
                                            Brak pracowników
                                        </p>
                                    )}
                            </div>
                        )}

                        {!selectedDate && (
                            <p className="text-[10px] text-slate-400 text-center py-1">
                                Kliknij dzień aby dodać pracownika
                            </p>
                        )}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}
