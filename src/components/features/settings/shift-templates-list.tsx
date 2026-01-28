"use client";

import { useState, useMemo } from "react";
import { ShiftTemplate, Employee } from "@/types";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Trash2,
    Clock,
    Coffee,
    Pencil,
    Users,
    MoreHorizontal,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ShiftTemplateDialog } from "@/components/features/schedule/dialogs/shift-template-dialog";
import { ShiftTemplateAssignmentsDialog } from "@/components/features/schedule/dialogs/shift-template-assignments-dialog";
import { useShiftTemplates } from "@/lib/hooks/use-shift-templates";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShiftTemplatesListProps {
    templates: ShiftTemplate[];
    organizationId: string;
    employees: Employee[];
    showHeader?: boolean;
    children?: React.ReactNode;
    // Opcjonalne - jeśli przekazane, używamy zewnętrznego stanu
    onEditTemplate?: (template: ShiftTemplate) => void;
    onDeleteTemplate?: (templateId: string) => void;
    deletingId?: string | null;
}

export function ShiftTemplatesList(props: ShiftTemplatesListProps) {
    const {
        templates,
        organizationId,
        employees,
        showHeader = true,
        children,
        onEditTemplate,
        onDeleteTemplate,
        deletingId: externalDeletingId,
    } = props;
    // Hook używany tylko gdy nie ma zewnętrznych callbacków (standalone mode)
    const internalHook = useShiftTemplates();

    // Użyj zewnętrznych callbacków lub wewnętrznego hooka
    const dialogOpen = onEditTemplate ? false : internalHook.dialogOpen;
    const setDialogOpen = onEditTemplate
        ? () => {}
        : internalHook.setDialogOpen;
    const editingTemplate = onEditTemplate
        ? null
        : internalHook.editingTemplate;
    const deletingId = externalDeletingId ?? internalHook.deletingId;
    const openCreateDialog = onEditTemplate
        ? () => {}
        : internalHook.openCreateDialog;
    const openEditDialog = onEditTemplate ?? internalHook.openEditDialog;
    const handleDelete = onDeleteTemplate ?? internalHook.handleDelete;

    const [assignmentsTemplate, setAssignmentsTemplate] =
        useState<ShiftTemplate | null>(null);

    // Sortuj szablony od najwcześniejszej do najpóźniejszej zmiany
    const sortedTemplates = useMemo(() => {
        return [...templates].sort((a, b) =>
            a.start_time.localeCompare(b.start_time)
        );
    }, [templates]);

    return (
        <>
            {/* Header - only for standalone page */}
            {showHeader && (
                <div className="mb-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800">
                                Szablony zmian
                            </h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {sortedTemplates.length > 0
                                    ? `${sortedTemplates.length} ${
                                          sortedTemplates.length === 1
                                              ? "zmiana"
                                              : sortedTemplates.length < 5
                                              ? "zmiany"
                                              : "zmian"
                                      }`
                                    : "Twórz zmiany do szybkiego dodawania do grafiku"}
                            </p>
                        </div>
                        <Button size="sm" onClick={openCreateDialog}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            Dodaj zmianę
                        </Button>
                    </div>
                </div>
            )}
            {children}

            {/* Content */}
            {sortedTemplates.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-200">
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <Clock className="h-8 w-8 text-slate-300 mb-3" />
                        <p className="text-sm text-slate-500">
                            Brak szablonów zmian
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {sortedTemplates.map((template) => {
                        // Calculate shift duration
                        const [startH, startM] = template.start_time
                            .split(":")
                            .map(Number);
                        const [endH, endM] = template.end_time
                            .split(":")
                            .map(Number);
                        let duration =
                            endH * 60 + endM - (startH * 60 + startM);
                        if (duration < 0) duration += 24 * 60;
                        const hours = Math.floor(duration / 60);
                        const mins = duration % 60;

                        return (
                            <div
                                key={template.id}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors"
                            >
                                {/* Avatar - identyczny jak w shift-templates-manager */}
                                <div
                                    className="w-11 h-11 rounded-lg flex flex-col items-center justify-center border shadow-sm shrink-0"
                                    style={{
                                        backgroundColor: template.color
                                            ? `${template.color}15`
                                            : undefined,
                                        borderColor: template.color
                                            ? `${template.color}35`
                                            : undefined,
                                        color: template.color ?? undefined,
                                    }}
                                >
                                    <span className="font-bold text-[11px] leading-none">
                                        {template.start_time.substring(0, 5)}
                                    </span>
                                    <span className="opacity-60 text-[9px] leading-none mt-0.5">
                                        {template.end_time.substring(0, 5)}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-slate-800">
                                        {template.start_time.substring(0, 5)} →{" "}
                                        {template.end_time.substring(0, 5)}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                                        <span>
                                            {hours}h
                                            {mins > 0 ? ` ${mins}m` : ""}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Coffee className="h-3 w-3" />
                                            {template.break_minutes || 0}min
                                        </span>
                                        <span className="flex items-center gap-1 text-blue-600">
                                            <Users className="h-3 w-3" />
                                            {template.min_employees || 0}
                                            {template.max_employees
                                                ? `-${template.max_employees}`
                                                : "+"}{" "}
                                            os.
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <div className="hidden sm:flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setAssignmentsTemplate(template)
                                            }
                                            disabled={employees.length === 0}
                                            className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                                        >
                                            <Users className="h-3.5 w-3.5 mr-1" />
                                            Przypisz zmiane
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                            onClick={() =>
                                                openEditDialog(template)
                                            }
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                                            onClick={() =>
                                                handleDelete(template.id)
                                            }
                                            disabled={
                                                deletingId === template.id
                                            }
                                        >
                                            {deletingId === template.id ? (
                                                <Spinner size="sm" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>

                                    {/* Mobile Dropdown */}
                                    <div className="sm:hidden">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setAssignmentsTemplate(
                                                            template
                                                        )
                                                    }
                                                    disabled={
                                                        employees.length === 0
                                                    }
                                                >
                                                    <Users className="h-4 w-4 mr-2" />
                                                    Przypisz zmiane
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        openEditDialog(template)
                                                    }
                                                >
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Edytuj
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleDelete(
                                                            template.id
                                                        )
                                                    }
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                    disabled={
                                                        deletingId ===
                                                        template.id
                                                    }
                                                >
                                                    {deletingId ===
                                                    template.id ? (
                                                        <Spinner
                                                            size="sm"
                                                            className="mr-2"
                                                        />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                    )}
                                                    Usuń
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Dialog tylko w trybie standalone (bez zewnętrznych callbacków) */}
            {!onEditTemplate && (
                <ShiftTemplateDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    organizationId={organizationId}
                    editingTemplate={editingTemplate}
                    showMinEmployees={true}
                    usedColors={sortedTemplates
                        .map((t) => t.color)
                        .filter((c): c is string => c !== null)}
                />
            )}

            {assignmentsTemplate && (
                <ShiftTemplateAssignmentsDialog
                    open={!!assignmentsTemplate}
                    onOpenChange={(open) =>
                        !open && setAssignmentsTemplate(null)
                    }
                    template={assignmentsTemplate}
                    employees={employees}
                />
            )}
        </>
    );
}
