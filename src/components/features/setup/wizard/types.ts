// Shared types for onboarding wizard
export type EmploymentType =
    | "full"
    | "half"
    | "custom"
    | "three_quarter"
    | "one_third";

export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    color: string;
    employmentType: EmploymentType;
    customHours?: number;
}

export interface ShiftTemplate {
    id: string;
    startTime: string;
    endTime: string;
    minEmployees: number;
    maxEmployees: number;
    color: string;
    assignedEmployees: string[];
    applicableDays: number[]; // 0=Sunday, 1=Monday, etc.
}

export interface WizardStep {
    id: number;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
}
