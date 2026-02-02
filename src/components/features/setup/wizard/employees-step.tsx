"use client";

import { memo, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { Employee } from "./types";
import { EMPLOYMENT_TYPES } from "@/lib/constants/employment";

interface EmployeesStepProps {
    employees: Employee[];
    onAddEmployee: () => void;
    onRemoveEmployee: (id: string) => void;
    onUpdateEmployee: (
        id: string,
        field: keyof Employee,
        value: string | number,
    ) => void;
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
}: EmployeesStepProps) {
    const handleUpdate = useCallback(
        (id: string) => (field: keyof Employee, value: string | number) => {
            onUpdateEmployee(id, field, value);
        },
        [onUpdateEmployee],
    );

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
            <div className="w-full pt-2">
                <Button
                    variant="outline"
                    onClick={onAddEmployee}
                    className="w-full h-11 border-2 border-dashed border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj pracownika
                </Button>
            </div>
        </div>
    );
});
