"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, UserCog, UserCheck, ShieldAlert } from "lucide-react";
import { ABSENCE_TYPE_LABELS } from "@/types";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Employee, EmployeeAbsence, LocalShift } from "@/types";

interface Suggestion {
    employee: Employee;
    score: number; // 0-100, 100 is best
    reason: string;
    sourceShift?: LocalShift; // If we are moving someone from another shift
    staffOnSourceShiftBefore?: number;
    staffOnSourceShiftAfter?: number;
    isNeutralSwap?: boolean;
    overtime: boolean;
}

interface AbsenceManagementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    absence: EmployeeAbsence;
    employee: Employee;
    date: string;
    onDeleteAbsence: (absenceId: string) => Promise<void>;
    onReplaceEmployee: (
        absence: EmployeeAbsence,
        replacementEmployeeId: string,
        sourceShift?: LocalShift,
    ) => Promise<void>;
    // Data for suggestions
    employees: Employee[];
    activeShifts: LocalShift[];
    getSuggestions?: (
        date: string,
        shifts: LocalShift[],
        employees: Employee[],
    ) => Suggestion[];
}

export function AbsenceManagementDialog({
    open,
    onOpenChange,
    absence,
    employee,
    date,
    onDeleteAbsence,
    onReplaceEmployee,
    employees,
    activeShifts,
    getSuggestions,
}: AbsenceManagementDialogProps) {
    const [view, setView] = useState<"initial" | "replace">("initial");
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    const handleReplaceClick = useCallback(() => {
        setView("replace");
        if (getSuggestions) {
            const calculatedSuggestions = getSuggestions(
                date,
                activeShifts,
                employees,
            );
            setSuggestions(calculatedSuggestions);
        } else {
            // Fallback or todo: implement real suggestion logic here if not passed as prop
            // For now just list available employees
            const avail = employees
                .filter((e) => e.id !== employee.id)
                .map((e) => ({
                    employee: e,
                    score: 90,
                    reason: "Dostępny pracownik",
                    overtime: false,
                }));
            setSuggestions(avail);
        }
    }, [date, activeShifts, employees, employee.id, getSuggestions]);

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await onDeleteAbsence(absence.id);
            onOpenChange(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmReplacement = async (suggestion: Suggestion) => {
        setIsLoading(true);
        try {
            await onReplaceEmployee(
                absence,
                suggestion.employee.id,
                suggestion.sourceShift,
            );
            onOpenChange(false);
        } finally {
            setIsLoading(false);
        }
    };

    const absenceLabel =
        ABSENCE_TYPE_LABELS[
            absence.absence_type as keyof typeof ABSENCE_TYPE_LABELS
        ] || absence.absence_type;
    const formattedDate = format(new Date(date), "d MMMM yyyy", { locale: pl });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Zarządzanie nieobecnością</DialogTitle>
                    <DialogDescription>
                        {getEmployeeFullName(employee)} - {formattedDate}
                    </DialogDescription>
                </DialogHeader>

                {view === "initial" ? (
                    <div className="flex flex-col gap-6 py-4">
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
                            <ShieldAlert className="h-5 w-5" />
                            <span className="font-medium text-sm">
                                Zarejestrowana nieobecność: {absenceLabel}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-24 flex flex-col gap-2 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={handleDelete}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <Trash2 className="h-6 w-6 text-red-500" />
                                )}
                                <span>Usuń nieobecność</span>
                            </Button>

                            <Button
                                variant="outline"
                                className="h-24 flex flex-col gap-2 border-slate-200 hover:bg-slate-50"
                                onClick={handleReplaceClick}
                                disabled={isLoading}
                            >
                                <UserCog className="h-6 w-6 text-blue-500" />
                                <span>Zastąp pracownika</span>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 py-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">
                                Sugerowane zastępstwa
                            </h4>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setView("initial")}
                            >
                                Wróć
                            </Button>
                        </div>

                        <ScrollArea className="h-[300px] pr-4">
                            <div className="flex flex-col gap-2">
                                {suggestions.map((suggestion) => (
                                    <div
                                        key={
                                            suggestion.employee.id +
                                            (suggestion.sourceShift?.id || "")
                                        }
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium text-sm">
                                                {getEmployeeFullName(
                                                    suggestion.employee,
                                                )}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={
                                                        suggestion.score > 80
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                    className="text-[10px]"
                                                >
                                                    {suggestion.score}%
                                                    dopasowania
                                                </Badge>
                                                {suggestion.sourceShift && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] text-amber-600 border-amber-200"
                                                    >
                                                        Przesunięcie
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 whitespace-pre-wrap">
                                                {suggestion.reason}
                                            </div>
                                            {suggestion.sourceShift && (
                                                <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200">
                                                    <div className="font-medium">
                                                        Jej zmiana:{" "}
                                                        {suggestion.sourceShift.start_time.slice(
                                                            0,
                                                            5,
                                                        )}
                                                        -
                                                        {suggestion.sourceShift.end_time.slice(
                                                            0,
                                                            5,
                                                        )}
                                                    </div>
                                                    <div>
                                                        Będzie:{" "}
                                                        <span className="font-medium">
                                                            {
                                                                suggestion.staffOnSourceShiftBefore
                                                            }{" "}
                                                            osób ➜{" "}
                                                            {
                                                                suggestion.staffOnSourceShiftAfter
                                                            }{" "}
                                                            osób
                                                        </span>
                                                    </div>
                                                    {suggestion.isNeutralSwap && (
                                                        <div className="text-amber-600 text-[10px] font-semibold mt-1">
                                                            (Zamiana neutralna
                                                            dla limitu godzin)
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                handleConfirmReplacement(
                                                    suggestion,
                                                )
                                            }
                                            disabled={
                                                isLoading || suggestion.overtime
                                            }
                                            className={
                                                suggestion.overtime
                                                    ? "opacity-50 cursor-not-allowed bg-red-100 hover:bg-red-100 text-red-700"
                                                    : ""
                                            }
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <UserCheck className="h-4 w-4" />
                                            )}
                                            {suggestion.overtime
                                                ? "Nadgodziny - Blokada"
                                                : "Wybierz"}
                                        </Button>
                                    </div>
                                ))}
                                {suggestions.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 text-sm">
                                        Brak idealnych sugestii.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
