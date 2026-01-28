"use client";

import { useMemo, useState } from "react";
import {
    ArrowRightLeft,
    UserCheck,
    AlertTriangle,
    Check,
    X,
    Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    getEmployeeFullName,
    getEmployeeColor,
    getEmployeeInitials,
} from "@/lib/core/employees/utils";
import { checkEmployeeAbsence } from "@/lib/core/schedule/utils";
import { getEmploymentTypeShortLabel } from "@/lib/core/schedule/work-hours";
import {
    EMPLOYMENT_TYPES,
    type EmploymentType,
} from "@/lib/constants/employment";
import type { Employee, LocalShift, EmployeeAbsence } from "@/types";

interface SwapCandidate {
    employee: Employee;
    currentShift: LocalShift | null; // Zmiana kandydata w dniu nieobecności
    hasViolation: boolean; // Czy zamiana naruszy 11h odpoczynku
    hoursBalance: number; // Bilans godzin (scheduled - required)
    canSwap: boolean; // Czy może wziąć zmianę (bez własnej nieobecności)
    reason?: string; // Powód dlaczego nie może
}

interface ShiftSwapDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    absentEmployee: Employee;
    absentShift: LocalShift; // Zmiana którą trzeba obsadzić
    date: string;
    employees: Employee[];
    allShifts: LocalShift[];
    employeeAbsences: EmployeeAbsence[];
    employeeHoursMap: Map<string, { scheduled: number; required: number }>;
    checkViolationForCell: (
        employeeId: string,
        date: string,
        startTime: string,
        endTime: string
    ) => boolean;
    onSwapShifts: (
        originalShift: LocalShift,
        replacementEmployeeId: string,
        swapShift?: LocalShift
    ) => void;
}

