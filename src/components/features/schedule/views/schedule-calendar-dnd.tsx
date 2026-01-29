"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useRegisterSaveFunction } from "@/lib/hooks/use-register-save-function";

import { ScheduleHeroView } from "../views/schedule-hero-view";
import { RestViolationsWarning } from "../components/rest-violations-warning";
import { SharedDialogs } from "../dialogs/shared-dialogs";
import { ActionToolbar } from "../components/action-toolbar";
import { MonthSelector } from "../components/month-selector";

import { useScheduleState } from "../hooks/use-schedule-state";

import type {
    Employee,
    ShiftTemplate,
    PublicHoliday,
    OrganizationSettings,
    EmployeePreferences,
    EmployeeAbsence,
    ShiftTemplateAssignment,
    LocalShift,
    ShiftFromDB,
} from "@/types";
import { useUnsavedChanges } from "@/lib/contexts/unsaved-changes-context";

// Re-export LocalShift dla innych komponentów
export type { LocalShift } from "@/types";

interface ScheduleCalendarDnDProps {
    year: number;
    month: number;
    holidays: PublicHoliday[];
    employees: Employee[];
    shifts: ShiftFromDB[];
    scheduleId: string;
    shiftTemplates: ShiftTemplate[];
    organizationSettings: OrganizationSettings | null;
    employeePreferences: EmployeePreferences[];
    employeeAbsences: EmployeeAbsence[];
    templateAssignments: ShiftTemplateAssignment[];
    organizationId: string;
    organizationName: string;
}

