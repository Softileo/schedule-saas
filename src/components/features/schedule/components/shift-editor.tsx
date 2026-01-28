"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    shiftSchema,
    type ShiftInput,
    validateShiftTimes,
} from "@/lib/validations/schedule";
import {
    createShift,
    updateShift,
    deleteShift,
} from "@/lib/api/client-helpers";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { Employee, ShiftTemplate } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Clock, Settings2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { calculateWorkHours, formatTime } from "@/lib/utils/date-helpers";
import {
    DEFAULT_EMPLOYEE_COLOR,
    getEmployeeFullName,
} from "@/lib/core/employees/utils";
import { DEFAULT_SHIFT_TIME } from "@/lib/constants/time";
import { SHIFT_COLORS } from "@/lib/constants/colors";
import { DAY_KEYS } from "@/lib/constants/days";

interface ExistingShift {
    id: string;
    schedule_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes: string | null;
    color: string | null;
}

interface ShiftEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scheduleId: string;
    employeeId: string;
    date: string;
    existingShift?: ExistingShift;
    employee: Employee;
    templates?: ShiftTemplate[];
}

export function ShiftEditor({
    open,
    onOpenChange,
    scheduleId,
    employeeId,
    date,
    existingShift,
    employee,
    templates = [],
}: ShiftEditorProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedColor, setSelectedColor] = useState<string>(
        existingShift?.color || DEFAULT_EMPLOYEE_COLOR
    );
    const [mode, setMode] = useState<"template" | "custom">(
        templates.length === 0 || !!existingShift ? "custom" : "template"
    );

    const formattedDate = format(parseISO(date), "d MMMM yyyy (EEEE)", {
        locale: pl,
    });

    const dayOfWeekIndex = parseISO(date).getDay();
    const dayKey = DAY_KEYS[dayOfWeekIndex];
    const availableTemplates = templates.filter((t) => {
        if (!t.applicable_days || t.applicable_days.length === 0) return true;
        return t.applicable_days.includes(dayKey as never);
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
        watch,
    } = useForm<ShiftInput>({
        resolver: zodResolver(shiftSchema),
        defaultValues: {
            employeeId,
            date,
            startTime: existingShift?.start_time
                ? formatTime(existingShift.start_time)
                : DEFAULT_SHIFT_TIME.START,
            endTime: existingShift?.end_time
                ? formatTime(existingShift.end_time)
                : DEFAULT_SHIFT_TIME.END,
            breakMinutes: existingShift?.break_minutes || 0,
            notes: existingShift?.notes || "",
        },
    });

    const startTime = watch("startTime");
    const endTime = watch("endTime");
    const breakMinutes = watch("breakMinutes");

    async function onSubmit(data: ShiftInput) {
        if (!validateShiftTimes(data.startTime, data.endTime)) {
            setError("endTime", {
                message:
                    "Godzina zakończenia musi być późniejsza niż rozpoczęcia",
            });
            return;
        }

        setIsLoading(true);

        try {
            if (existingShift) {
                // Aktualizacja istniejącej zmiany
                const { error } = await updateShift(existingShift.id, {
                    start_time: data.startTime,
                    end_time: data.endTime,
                    break_minutes: data.breakMinutes,
                    notes: data.notes || null,
                    color: selectedColor,
                });

                if (error) throw error;
            } else {
                // Tworzenie nowej zmiany
                const { error } = await createShift({
                    schedule_id: scheduleId,
                    employee_id: employeeId,
                    date,
                    start_time: data.startTime,
                    end_time: data.endTime,
                    break_minutes: data.breakMinutes,
                    notes: data.notes || null,
                    color: selectedColor,
                });

                if (error) throw error;
            }

            onOpenChange(false);
            router.refresh();
        } catch (error: unknown) {
            const err = error as {
                message?: string;
                code?: string;
                details?: string;
            };
            logger.error("Error saving shift:", {
                message: err?.message,
                code: err?.code,
                details: err?.details,
                full: error,
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete() {
        if (!existingShift) return;

        setIsDeleting(true);

        try {
            const { error } = await deleteShift(existingShift.id);

            if (error) throw error;

            onOpenChange(false);
            router.refresh();
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error deleting shift:", message);
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleQuickAdd(template: ShiftTemplate) {
        setIsLoading(true);

        try {
            const { error } = await createShift({
                schedule_id: scheduleId,
                employee_id: employeeId,
                date,
                start_time: formatTime(template.start_time),
                end_time: formatTime(template.end_time),
                break_minutes: template.break_minutes ?? 0,
                color: template.color ?? undefined,
                notes: null,
            });

            if (error) {
                logger.error("Error creating shift:", error);
                throw error;
            }

            onOpenChange(false);
            router.refresh();
        } catch (error: unknown) {
            const err = error as {
                message?: string;
                code?: string;
                details?: string;
            };
            logger.error("Error saving shift:", {
                message: err?.message,
                code: err?.code,
                details: err?.details,
                full: error,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {existingShift ? "Edytuj zmianę" : "Dodaj zmianę"}
                    </DialogTitle>
                    <DialogDescription>
                        {getEmployeeFullName(employee)} — {formattedDate}
                    </DialogDescription>
                </DialogHeader>

                {/* Szablony - tylko przy dodawaniu nowej zmiany i gdy są szablony */}
                {!existingShift &&
                    availableTemplates.length > 0 &&
                    mode === "template" && (
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">
                                Wybierz zmianę
                            </Label>
                            <div className="grid gap-2">
                                {availableTemplates.map((template) => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        disabled={isLoading}
                                        onClick={() => handleQuickAdd(template)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:border-primary/50 hover:bg-accent text-left",
                                            "border-border"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full shrink-0"
                                                style={{
                                                    backgroundColor:
                                                        template.color ??
                                                        undefined,
                                                }}
                                            />
                                            <div>
                                                <div className="font-medium">
                                                    {template.start_time.substring(
                                                        0,
                                                        5
                                                    )}{" "}
                                                    —{" "}
                                                    {template.end_time.substring(
                                                        0,
                                                        5
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {(template.break_minutes ??
                                                        0) > 0 && (
                                                        <span>
                                                            przerwa{" "}
                                                            {
                                                                template.break_minutes
                                                            }{" "}
                                                            min
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium text-muted-foreground">
                                            {calculateWorkHours(
                                                template.start_time,
                                                template.end_time,
                                                template.break_minutes ?? 0
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        lub
                                    </span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => setMode("custom")}
                            >
                                <Settings2 className="mr-2 h-4 w-4" />
                                Niestandardowe godziny
                            </Button>
                        </div>
                    )}

                {/* Formularz niestandardowy */}
                {(existingShift ||
                    templates.length === 0 ||
                    mode === "custom") && (
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <input type="hidden" {...register("employeeId")} />
                        <input type="hidden" {...register("date")} />

                        {/* Przycisk powrotu do szablonów */}
                        {!existingShift &&
                            templates.length > 0 &&
                            mode === "custom" && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setMode("template")}
                                    className="mb-2"
                                >
                                    ← Powrót do szablonów
                                </Button>
                            )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startTime">Od</Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    disabled={isLoading}
                                    {...register("startTime")}
                                />
                                {errors.startTime && (
                                    <p className="text-sm text-destructive">
                                        {errors.startTime.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="endTime">Do</Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    disabled={isLoading}
                                    {...register("endTime")}
                                />
                                {errors.endTime && (
                                    <p className="text-sm text-destructive">
                                        {errors.endTime.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="breakMinutes">
                                Przerwa (minuty)
                            </Label>
                            <Input
                                id="breakMinutes"
                                type="number"
                                min="0"
                                max="120"
                                disabled={isLoading}
                                {...register("breakMinutes", {
                                    valueAsNumber: true,
                                })}
                            />
                            {errors.breakMinutes && (
                                <p className="text-sm text-destructive">
                                    {errors.breakMinutes.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notatki (opcjonalnie)</Label>
                            <Input
                                id="notes"
                                placeholder="np. Zmiana nocna"
                                disabled={isLoading}
                                {...register("notes")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Kolor zmiany</Label>
                            <div className="flex flex-wrap gap-2">
                                {SHIFT_COLORS.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() =>
                                            setSelectedColor(color.value)
                                        }
                                        className={cn(
                                            "w-8 h-8 rounded-full border-2 transition-all",
                                            selectedColor === color.value
                                                ? "border-foreground scale-110"
                                                : "border-transparent hover:scale-105"
                                        )}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                Czas pracy:{" "}
                                <span className="font-medium text-foreground">
                                    {calculateWorkHours(
                                        startTime,
                                        endTime,
                                        breakMinutes
                                    )}
                                </span>
                            </span>
                        </div>

                        <div className="flex justify-between pt-4">
                            {existingShift ? (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={isLoading || isDeleting}
                                >
                                    {isDeleting ? (
                                        <Spinner withMargin />
                                    ) : (
                                        <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    Usuń
                                </Button>
                            ) : (
                                <div />
                            )}

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isLoading || isDeleting}
                                >
                                    Anuluj
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isLoading || isDeleting}
                                >
                                    {isLoading && <Spinner withMargin />}
                                    {existingShift ? "Zapisz" : "Dodaj"}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
