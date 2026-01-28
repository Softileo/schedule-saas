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
        value: string | number
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
        employee.customHours || 8
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
        <div className="group flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
            {/* Avatar */}
            <div
                className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: employee.color }}
            >
                {employee.firstName && employee.lastName
                    ? `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
                    : index + 1}
            </div>

            {/* Names */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                    placeholder="Imię"
                    value={employee.firstName}
                    onChange={(e) => onUpdate("firstName", e.target.value)}
                    className="h-9 text-sm border-slate-200"
                />
                <Input
                    placeholder="Nazwisko"
                    value={employee.lastName}
                    onChange={(e) => onUpdate("lastName", e.target.value)}
                    className="h-9 text-sm border-slate-200"
                />
            </div>

            {/* Employment - compact buttons */}
            <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 shrink-0">
                    Etat:
                </span>
                <div className="flex items-center gap-1">
                    {EMPLOYMENT_OPTIONS_SHORT.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                                onUpdate("employmentType", opt.value)
                            }
                            className={cn(
                                "w-10 h-9 rounded-md border-2 border-slate-100 text-xs font-semibold transition-colors",
                                employee.employmentType === opt.value
                                    ? "bg-slate-100 border-blue-500 text-blue-500"
                                    : "bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200"
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
                                    "px-2.5 h-9 rounded-md text-xs font-semibold transition-colors",
                                    employee.employmentType === "custom"
                                        ? "bg-slate-900 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                                                parseFloat(e.target.value) || 8
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
                    className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
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
        [onUpdateEmployee]
    );

    return (
        <div className="w-full space-y-5 animate-in fade-in duration-300">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                    Dodaj pracowników
                </h2>
                <p className="text-slate-500 mt-1 text-sm">
                    Wpisz dane osób, dla których będziesz tworzyć grafik
                </p>
            </div>

            {/* Stats */}
            <div className="flex items-center max-w-md mx-auto justify-center px-4 py-2 w-full">
                <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                        {employees.length}{" "}
                        {employees.length === 1 ? "pracownik" : "pracowników"}
                    </span>
                </div>
            </div>

            {/* Employee List */}
            <div className="space-y-2 w-full">
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
            <div className="w-full max-w-md mx-auto">
                <Button
                    variant="outline"
                    onClick={onAddEmployee}
                    className="w-full h-10 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj pracownika
                </Button>
            </div>
        </div>
    );
});
