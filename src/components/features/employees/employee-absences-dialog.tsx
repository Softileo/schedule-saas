"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/error";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import { logger } from "@/lib/utils/logger";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { pl } from "date-fns/locale";
import { showToast } from "@/lib/utils/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
    AbsenceTypeSelect,
    isUnpaidAbsenceType,
} from "@/components/ui/absence-type-select";
import type { Employee } from "@/types";
import {
    AbsenceType,
    EmployeeAbsence,
    ABSENCE_TYPE_LABELS,
    ABSENCE_TYPE_COLORS,
} from "@/types";

interface EmployeeAbsencesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee;
    organizationId: string;
}

export function EmployeeAbsencesDialog({
    open,
    onOpenChange,
    employee,
    organizationId,
}: EmployeeAbsencesDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [absences, setAbsences] = useState<EmployeeAbsence[]>([]);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Formularz nowej nieobecności
    const [formData, setFormData] = useState({
        absenceType: "vacation" as AbsenceType,
        startDate: new Date(),
        endDate: new Date(),
        isPaid: true,
        notes: "",
    });

    // Pobierz nieobecności pracownika
    const loadAbsences = useCallback(async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from("employee_absences")
            .select("*")
            .eq("employee_id", employee.id)
            .order("start_date", { ascending: false });

        if (error) {
            logger.error("Error loading absences:", error);
            showToast.loadError("nieobecności");
            return;
        }
        setAbsences(data || []);
    }, [employee.id]);

    useEffect(() => {
        if (open && employee) {
            loadAbsences();
        }
    }, [open, employee, loadAbsences]);

    async function handleAddAbsence() {
        if (formData.endDate < formData.startDate) {
            showToast.error("Data końca musi być późniejsza niż data początku");
            return;
        }

        setIsLoading(true);

        try {
            const supabase = createClient();

            const { error } = await supabase.from("employee_absences").insert({
                employee_id: employee.id,
                organization_id: organizationId,
                absence_type: formData.absenceType,
                start_date: format(formData.startDate, "yyyy-MM-dd"),
                end_date: format(formData.endDate, "yyyy-MM-dd"),
                is_paid: formData.isPaid,
                notes: formData.notes || null,
            });

            if (error) throw error;

            showToast.created("nieobecność");
            setFormData({
                absenceType: "vacation",
                startDate: new Date(),
                endDate: new Date(),
                isPaid: true,
                notes: "",
            });
            loadAbsences();
            router.refresh();
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error adding absence:", message);
            showToast.createError("nieobecności");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDeleteAbsence() {
        if (!deleteId) return;

        setIsLoading(true);

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("employee_absences")
                .delete()
                .eq("id", deleteId);

            if (error) throw error;

            showToast.deleted("nieobecność");
            setDeleteId(null);
            loadAbsences();
            router.refresh();
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error deleting absence:", message);
            showToast.deleteError("nieobecności");
        } finally {
            setIsLoading(false);
        }
    }

    // Oblicz liczbę dni nieobecności
    function calculateDays(startDate: string, endDate: string): number {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const days = eachDayOfInterval({ start, end });
        return days.length;
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-slate-500" />
                            Nieobecności - {getEmployeeFullName(employee)}
                        </DialogTitle>
                        <DialogDescription>
                            Zarządzaj urlopami, zwolnieniami i innymi
                            nieobecnościami
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Formularz dodawania - zawsze widoczny */}
                        <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
                            <h4 className="font-medium text-sm">
                                Nowa nieobecność
                            </h4>

                            <div className="space-y-3">
                                {/* Typ nieobecności */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs">
                                        Typ nieobecności
                                    </Label>
                                    <AbsenceTypeSelect
                                        value={formData.absenceType}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                absenceType: value,
                                                isPaid: !isUnpaidAbsenceType(
                                                    value
                                                ),
                                            }))
                                        }
                                    />
                                </div>

                                {/* Daty */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Od</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal"
                                                >
                                                    {format(
                                                        formData.startDate,
                                                        "dd.MM.yyyy"
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={
                                                        formData.startDate
                                                    }
                                                    onSelect={(date) =>
                                                        date &&
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            startDate: date,
                                                            endDate:
                                                                date >
                                                                prev.endDate
                                                                    ? date
                                                                    : prev.endDate,
                                                        }))
                                                    }
                                                    locale={pl}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Do</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal"
                                                >
                                                    {format(
                                                        formData.endDate,
                                                        "dd.MM.yyyy"
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
                                                        date <
                                                        formData.startDate
                                                    }
                                                    locale={pl}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Płatne/Niepłatne */}
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">
                                        Płatna nieobecność
                                    </Label>
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

                                {/* Notatka */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs">
                                        Notatka (opcjonalnie)
                                    </Label>
                                    <Textarea
                                        placeholder="Dodatkowe informacje..."
                                        value={formData.notes}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                notes: e.target.value,
                                            }))
                                        }
                                        rows={2}
                                    />
                                </div>

                                <Button
                                    onClick={handleAddAbsence}
                                    disabled={isLoading}
                                    className="w-full"
                                >
                                    {isLoading && <Spinner withMargin />}
                                    Dodaj nieobecność
                                </Button>
                            </div>
                        </div>

                        {/* Lista nieobecności */}
                        <div className="space-y-2">
                            {absences.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    Brak zarejestrowanych nieobecności
                                </p>
                            ) : (
                                absences.map((absence) => (
                                    <div
                                        key={absence.id}
                                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl"
                                    >
                                        <div
                                            className="w-1 h-10 rounded-full shrink-0"
                                            style={{
                                                backgroundColor:
                                                    ABSENCE_TYPE_COLORS[
                                                        absence.absence_type
                                                    ],
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">
                                                    {
                                                        ABSENCE_TYPE_LABELS[
                                                            absence.absence_type
                                                        ]
                                                    }
                                                </span>
                                                {!absence.is_paid && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                                        niepłatne
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {format(
                                                    parseISO(
                                                        absence.start_date
                                                    ),
                                                    "d MMM",
                                                    {
                                                        locale: pl,
                                                    }
                                                )}{" "}
                                                -{" "}
                                                {format(
                                                    parseISO(absence.end_date),
                                                    "d MMM yyyy",
                                                    {
                                                        locale: pl,
                                                    }
                                                )}
                                                <span className="text-slate-400 ml-1">
                                                    (
                                                    {calculateDays(
                                                        absence.start_date,
                                                        absence.end_date
                                                    )}{" "}
                                                    dni)
                                                </span>
                                            </div>
                                            {absence.notes && (
                                                <p className="text-xs text-slate-400 mt-0.5 truncate">
                                                    {absence.notes}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setDeleteId(absence.id)
                                            }
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog potwierdzenia usunięcia */}
            <AlertDialog
                open={!!deleteId}
                onOpenChange={() => setDeleteId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć nieobecność?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ta operacja jest nieodwracalna. Nieobecność zostanie
                            trwale usunięta.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>
                            Anuluj
                        </AlertDialogCancel>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAbsence}
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isLoading && <Spinner withMargin />}
                            Usuń
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
