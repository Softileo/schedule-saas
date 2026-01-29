/**
 * Wspólny hook dla filtrowania pracowników
 */

import { useState, useMemo } from "react";
import type { Employee } from "@/types";
import {
    EMPLOYMENT_TYPES,
    type EmploymentType,
} from "@/lib/constants/employment";

/**
 * Hook do zarządzania filtrowaniem pracowników z wyszukiwaniem i typem zatrudnienia
 */
export function useEmployeeFilters(
    employees: Employee[],
    excludeEmployeeIds?: string[],
) {
    const [searchQuery, setSearchQuery] = useState("");
    const [employmentFilter, setEmploymentFilter] = useState<string | null>(
        null,
    );

    // Dostępne typy etatów (tylko te które mają pracowników)
    const availableEmploymentTypes = useMemo(() => {
        const filteredEmployees = employees.filter(
            (e) => !excludeEmployeeIds?.includes(e.id),
        );

        const typeCounts = new Map<EmploymentType, number>();
        filteredEmployees.forEach((e) => {
            const count =
                typeCounts.get(e.employment_type as EmploymentType) || 0;
            typeCounts.set(e.employment_type as EmploymentType, count + 1);
        });

        // Zwróć typy w kolejności z EMPLOYMENT_TYPES
        return EMPLOYMENT_TYPES.filter((t) => typeCounts.has(t.value)).map(
            (t) => ({
                ...t,
                count: typeCounts.get(t.value) || 0,
            }),
        );
    }, [employees, excludeEmployeeIds]);

    // Filtrowanie pracowników
    const filteredEmployees = useMemo(() => {
        let result = employees;

        // Wyklucz określone ID
        if (excludeEmployeeIds && excludeEmployeeIds.length > 0) {
            result = result.filter((e) => !excludeEmployeeIds.includes(e.id));
        }

        // Filtruj po zapytaniu wyszukiwania
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (e) =>
                    e.first_name.toLowerCase().includes(query) ||
                    e.last_name.toLowerCase().includes(query),
            );
        }

        // Filtruj po typie zatrudnienia
        if (employmentFilter) {
            result = result.filter(
                (e) => e.employment_type === employmentFilter,
            );
        }

        return result;
    }, [employees, excludeEmployeeIds, searchQuery, employmentFilter]);

    return {
        searchQuery,
        setSearchQuery,
        employmentFilter,
        setEmploymentFilter,
        availableEmploymentTypes,
        filteredEmployees,
    };
}
