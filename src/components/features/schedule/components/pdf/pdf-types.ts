import type {
    Employee,
    ShiftTemplate,
    PublicHoliday,
    OrganizationSettings,
} from "@/types";
import type { LocalShift } from "@/components/features/schedule";

export interface SchedulePDFData {
    organizationName: string;
    year: number;
    month: number;
    employees: Employee[];
    shifts: LocalShift[];
    shiftTemplates: ShiftTemplate[];
    holidays: PublicHoliday[];
    organizationSettings: OrganizationSettings | null;
    employeeHours: Map<string, { scheduled: number; required: number }>;
}

export type PDFTemplateType = "classic" | "colorful" | "minimal";

export interface PDFTemplateConfig {
    id: PDFTemplateType;
    name: string;
    description: string;
}

export const PDF_TEMPLATES: PDFTemplateConfig[] = [
    {
        id: "classic",
        name: "Klasyczny",
        description:
            "Tradycyjny układ z wyraźnymi liniami i stonowanymi kolorami",
    },
    {
        id: "colorful",
        name: "Kolorowy",
        description: "Pastelowe kolory zmian i kolorowe kropki pracowników",
    },
    // {
    //     id: "minimal",
    //     name: "Minimalistyczny",
    //     description: "Ultra czysty design, tylko tekst godzin",
    // },
];
