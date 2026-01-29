import { format } from "date-fns";
import type { Database } from "@/types/database";

type AbsenceType = Database["public"]["Enums"]["absence_type"];

interface AbsenceData {
    employee_id: string;
    organization_id: string;
    absence_type: AbsenceType;
    start_date: string;
    end_date: string;
    is_paid: boolean;
    notes: string | null;
}

export function createAbsenceData(
    employeeId: string,
    organizationId: string,
    absenceType: string,
    startDate: Date,
    endDate: Date,
    isPaid: boolean,
    notes?: string,
): AbsenceData {
    return {
        employee_id: employeeId,
        organization_id: organizationId,
        absence_type: absenceType as AbsenceType,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        is_paid: isPaid,
        notes: notes || null,
    };
}
