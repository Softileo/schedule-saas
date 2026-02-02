"use client";

import { memo, useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Users, FileUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { Employee, EmploymentType } from "./types";
import { EMPLOYMENT_TYPES } from "@/lib/constants/employment";
import { toast } from "sonner";

interface EmployeesStepProps {
    employees: Employee[];
    onAddEmployee: () => void;
    onRemoveEmployee: (id: string) => void;
    onUpdateEmployee: (
        id: string,
        field: keyof Employee,
        value: string | number,
    ) => void;
    onBatchImport?: (employees: Array<Omit<Employee, "id">>) => void;
}

const EMPLOYMENT_OPTIONS_SHORT = EMPLOYMENT_TYPES.slice(0, -1); // Bez custom dla szybkiego wyboru

const EmployeeCard = memo(function EmployeeCard({
    employee,
    index,
    canDelete,
    onRemove,
    onUpdate,
}: {
    employee: Employee;
    index: number;
    canDelete: boolean;
    onRemove: () => void;
    onUpdate: (field: keyof Employee, value: string | number) => void;
}) {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [tempHours, setTempHours] = useState<number>(
        employee.customHours || 8,
    );

    const handleCustomClick = () => {
        if (employee.employmentType === "custom") {
            setIsPopoverOpen(true);
        } else {
            onUpdate("employmentType", "custom");
            setIsPopoverOpen(true);
        }
    };

    const handleSaveCustomHours = () => {
        onUpdate("customHours", tempHours);
        setIsPopoverOpen(false);
    };

    return (
        <div className="relative group flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
            {/* Avatar */}
            <div
                className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: employee.color }}
            >
                {employee.firstName && employee.lastName
                    ? `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
                    : index + 1}
            </div>

            {/* Names */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                    placeholder="Imię"
                    value={employee.firstName}
                    onChange={(e) => onUpdate("firstName", e.target.value)}
                    className="h-10 text-base sm:text-base border-slate-200"
                />
                <Input
                    placeholder="Nazwisko"
                    value={employee.lastName}
                    onChange={(e) => onUpdate("lastName", e.target.value)}
                    className="h-10 text-base sm:text-base border-slate-200"
                />
            </div>

            {/* Employment - Mobile: Below names, Desktop: Right side */}
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2 sm:mt-0">
                <span className="text-xs font-medium text-slate-600 shrink-0">
                    Etat:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                    {EMPLOYMENT_OPTIONS_SHORT.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                                onUpdate("employmentType", opt.value)
                            }
                            className={cn(
                                "w-11 h-9 rounded-md border-2 text-xs font-semibold transition-colors",
                                employee.employmentType === opt.value
                                    ? "bg-slate-100 border-blue-500 text-blue-500"
                                    : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200",
                            )}
                            title={opt.label}
                        >
                            {opt.fraction}
                        </button>
                    ))}
                    <Popover
                        open={isPopoverOpen}
                        onOpenChange={setIsPopoverOpen}
                    >
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                onClick={handleCustomClick}
                                className={cn(
                                    "px-3 h-9 rounded-md text-xs font-semibold transition-colors whitespace-nowrap",
                                    employee.employmentType === "custom"
                                        ? "bg-slate-900 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-slate-200",
                                )}
                                title="Niestandardowy"
                            >
                                {employee.employmentType === "custom" &&
                                employee.customHours
                                    ? `${employee.customHours}h`
                                    : "Inne"}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4" align="end">
                            <div className="space-y-3">
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-900">
                                        Niestandardowy wymiar
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Podaj liczbę godzin dziennie
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600">
                                        Godziny dziennie
                                    </label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={12}
                                        step={0.5}
                                        value={tempHours}
                                        onChange={(e) =>
                                            setTempHours(
                                                parseFloat(e.target.value) || 8,
                                            )
                                        }
                                        className="h-9 text-sm"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleSaveCustomHours}
                                        className="flex-1"
                                    >
                                        Zapisz
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsPopoverOpen(false)}
                                        className="flex-1"
                                    >
                                        Anuluj
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Delete */}
            {canDelete && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto h-8 w-8 sm:h-9 sm:w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    aria-label="Usuń pracownika"
                >
                    <X className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
});

export const EmployeesStep = memo(function EmployeesStep({
    employees,
    onAddEmployee,
    onRemoveEmployee,
    onUpdateEmployee,
    onBatchImport,
}: EmployeesStepProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    const handleUpdate = useCallback(
        (id: string) => (field: keyof Employee, value: string | number) => {
            onUpdateEmployee(id, field, value);
        },
        [onUpdateEmployee],
    );

    const generateColors = (count: number): string[] => {
        const colors = [
            "#3b82f6",
            "#ef4444",
            "#10b981",
            "#f59e0b",
            "#8b5cf6",
            "#ec4899",
            "#14b8a6",
            "#f97316",
            "#6366f1",
            "#84cc16",
        ];
        return Array.from(
            { length: count },
            (_, i) => colors[i % colors.length],
        );
    };

    const handleImportExcel = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);

        try {
            const ExcelJS = (await import("exceljs")).default;
            const workbook = new ExcelJS.Workbook();
            const arrayBuffer = await file.arrayBuffer();
            await workbook.xlsx.load(arrayBuffer);

            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                toast.error("Plik jest pusty");
                return;
            }

            const importedEmployees: Array<{
                firstName: string;
                lastName: string;
                employmentType: EmploymentType;
                customHours?: number;
            }> = [];

            // Pomijamy pierwszy wiersz (nagłówki) i zaczynamy od drugiego
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header

                const fullName = row.getCell(1).value?.toString().trim() || "";
                const employmentTypeValue = row
                    .getCell(2)
                    .value?.toString()
                    .trim()
                    .toLowerCase();

                // Split full name into first and last name
                const nameParts = fullName.split(/\s+/);
                if (nameParts.length < 2) return; // Need at least first and last name

                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(" "); // Handle multiple last names

                if (firstName && lastName) {
                    const employeeData: {
                        firstName: string;
                        lastName: string;
                        employmentType: EmploymentType;
                        customHours?: number;
                    } = {
                        firstName,
                        lastName,
                        employmentType: "full", // Default to full employment
                    };

                    // Map employment type (if provided)
                    if (employmentTypeValue) {
                        if (
                            employmentTypeValue.includes("pełny") ||
                            employmentTypeValue === "1" ||
                            employmentTypeValue === "full"
                        ) {
                            employeeData.employmentType = "full";
                        } else if (
                            employmentTypeValue.includes("3/4") ||
                            employmentTypeValue === "0.75" ||
                            employmentTypeValue === "three_quarter"
                        ) {
                            employeeData.employmentType = "three_quarter";
                        } else if (
                            employmentTypeValue.includes("1/2") ||
                            employmentTypeValue === "0.5" ||
                            employmentTypeValue === "half"
                        ) {
                            employeeData.employmentType = "half";
                        } else if (
                            employmentTypeValue.includes("1/3") ||
                            employmentTypeValue === "0.33" ||
                            employmentTypeValue === "one_third"
                        ) {
                            employeeData.employmentType = "one_third";
                        } else {
                            // Try to parse as number for custom hours
                            const hours = parseFloat(employmentTypeValue);
                            if (!isNaN(hours) && hours > 0 && hours <= 12) {
                                employeeData.employmentType = "custom";
                                employeeData.customHours = hours;
                            }
                        }
                    }

                    importedEmployees.push(employeeData);
                }
            });

            if (importedEmployees.length === 0) {
                toast.error("Nie znaleziono pracowników w pliku");
                return;
            }

            // Generate colors for imported employees
            const colors = generateColors(importedEmployees.length);

            // Create employee objects with colors
            const employeesWithColors: Array<Omit<Employee, "id">> =
                importedEmployees.map((imp, index) => ({
                    firstName: imp.firstName,
                    lastName: imp.lastName,
                    color: colors[index],
                    employmentType: imp.employmentType,
                    customHours: imp.customHours,
                }));

            // Use batch import if available, otherwise fall back to manual method
            if (onBatchImport) {
                onBatchImport(employeesWithColors);
            } else {
                // Fallback: clear and rebuild
                // Remove all except first
                employees.slice(1).forEach((emp) => onRemoveEmployee(emp.id));

                // Update first employee
                if (employees[0] && employeesWithColors[0]) {
                    const firstEmp = employees[0];
                    const firstData = employeesWithColors[0];
                    onUpdateEmployee(
                        firstEmp.id,
                        "firstName",
                        firstData.firstName,
                    );
                    onUpdateEmployee(
                        firstEmp.id,
                        "lastName",
                        firstData.lastName,
                    );
                    onUpdateEmployee(firstEmp.id, "color", firstData.color);
                    onUpdateEmployee(
                        firstEmp.id,
                        "employmentType",
                        firstData.employmentType,
                    );
                    if (firstData.customHours) {
                        onUpdateEmployee(
                            firstEmp.id,
                            "customHours",
                            firstData.customHours,
                        );
                    }
                }

                // Add rest one by one
                for (let i = 1; i < employeesWithColors.length; i++) {
                    onAddEmployee();
                }
            }

            toast.success(
                `Zaimportowano ${importedEmployees.length} pracowników`,
            );
        } catch (error) {
            console.error("Import error:", error);
            toast.error("Błąd podczas importu pliku");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-5 sm:space-y-6 animate-in fade-in duration-300 px-1 sm:px-2">
            {/* Header */}
            <div className="text-center px-2">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                    Dodaj pracowników
                </h2>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                    Wpisz dane osób, dla których będziesz tworzyć grafik
                </p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center py-2">
                <div className="flex items-center gap-2 text-sm px-4 py-1.5 bg-slate-100 rounded-full">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-700 font-medium">
                        {employees.length}{" "}
                        {employees.length === 1 ? "pracownik" : "pracowników"}
                    </span>
                </div>
            </div>

            {/* Employee List */}
            <div className="space-y-3 w-full">
                {employees.map((emp, index) => (
                    <EmployeeCard
                        key={emp.id}
                        employee={emp}
                        index={index}
                        canDelete={employees.length > 1}
                        onRemove={() => onRemoveEmployee(emp.id)}
                        onUpdate={handleUpdate(emp.id)}
                    />
                ))}
            </div>

            {/* Actions */}
            <div className="w-full space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                        variant="outline"
                        onClick={onAddEmployee}
                        className="w-full h-11 border-2 border-dashed border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-medium"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Dodaj pracownika
                    </Button>
                    <div className="relative">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleImportExcel}
                            className="hidden"
                            id="excel-upload"
                        />
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="w-full h-11 border-2 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 font-medium"
                        >
                            <FileUp className="w-4 h-4 mr-2" />
                            {isImporting
                                ? "Importowanie..."
                                : "Importuj z Excel"}
                        </Button>
                    </div>
                </div>

                {/* Instructions Toggle */}
                <button
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2 py-2 font-medium"
                >
                    <Info className="w-4 h-4" />
                    {showInstructions ? "Ukryj instrukcję" : "Pokaż instrukcję"}
                </button>

                {/* Instructions Panel */}
                {showInstructions && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <h4 className="font-semibold text-sm text-blue-900">
                            Jak przygotować plik Excel?
                        </h4>
                        <div className="space-y-2 text-xs text-blue-800">
                            <p>
                                Plik powinien zawierać{" "}
                                <strong>2 kolumny</strong>:
                            </p>
                            <div className="bg-white rounded border border-blue-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-blue-100">
                                        <tr>
                                            <th className="px-3 py-2 font-semibold text-blue-900">
                                                Pracownik
                                            </th>
                                            <th className="px-3 py-2 font-semibold text-blue-900">
                                                Etat (opcjonalnie)
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-100">
                                        <tr>
                                            <td className="px-3 py-2 text-slate-700">
                                                Jan Kowalski
                                            </td>
                                            <td className="px-3 py-2 text-slate-500">
                                                pełny
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-2 text-slate-700">
                                                Anna Nowak
                                            </td>
                                            <td className="px-3 py-2 text-slate-500">
                                                1/2
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-2 text-slate-700">
                                                Piotr Wiśniewski
                                            </td>
                                            <td className="px-3 py-2 text-slate-500">
                                                8
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-2 text-slate-700">
                                                Maria Kowalczyk
                                            </td>
                                            <td className="px-3 py-2 text-slate-400 italic">
                                                (puste - domyślnie pełny)
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <ul className="space-y-1 pl-4 list-disc text-blue-800">
                                <li>
                                    <strong>Kolumna 1</strong>: Imię i nazwisko
                                    oddzielone spacją
                                </li>
                                <li>
                                    <strong>Kolumna 2</strong>: Etat
                                    (opcjonalnie)
                                    <ul className="pl-4 mt-1 space-y-0.5 list-circle">
                                        <li>Jeśli puste → pełny etat</li>
                                        <li>
                                            "pełny", "1", "full" → pełny etat
                                        </li>
                                        <li>"3/4", "0.75" → 3/4 etatu</li>
                                        <li>"1/2", "0.5" → 1/2 etatu</li>
                                        <li>"1/3", "0.33" → 1/3 etatu</li>
                                        <li>
                                            Liczba (np. "8") → niestandardowe
                                            godziny
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
