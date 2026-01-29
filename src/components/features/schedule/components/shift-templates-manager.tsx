"use client";

import { useMemo } from "react";
import { ShiftTemplate } from "@/types";
import { Button } from "@/components/ui/button";
import { calculateShiftDuration } from "@/lib/utils/time-helpers";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Settings, Users, Pencil, Trash2, Clock } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ShiftTemplateDialog } from "../dialogs/shift-template-dialog";
import { useShiftTemplates } from "@/lib/hooks/use-shift-templates";
import { ShiftTemplateAvatar } from "./shift-template-avatar";

interface ShiftTemplatesManagerProps {
    templates: ShiftTemplate[];
    organizationId: string;
    /** Czy pokazywać opcję usuwania szablonów */
    showDelete?: boolean;
    /** Czy pokazywać pole min. osób w dialogu */
    showMinEmployees?: boolean;
    /** Wariant przycisku: "button" dla pełnego przycisku, "icon" dla samej ikony */
    variant?: "button" | "icon";
}

export function ShiftTemplatesManager({
    templates,
    organizationId,
    showDelete = false,
    showMinEmployees = true,
    variant = "button",
}: ShiftTemplatesManagerProps) {
    const {
        dialogOpen,
        setDialogOpen,
        editingTemplate,
        deletingId,
        openCreateDialog,
        openEditDialog,
        handleDelete,
    } = useShiftTemplates();

    // Sortuj szablony od najwcześniejszej do najpóźniejszej zmiany
    const sortedTemplates = useMemo(() => {
        return [...templates].sort((a, b) =>
            a.start_time.localeCompare(b.start_time),
        );
    }, [templates]);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {variant === "icon" ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs"
                        >
                            <Settings className="mr-1.5 h-3.5 w-3.5" />
                            Zmiany
                        </Button>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-80 p-0 overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-4 py-3 bg-linear-to-br from-blue-50 via-gray-50 to-violet-50 border-b border-gray-200">
                        <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-blue-600" />
                            Szablony zmian
                        </h3>
                        <p className="text-xs text-blue-600 mt-0.5">
                            {sortedTemplates.length}{" "}
                            {sortedTemplates.length === 1
                                ? "szablon"
                                : sortedTemplates.length < 5
                                  ? "szablony"
                                  : "szablonów"}
                        </p>
                    </div>

                    <div className="max-h-[55vh] overflow-y-auto p-2 space-y-1">
                        {sortedTemplates.length > 0 ? (
                            <>
                                {sortedTemplates.map((template) => {
                                    const { hours, mins } =
                                        calculateShiftDuration(
                                            template.start_time,
                                            template.end_time,
                                        );

                                    return (
                                        <div
                                            key={template.id}
                                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                                        >
                                            <ShiftTemplateAvatar
                                                template={template}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-sm text-slate-800">
                                                    {template.start_time.substring(
                                                        0,
                                                        5,
                                                    )}{" "}
                                                    →{" "}
                                                    {template.end_time.substring(
                                                        0,
                                                        5,
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                    <span>
                                                        {hours}h
                                                        {mins > 0
                                                            ? ` ${mins}m`
                                                            : ""}
                                                    </span>
                                                    {showMinEmployees && (
                                                        <span className="flex items-center gap-0.5 text-blue-600">
                                                            <Users className="h-3 w-3" />
                                                            osoby{" "}
                                                            {
                                                                template.min_employees
                                                            }
                                                            {template.max_employees
                                                                ? `-${template.max_employees}`
                                                                : "+"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg hover:bg-slate-100"
                                                    onClick={() =>
                                                        openEditDialog(template)
                                                    }
                                                >
                                                    <Pencil className="h-3.5 w-3.5 text-slate-400" />
                                                </Button>
                                                {showDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-lg hover:bg-red-50"
                                                        onClick={() =>
                                                            handleDelete(
                                                                template.id,
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId ===
                                                            template.id
                                                        }
                                                    >
                                                        {deletingId ===
                                                        template.id ? (
                                                            <Spinner size="sm" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        ) : (
                            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                                <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                Brak szablonów zmian
                            </div>
                        )}
                    </div>

                    {/* Footer with add button */}
                    <div className="p-2 border-t border-slate-100">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-9 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg"
                            onClick={openCreateDialog}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Dodaj szablon zmiany
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <ShiftTemplateDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                organizationId={organizationId}
                editingTemplate={editingTemplate}
                showMinEmployees={showMinEmployees}
                usedColors={sortedTemplates
                    .map((t) => t.color)
                    .filter((c): c is string => c !== null)}
            />
        </>
    );
}
