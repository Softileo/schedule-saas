import { z } from "zod";
import { EMPLOYMENT_TYPE_VALUES } from "@/lib/constants/employment";

export const employeeSchema = z.object({
    firstName: z.string().min(1, "Imię jest wymagane"),
    lastName: z.string().min(1, "Nazwisko jest wymagane"),
    email: z
        .string()
        .email("Nieprawidłowy format email")
        .optional()
        .or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    employmentType: z.enum(EMPLOYMENT_TYPE_VALUES, {
        message: "Wybierz typ etatu",
    }),
    customHours: z
        .number()
        .min(1, "Minimalna liczba godzin to 1")
        .max(12, "Maksymalna liczba godzin to 12")
        .optional()
        .nullable(),
    isSupervisor: z.boolean().optional(),
});

export const employeeUpdateSchema = employeeSchema.partial();

export type EmployeeFormData = z.infer<typeof employeeSchema>;
export type EmployeeUpdateFormData = z.infer<typeof employeeUpdateSchema>;

// Aliasy dla zgodności
export type EmployeeInput = EmployeeFormData;
