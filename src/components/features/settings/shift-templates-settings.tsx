"use client";

import { ShiftTemplate, Employee } from "@/types";
import { SettingsCard } from "@/components/ui/settings-card";
import { ShiftTemplatesList } from "./shift-templates-list";
import { ShiftTemplateDialog } from "@/components/features/schedule/dialogs/shift-template-dialog";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShiftTemplates } from "@/lib/hooks/use-shift-templates";

interface ShiftTemplatesSettingsProps {
    templates: ShiftTemplate[];
    organizationId: string;
    employees?: Employee[];
}

export function ShiftTemplatesSettings({
    templates,
    organizationId,
    employees = [],
}: ShiftTemplatesSettingsProps) {
    const {
        dialogOpen,
        setDialogOpen,
        editingTemplate,
        openCreateDialog,
        openEditDialog,
        deletingId,
        handleDelete,
    } = useShiftTemplates();

    return (
        <>
            <SettingsCard
                title="Szablony zmian"
                description="Twórz szablony do szybkiego dodawania zmian"
                headerAction={
                    <Button onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Dodaj zmianę
                    </Button>
                }
            >
                <ShiftTemplatesList
                    templates={templates}
                    organizationId={organizationId}
                    employees={employees}
                    showHeader={false}
                    onEditTemplate={openEditDialog}
                    onDeleteTemplate={handleDelete}
                    deletingId={deletingId}
                />
            </SettingsCard>

            <ShiftTemplateDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                organizationId={organizationId}
                editingTemplate={editingTemplate}
                showMinEmployees={true}
                usedColors={templates
                    .map((t) => t.color)
                    .filter((c): c is string => c !== null)}
            />
        </>
    );
}
