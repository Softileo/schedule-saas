"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { showToast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import {
    getEmployeeColor,
    getEmployeeInitials,
    getEmployeeFullName,
} from "@/lib/core/employees/utils";
import { getEmploymentTypeShortLabel } from "@/lib/core/schedule/work-hours";
import {
    EMPLOYMENT_TYPES,
    type EmploymentType,
} from "@/lib/constants/employment";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BaseDialog } from "@/components/common/dialogs";
import { Users, Info, Search, Check, X } from "lucide-react";
import { InlineLoader, ButtonSpinner } from "@/components/ui/page-loader";
import type { Employee, ShiftTemplate } from "@/types";

interface ShiftTemplateAssignmentsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template: ShiftTemplate;
    employees: Employee[];
    onSuccess?: () => void;
}

export function ShiftTemplateAssignmentsDialog({
    open,
    onOpenChange,
    template,
    employees,
    onSuccess,
}: ShiftTemplateAssignmentsDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<Set<string>>(
        new Set()
    );
    const [initialAssignments, setInitialAssignments] = useState<Set<string>>(
        new Set()
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [employmentFilter, setEmploymentFilter] = useState<string | null>(
        null
    );

    // Dostępne typy etatów (tylko te które mają pracowników)
    const availableEmploymentTypes = useMemo(() => {
        const typeCounts = new Map<EmploymentType, number>();
        employees.forEach((e) => {
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
    }, [employees]);

    // Filtrowanie pracowników
    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            // Filtr po wyszukiwaniu
            if (searchQuery) {
                const fullName = getEmployeeFullName(emp).toLowerCase();
                if (!fullName.includes(searchQuery.toLowerCase())) {
                    return false;
                }
            }
            // Filtr po typie etatu
            if (employmentFilter && emp.employment_type !== employmentFilter) {
                return false;
            }
            return true;
        });
    }, [employees, searchQuery, employmentFilter]);

    const loadAssignments = useCallback(async () => {
        setIsLoading(true);
        const supabase = createClient();

        const { data, error } = await supabase
            .from("shift_template_assignments")
            .select("employee_id")
            .eq("template_id", template.id);

        if (error) {
            logger.error("Error loading assignments:", error);
            showToast.loadError("przypisań");
            setIsLoading(false);
            return;
        }

        const ids = new Set(data?.map((a) => a.employee_id) || []);
        setAssignedEmployeeIds(ids);
        setInitialAssignments(new Set(ids));
        setIsLoading(false);
    }, [template.id]);

    // Pobierz aktualne przypisania
    useEffect(() => {
        if (open && template) {
            loadAssignments();
        }
    }, [open, template, loadAssignments]);

    function toggleEmployee(employeeId: string) {
        setAssignedEmployeeIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(employeeId)) {
                newSet.delete(employeeId);
            } else {
                newSet.add(employeeId);
            }
            return newSet;
        });
    }

    function selectAll() {
        setAssignedEmployeeIds((prev) => {
            const newSet = new Set(prev);
            filteredEmployees.forEach((e) => newSet.add(e.id));
            return newSet;
        });
    }

    function deselectAll() {
        setAssignedEmployeeIds((prev) => {
            const newSet = new Set(prev);
            filteredEmployees.forEach((e) => newSet.delete(e.id));
            return newSet;
        });
    }

    async function handleSave() {
        setIsSaving(true);

        try {
            const supabase = createClient();

            // Znajdź zmiany
            const toAdd = [...assignedEmployeeIds].filter(
                (id) => !initialAssignments.has(id)
            );
            const toRemove = [...initialAssignments].filter(
                (id) => !assignedEmployeeIds.has(id)
            );

            // Usuń stare przypisania
            if (toRemove.length > 0) {
                const { error } = await supabase
                    .from("shift_template_assignments")
                    .delete()
                    .eq("template_id", template.id)
                    .in("employee_id", toRemove);

                if (error) throw error;
            }

            // Dodaj nowe przypisania
            if (toAdd.length > 0) {
                const { error } = await supabase
                    .from("shift_template_assignments")
                    .insert(
                        toAdd.map((employeeId) => ({
                            template_id: template.id,
                            employee_id: employeeId,
                        }))
                    );

                if (error) throw error;
            }

            showToast.saved();
            onOpenChange(false);
            onSuccess?.();
            router.refresh();
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error saving assignments:", message);
            showToast.saveError();
        } finally {
            setIsSaving(false);
        }
    }

    const hasChanges =
        [...assignedEmployeeIds].sort().join(",") !==
        [...initialAssignments].sort().join(",");

    return (
        <BaseDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Przypisz pracowników"
            icon={Users}
            description={
                <>
                    Wybierz, którzy pracownicy mogą pracować na zmianie{" "}
                    <span
                        className="font-medium"
                        style={{ color: template.color ?? undefined }}
                    >
                        {template.start_time.slice(0, 5)} -{" "}
                        {template.end_time.slice(0, 5)}
                    </span>
                </>
            }
        >
            {/* Info */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                    Jeśli nie wybierzesz żadnego pracownika, wszyscy będą mogli
                    mieć tę zmianę. Wybierz konkretnych pracowników, aby
                    ograniczyć dostępność tej zmiany.
                </p>
            </div>

            {/* Lista pracowników */}
            <div className="space-y-4">
                {isLoading ? (
                    <InlineLoader text="Ładowanie przypisań..." size={24} />
                ) : (
                    <>
                        {/* Wyszukiwarka i filtry w jednym rzędzie */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="Szukaj pracownika..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="pl-9 h-9"
                                />
                            </div>

                            {/* Filtry typów etatów jako segmented control */}
                            {availableEmploymentTypes.length > 1 && (
                                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                    <button
                                        onClick={() =>
                                            setEmploymentFilter(null)
                                        }
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

                        {/* Przyciski akcji i licznik */}
                        <div className="flex items-center justify-between py-2 border-y border-slate-100">
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectAll}
                                    className="text-xs h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    Zaznacz ({filteredEmployees.length})
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={deselectAll}
                                    className="text-xs h-7 text-slate-500 hover:text-slate-700"
                                >
                                    <X className="w-3.5 h-3.5 mr-1" />
                                    Odznacz
                                </Button>
                            </div>
                            {assignedEmployeeIds.size > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="font-medium"
                                >
                                    {assignedEmployeeIds.size} wybranych
                                </Badge>
                            )}
                        </div>

                        {/* Lista */}
                        <div className="max-h-64 overflow-y-auto -mx-1 px-1">
                            {filteredEmployees.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-slate-500">
                                        {searchQuery || employmentFilter
                                            ? "Brak pracowników spełniających kryteria"
                                            : "Brak pracowników"}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredEmployees.map((employee) => {
                                        const isAssigned =
                                            assignedEmployeeIds.has(
                                                employee.id
                                            );
                                        const employeeColor =
                                            getEmployeeColor(employee);

                                        return (
                                            <label
                                                key={employee.id}
                                                className={cn(
                                                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                                                    isAssigned
                                                        ? "bg-blue-50 border border-blue-200"
                                                        : "hover:bg-slate-50 border border-transparent"
                                                )}
                                            >
                                                <Checkbox
                                                    checked={isAssigned}
                                                    onCheckedChange={() =>
                                                        toggleEmployee(
                                                            employee.id
                                                        )
                                                    }
                                                    className={cn(
                                                        isAssigned &&
                                                            "border-blue-500 bg-blue-500"
                                                    )}
                                                />
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            employeeColor,
                                                    }}
                                                >
                                                    {getEmployeeInitials(
                                                        employee
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className={cn(
                                                            "text-sm font-medium",
                                                            isAssigned
                                                                ? "text-blue-900"
                                                                : "text-slate-900"
                                                        )}
                                                    >
                                                        {getEmployeeFullName(
                                                            employee
                                                        )}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] px-1.5 py-0 shrink-0",
                                                        isAssigned
                                                            ? "border-blue-300 text-blue-700 bg-blue-50"
                                                            : "text-slate-500"
                                                    )}
                                                >
                                                    {getEmploymentTypeShortLabel(
                                                        employee.employment_type as EmploymentType
                                                    )}
                                                </Badge>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Podsumowanie i przycisk zapisz */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                    {assignedEmployeeIds.size === 0 ? (
                        <span className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            Wszyscy pracownicy mogą pracować
                        </span>
                    ) : (
                        <span>
                            Ograniczono do{" "}
                            <strong className="text-slate-900">
                                {assignedEmployeeIds.size}
                            </strong>{" "}
                            z {employees.length} pracowników
                        </span>
                    )}
                </div>
                <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                    {isSaving && <ButtonSpinner />}
                    Zapisz zmiany
                </Button>
            </div>
        </BaseDialog>
    );
}
