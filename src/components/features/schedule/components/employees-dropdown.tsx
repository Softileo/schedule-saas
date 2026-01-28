"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInDays, parseISO, isWithinInterval } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Employee, AbsenceType, EmployeeAbsence } from "@/types";
import { ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from "@/types";
import { AbsenceTypeSelect } from "@/components/ui/absence-type-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Users, Plus, Trash2, Pencil, Flag, Search, UserX } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
    getEmployeeColor,
    getEmployeeInitials,
    getEmployeeFullName,
} from "@/lib/core/employees/utils";
import type { DateRange } from "react-day-picker";

interface EmployeesDropdownProps {
    organizationId: string;
    employees: Employee[];
    variant?: "icon" | "button";
}

export function EmployeesDropdown({
    organizationId,
    employees,
    variant = "icon",
}: EmployeesDropdownProps) {
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
        null
    );
    const [selectedAbsence, setSelectedAbsence] =
        useState<EmployeeAbsence | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [absences, setAbsences] = useState<EmployeeAbsence[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Stan formularza nieobecności
    const [absenceForm, setAbsenceForm] = useState({
        absenceType: "vacation" as AbsenceType,
        dateRange: { from: undefined, to: undefined } as DateRange,
        isPaid: true,
    });

    const loadAbsences = useCallback(async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from("employee_absences")
            .select("*")
            .eq("organization_id", organizationId)
            .order("start_date", { ascending: true });

        if (!error && data) {
            setAbsences(data);
        }
    }, [organizationId]);

    // Pobierz nieobecności gdy dropdown jest otwarty
    useEffect(() => {
        if (dropdownOpen) {
            loadAbsences();
        }
    }, [dropdownOpen, loadAbsences]);

    // Oblicz liczbę dni
    const daysCount = useMemo(() => {
        if (!absenceForm.dateRange?.from) return 0;
        if (!absenceForm.dateRange?.to) return 1;
        return (
            differenceInDays(
                absenceForm.dateRange.to,
                absenceForm.dateRange.from
            ) + 1
        );
    }, [absenceForm.dateRange]);

    // Sortuj pracowników alfabetycznie
    const sortedEmployees = useMemo(() => {
        let filtered = [...employees];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((emp) =>
                getEmployeeFullName(emp).toLowerCase().includes(query)
            );
        }

        return filtered.sort((a, b) =>
            getEmployeeFullName(a).localeCompare(getEmployeeFullName(b))
        );
    }, [employees, searchQuery]);

    // Pobierz nieobecności dla pracownika (aktualne i przyszłe)
    const getEmployeeAbsences = (employeeId: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return absences.filter((a) => {
            if (a.employee_id !== employeeId) return false;
            const endDate = parseISO(a.end_date);
            // Pokaż tylko trwające lub przyszłe nieobecności
            return endDate >= today;
        });
    };

    // Sprawdź czy pracownik ma aktywną nieobecność (dzisiaj)
    const hasActiveAbsence = (employeeId: string) => {
        const today = new Date();
        return absences.some((a) => {
            if (a.employee_id !== employeeId) return false;
            const start = parseISO(a.start_date);
            const end = parseISO(a.end_date);
            return isWithinInterval(today, { start, end });
        });
    };

    function handleOpenAbsenceDialog(
        employee: Employee,
        absence?: EmployeeAbsence
    ) {
        setSelectedEmployee(employee);
        setEditMode(!!absence);
        setSelectedAbsence(absence || null);

        if (absence) {
            setAbsenceForm({
                absenceType: absence.absence_type as AbsenceType,
                dateRange: {
                    from: parseISO(absence.start_date),
                    to: parseISO(absence.end_date),
                },
                isPaid: absence.is_paid ?? true,
            });
        } else {
            setAbsenceForm({
                absenceType: "vacation",
                dateRange: { from: undefined, to: undefined },
                isPaid: true,
            });
        }
        setAbsenceDialogOpen(true);
    }

    function handleDeleteClick(absence: EmployeeAbsence) {
        setSelectedAbsence(absence);
        setDeleteDialogOpen(true);
    }

    async function onSubmitAbsence() {
        if (!selectedEmployee || !absenceForm.dateRange?.from) return;

        setIsLoading(true);

        try {
            const supabase = createClient();

            if (editMode && selectedAbsence) {
                // Aktualizuj istniejącą nieobecność
                const { error } = await supabase
                    .from("employee_absences")
                    .update({
                        absence_type: absenceForm.absenceType,
                        start_date: format(
                            absenceForm.dateRange.from,
                            "yyyy-MM-dd"
                        ),
                        end_date: format(
                            absenceForm.dateRange.to ||
                                absenceForm.dateRange.from,
                            "yyyy-MM-dd"
                        ),
                        is_paid: absenceForm.isPaid,
                    })
                    .eq("id", selectedAbsence.id);

                if (error) throw error;
                toast.success("Nieobecność została zaktualizowana");
            } else {
                // Dodaj nową nieobecność
                const { error } = await supabase
                    .from("employee_absences")
                    .insert({
                        employee_id: selectedEmployee.id,
                        organization_id: organizationId,
                        absence_type: absenceForm.absenceType,
                        start_date: format(
                            absenceForm.dateRange.from,
                            "yyyy-MM-dd"
                        ),
                        end_date: format(
                            absenceForm.dateRange.to ||
                                absenceForm.dateRange.from,
                            "yyyy-MM-dd"
                        ),
                        is_paid: absenceForm.isPaid,
                    });

                if (error) throw error;
                toast.success(
                    `Nieobecność dodana dla ${getEmployeeFullName(
                        selectedEmployee
                    )}`
                );
            }

            setAbsenceDialogOpen(false);
            await loadAbsences();
            router.refresh();
        } catch {
            toast.error("Nie udało się zapisać nieobecności");
        } finally {
            setIsLoading(false);
        }
    }

    async function onDeleteAbsence() {
        if (!selectedAbsence) return;

        setIsLoading(true);

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("employee_absences")
                .delete()
                .eq("id", selectedAbsence.id);

            if (error) throw error;

            toast.success("Nieobecność została usunięta");
            setDeleteDialogOpen(false);
            await loadAbsences();
            router.refresh();
        } catch {
            toast.error("Nie udało się usunąć nieobecności");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    {variant === "icon" ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <UserX className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs"
                        >
                            <UserX className="mr-1.5 h-3.5 w-3.5" />
                            Pracownicy
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
                            Nieobecności pracowników
                        </h3>
                        <p className="text-xs text-blue-600 mt-0.5">
                            {sortedEmployees.length} pracowników
                        </p>
                    </div>

                    <div className="p-2 border-b border-gray-100 bg-white">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Szukaj pracownika..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 focus-visible:ring-1"
                            />
                        </div>
                    </div>

                    <div className="max-h-[55vh] overflow-y-auto">
                        {sortedEmployees.length > 0 ? (
                            <Accordion
                                type="single"
                                collapsible
                                className="p-2"
                            >
                                {sortedEmployees.map((employee) => {
                                    const color = getEmployeeColor(employee);
                                    const initials =
                                        getEmployeeInitials(employee);
                                    const employeeAbsences =
                                        getEmployeeAbsences(employee.id);
                                    const isActive = hasActiveAbsence(
                                        employee.id
                                    );

                                    return (
                                        <AccordionItem
                                            key={employee.id}
                                            value={employee.id}
                                            className="border-b-0 mb-1"
                                        >
                                            <div className="flex items-center gap-2 rounded-xl hover:bg-slate-50 transition-colors px-2">
                                                <AccordionTrigger className="flex-1 py-2 hover:no-underline [&>svg]:hidden">
                                                    <div className="flex items-center gap-3 w-full">
                                                        <div
                                                            className={cn(
                                                                "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm",
                                                                isActive &&
                                                                    "ring-2 ring-red-400 ring-offset-2"
                                                            )}
                                                            style={{
                                                                backgroundColor:
                                                                    color,
                                                            }}
                                                        >
                                                            {initials}
                                                        </div>
                                                        <div className="min-w-0 flex-1 text-left">
                                                            <div className="font-medium text-sm text-slate-800 truncate flex items-center gap-2">
                                                                {getEmployeeFullName(
                                                                    employee
                                                                )}
                                                                {isActive && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                                                                        Nieobecny
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div
                                                                className={cn(
                                                                    "text-xs mt-0.5 flex items-center gap-1",
                                                                    employeeAbsences.length >
                                                                        0
                                                                        ? "text-amber-600 font-medium"
                                                                        : "text-slate-400"
                                                                )}
                                                            >
                                                                {employeeAbsences.length >
                                                                    0 && (
                                                                    <Flag className="h-3 w-3" />
                                                                )}
                                                                {employeeAbsences.length >
                                                                0
                                                                    ? `${
                                                                          employeeAbsences.length
                                                                      } ${
                                                                          employeeAbsences.length ===
                                                                          1
                                                                              ? "nieobecność"
                                                                              : "nieobecności"
                                                                      }`
                                                                    : "Brak zaplanowanych"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 shrink-0 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 ml-auto"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenAbsenceDialog(
                                                            employee
                                                        );
                                                    }}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <AccordionContent className="pb-2 pt-0">
                                                {employeeAbsences.length > 0 ? (
                                                    <div className="space-y-1.5 pl-2.5 pr-2">
                                                        {employeeAbsences.map(
                                                            (absence) => {
                                                                const startDate =
                                                                    parseISO(
                                                                        absence.start_date
                                                                    );
                                                                const endDate =
                                                                    parseISO(
                                                                        absence.end_date
                                                                    );
                                                                const days =
                                                                    differenceInDays(
                                                                        endDate,
                                                                        startDate
                                                                    ) + 1;
                                                                const absenceColor =
                                                                    ABSENCE_TYPE_COLORS[
                                                                        absence.absence_type as AbsenceType
                                                                    ];
                                                                const isCurrentlyActive =
                                                                    isWithinInterval(
                                                                        new Date(),
                                                                        {
                                                                            start: startDate,
                                                                            end: endDate,
                                                                        }
                                                                    );

                                                                return (
                                                                    <div
                                                                        key={
                                                                            absence.id
                                                                        }
                                                                        className={cn(
                                                                            "flex items-center gap-2.5 p-2 rounded-lg text-xs",
                                                                            isCurrentlyActive
                                                                                ? "bg-white border border-red-200 shadow-sm"
                                                                                : "bg-white border border-slate-200"
                                                                        )}
                                                                    >
                                                                        <div
                                                                            className="w-1 h-8 rounded-full shrink-0"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    absenceColor,
                                                                            }}
                                                                        />
                                                                        <div className="min-w-0 flex-1">
                                                                            <div
                                                                                className="font-medium truncate"
                                                                                style={{
                                                                                    color: absenceColor,
                                                                                }}
                                                                            >
                                                                                {
                                                                                    ABSENCE_TYPE_LABELS[
                                                                                        absence.absence_type as AbsenceType
                                                                                    ]
                                                                                }
                                                                            </div>
                                                                            <div className="text-slate-500 flex items-center gap-1">
                                                                                {format(
                                                                                    startDate,
                                                                                    "d MMM",
                                                                                    {
                                                                                        locale: pl,
                                                                                    }
                                                                                )}
                                                                                {days >
                                                                                    1 && (
                                                                                    <>
                                                                                        <span className="text-slate-300">
                                                                                            →
                                                                                        </span>
                                                                                        {format(
                                                                                            endDate,
                                                                                            "d MMM",
                                                                                            {
                                                                                                locale: pl,
                                                                                            }
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                                <span className="text-slate-400">
                                                                                    (
                                                                                    {
                                                                                        days
                                                                                    }{" "}
                                                                                    {days ===
                                                                                    1
                                                                                        ? "dzień"
                                                                                        : "dni"}

                                                                                    )
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 rounded-lg hover:bg-slate-100"
                                                                                onClick={() =>
                                                                                    handleOpenAbsenceDialog(
                                                                                        employee,
                                                                                        absence
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Pencil className="h-3.5 w-3.5 text-slate-400" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 rounded-lg hover:bg-red-50"
                                                                                onClick={() =>
                                                                                    handleDeleteClick(
                                                                                        absence
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-400 pl-14">
                                                        Brak nieobecności
                                                    </p>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        ) : (
                            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                                <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                Brak pracowników
                            </div>
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
            {/* Dialog dodawania/edycji nieobecności */}
            <Dialog
                open={absenceDialogOpen}
                onOpenChange={setAbsenceDialogOpen}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedEmployee && (
                                <div
                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white"
                                    style={{
                                        backgroundColor:
                                            getEmployeeColor(selectedEmployee),
                                    }}
                                >
                                    {getEmployeeInitials(selectedEmployee)}
                                </div>
                            )}
                            {editMode
                                ? "Edytuj nieobecność"
                                : "Dodaj nieobecność"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedEmployee?.first_name}{" "}
                            {selectedEmployee?.last_name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label>Typ nieobecności</Label>
                            <AbsenceTypeSelect
                                value={absenceForm.absenceType}
                                onValueChange={(v) =>
                                    setAbsenceForm((prev) => ({
                                        ...prev,
                                        absenceType: v,
                                    }))
                                }
                            />
                        </div>

                        {/* Kalendarz z zakresem dat */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>
                                    {!absenceForm.dateRange?.from
                                        ? "Kliknij datę początkową"
                                        : !absenceForm.dateRange?.to
                                        ? "Kliknij datę końcową"
                                        : "Wybrane daty"}
                                </Label>
                                {daysCount > 0 && (
                                    <span className="text-sm font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                        {daysCount}{" "}
                                        {daysCount === 1 ? "dzień" : "dni"}
                                    </span>
                                )}
                            </div>
                            <div className="border rounded-lg p-3 flex justify-center">
                                <Calendar
                                    mode="range"
                                    selected={absenceForm.dateRange}
                                    onSelect={(range) =>
                                        setAbsenceForm((prev) => ({
                                            ...prev,
                                            dateRange: range || {
                                                from: undefined,
                                                to: undefined,
                                            },
                                        }))
                                    }
                                    locale={pl}
                                    numberOfMonths={1}
                                />
                            </div>
                            {absenceForm.dateRange?.from && (
                                <p className="text-xs text-slate-500 text-center">
                                    {format(
                                        absenceForm.dateRange.from,
                                        "d MMMM yyyy",
                                        { locale: pl }
                                    )}
                                    {absenceForm.dateRange.to && (
                                        <>
                                            {" "}
                                            —{" "}
                                            {format(
                                                absenceForm.dateRange.to,
                                                "d MMMM yyyy",
                                                { locale: pl }
                                            )}
                                        </>
                                    )}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="isPaid">Płatna</Label>
                            <Switch
                                id="isPaid"
                                checked={absenceForm.isPaid}
                                onCheckedChange={(checked) =>
                                    setAbsenceForm((prev) => ({
                                        ...prev,
                                        isPaid: checked,
                                    }))
                                }
                            />
                        </div>

                        <Button
                            onClick={onSubmitAbsence}
                            className="w-full"
                            disabled={isLoading || !absenceForm.dateRange?.from}
                        >
                            {isLoading ? (
                                <Spinner withMargin />
                            ) : (
                                <Plus className="mr-2 h-4 w-4" />
                            )}
                            {editMode
                                ? "Zapisz zmiany"
                                : `Dodaj nieobecność (${daysCount} ${
                                      daysCount === 1 ? "dzień" : "dni"
                                  })`}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Dialog potwierdzenia usunięcia */}
            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć nieobecność?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedAbsence && (
                                <>
                                    Czy na pewno chcesz usunąć nieobecność{" "}
                                    <strong>
                                        {
                                            ABSENCE_TYPE_LABELS[
                                                selectedAbsence.absence_type as AbsenceType
                                            ]
                                        }
                                    </strong>{" "}
                                    (
                                    {format(
                                        parseISO(selectedAbsence.start_date),
                                        "d MMM",
                                        { locale: pl }
                                    )}
                                    {selectedAbsence.start_date !==
                                        selectedAbsence.end_date && (
                                        <>
                                            {" "}
                                            —{" "}
                                            {format(
                                                parseISO(
                                                    selectedAbsence.end_date
                                                ),
                                                "d MMM",
                                                { locale: pl }
                                            )}
                                        </>
                                    )}
                                    )?
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onDeleteAbsence}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isLoading}
                        >
                            {isLoading ? <Spinner size="sm" /> : "Usuń"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
