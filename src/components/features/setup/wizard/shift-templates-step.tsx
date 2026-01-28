"use client";

import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, CalendarDays, Users, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAY_KEY_MAP, DAY_NAMES_SHORT } from "@/lib/constants/days";
import { calculateWorkHours } from "@/lib/utils/date-helpers";
import { EMPLOYMENT_TYPES } from "@/lib/constants/employment";
import { getShiftValidationError } from "@/lib/validations/shift-template";
import type { OpeningHours } from "@/types";
import type { Employee, ShiftTemplate } from "./types";

interface ShiftTemplatesStepProps {
    shiftTemplates: ShiftTemplate[];
    employees: Employee[];
    openingHours: OpeningHours;
    sundayMode: "all" | "custom";
    onAddShiftTemplate: () => void;
    onRemoveShiftTemplate: (id: string) => void;
    onUpdateShiftTemplate: (
        id: string,
        field: keyof ShiftTemplate,
        value: string | string[] | number | number[]
    ) => void;
    onToggleDayForTemplate: (templateId: string, dayIndex: number) => void;
    onToggleEmployeeAssignment: (
        templateId: string,
        employeeId: string
    ) => void;
}

// Opening hours summary component
const OpeningHoursSummary = memo(function OpeningHoursSummary({
    openingHours,
    sundayMode,
}: {
    openingHours: OpeningHours;
    sundayMode: "all" | "custom";
}) {
    const groups = useMemo(() => {
        const enabledDays = Object.entries(openingHours)
            .filter(([, h]) => h.enabled)
            .map(([day, h]) => {
                const labels: Record<string, string> = {
                    monday: "Pn",
                    tuesday: "Wt",
                    wednesday: "Śr",
                    thursday: "Cz",
                    friday: "Pt",
                    saturday: "Sb",
                    sunday: "Nd",
                };
                return { day, label: labels[day], ...h };
            });

        const result: { days: string[]; hours: string }[] = [];
        enabledDays.forEach(({ label, open, close }) => {
            const hourStr = `${open.slice(0, 5)}-${close.slice(0, 5)}`;
            const existing = result.find((g) => g.hours === hourStr);
            if (existing) {
                existing.days.push(label);
            } else {
                result.push({ days: [label], hours: hourStr });
            }
        });

        return result;
    }, [openingHours]);

    return (
        <div className="bg-emerald-100 rounded-xl p-3 border border-emerald-300">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">Godziny otwarcia</span>
                {openingHours.sunday?.enabled && sundayMode === "custom" && (
                    <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-medium">
                        Nd handlowe
                    </span>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {groups.map((g, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm"
                    >
                        <span className="text-xs font-semibold text-slate-700">
                            {g.days.join(", ")}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                            {g.hours}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
});

// Single shift template card
const ShiftTemplateCard = memo(function ShiftTemplateCard({
    template,
    employees,
    openingHours,
    canDelete,
    onRemove,
    onUpdate,
    onToggleDay,
    onToggleEmployee,
}: {
    template: ShiftTemplate;
    employees: Employee[];
    openingHours: OpeningHours;
    canDelete: boolean;
    onRemove: () => void;
    onUpdate: (
        field: keyof ShiftTemplate,
        value: string | string[] | number | number[]
    ) => void;
    onToggleDay: (dayIndex: number) => void;
    onToggleEmployee: (employeeId: string) => void;
}) {
    const validationError = getShiftValidationError(template, openingHours);
    const hasError =
        validationError !== null && template.startTime && template.endTime;

    const validEmployees = useMemo(
        () => employees.filter((e) => e.firstName.trim() && e.lastName.trim()),
        [employees]
    );

    const allAssigned = useMemo(
        () =>
            validEmployees.length > 0 &&
            validEmployees.every((e) =>
                template.assignedEmployees.includes(e.id)
            ),
        [validEmployees, template.assignedEmployees]
    );

    const handleToggleAll = () => {
        const validIds = validEmployees.map((e) => e.id);
        if (allAssigned) {
            onUpdate("assignedEmployees", []);
        } else {
            onUpdate("assignedEmployees", validIds);
        }
    };

    // Quick day selection handlers
    const selectWeekdays = () => {
        onUpdate("applicableDays", [1, 2, 3, 4, 5]); // Pn-Pt
    };

    const selectWeekend = () => {
        onUpdate("applicableDays", [6, 0]); // Sb-Nd
    };

    const selectAllDays = () => {
        onUpdate("applicableDays", [1, 2, 3, 4, 5, 6, 0]); // All
    };

    const deselectAllDays = () => {
        onUpdate("applicableDays", []);
    };

    return (
        <div
            className={cn(
                "p-4 rounded-xl border-2 bg-white space-y-4 transition-colors relative",
                hasError
                    ? "border-red-200 bg-red-50/30"
                    : "border-slate-200 hover:border-slate-300"
            )}
        >
            {/* Delete button in top right */}
            {canDelete && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="absolute top-2 right-2 h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                >
                    <X className="w-4 h-4" />
                </Button>
            )}

            {/* Time inputs with color indicators */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 flex items-center gap-2">
                        <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: template.color }}
                        />
                        Godzina rozpoczęcia
                    </Label>
                    <Input
                        type="time"
                        value={template.startTime}
                        onChange={(e) => onUpdate("startTime", e.target.value)}
                        className="h-10 text-sm"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 flex items-center gap-2">
                        <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: template.color }}
                        />
                        Godzina zakończenia
                    </Label>
                    <Input
                        type="time"
                        value={template.endTime}
                        onChange={(e) => onUpdate("endTime", e.target.value)}
                        className="h-10 text-sm"
                    />
                </div>
            </div>

            {/* Break and employees in row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">
                        Przerwa (min)
                    </Label>
                    <Input
                        type="number"
                        min={0}
                        max={120}
                        step={15}
                        value={template.breakMinutes}
                        onChange={(e) =>
                            onUpdate(
                                "breakMinutes",
                                parseInt(e.target.value) || 0
                            )
                        }
                        className="h-10 text-sm"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">
                        Min osób
                    </Label>
                    <Input
                        type="number"
                        min={0}
                        max={template.maxEmployees || 20}
                        value={template.minEmployees}
                        onChange={(e) =>
                            onUpdate(
                                "minEmployees",
                                parseInt(e.target.value) || 0
                            )
                        }
                        className="h-10 text-sm"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">
                        Max osób
                    </Label>
                    <Input
                        type="number"
                        min={template.minEmployees || 0}
                        max={20}
                        value={template.maxEmployees || ""}
                        onChange={(e) =>
                            onUpdate(
                                "maxEmployees",
                                parseInt(e.target.value) || 0
                            )
                        }
                        placeholder="Bez limitu"
                        className="h-10 text-sm"
                    />
                </div>
            </div>

            {/* Work hours badge */}
            {template.startTime && template.endTime && (
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-600">
                        Czas pracy (z przerwami):
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                        {calculateWorkHours(
                            template.startTime,
                            template.endTime,
                            template.breakMinutes
                        )}
                    </span>
                </div>
            )}

            {/* Day selection with quick actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        Dni tygodnia
                    </Label>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={selectWeekdays}
                            className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
                            title="Zaznacz Pn-Pt"
                        >
                            Pn-Pt
                        </button>
                        <button
                            type="button"
                            onClick={selectWeekend}
                            className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
                            title="Zaznacz Sb-Nd"
                        >
                            Weekend
                        </button>
                        <button
                            type="button"
                            onClick={selectAllDays}
                            className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
                            title="Zaznacz wszystkie"
                        >
                            Wszystkie
                        </button>
                        <button
                            type="button"
                            onClick={deselectAllDays}
                            className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
                            title="Odznacz wszystkie"
                        >
                            ×
                        </button>
                    </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                        const isSelected =
                            template.applicableDays.includes(dayIndex);
                        const dayKey = DAY_KEY_MAP[dayIndex];
                        const isDayOpen = openingHours[dayKey]?.enabled;

                        return (
                            <button
                                key={dayIndex}
                                type="button"
                                onClick={() => onToggleDay(dayIndex)}
                                className={cn(
                                    "flex-1 min-w-11.25 px-3 py-2 text-xs font-semibold rounded-lg border-2 transition-all",
                                    isSelected
                                        ? isDayOpen
                                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                            : "bg-amber-500 text-white border-amber-500 shadow-sm"
                                        : isDayOpen
                                        ? "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                        : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                )}
                                title={
                                    !isDayOpen
                                        ? "Firma zamknięta w ten dzień"
                                        : undefined
                                }
                                disabled={!isDayOpen}
                            >
                                {DAY_NAMES_SHORT[dayIndex]}
                                {!isDayOpen && isSelected && (
                                    <span className="ml-1">⚠️</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Validation error message */}
            {hasError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <X className="w-2.5 h-2.5" />
                    </div>
                    <p className="text-xs text-red-700 leading-relaxed">
                        {validationError}
                    </p>
                </div>
            )}

            {/* Employee assignment */}
            {validEmployees.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            Przypisz pracowników{" "}
                            <span className="text-slate-400 font-normal">
                                (opcjonalnie)
                            </span>
                        </Label>
                        <button
                            type="button"
                            onClick={handleToggleAll}
                            className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
                        >
                            {allAssigned
                                ? "Odznacz wszystkich"
                                : "Zaznacz wszystkich"}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {validEmployees
                            .sort((a, b) => {
                                // Sort order: full, three_quarter, half, one_third, custom
                                const order = [
                                    "full",
                                    "three_quarter",
                                    "half",
                                    "one_third",
                                    "custom",
                                ];
                                return (
                                    order.indexOf(a.employmentType) -
                                    order.indexOf(b.employmentType)
                                );
                            })
                            .map((emp) => {
                                const isAssigned =
                                    template.assignedEmployees.includes(emp.id);
                                const empConfig = EMPLOYMENT_TYPES.find(
                                    (t) => t.value === emp.employmentType
                                );
                                const empLabel =
                                    emp.employmentType === "custom" &&
                                    emp.customHours
                                        ? `${emp.customHours}h`
                                        : empConfig?.fraction ||
                                          empConfig?.shortLabel ||
                                          "";
                                return (
                                    <button
                                        key={emp.id}
                                        onClick={() => onToggleEmployee(emp.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2",
                                            isAssigned
                                                ? "bg-blue-50 text-blue-700 border-blue-500 shadow-sm"
                                                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-6 h-6 rounded text-white text-[10px] font-bold flex items-center justify-center shrink-0",
                                                !isAssigned && "opacity-60"
                                            )}
                                            style={{
                                                backgroundColor: emp.color,
                                            }}
                                        >
                                            {emp.firstName[0]}
                                            {emp.lastName[0]}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="truncate max-w-20">
                                                {emp.firstName}{" "}
                                                {emp.lastName[0]}.
                                            </span>
                                            {empLabel && (
                                                <span
                                                    className={cn(
                                                        "text-[10px] font-semibold",
                                                        isAssigned
                                                            ? "text-blue-500"
                                                            : "text-slate-400"
                                                    )}
                                                >
                                                    {empLabel}
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-3 h-3 shrink-0 flex items-center justify-center">
                                            {isAssigned && (
                                                <Check className="w-3 h-3 text-blue-500" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
});

export const ShiftTemplatesStep = memo(function ShiftTemplatesStep({
    shiftTemplates,
    employees,
    openingHours,
    sundayMode,
    onAddShiftTemplate,
    onRemoveShiftTemplate,
    onUpdateShiftTemplate,
    onToggleDayForTemplate,
    onToggleEmployeeAssignment,
}: ShiftTemplatesStepProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                    Zdefiniuj zmiany
                </h2>
                <p className="text-slate-500 mt-1 text-sm">
                    Stwórz szablony zmian, wybierz dni i przypisz pracowników
                </p>
            </div>

            {/* Opening hours summary */}
            <div className="max-w-md mx-auto">
                <OpeningHoursSummary
                    openingHours={openingHours}
                    sundayMode={sundayMode}
                />
            </div>

            <div className="space-y-4 max-w-xl mx-auto">
                {shiftTemplates.map((template) => (
                    <ShiftTemplateCard
                        key={template.id}
                        template={template}
                        employees={employees}
                        openingHours={openingHours}
                        canDelete={shiftTemplates.length > 1}
                        onRemove={() => onRemoveShiftTemplate(template.id)}
                        onUpdate={(field, value) =>
                            onUpdateShiftTemplate(template.id, field, value)
                        }
                        onToggleDay={(dayIndex) =>
                            onToggleDayForTemplate(template.id, dayIndex)
                        }
                        onToggleEmployee={(empId) =>
                            onToggleEmployeeAssignment(template.id, empId)
                        }
                    />
                ))}

                <div className="max-w-md mx-auto">
                    <Button
                        variant="outline"
                        onClick={onAddShiftTemplate}
                        className="w-full h-10 sm:h-11  border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Dodaj zmianę
                    </Button>
                </div>
            </div>
        </div>
    );
});
