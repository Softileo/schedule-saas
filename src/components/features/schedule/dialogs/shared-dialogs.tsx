"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { ShiftEditDialog } from "../dialogs/shift-edit-dialog";
import type {
    Employee,
    ShiftTemplate,
    PublicHoliday,
    OrganizationSettings,
} from "@/types";
import type { LocalShift } from "../views/schedule-calendar-dnd";

// Lazy load heavy components (PDF uses @react-pdf/renderer ~200KB)
const ExportDialog = dynamic(
    () => import("./export-dialog").then((mod) => mod.ExportDialog),
    {
        loading: () => (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-lg p-6 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span>Ładowanie eksportu...</span>
                </div>
            </div>
        ),
        ssr: false,
    }
);

const AIGenerateDialog = dynamic(
    () =>
        import("../features/ai/ai-generate-dialog").then(
            (mod) => mod.AIGenerateDialog
        ),
    {
        loading: () => (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-lg p-6 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span>Ładowanie generatora AI...</span>
                </div>
            </div>
        ),
        ssr: false,
    }
);

interface SharedDialogsProps {
    // ShiftEditDialog
    editingShift: LocalShift | null;
    employees: Employee[];
    shiftTemplates: ShiftTemplate[];
    onSaveShiftEdit: (updatedShift: Partial<LocalShift>) => void;
    onCloseShiftEdit: () => void;
    onDeleteShift: () => void;

    // PDFExportDialog
    isPDFDialogOpen: boolean;
    onClosePDF: () => void;
    organizationName: string;
    year: number;
    month: number;
    localShifts: LocalShift[];
    holidays: PublicHoliday[];
    organizationSettings: OrganizationSettings | null;
    employeeHoursMap: Map<string, { scheduled: number; required: number }>;

    // AIGenerateDialog
    isAIDialogOpen: boolean;
    onCloseAI: () => void;
    organizationId: string;
    onRefreshShifts: () => Promise<void>;
}

export function SharedDialogs({
    // ShiftEditDialog
    editingShift,
    employees,
    shiftTemplates,
    onSaveShiftEdit,
    onCloseShiftEdit,
    onDeleteShift,
    // PDFExportDialog
    isPDFDialogOpen,
    onClosePDF,
    organizationName,
    year,
    month,
    localShifts,
    holidays,
    organizationSettings,
    employeeHoursMap,
    // AIGenerateDialog
    isAIDialogOpen,
    onCloseAI,
    organizationId,
    onRefreshShifts,
}: SharedDialogsProps) {
    return (
        <>
            {/* Dialog edycji zmiany */}
            {editingShift && (
                <ShiftEditDialog
                    shift={editingShift}
                    employee={
                        employees.find(
                            (e) => e.id === editingShift.employee_id
                        )!
                    }
                    shiftTemplates={shiftTemplates}
                    onSave={onSaveShiftEdit}
                    onClose={onCloseShiftEdit}
                    onDelete={onDeleteShift}
                />
            )}

            {/* Dialog eksportu PDF */}
            {isPDFDialogOpen && (
                <ExportDialog
                    open={isPDFDialogOpen}
                    onOpenChange={(open) => !open && onClosePDF()}
                    organizationName={organizationName}
                    year={year}
                    month={month}
                    employees={employees}
                    shifts={localShifts}
                    shiftTemplates={shiftTemplates}
                    holidays={holidays}
                    organizationSettings={organizationSettings}
                    employeeHours={employeeHoursMap}
                />
            )}

            {/* Dialog generowania AI */}
            {isAIDialogOpen && (
                <AIGenerateDialog
                    open={isAIDialogOpen}
                    onOpenChange={(open) => !open && onCloseAI()}
                    organizationId={organizationId}
                    year={year}
                    month={month}
                    onRefresh={onRefreshShifts}
                />
            )}
        </>
    );
}