export function ScheduleCalendarDnD({
    year,
    month,
    holidays,
    employees,
    shifts: initialShifts,
    scheduleId,
    shiftTemplates,
    organizationSettings,
    employeeAbsences: initialAbsences,
    templateAssignments,
    organizationId,
    organizationName,
}: ScheduleCalendarDnDProps) {
    // Główny hook zarządzający stanem grafiku
    const {
        // Dane
        employeeAbsences,
        filteredEmployeeIds,
        sortedShiftTemplates,
        holidaysMap,
        localShifts,
        activeShifts,
        employeeHoursMap,
        employeeAbsenceInfo,
        violations,

        // Funkcje
        setFilteredEmployeeIds,
        refreshAbsences,
        removeShift,
        updateShift,
        clearAllShifts,
        refreshFromDB,
        saveAll,
        setLocalShifts,
        handleAddShift: addShiftToState,
        checkViolationForCell,
    } = useScheduleState({
        year,
        month,
        holidays,
        employees,
        initialShifts,
        scheduleId,
        shiftTemplates,
        organizationSettings,
        initialAbsences,
    });

    // Stan UI
    const [editingShift, setEditingShift] = useState<LocalShift | null>(null);
    const [isPDFDialogOpen, setIsPDFDialogOpen] = useState(false);
    const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);

    // Rejestruj funkcję zapisu
    useRegisterSaveFunction(saveAll);

    // Dodaj zmianę (dla mobile/compact view)
    const handleAddShift = useCallback(
        (shift: LocalShift) => {
            addShiftToState(shift);
        },
        [addShiftToState],
    );

    // Zapisz edycję zmiany
    const handleSaveShiftEdit = useCallback(
        (updatedShift: Partial<LocalShift>) => {
            if (!editingShift) return;

            setLocalShifts((prev) =>
                prev.map((s) => {
                    if (s.id !== editingShift.id) return s;
                    return {
                        ...s,
                        ...updatedShift,
                        status: s.status === "new" ? "new" : "modified",
                    };
                }),
            );
            setEditingShift(null);
            toast.success("Zapisano zmiany");
        },
        [editingShift, setLocalShifts],
    );

    // Handlers dla dialogów
    const handleCloseShiftEdit = useCallback(() => setEditingShift(null), []);
    const handleDeleteShift = useCallback(() => {
        if (editingShift) {
            removeShift(editingShift.id);
            setEditingShift(null);
        }
    }, [editingShift, removeShift]);
    const handleOpenPDFDialog = useCallback(() => setIsPDFDialogOpen(true), []);
    const handleClosePDFDialog = useCallback(
        () => setIsPDFDialogOpen(false),
        [],
    );
    const handleOpenAIDialog = useCallback(() => setIsAIDialogOpen(true), []);
    const handleCloseAIDialog = useCallback(() => setIsAIDialogOpen(false), []);

    // Wspólne props dla SharedDialogs (memoizowane)
    const sharedDialogsProps = useMemo(
        () => ({
            editingShift,
            employees,
            shiftTemplates,
            onSaveShiftEdit: handleSaveShiftEdit,
            onCloseShiftEdit: handleCloseShiftEdit,
            onDeleteShift: handleDeleteShift,
            isPDFDialogOpen,
            onClosePDF: handleClosePDFDialog,
            organizationName,
            year,
            month,
            localShifts,
            holidays,
            organizationSettings,
            employeeHoursMap,
            isAIDialogOpen,
            onCloseAI: handleCloseAIDialog,
            organizationId,
            onRefreshShifts: refreshFromDB,
        }),
        [
            editingShift,
            employees,
            shiftTemplates,
            handleSaveShiftEdit,
            handleCloseShiftEdit,
            handleDeleteShift,
            isPDFDialogOpen,
            handleClosePDFDialog,
            organizationName,
            year,
            month,
            localShifts,
            holidays,
            organizationSettings,
            employeeHoursMap,
            isAIDialogOpen,
            handleCloseAIDialog,
            organizationId,
            refreshFromDB,
        ],
    );

    // Wspólne props dla ActionToolbar
    const actionToolbarProps = useMemo(
        () => ({
            shiftTemplates,
            organizationId,
            employees,
            onOpenPDFDialog: handleOpenPDFDialog,
            onOpenAIDialog: handleOpenAIDialog,
            scheduleId,
            year,
            month,
            shiftsCount: activeShifts.length,
            onClearSchedule: clearAllShifts,
        }),
        [
            shiftTemplates,
            organizationId,
            employees,
            handleOpenPDFDialog,
            handleOpenAIDialog,
            scheduleId,
            year,
            month,
            activeShifts.length,
            clearAllShifts,
        ],
    );

    // Wspólne props dla widoków kalendarza
    const commonViewProps = useMemo(
        () => ({
            year,
            month,
            holidays,
            holidaysMap,
            employees,
            localShifts,
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
            onFilterChange: setFilteredEmployeeIds,
            onRemoveShift: removeShift,
            checkViolationForCell,
            onAbsenceAdded: refreshAbsences,
            setFilteredEmployeeIds, // Added missing dependency
        }),
        [
            year,
            month,
            holidays,
            holidaysMap,
            employees,
            localShifts,
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
            removeShift,
            checkViolationForCell,
            refreshAbsences,
            setFilteredEmployeeIds, // Added to deps
        ],
    );

    const { hasUnsavedChanges } = useUnsavedChanges();

    // =========================================================================
    // RENDEROWANIE
    // =========================================================================

    const renderDesktopHeader = () => (
        <div
            className={`sm:sticky space-y-3 top-18 z-40 flex sm:flex-row flex-col items-center justify-between mb-3 ${hasUnsavedChanges ? "lg:translate-y-0" : "lg:-translate-y-full"} transition-transform duration-300 ease-out`}
        >
            <MonthSelector year={year} month={month} />
            <ActionToolbar {...actionToolbarProps} />
        </div>
    );

    const renderHeroView = () => (
        <>
            {renderDesktopHeader()}
            <ScheduleHeroView
                {...commonViewProps}
                onUpdateShift={updateShift}
                onAddShift={handleAddShift}
            />
        </>
    );

    return (
        <>
            <RestViolationsWarning violations={violations} />
            {renderHeroView()}
            <SharedDialogs {...sharedDialogsProps} />
        </>
    );
}
