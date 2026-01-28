"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import type { ShiftTemplate, DayOfWeekEnum } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseDialog } from "@/components/common/dialogs";
import { Clock, Users, Calendar, Palette, Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { showToast } from "@/lib/utils/toast";
import { calculateWorkHours, formatTime } from "@/lib/utils/date-helpers";
import { cn } from "@/lib/utils";

// Import scentralizowanych kolorów
import {
    TEMPLATE_COLORS,
    getRandomColor,
    DEFAULT_EMPLOYEE_COLOR,
} from "@/lib/constants/colors";
import { DEFAULT_SHIFT_TIME } from "@/lib/constants/time";
import {
    DAY_NAMES_SHORT,
    DAY_NAMES_FULL_SUNDAY_FIRST,
    DAY_KEY_MAP,
    dayKeyToIndex,
} from "@/lib/constants/days";

export interface ShiftTemplateFormData {
    startTime: string;
    endTime: string;
    breakMinutes: number;
    color: string;
    minEmployees: number;
    maxEmployees: number | null; // null = bez limitu
    applicableDays: number[] | null; // Używamy indeksów w UI, konwertujemy przy zapisie
}

export const DEFAULT_FORM_DATA: ShiftTemplateFormData = {
    startTime: DEFAULT_SHIFT_TIME.START,
    endTime: DEFAULT_SHIFT_TIME.END,
    breakMinutes: 0,
    color: DEFAULT_EMPLOYEE_COLOR,
    minEmployees: 0,
    maxEmployees: null, // null = bez limitu
    applicableDays: null, // null = wszystkie dni
};

interface ShiftTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
    editingTemplate?: ShiftTemplate | null;
    showMinEmployees?: boolean;
    onSuccess?: () => void;
    usedColors?: string[];
}

