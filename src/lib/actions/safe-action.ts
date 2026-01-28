import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";

/**
 * Standardized response format for Server Actions
 */
export type ActionResponse<T> = {
    data?: T;
    error?: string;
    fieldErrors?: Record<string, string[]>;
};

/**
 * Wrapper for Server Actions that handles:
 * - Input validation (Zod)
 * - Authentication (Supabase)
 * - Error handling (try/catch)
 * - Logging
 */
export async function authenticatedAction<TInput, TOutput>(
    schema: z.Schema<TInput>,
    input: TInput,
    action: (parsedInput: TInput, userId: string) => Promise<TOutput>
): Promise<ActionResponse<TOutput>> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: "Nieautoryzowany dostęp. Zaloguj się ponownie." };
        }

        const validationResult = schema.safeParse(input);

        if (!validationResult.success) {
            return {
                fieldErrors: validationResult.error.flatten()
                    .fieldErrors as Record<string, string[]>,
                error: "Nieprawidłowe dane wejściowe.",
            };
        }

        const data = await action(validationResult.data, user.id);

        return { data };
    } catch (error) {
        logger.error("Server Action Critical Error:", error);

        // Rozróżnienie błędów znanych (np. rzuconych celowo)
        if (error instanceof Error) {
            // Możemy tu dodać logikę ukrywania wrażliwych błędów w produkcji
            return { error: error.message };
        }

        return { error: "Wystąpił nieoczekiwany błąd serwera." };
    }
}
