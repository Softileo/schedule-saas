"use client";

import { useState, useMemo } from "react";
import { Employee, EmployeeAbsence } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EmployeeWithAbsences = Employee & {
    employee_absences?: EmployeeAbsence[];
};

import {
    Mail,
    Phone,
    Settings2,
    CalendarDays,
    Search,
    MoreHorizontal,
    Pencil,
    Trash2,
    UserPlus,
} from "lucide-react";
import { getEmploymentTypeLabel } from "@/lib/core/schedule/work-hours";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import { useEmployeeDialogs } from "@/lib/hooks/use-dialog-state";
import { EditEmployeeDialog } from "./edit-employee-dialog";
import { DeleteEmployeeDialog } from "./delete-employee-dialog";
import { EmployeePreferencesDialog } from "./employee-preferences-dialog";
import { EmployeeAbsencesDialog } from "./employee-absences-dialog";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from "next/link";

const DEFAULT_PAGE_SIZE = 24;

interface EmployeesListProps {
    employees: Employee[];
    organizationId: string;
}

export function EmployeesList({
    employees,
    organizationId,
}: EmployeesListProps) {
    const { editDialog, deleteDialog, preferencesDialog, absencesDialog } =
        useEmployeeDialogs<Employee>();
    const [searchQuery, setSearchQuery] = useState("");

    // Filter employees based on search - memoized for performance
    const filteredEmployees = useMemo(() => {
        if (!searchQuery.trim()) return employees;
        const query = searchQuery.toLowerCase();
        return employees.filter((employee) => {
            const fullName = getEmployeeFullName(employee).toLowerCase();
            const email = employee.email?.toLowerCase() || "";
            return fullName.includes(query) || email.includes(query);
        });
    }, [employees, searchQuery]);

    // Pagination
    const {
        paginatedItems: paginatedEmployees,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        totalPages,
        totalItems,
    } = usePagination(filteredEmployees, DEFAULT_PAGE_SIZE);

    if (employees.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <UserPlus className="h-7 w-7 text-slate-400" />
                    </div>
                    <h3 className="text-base font-medium text-slate-800 mb-1">
                        Dodaj pierwszego pracownika
                    </h3>
                    <p className="text-sm text-slate-500 text-center max-w-sm">
                        Kliknij przycisk &quot;Dodaj pracownika&quot; powyżej,
                        aby rozpocząć
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Search Bar */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Szukaj pracownika..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-white border-slate-200 rounded-lg"
                    />
                </div>
            </div>

            {filteredEmployees.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <Search className="h-8 w-8 text-slate-300 mb-3" />
                        <p className="text-sm text-slate-500">
                            Nie znaleziono pracowników
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Employee Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                                        Pracownik
                                    </th>
                                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                                        Kontakt
                                    </th>
                                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                                        Etat
                                    </th>
                                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                                        Akcje
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedEmployees.map((employee) => {
                                    const employmentLabel =
                                        getEmploymentTypeLabel(
                                            employee.employment_type ?? "full",
                                        );
                                    const color = employee.color || "#64748b";
                                    return (
                                        <tr
                                            key={employee.id}
                                            className="hover:bg-slate-50/50 transition-colors"
                                        >
                                            {/* Name & Avatar */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold text-white shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                color,
                                                        }}
                                                    >
                                                        {employee.first_name?.[0]?.toUpperCase() ||
                                                            ""}
                                                        {employee.last_name?.[0]?.toUpperCase() ||
                                                            ""}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-slate-800 truncate">
                                                            {getEmployeeFullName(
                                                                employee,
                                                            )}
                                                        </div>
                                                        {/* Mobile: show email */}
                                                        <div className="text-xs text-slate-500 truncate md:hidden">
                                                            {employee.email ||
                                                                "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact - hidden on mobile */}
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <div className="space-y-0.5">
                                                    {employee.email ? (
                                                        <Link
                                                            href={`mailto:${employee.email}`}
                                                            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600"
                                                        >
                                                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                            <span className="truncate max-w-45">
                                                                {employee.email}
                                                            </span>
                                                        </Link>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">
                                                            —
                                                        </span>
                                                    )}
                                                    {employee.phone && (
                                                        <Link
                                                            href={`tel:${employee.phone}`}
                                                            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600"
                                                        >
                                                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                            {employee.phone}
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Employment type - hidden on mobile */}
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                                                        employee.employment_type ===
                                                            "full"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : employee.employment_type ===
                                                                "half"
                                                              ? "bg-amber-50 text-amber-700"
                                                              : "bg-slate-100 text-slate-700",
                                                    )}
                                                >
                                                    {employmentLabel}
                                                    {employee.employment_type ===
                                                        "custom" &&
                                                        employee.custom_hours && (
                                                            <span>
                                                                (
                                                                {
                                                                    employee.custom_hours
                                                                }
                                                                h)
                                                            </span>
                                                        )}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="hidden md:flex items-center justify-end gap-0.5">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    preferencesDialog.open(
                                                                        employee,
                                                                    )
                                                                }
                                                                className="h-8 w-8 text-slate-500 hover:text-slate-900"
                                                            >
                                                                <Settings2 className="h-5 w-5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Preferencje
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    absencesDialog.open(
                                                                        employee,
                                                                    )
                                                                }
                                                                className="h-8 w-8 text-slate-500 hover:text-slate-900 relative" // Dodano 'relative'
                                                            >
                                                                <CalendarDays className="h-5 w-5" />

                                                                {/* Czerwona kropka z liczbą */}
                                                                {((
                                                                    employee as EmployeeWithAbsences
                                                                )
                                                                    .employee_absences
                                                                    ?.length ??
                                                                    0) > 0 && (
                                                                    <span className="absolute top-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-semibold text-white">
                                                                        {(
                                                                            employee as EmployeeWithAbsences
                                                                        )
                                                                            .employee_absences
                                                                            ?.length ??
                                                                            0}
                                                                    </span>
                                                                )}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Nieobecności (
                                                            {(
                                                                employee as EmployeeWithAbsences
                                                            ).employee_absences
                                                                ?.length || 0}
                                                            )
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    editDialog.open(
                                                                        employee,
                                                                    )
                                                                }
                                                                className="h-8 w-8 text-slate-500 hover:text-slate-900"
                                                            >
                                                                <Pencil className="h-5 w-5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Edytuj
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    deleteDialog.open(
                                                                        employee,
                                                                    )
                                                                }
                                                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Usuń
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>

                                                {/* Mobile Actions Dropdown */}
                                                <div className="flex md:hidden justify-end">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-500"
                                                            >
                                                                <MoreHorizontal className="h-5 w-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    preferencesDialog.open(
                                                                        employee,
                                                                    )
                                                                }
                                                            >
                                                                <Settings2 className="mr-2 h-4 w-4" />
                                                                Preferencje
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    absencesDialog.open(
                                                                        employee,
                                                                    )
                                                                }
                                                            >
                                                                <CalendarDays className="mr-2 h-4 w-4" />
                                                                Nieobecności
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    editDialog.open(
                                                                        employee,
                                                                    )
                                                                }
                                                            >
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Edytuj
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    deleteDialog.open(
                                                                        employee,
                                                                    )
                                                                }
                                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Usuń
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-6">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                pageSize={pageSize}
                                totalItems={totalItems}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={setPageSize}
                            />
                        </div>
                    )}
                </>
            )}

            {editDialog.selected && (
                <EditEmployeeDialog
                    employee={editDialog.selected}
                    open={editDialog.isOpen}
                    onOpenChange={editDialog.setOpen}
                />
            )}

            {deleteDialog.selected && (
                <DeleteEmployeeDialog
                    employee={deleteDialog.selected}
                    open={deleteDialog.isOpen}
                    onOpenChange={deleteDialog.setOpen}
                />
            )}

            {preferencesDialog.selected && (
                <EmployeePreferencesDialog
                    employee={preferencesDialog.selected}
                    open={preferencesDialog.isOpen}
                    onOpenChange={preferencesDialog.setOpen}
                />
            )}

            {absencesDialog.selected && (
                <EmployeeAbsencesDialog
                    employee={absencesDialog.selected}
                    organizationId={organizationId}
                    open={absencesDialog.isOpen}
                    onOpenChange={absencesDialog.setOpen}
                />
            )}
        </>
    );
}
