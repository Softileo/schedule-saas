"use client";

import { memo } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
    canEmployeeUseTemplate,
    isTemplateAvailableOnDay,
} from "@/lib/core/schedule/utils";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import type { ShiftTemplate, Employee, ShiftTemplateAssignment } from "@/types";

interface ShiftSelectorModalProps {
    open: boolean;
    day: string;
    employeeId: string;
    employees: Employee[];
    templates: ShiftTemplate[];
    templateAssignments: ShiftTemplateAssignment[];
    onSelect: (template: ShiftTemplate) => void;
    onOpenChange: (open: boolean) => void;
}

export const ShiftSelectorModal = memo(function ShiftSelectorModal({
    open,
    day,
    employeeId,
    employees,
    templates,
    templateAssignments,
    onSelect,
    onOpenChange,
}: ShiftSelectorModalProps) {
    if (!open) return null;

    const employee = employees.find((e) => e.id === employeeId);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />
            <div className="bg-white rounded-lg shadow-lg w-full max-w-sm overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">
                            Wybierz zmianę
                        </h3>
                        <p className="text-slate-500 text-xs mt-0.5">
                            {format(new Date(day), "d MMMM", { locale: pl })} •{" "}
                            {employee ? getEmployeeFullName(employee) : ""}
                        </p>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all rounded"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="p-2 max-h-[300px] overflow-y-auto">
                    {templates.map((template) => {
                        // Sprawdź czy szablon jest dostępny w ten dzień tygodnia
                        const availableOnDay = isTemplateAvailableOnDay(
                            template,
                            day
                        );
                        // Sprawdź czy pracownik może używać tego szablonu
                        const canUseByAssignment = canEmployeeUseTemplate(
                            employeeId,
                            template.id,
                            templateAssignments
                        );
                        const canUse = availableOnDay && canUseByAssignment;

                        // Nie pokazuj szablonów niedostępnych w ten dzień
                        if (!availableOnDay) return null;

                        return (
                            <button
                                key={template.id}
                                onClick={() => canUse && onSelect(template)}
                                disabled={!canUse}
                                className={cn(
                                    "w-full group flex items-center gap-3 p-3 transition-all text-left border-l-[3px]",
                                    canUse
                                        ? "hover:bg-slate-50 active:bg-slate-100"
                                        : "opacity-40 cursor-not-allowed"
                                )}
                                style={{
                                    borderLeftColor:
                                        template.color ?? undefined,
                                }}
                            >
                                <div className="flex-1">
                                    <span className="block text-sm font-medium text-slate-800">
                                        {template.start_time.slice(0, 5)} -{" "}
                                        {template.end_time.slice(0, 5)}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