export function ShiftTemplateDialog({
    open,
    onOpenChange,
    organizationId,
    editingTemplate = null,
    showMinEmployees = true,
    onSuccess,
    usedColors = [],
}: ShiftTemplateDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<ShiftTemplateFormData>({
        ...DEFAULT_FORM_DATA,
        color: getRandomColor(usedColors),
    });

    // Ustaw dane formularza gdy otwieramy dialog
    useEffect(() => {
        if (open) {
            if (editingTemplate) {
                // Konwertuj stringi enum na indeksy dla UI
                const daysAsIndices = editingTemplate.applicable_days
                    ? editingTemplate.applicable_days.map((day) =>
                          dayKeyToIndex(day as DayOfWeekEnum),
                      )
                    : null;

                setFormData({
                    startTime: formatTime(editingTemplate.start_time),
                    endTime: formatTime(editingTemplate.end_time),
                    breakMinutes: editingTemplate.break_minutes ?? 0,
                    color: editingTemplate.color ?? DEFAULT_EMPLOYEE_COLOR,
                    minEmployees: editingTemplate.min_employees ?? 0,
                    maxEmployees: editingTemplate.max_employees ?? null,
                    applicableDays: daysAsIndices,
                });
            } else {
                // Nowy szablon - losowy kolor (bez już użytych)
                setFormData({
                    ...DEFAULT_FORM_DATA,
                    color: getRandomColor(usedColors),
                });
            }
        }
    }, [open, editingTemplate, usedColors]);

    async function handleSave() {
        setIsLoading(true);

        try {
            const supabase = createClient();

            // Konwertuj indeksy dni na stringi enum dla bazy danych
            const applicableDaysEnum = formData.applicableDays
                ? formData.applicableDays.map((idx) => DAY_KEY_MAP[idx])
                : null;

            // Auto-generate name from hours
            const generatedName = `${formData.startTime}-${formData.endTime}`;

            const data = {
                organization_id: organizationId,
                name: generatedName,
                start_time: formData.startTime,
                end_time: formData.endTime,
                break_minutes: formData.breakMinutes,
                color: formData.color,
                min_employees: formData.minEmployees,
                max_employees: formData.maxEmployees,
                applicable_days: applicableDaysEnum,
            };

            if (editingTemplate) {
                const { error } = await supabase
                    .from("shift_templates")
                    .update(data)
                    .eq("id", editingTemplate.id);

                if (error) throw error;
                showToast.updated("szablon");
            } else {
                const { error } = await supabase
                    .from("shift_templates")
                    .insert(data);

                if (error) throw error;
                showToast.created("szablon");
            }

            onOpenChange(false);
            onSuccess?.();
            router.refresh();
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error saving template:", message);
            showToast.saveError();
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <BaseDialog
            open={open}
            onOpenChange={onOpenChange}
            title={editingTemplate ? "Edytuj zmianę" : "Nowa zmiana"}
            description={
                editingTemplate
                    ? "Zmień parametry zmiany w grafiku"
                    : "Utwórz zmianę do wykorzystania w grafiku"
            }
        >
            <div className="space-y-5 py-2">
                {/* Sekcja: Czas pracy */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Czas pracy
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Od</Label>
                            <Input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        startTime: e.target.value,
                                    })
                                }
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Do</Label>
                            <Input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        endTime: e.target.value,
                                    })
                                }
                                className="h-10"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-slate-500">
                                Przerwa
                            </Label>
                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                {[0, 15, 30, 45, 60].map((mins) => (
                                    <button
                                        key={mins}
                                        type="button"
                                        onClick={() =>
                                            setFormData({
                                                ...formData,
                                                breakMinutes: mins,
                                            })
                                        }
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                                            formData.breakMinutes === mins
                                                ? "bg-white text-slate-900 shadow-sm"
                                                : "text-slate-600 hover:text-slate-900",
                                        )}
                                    >
                                        {mins === 0 ? "0" : `${mins}min`}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="text-sm font-medium text-slate-900 bg-blue-50 px-2.5 py-1 rounded-md">
                            {calculateWorkHours(
                                formData.startTime,
                                formData.endTime,
                                formData.breakMinutes,
                            )}
                        </div>
                    </div>
                </div>

                {/* Sekcja: Dni tygodnia */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Calendar className="h-4 w-4 text-emerald-500" />
                            Dni tygodnia
                        </div>
                        {formData.applicableDays &&
                            formData.applicableDays.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFormData({
                                            ...formData,
                                            applicableDays: null,
                                        })
                                    }
                                    className="text-xs text-slate-500 hover:text-slate-700"
                                >
                                    Resetuj do wszystkich
                                </button>
                            )}
                    </div>
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
                        {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                            const isSelected =
                                formData.applicableDays?.includes(dayIndex) ??
                                false;
                            const allDays =
                                formData.applicableDays === null ||
                                formData.applicableDays.length === 0;
                            const isWeekend = dayIndex === 0 || dayIndex === 6;

                            return (
                                <button
                                    key={dayIndex}
                                    type="button"
                                    title={
                                        DAY_NAMES_FULL_SUNDAY_FIRST[dayIndex]
                                    }
                                    className={cn(
                                        "flex-1 py-2 rounded-md text-xs font-medium transition-all",
                                        allDays
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : isSelected
                                              ? "bg-white text-slate-900 shadow-sm"
                                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                                        isWeekend &&
                                            !allDays &&
                                            !isSelected &&
                                            "text-red-400",
                                    )}
                                    onClick={() => {
                                        let newDays: number[] | null;
                                        if (allDays) {
                                            newDays = [dayIndex];
                                        } else if (isSelected) {
                                            const filtered =
                                                formData.applicableDays!.filter(
                                                    (d) => d !== dayIndex,
                                                );
                                            newDays =
                                                filtered.length === 0
                                                    ? null
                                                    : filtered;
                                        } else {
                                            newDays = [
                                                ...(formData.applicableDays ||
                                                    []),
                                                dayIndex,
                                            ];
                                        }
                                        setFormData({
                                            ...formData,
                                            applicableDays: newDays,
                                        });
                                    }}
                                >
                                    {DAY_NAMES_SHORT[dayIndex]}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-slate-500">
                        {formData.applicableDays === null ||
                        formData.applicableDays.length === 0
                            ? "Zmiana dostępna we wszystkie dni"
                            : `Dostępna w ${formData.applicableDays.length} ${
                                  formData.applicableDays.length === 1
                                      ? "dzień"
                                      : formData.applicableDays.length < 5
                                        ? "dni"
                                        : "dni"
                              }`}
                    </p>
                </div>

                {/* Sekcja: Obsada */}
                {showMinEmployees && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Users className="h-4 w-4 text-purple-500" />
                            Obsada
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500">
                                    Min. osób
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={50}
                                    value={formData.minEmployees}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            minEmployees:
                                                parseInt(e.target.value) || 0,
                                        })
                                    }
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500">
                                    Max. osób
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={50}
                                    placeholder="∞"
                                    value={formData.maxEmployees ?? ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            maxEmployees: e.target.value
                                                ? parseInt(e.target.value)
                                                : null,
                                        })
                                    }
                                    className="h-10"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Sekcja: Kolor */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Palette className="h-4 w-4 text-orange-500" />
                        Kolor zmiany
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {TEMPLATE_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                className={cn(
                                    "w-8 h-8 rounded-lg transition-all flex items-center justify-center",
                                    formData.color === color
                                        ? "ring-2 ring-offset-2 ring-slate-400 scale-110"
                                        : "hover:scale-105",
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() =>
                                    setFormData({ ...formData, color })
                                }
                            >
                                {formData.color === color && (
                                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Przycisk zapisz */}
                <Button
                    onClick={handleSave}
                    disabled={
                        isLoading || !formData.startTime || !formData.endTime
                    }
                    className="w-full h-11"
                >
                    {isLoading && <Spinner withMargin />}
                    {editingTemplate ? "Zapisz zmiany" : "Utwórz zmianę"}
                </Button>
            </div>
        </BaseDialog>
    );
}
