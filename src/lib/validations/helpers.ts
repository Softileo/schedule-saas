import { z } from "zod";

/**
 * Wspólna funkcja refine dla potwierdzenia hasła
 * Eliminuje duplikację logiki porównywania haseł
 */
export function passwordMatchRefine(schema: z.ZodObject<any>) {
    return schema.refine(
        (data) => {
            const d = data as Record<string, unknown>;
            return d.password === d.confirmPassword;
        },
        {
            message: "Hasła nie są identyczne",
            path: ["confirmPassword"],
        },
    );
}

/**
 * Tworzy schema z hasłem i potwierdzeniem hasła
 */
export function createPasswordConfirmationSchema(baseSchema: z.ZodObject<any>) {
    return passwordMatchRefine(
        baseSchema.extend({
            confirmPassword: z
                .string()
                .min(1, "Potwierdzenie hasła jest wymagane"),
        }),
    );
}
