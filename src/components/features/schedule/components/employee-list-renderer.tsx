/**
 * =============================================================================
 * EMPLOYEE LIST RENDERER - Shared component for rendering employee lists
 * =============================================================================
 */

import { DraggableEmployee } from "./draggable-employee";
import type { Employee } from "@/types";

interface EmployeeHours {
    scheduled: number;
    required: number;
}

interface EmployeeListRendererProps {
    employees: Employee[];
    employeeHoursMap: Map<string, EmployeeHours>;
    layout?: "grid" | "list";
}

export function EmployeeListRenderer({
    employees,
    employeeHoursMap,
    layout = "list",
}: EmployeeListRendererProps) {
    const employeeElements = employees.map((employee) => {
        const hours = employeeHoursMap.get(employee.id) || {
            scheduled: 0,
            required: 0,
        };
        return (
            <DraggableEmployee
                key={employee.id}
                employee={employee}
                scheduledHours={hours.scheduled}
                requiredHours={hours.required}
            />
        );
    });

    if (layout === "grid") {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                {employeeElements}
            </div>
        );
    }

    return (
        <div className="space-y-1 overflow-y-auto flex-1 pr-2">
            {employeeElements}
        </div>
    );
}