export function ShiftSwapDialog({
    open,
    onOpenChange,
    absentEmployee,
    absentShift,
    date,
    employees,
    allShifts,
    employeeAbsences,
    employeeHoursMap,
    checkViolationForCell,
    onSwapShifts,
}: ShiftSwapDialogProps) {
    const [selectedCandidate, setSelectedCandidate] = useState<string | null>(
        null
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [employmentFilter, setEmploymentFilter] = useState<string | null>(
        null
    );

    // Dostępne typy etatów (tylko te które mają pracowników)
    const availableEmploymentTypes = useMemo(() => {
        const typeCounts = new Map<EmploymentType, number>();
        employees
            .filter((e) => e.id !== absentEmployee.id)
            .forEach((e) => {
                const count =
                    typeCounts.get(e.employment_type as EmploymentType) || 0;
                typeCounts.set(e.employment_type as EmploymentType, count + 1);
            });

        // Zwróć typy w kolejności z EMPLOYMENT_TYPES
        return EMPLOYMENT_TYPES.filter((t) => typeCounts.has(t.value)).map(
            (t) => ({
                ...t,
                count: typeCounts.get(t.value) || 0,
            })
        );
    }, [employees, absentEmployee.id]);

    // Znajdź kandydatów do zamiany
    const candidates = useMemo((): SwapCandidate[] => {
        return (
            employees
                .filter((emp) => emp.id !== absentEmployee.id)
                .map((emp) => {
                    // Sprawdź czy pracownik ma nieobecność tego dnia
                    const absence = checkEmployeeAbsence(
                        emp.id,
                        date,
                        employeeAbsences
                    );
                    if (absence) {
                        return {
                            employee: emp,
                            currentShift: null,
                            hasViolation: false,
                            hoursBalance: 0,
                            canSwap: false,
                            reason: "Ma nieobecność",
                        };
                    }

                    // Sprawdź czy pracownik ma już zmianę tego dnia
                    const existingShift = allShifts.find(
                        (s) =>
                            s.employee_id === emp.id &&
                            s.date === date &&
                            s.status !== "deleted"
                    );

                    // Sprawdź naruszenie 11h odpoczynku
                    const hasViolation = checkViolationForCell(
                        emp.id,
                        date,
                        absentShift.start_time,
                        absentShift.end_time
                    );

                    // Bilans godzin
                    const hours = employeeHoursMap.get(emp.id);
                    const hoursBalance = hours
                        ? hours.scheduled - hours.required
                        : 0;

                    return {
                        employee: emp,
                        currentShift: existingShift || null,
                        hasViolation,
                        hoursBalance,
                        canSwap: !hasViolation,
                        reason: hasViolation
                            ? "Naruszy 11h odpoczynku"
                            : undefined,
                    };
                })
                // Sortuj: najpierw ci co mają inną zmianę (zamiana), potem wolni z deficytem, potem reszta
                .sort((a, b) => {
                    if (a.canSwap && !b.canSwap) return -1;
                    if (!a.canSwap && b.canSwap) return 1;
                    if (a.canSwap && b.canSwap) {
                        // Najpierw ci z inną zmianą (zamiana zmian - bez nadgodzin)
                        if (a.currentShift && !b.currentShift) return -1;
                        if (!a.currentShift && b.currentShift) return 1;
                        // Następnie sortuj po bilansie godzin (preferuj tych z niedomiarem)
                        return a.hoursBalance - b.hoursBalance;
                    }
                    return 0;
                })
        );
    }, [
        employees,
        absentEmployee.id,
        date,
        employeeAbsences,
        allShifts,
        checkViolationForCell,
        absentShift,
        employeeHoursMap,
    ]);

    // Filtrowanie kandydatów
    const filteredCandidates = useMemo(() => {
        return candidates.filter((c) => {
            // Filtr po wyszukiwaniu
            if (searchQuery) {
                const fullName = getEmployeeFullName(c.employee).toLowerCase();
                if (!fullName.includes(searchQuery.toLowerCase())) {
                    return false;
                }
            }
            // Filtr po typie etatu
            if (
                employmentFilter &&
                c.employee.employment_type !== employmentFilter
            ) {
                return false;
            }
            return true;
        });
    }, [candidates, searchQuery, employmentFilter]);

    // Rekomendowani (mogą wziąć zmianę, bez własnej zmiany, bez naruszenia)
    const recommended = filteredCandidates.filter(
        (c) => c.canSwap && !c.currentShift
    );

    // Podziel rekomendowanych na tych z deficytem i tych z nadgodzinami
    const withDeficit = recommended.filter((c) => c.hoursBalance < 0);
    const withOvertime = recommended.filter((c) => c.hoursBalance >= 0);

    // Mogą zamienić (mają zmianę ale mogą zamienić)
    const canSwapWith = filteredCandidates.filter(
        (c) => c.canSwap && c.currentShift
    );

    // Policz ile osób jest na zmianie nieobecnego (ta sama godzina)
    const shiftsOnSameTime = allShifts.filter(
        (s) =>
            s.date === date &&
            s.status !== "deleted" &&
            s.start_time === absentShift.start_time &&
            s.end_time === absentShift.end_time
    );
    const currentStaffOnShift = shiftsOnSameTime.length;

    // Nie mogą
    const cannotSwap = filteredCandidates.filter((c) => !c.canSwap);

    const handleConfirmSwap = () => {
        if (!selectedCandidate) return;

        const candidate = candidates.find(
            (c) => c.employee.id === selectedCandidate
        );
        if (!candidate) return;

        onSwapShifts(
            absentShift,
            selectedCandidate,
            candidate.currentShift || undefined
        );
        onOpenChange(false);
        setSelectedCandidate(null);
    };

    // Pomocnicza funkcja do liczenia osób na danej zmianie
    const countStaffOnShift = (startTime: string, endTime: string): number => {
        return allShifts.filter(
            (s) =>
                s.date === date &&
                s.status !== "deleted" &&
                s.start_time === startTime &&
                s.end_time === endTime
        ).length;
    };

    const renderCandidate = (candidate: SwapCandidate, showReason = false) => {
        const isSelected = selectedCandidate === candidate.employee.id;
        const hours = employeeHoursMap.get(candidate.employee.id);

        // Ile osób na zmianie kandydata (jeśli ma zmianę)
        const candidateShiftStaff = candidate.currentShift
            ? countStaffOnShift(
                  candidate.currentShift.start_time,
                  candidate.currentShift.end_time
              )
            : 0;

        return (
            <button
                key={candidate.employee.id}
                onClick={() =>
                    candidate.canSwap &&
                    setSelectedCandidate(candidate.employee.id)
                }
                disabled={!candidate.canSwap}
                className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                    candidate.canSwap
                        ? isSelected
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                            : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                        : "border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed"
                )}
            >
                {/* Avatar */}
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{
                        backgroundColor: getEmployeeColor(candidate.employee),
                    }}
                >
                    {getEmployeeInitials(candidate.employee)}
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 truncate">
                            {getEmployeeFullName(candidate.employee)}
                        </span>
                        <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 shrink-0"
                        >
                            {getEmploymentTypeShortLabel(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                candidate.employee.employment_type as any
                            )}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {hours && (
                            <span
                                className={cn(
                                    "text-xs",
                                    hours.scheduled >= hours.required
                                        ? hours.scheduled > hours.required
                                            ? "text-orange-500"
                                            : "text-green-600"
                                        : "text-slate-400"
                                )}
                            >
                                {hours.scheduled}/{hours.required}h
                            </span>
                        )}
                        {candidate.currentShift && (
                            <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                            >
                                {candidate.currentShift.start_time.slice(0, 5)}-
                                {candidate.currentShift.end_time.slice(0, 5)} (
                                {candidateShiftStaff} os.)
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Status */}
                <div className="shrink-0">
                    {candidate.canSwap ? (
                        isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-slate-300" />
                        )
                    ) : (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                            {showReason && candidate.reason && (
                                <span>{candidate.reason}</span>
                            )}
                            <X className="w-4 h-4 text-slate-400" />
                        </div>
                    )}
                </div>
            </button>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                        Znajdź zastępstwo
                    </DialogTitle>
                    <DialogDescription>
                        <span className="font-medium text-slate-700">
                            {getEmployeeFullName(absentEmployee)}
                        </span>{" "}
                        ma nieobecność. Wybierz kto weźmie zmianę{" "}
                        <span className="font-medium">
                            {absentShift.start_time.slice(0, 5)}-
                            {absentShift.end_time.slice(0, 5)}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                {/* Wyszukiwarka i filtry */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Szukaj pracownika..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                    {availableEmploymentTypes.length > 1 && (
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setEmploymentFilter(null)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    employmentFilter === null
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                Wszyscy
                            </button>
                            {availableEmploymentTypes.map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() =>
                                        setEmploymentFilter(type.value)
                                    }
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                        employmentFilter === type.value
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-600 hover:text-slate-900"
                                    )}
                                    title={type.label}
                                >
                                    {type.shortLabel}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="max-h-80 overflow-y-auto pr-4 -mr-4">
                    <div className="space-y-4">
                        {/* Zamiana zmian - NAJPIERW (bez nadgodzin) */}
                        {canSwapWith.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-medium text-slate-700">
                                        Zamiana zmian ({canSwapWith.length})
                                    </span>
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] bg-blue-100 text-blue-700"
                                    >
                                        bez nadgodzin
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Po zamianie na tej zmianie będzie{" "}
                                    <span className="font-medium">
                                        {currentStaffOnShift} osób
                                    </span>
                                </p>
                                <div className="space-y-2">
                                    {canSwapWith.map((c) => renderCandidate(c))}
                                </div>
                            </div>
                        )}

                        {/* Z deficytem godzin */}
                        {withDeficit.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <UserCheck className="w-4 h-4 text-green-500" />
                                    <span className="text-sm font-medium text-slate-700">
                                        Brakuje godzin ({withDeficit.length})
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Po dodaniu na tej zmianie będzie{" "}
                                    <span className="font-medium">
                                        {currentStaffOnShift + 1} osób
                                    </span>
                                </p>
                                <div className="space-y-2">
                                    {withDeficit.map((c) => renderCandidate(c))}
                                </div>
                            </div>
                        )}

                        {/* Z nadgodzinami */}
                        {withOvertime.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    <span className="text-sm font-medium text-slate-700">
                                        Będą nadgodziny ({withOvertime.length})
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Po dodaniu na tej zmianie będzie{" "}
                                    <span className="font-medium">
                                        {currentStaffOnShift + 1} osób
                                    </span>
                                </p>
                                <div className="space-y-2">
                                    {withOvertime.map((c) =>
                                        renderCandidate(c)
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Nie mogą */}
                        {cannotSwap.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-400">
                                        Niedostępni ({cannotSwap.length})
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {cannotSwap.map((c) =>
                                        renderCandidate(c, true)
                                    )}
                                </div>
                            </div>
                        )}

                        {candidates.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                Brak dostępnych pracowników
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Anuluj
                    </Button>
                    <Button
                        disabled={!selectedCandidate}
                        onClick={handleConfirmSwap}
                    >
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                        Przypisz zmianę
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
