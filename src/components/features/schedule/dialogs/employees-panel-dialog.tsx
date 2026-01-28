"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import { createEmployee, createAbsence } from "@/lib/api/client-helpers";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { employeeSchema, type EmployeeInput } from "@/lib/validations/employee";
import { getUniqueEmployeeColor } from "@/lib/constants/colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Plus, UserPlus, Users } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { Employee, AbsenceType } from "@/types";
import { AbsenceTypeSelect } from "@/components/ui/absence-type-select";
import { cn } from "@/lib/utils";
import {
    getEmployeeColor,
    getEmployeeInitials,
    getEmployeeFullName,
} from "@/lib/core/employees/utils";

interface EmployeesPanelDialogProps {
    organizationId: string;
    employees: Employee[];
    variant?: "icon" | "button";
}

export function EmployeesPanelDialog({
    organizationId,
    employees,
    variant = "icon",
}: EmployeesPanelDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"add-employee" | "add-absence">(
        "add-employee"
    );
    const [isLoading, setIsLoading] = useState(false);

    // Formularz pracownika
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset: resetEmployeeForm,
        formState: { errors },
    } = useForm<EmployeeInput>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            employmentType: "full",
        },
    });

    const employmentType = watch("employmentType");

    // Stan formularza nieobecności
    const [absenceForm, setAbsenceForm] = useState({
        employeeId: "",
        absenceType: "vacation" as AbsenceType,
        startDate: new Date(),
        endDate: new Date(),
        isPaid: true,
        notes: "",
    });

    async function onSubmitEmployee(data: EmployeeInput) {
        setIsLoading(true);
        // Pobierz kolory już używane przez istniejących pracowników
        const usedColors = employees
            .map((e) => e.color)
            .filter((c): c is string => c !== null);
        const uniqueColor = getUniqueEmployeeColor(usedColors);

        try {
            const { error } = await createEmployee({
                organization_id: organizationId,
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email || null,
                phone: data.phone || null,
                employment_type: data.employmentType,
                custom_hours:
                    data.employmentType === "custom"
                        ? data.customHours ?? null
                        : null,
                is_active: true,
                color: uniqueColor,
                position: null,
            });

            if (error) throw error;

            resetEmployeeForm();
            toast.success("Pracownik został dodany");
            router.refresh();
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error adding employee:", message);
            toast.error("Nie udało się dodać pracownika");
        } finally {
            setIsLoading(false);
        }
    }

    async function onSubmitAbsence() {
        if (!absenceForm.employeeId) {
            toast.error("Wybierz pracownika");
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await createAbsence({
                employee_id: absenceForm.employeeId,
                organization_id: organizationId,
                absence_type: absenceForm.absenceType,
                start_date: format(absenceForm.startDate, "yyyy-MM-dd"),
                end_date: format(absenceForm.endDate, "yyyy-MM-dd"),
                is_paid: absenceForm.isPaid,
                notes: absenceForm.notes || null,
                updated_at: new Date().toISOString(),
                created_by: null,
            });

            if (error) throw error;

            setAbsenceForm({
                employeeId: "",
                absenceType: "vacation",
                startDate: new Date(),
                endDate: new Date(),
                isPaid: true,
                notes: "",
            });
            toast.success("Nieobecność została dodana");
            router.refresh();
        } catch {
            toast.error("Nie udało się dodać nieobecności");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {variant === "icon" ? (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Users className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        Pracownicy
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Pracownicy</DialogTitle>
                    <DialogDescription>
                        Dodaj pracownika lub nieobecność
                    </DialogDescription>
                </DialogHeader>

                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as typeof activeTab)}
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger
                            value="add-employee"
                            className="flex items-center gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            Dodaj pracownika
                        </TabsTrigger>
                        <TabsTrigger
                            value="add-absence"
                            className="flex items-center gap-2"
                        >
                            <CalendarDays className="h-4 w-4" />
                            Dodaj nieobecność
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB: Dodaj pracownika */}
                    <TabsContent
                        value="add-employee"
                        className="space-y-4 mt-4"
                    >
                        <form
                            onSubmit={handleSubmit(onSubmitEmployee)}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">Imię *</Label>
                                    <Input
                                        id="firstName"
                                        {...register("firstName")}
                                        placeholder="Jan"
                                    />
                                    {errors.firstName && (
                                        <p className="text-sm text-destructive">
                                            {errors.firstName.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Nazwisko *</Label>
                                    <Input
                                        id="lastName"
                                        {...register("lastName")}
                                        placeholder="Kowalski"
                                    />
                                    {errors.lastName && (
                                        <p className="text-sm text-destructive">
                                            {errors.lastName.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    {...register("email")}
                                    placeholder="jan.kowalski@email.com"
                                />
                                {errors.email && (
                                    <p className="text-sm text-destructive">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefon</Label>
                                <Input
                                    id="phone"
                                    {...register("phone")}
                                    placeholder="123 456 789"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Wymiar etatu *</Label>
                                <Select
                                    value={employmentType}
                                    onValueChange={(value) =>
                                        setValue(
                                            "employmentType",
                                            value as EmployeeInput["employmentType"]
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Wybierz wymiar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full">
                                            Pełny etat (8h/dzień)
                                        </SelectItem>
                                        <SelectItem value="half">
                                            1/2 etatu (4h/dzień)
                                        </SelectItem>
                                        <SelectItem value="custom">
                                            Własna liczba godzin
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {employmentType === "custom" && (
                                <div className="space-y-2">
                                    <Label htmlFor="customHours">
                                        Liczba godzin miesięcznie
                                    </Label>
                                    <Input
                                        id="customHours"
                                        type="number"
                                        {...register("customHours", {
                                            valueAsNumber: true,
                                        })}
                                        placeholder="100"
                                    />
                                    {errors.customHours && (
                                        <p className="text-sm text-destructive">
                                            {errors.customHours.message}
                                        </p>
                                    )}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Spinner withMargin />
                                ) : (
                                    <Plus className="mr-2 h-4 w-4" />
                                )}
                                Dodaj pracownika
                            </Button>
                        </form>
                    </TabsContent>

                    {/* TAB: Dodaj nieobecność */}
                    <TabsContent value="add-absence" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Pracownik *</Label>
                                <Select
                                    value={absenceForm.employeeId}
                                    onValueChange={(value) =>
                                        setAbsenceForm((prev) => ({
                                            ...prev,
                                            employeeId: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Wybierz pracownika" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map((emp) => (
                                            <SelectItem
                                                key={emp.id}
                                                value={emp.id}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                                                        style={{
                                                            backgroundColor:
                                                                getEmployeeColor(
                                                                    emp
                                                                ),
                                                        }}
                                                    >
                                                        {getEmployeeInitials(
                                                            emp
                                                        )}
                                                    </div>
                                                    {getEmployeeFullName(emp)}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Typ nieobecności *</Label>
                                <AbsenceTypeSelect
                                    value={absenceForm.absenceType}
                                    onValueChange={(value) =>
                                        setAbsenceForm((prev) => ({
                                            ...prev,
                                            absenceType: value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Data rozpoczęcia *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !absenceForm.startDate &&
                                                        "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarDays className="mr-2 h-4 w-4" />
                                                {format(
                                                    absenceForm.startDate,
                                                    "dd.MM.yyyy",
                                                    { locale: pl }
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                selected={absenceForm.startDate}
                                                onSelect={(date) =>
                                                    date &&
                                                    setAbsenceForm((prev) => ({
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

                                <div className="space-y-2">
                                    <Label>Data zakończenia *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !absenceForm.endDate &&
                                                        "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarDays className="mr-2 h-4 w-4" />
                                                {format(
                                                    absenceForm.endDate,
                                                    "dd.MM.yyyy",
                                                    { locale: pl }
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                selected={absenceForm.endDate}
                                                onSelect={(date) =>
                                                    date &&
                                                    setAbsenceForm((prev) => ({
                                                        ...prev,
                                                        endDate: date,
                                                    }))
                                                }
                                                disabled={(date) =>
                                                    date < absenceForm.startDate
                                                }
                                                locale={pl}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="isPaid">
                                    Nieobecność płatna
                                </Label>
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

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notatki</Label>
                                <Textarea
                                    id="notes"
                                    value={absenceForm.notes}
                                    onChange={(e) =>
                                        setAbsenceForm((prev) => ({
                                            ...prev,
                                            notes: e.target.value,
                                        }))
                                    }
                                    placeholder="Dodatkowe informacje..."
                                    rows={2}
                                />
                            </div>

                            <Button
                                onClick={onSubmitAbsence}
                                className="w-full"
                                disabled={isLoading || !absenceForm.employeeId}
                            >
                                {isLoading ? (
                                    <Spinner withMargin />
                                ) : (
                                    <Plus className="mr-2 h-4 w-4" />
                                )}
                                Dodaj nieobecność
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
