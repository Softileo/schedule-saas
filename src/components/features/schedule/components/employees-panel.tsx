"use client";

import { memo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Users, Filter, X, Check, BarChart2 } from "lucide-react";
import { DraggableEmployee } from "../components/draggable-employee";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import { EmployeeAvatar } from "@/components/features/employees/employee-avatar";
import type { Employee } from "@/types";
import Soon from "@/components/ui/soon";
import { Button } from "@/components/ui/button";
import { EmployeeListRenderer } from "./employee-list-renderer";

interface EmployeesPanelProps {
    employees: Employee[];
    employeeHoursMap: Map<string, { scheduled: number; required: number }>;
    variant?: "default" | "sidebar" | "filter-only";
    filteredEmployeeIds?: Set<string>;
    onFilterChange?: (ids: Set<string>) => void;
    onShowStats?: () => void;
}

const Legend = memo(function Legend() {
    return (
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300" />
                <span>Niedziela</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-50 border border-blue-100" />
                <span>Nd. handlowa</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-50 border border-red-100" />
                <span>Święto</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="w-3 h-3 flex items-center justify-center font-bold text-slate-400">
                    Z
                </span>
                <span>Zamknięte</span>
            </div>
        </div>
    );
});

// Komponent Popover filtrów
const FilterPopover = memo(function FilterPopover({
    employees,
    filteredEmployeeIds,
    onFilterChange,
    onClose,
    anchorRef,
}: {
    employees: Employee[];
    filteredEmployeeIds: Set<string>;
    onFilterChange: (ids: Set<string>) => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [position, setPosition] = useState(() => ({ top: 0, left: 0 }));

    useEffect(() => {
        // Oblicz pozycję synchronicznie przy montowaniu
        const getPosition = () => {
            if (anchorRef.current) {
                const rect = anchorRef.current.getBoundingClientRect();
                return {
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                };
            }
            return { top: 0, left: 0 };
        };

        // Zaktualizuj pozycję po zamontowaniu, aby naprawić ewentualny mismatch SSR/CSR
        setPosition(getPosition());
    }, [anchorRef]);

    // Aktualizuj pozycję przy scrollu/resize
    useEffect(() => {
        const updatePosition = () => {
            if (anchorRef.current) {
                const rect = anchorRef.current.getBoundingClientRect();
                setPosition({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                });
            }
        };

        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [anchorRef]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                anchorRef.current &&
                !anchorRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose, anchorRef]);

    const toggleEmployee = (employeeId: string) => {
        const newSet = new Set(filteredEmployeeIds);
        if (newSet.has(employeeId)) {
            newSet.delete(employeeId);
        } else {
            newSet.add(employeeId);
        }
        onFilterChange(newSet);
    };

    const selectAll = () => {
        onFilterChange(new Set(filteredEmployees.map((e) => e.id)));
    };

    const clearAll = () => {
        onFilterChange(new Set());
    };

    // Filtruj pracowników na podstawie wyszukiwania
    const filteredEmployees = employees.filter((employee) => {
        if (!searchQuery) return true;
        const fullName = getEmployeeFullName(employee).toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
    });

    const popoverContent = (
        <div
            ref={popoverRef}
            style={{ top: position.top, left: position.left }}
            className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-slate-200 min-w-[220px]"
        >
            <div className="p-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                    Filtruj pracowników
                </span>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-slate-100 rounded"
                >
                    <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
            </div>
            {/* Wyszukiwarka */}
            <div className="p-2 border-b border-slate-100">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Szukaj pracownika..."
                        className="w-full text-xs px-3 py-1.5 pr-8 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded"
                        >
                            <X className="h-3 w-3 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>
            <div className="p-1 border-b border-slate-100 flex gap-1">
                <button
                    onClick={selectAll}
                    className="flex-1 text-[10px] px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                    Zaznacz wszystkich
                </button>
                <button
                    onClick={clearAll}
                    className="flex-1 text-[10px] px-2 py-1 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                >
                    Wyczyść
                </button>
            </div>
            <div className="max-h-[280px] overflow-y-auto p-1">
                {filteredEmployees.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                        Nie znaleziono pracowników
                    </div>
                ) : (
                    filteredEmployees.map((employee) => {
                        const isSelected = filteredEmployeeIds.has(employee.id);
                        return (
                            <button
                                key={employee.id}
                                onClick={() => toggleEmployee(employee.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
                                    isSelected
                                        ? "bg-blue-50"
                                        : "hover:bg-slate-50",
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                                        isSelected
                                            ? "bg-blue-500 border-blue-500 text-white"
                                            : "border-slate-300",
                                    )}
                                >
                                    {isSelected && (
                                        <Check className="w-3 h-3" />
                                    )}
                                </div>
                                <EmployeeAvatar
                                    employee={employee}
                                    size="sm"
                                    variant="square"
                                />
                                <span className="text-xs text-slate-700 truncate">
                                    {getEmployeeFullName(employee)}
                                </span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );

    return createPortal(popoverContent, document.body);
});

export const EmployeesPanel = memo(function EmployeesPanel({
    employees,
    employeeHoursMap,
    variant = "default",
    filteredEmployeeIds = new Set(),
    onFilterChange,
    onShowStats,
}: EmployeesPanelProps) {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const isFilterActive = filteredEmployeeIds.size > 0;
    const filterButtonRef = useRef<HTMLButtonElement>(null);

    // Wariant filter-only - tylko przycisk filtra
    if (variant === "filter-only") {
        return (
            <div className="flex items-center gap-2">
                {onFilterChange && (
                    <div className="relative">
                        <Button
                            ref={filterButtonRef}
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={cn(
                                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                isFilterActive || isFilterOpen
                                    ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                            )}
                        >
                            <Filter className="h-3.5 w-3.5" />
                            <span>Filtruj</span>
                            {isFilterActive && (
                                <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                                    {filteredEmployeeIds.size}
                                </span>
                            )}
                        </Button>
                        {isFilterOpen && (
                            <FilterPopover
                                employees={employees}
                                filteredEmployeeIds={filteredEmployeeIds}
                                onFilterChange={onFilterChange}
                                onClose={() => setIsFilterOpen(false)}
                                anchorRef={filterButtonRef}
                            />
                        )}
                    </div>
                )}
                {onShowStats && (
                    <Button
                        onClick={onShowStats}
                        disabled
                        className="flex items-center relative gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                        title="Statystyki pracowników"
                    >
                        <BarChart2 className="h-3.5 w-3.5" />
                        <span>Statystyki</span> <Soon top={-8} right={-20} />
                    </Button>
                )}
            </div>
        );
    }

    // Wariant sidebar - dla widoku kompaktowego
    if (variant === "sidebar") {
        return (
            <aside className="w-45 lg:w-55 shrink-0 bg-white border border-slate-200 rounded-lg p-3 lg:p-4 sticky top-4 max-h-[calc(100vh-120px)] flex flex-col">
                <div className="flex items-center justify-between mb-3 lg:mb-4 shrink-0">
                    <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Pracownicy
                    </h2>
                    {onFilterChange && (
                        <>
                            <Button
                                ref={filterButtonRef}
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={cn(
                                    "relative p-1 rounded transition-colors",
                                    isFilterActive || isFilterOpen
                                        ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
                                )}
                                title="Filtruj pracowników"
                            >
                                <Filter className="h-3.5 w-3.5" />
                                {isFilterActive && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                        {filteredEmployeeIds.size}
                                    </span>
                                )}
                            </Button>
                            {isFilterOpen && (
                                <FilterPopover
                                    employees={employees}
                                    filteredEmployeeIds={filteredEmployeeIds}
                                    onFilterChange={onFilterChange}
                                    onClose={() => setIsFilterOpen(false)}
                                    anchorRef={filterButtonRef}
                                />
                            )}
                        </>
                    )}
                </div>

                <EmployeeListRenderer
                    employees={employees}
                    employeeHoursMap={employeeHoursMap}
                    layout="list"
                />
            </aside>
        );
    }

    // Wariant default - dla widoku tabeli
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-slate-400" />
                        Pracownicy
                        <span className="text-slate-400 font-normal">
                            ({employees.length})
                        </span>
                    </h3>
                    {onFilterChange && (
                        <>
                            <button
                                ref={filterButtonRef}
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
                                    isFilterActive || isFilterOpen
                                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        : "text-slate-500 hover:bg-slate-100",
                                )}
                            >
                                <Filter className="h-3.5 w-3.5" />
                                <span>Filtruj</span>
                                {isFilterActive && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                                        {filteredEmployeeIds.size}
                                    </span>
                                )}
                            </button>
                            {isFilterOpen && (
                                <FilterPopover
                                    employees={employees}
                                    filteredEmployeeIds={filteredEmployeeIds}
                                    onFilterChange={onFilterChange}
                                    onClose={() => setIsFilterOpen(false)}
                                    anchorRef={filterButtonRef}
                                />
                            )}
                        </>
                    )}
                </div>
                <Legend />
            </div>
            <EmployeeListRenderer
                employees={employees}
                employeeHoursMap={employeeHoursMap}
                layout="grid"
            />
        </div>
    );
});
