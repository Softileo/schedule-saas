import { z } from "zod";
import { timeToMinutes } from "@/lib/utils/date-helpers";

// Schema dla formularza tworzenia organizacji z opisem
export const organizationFormSchema = z.object({
    name: z
        .string()
        .min(1, "Nazwa organizacji jest wymagana")
        .min(2, "Nazwa musi mieć minimum 2 znaki")
        .max(100, "Nazwa może mieć maksymalnie 100 znaków"),
    description: z
        .string()
        .max(500, "Opis może mieć maksymalnie 500 znaków")
        .optional()
        .or(z.literal("")),
});

export const shiftSchema = z
    .object({
        employeeId: z.string().min(1, "Wybierz pracownika"),
        date: z.string().min(1, "Data jest wymagana"),
        startTime: z
            .string()
            .min(1, "Godzina rozpoczęcia jest wymagana")
            .regex(
                /^([01]\d|2[0-3]):([0-5]\d)$/,
                "Nieprawidłowy format godziny"
            ),
        endTime: z
            .string()
            .min(1, "Godzina zakończenia jest wymagana")
            .regex(
                /^([01]\d|2[0-3]):([0-5]\d)$/,
                "Nieprawidłowy format godziny"
            ),
        breakMinutes: z
            .number()
            .min(0, "Przerwa nie może być ujemna")
            .max(120, "Przerwa może trwać maksymalnie 2 godziny"),
        notes: z
            .string()
            .max(500, "Notatka może mieć maksymalnie 500 znaków")
            .optional()
            .or(z.literal("")),
    })
    .refine(
        (data) => {
            const startMinutes = timeToMinutes(data.startTime);
            const endMinutes = timeToMinutes(data.endTime);
            return endMinutes > startMinutes;
        },
        {
            message: "Godzina zakończenia musi być późniejsza niż rozpoczęcia",
            path: ["endTime"],
        }
    );

export type OrganizationFormData = z.infer<typeof organizationFormSchema>;
export type ShiftFormData = z.infer<typeof shiftSchema>;
export type ShiftInput = z.infer<typeof shiftSchema>;

// Funkcja pomocnicza do walidacji czasów zmiany
export function validateShiftTimes(
    startTime: string,
    endTime: string
): boolean {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    return endMinutes > startMinutes;
}
