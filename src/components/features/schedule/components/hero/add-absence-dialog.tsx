"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/utils/toast";
import { logger } from "@/lib/utils/logger";
import { format } from "date-fns";
import { createAbsenceData } from "@/lib/utils/absence-helpers";
import { pl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, Flag, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
    AbsenceTypeSelect,
    isUnpaidAbsenceType,
} from "@/components/ui/absence-type-select";
import type { Employee, AbsenceType, LocalShift } from "@/types";

interface AddAbsenceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee;
    organizationId: string;
    initialDate: Date;
    existingShift?: LocalShift | null;
    onRemoveShift: (shiftId: string) => void;
    onAbsenceAdded: () => void;
    onOpenSwapDialog?: () => void;
}

export function AddAbsenceDialog({
    open,
    onOpenChange,
    employee,
    organizationId,
    initialDate,
    existingShift,
    onRemoveShift,
    onAbsenceAdded,
    onOpenSwapDialog,
}: AddAbsenceDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        absenceType: "vacation" as AbsenceType,
        startDate: initialDate,
        endDate: initialDate,
        isPaid: true,
    });

    const handleSubmit = useCallback(
        async (andOpenSwap: boolean = false) => {
            if (formData.endDate < formData.startDate) {
                showToast.error("Data końca musi być po dacie początku");
                return;
            }

            setIsLoading(true);
            try {
                const supabase = createClient();
                const absenceData = createAbsenceData(
                    employee.id,
                    organizationId,
                    formData.absenceType,
                    formData.startDate,
                    formData.endDate,
                    formData.isPaid,
                );

                console.log("➕ Adding absence:", absenceData);

                const { data, error } = await supabase
                    .from("employee_absences")
                    .insert(absenceData)
                    .select();

                console.log("✅ Absence added:", { data, error });

                if (error) throw error;

                // Usuń zmianę nieobecnego pracownika
                if (existingShift) {
                    onRemoveShift(existingShift.id);
                }

                // Małe opóźnienie aby baza danych mogła przetworzyć INSERT
                await new Promise((resolve) => setTimeout(resolve, 100));

                // Najpierw odśwież dane nieobecności
                console.log("🔄 Calling onAbsenceAdded()");
                await onAbsenceAdded();

                // Potem pokaż toast i zamknij dialog
                showToast.success(
                    existingShift
                        ? "Dodano nieobecność i usunięto zmianę"
                        : "Dodano nieobecność",
                );
                onOpenChange(false);

                // Otwórz dialog zamiany jeśli wybrano tę opcję
                if (andOpenSwap && onOpenSwapDialog) {
                    setTimeout(() => onOpenSwapDialog(), 100);
                }
            } catch (err) {
                logger.error("Error adding absence:", err);
                showToast.error("Nie udało się dodać nieobecności");
            } finally {
                setIsLoading(false);
            }
        },
        [
            employee.id,
            organizationId,
            formData,
            existingShift,
            onRemoveShift,
            onOpenChange,
            onAbsenceAdded,
            onOpenSwapDialog,
        ],
    );

    // Aktualizuj isPaid automatycznie przy zmianie typu
    const handleTypeChange = (type: AbsenceType) => {
        setFormData((prev) => ({
            ...prev,
            absenceType: type,
            isPaid: !isUnpaidAbsenceType(type),
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Flag className="h-5 w-5 text-amber-500" />
                        Dodaj nieobecność
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        {employee.first_name} {employee.last_name}
                    </p>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Ostrzeżenie o istniejącej zmianie */}
                    {existingShift && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
                                <AlertTriangle className="h-4 w-4" />
                                Pracownik ma zmianę tego dnia
                            </div>
                            <p className="text-xs text-amber-600">
                                {existingShift.start_time?.slice(0, 5)} -{" "}
                                {existingShift.end_time?.slice(0, 5)} • Zmiana
                                zostanie automatycznie usunięta
                            </p>
                        </div>
                    )}

                    {/* Typ nieobecności */}
                    <div className="space-y-2">
                        <Label>Typ nieobecności</Label>
                        <AbsenceTypeSelect
                            value={formData.absenceType}
                            onValueChange={handleTypeChange}
                        />
                    </div>

                    {/* Daty */}
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <Label>Od</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        {format(
                                            formData.startDate,
                                            "d MMM yyyy",
                                            { locale: pl },
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={formData.startDate}
                                        onSelect={(date) =>
                                            date &&
                                            setFormData((prev) => ({
                                                ...prev,
                                                startDate: date,
                                                endDate:
                                                    date > prev.endDate
                                                        ? date
                                                        : prev.endDate,
                                            }))
                                        }
                                        locale={pl}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label>Do</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        {format(
                                            formData.endDate,
                                            "d MMM yyyy",
                                            { locale: pl },
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={formData.endDate}
                                        onSelect={(date) =>
                                            date &&
                                            setFormData((prev) => ({
                                                ...prev,
                                                endDate: date,
                                            }))
                                        }
                                        disabled={(date) =>
                                            date < formData.startDate
                                        }
                                        locale={pl}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Płatna */}
                    <div className="flex items-center justify-between">
                        <Label>Płatna nieobecność</Label>
                        <Switch
                            checked={formData.isPaid}
                            onCheckedChange={(checked) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    isPaid: checked,
                                }))
                            }
                        />
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="sm:mr-auto"
                    >
                        Anuluj
                    </Button>
                    {existingShift && onOpenSwapDialog && (
                        <Button
                            variant="secondary"
                            onClick={() => handleSubmit(true)}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Spinner className="mr-2 h-4 w-4" />
                            ) : null}
                            Dodaj i znajdź zastępstwo
                        </Button>
                    )}
                    <Button
                        onClick={() => handleSubmit(false)}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Spinner className="mr-2 h-4 w-4" />
                                Zapisuję...
                            </>
                        ) : (
                            "Dodaj nieobecność"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
