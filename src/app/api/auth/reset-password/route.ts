import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import {
    verifyCode,
    deleteVerificationCode,
    findUserByEmail,
} from "@/lib/api/auth-helpers";

// Schema dla weryfikacji kodu + nowe hasło
const resetPasswordWithCodeSchema = z
    .object({
        email: z.string().email(),
        code: z
            .string()
            .min(6, "Kod musi mieć 6 cyfr")
            .max(6, "Kod musi mieć 6 cyfr"),
        password: z
            .string()
            .min(8, "Hasło musi mieć minimum 8 znaków")
            .regex(/[A-Z]/, "Hasło musi zawierać wielką literę")
            .regex(/[a-z]/, "Hasło musi zawierać małą literę")
            .regex(/[0-9]/, "Hasło musi zawierać cyfrę"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Hasła nie są identyczne",
        path: ["confirmPassword"],
    });

async function handler(request: Request) {
    try {
        const body = await request.json();
        const validation = resetPasswordWithCodeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error:
                        validation.error.issues[0]?.message ||
                        "Nieprawidłowe dane",
                },
                { status: 400 },
            );
        }

        const { email, code, password } = validation.data;

        // Sprawdź kod weryfikacyjny
        const verificationResult = await verifyCode(
            email,
            code,
            "password_reset",
        );
        if (verificationResult instanceof NextResponse) {
            return verificationResult;
        }

        // Pobierz użytkownika po email
        const userResult = await findUserByEmail(email);
        if (userResult instanceof NextResponse) {
            return userResult;
        }

        const supabase = await createServiceClient();

        // Zaktualizuj hasło użytkownika
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            userResult.id,
            { password },
        );

        if (updateError) {
            logger.error("Update password error:", updateError);
            return NextResponse.json(
                { error: "Nie udało się zaktualizować hasła" },
                { status: 500 },
            );
        }

        // Usuń wykorzystany kod
        await deleteVerificationCode(verificationResult.id);

        logger.info(`Password reset successful for: ${email}`);

        return NextResponse.json({
            success: true,
            message: "Hasło zostało zmienione. Możesz się teraz zalogować.",
        });
    } catch (error) {
        logger.error("Reset password error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas zmiany hasła" },
            { status: 500 },
        );
    }
}

export const POST = withRateLimit(
    {
        keyPrefix: "reset-password",
        limit: RATE_LIMITS.passwordReset || 5,
        errorMessage: "Zbyt wiele prób zmiany hasła. Spróbuj ponownie później.",
    },
    handler,
);
