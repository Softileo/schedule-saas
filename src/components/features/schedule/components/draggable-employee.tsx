"use client";

import { memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
    getEmployeeColor,
    getEmployeeFullName,
} from "@/lib/core/employees/utils";
import { EmployeeAvatar } from "@/components/features/employees/employee-avatar";
import { X } from "lucide-react";
import type { Employee } from "@/types";
import type { LocalShift } from "@/components/features/schedule";

interface DraggableEmployeeProps {
    employee: Employee;
    scheduledHours: number;
    requiredHours: number;
}

export const DraggableEmployee = memo(function DraggableEmployee({
    employee,
    scheduledHours,
    requiredHours,
}: DraggableEmployeeProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: `employee-${employee.id}`,
            data: {
                type: "employee",
                employee,
            },
        });

    // Dokładnie wymagane godziny = zielony
    // Nadgodziny (więcej niż wymagane) = pomarańczowy
    // Niedobór = domyślny (biały)
    const isExact =
        requiredHours > 0 && Math.abs(scheduledHours - requiredHours) <= 2;
    const hasOvertime = scheduledHours > requiredHours + 2;
    const isComplete = scheduledHours >= requiredHours && requiredHours > 0;
    const progress =
        requiredHours > 0
            ? Math.min((scheduledHours / requiredHours) * 100, 100)
            : 0;

    const style = transform
        ? {
              transform: CSS.Translate.toString(transform),
              zIndex: isDragging ? 1000 : undefined,
          }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing",
                "border transition-all",
                "select-none touch-none",
                isDragging && "invisible",
                hasOvertime
                    ? "bg-amber-50 border-amber-300" // Nadgodziny = pomarańczowy
                    : isExact
                    ? "bg-emerald-50 border-emerald-200" // Dokładne godziny = zielony
                    : "bg-white border-slate-200 hover:bg-slate-50" // Niedobór = biały
            )}
        >
            <EmployeeAvatar employee={employee} size="md" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">
                    {getEmployeeFullName(employee)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                hasOvertime
                                    ? "bg-amber-500" // Nadgodziny = pomarańczowy
                                    : isComplete
                                    ? "bg-emerald-500" // OK = zielony
                                    : "bg-blue-500" // Niedobór = niebieski
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span
                        className={cn(
                            "text-[10px] font-medium whitespace-nowrap",
                            hasOvertime
                                ? "text-amber-600" // Nadgodziny = pomarańczowy
                                : isComplete
                                ? "text-emerald-600" // OK = zielony
                                : "text-slate-400" // Niedobór = szary
                        )}
                    >
                        {Math.round(scheduledHours)}/{requiredHours}h
                    </span>
                </div>
            </div>
        </div>
    );
});

// Mniejsza wersja do wyświetlania w komórkach grafiku - DRAGGABLE
export const EmployeeBadge = memo(function EmployeeBadge({
    employee,
    shift,
    onRemove,
    onClick,
}: {
    employee: Employee;
    shift?: LocalShift;
    onRemove?: () => void;
    onClick?: () => void;
}) {
    const employeeColor = getEmployeeColor(employee);

    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: shift ? `shift-${shift.id}` : `badge-${employee.id}`,
            data: {
                type: "shift",
                shift,
                employee,
            },
            disabled: !shift,
        });

    const dragStyle = transform
        ? {
              transform: CSS.Translate.toString(transform),
              zIndex: isDragging ? 1000 : undefined,
          }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={{
                ...dragStyle,
                backgroundColor: `${employeeColor}15`,
            }}
            {...(shift ? listeners : {})}
            {...(shift ? attributes : {})}
            onClick={!isDragging ? onClick : undefined}
            className={cn(
                "group relative flex items-center justify-center gap-0.5 px-1 py-0.5 rounded transition-all",
                shift &&
                    "cursor-grab active:cursor-grabbing select-none touch-none",
                !shift && "cursor-pointer",
                isDragging && "invisible",
                "hover:ring-1 hover:ring-blue-400"
            )}
        >
            <EmployeeAvatar employee={employee} size="md" />
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemove();
                    }}
                    className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full shadow-sm transition-all"
                >
                    <X className="w-2.5 h-2.5" />
                </button>
            )}
        </div>
    );
});
