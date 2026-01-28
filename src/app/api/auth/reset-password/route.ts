import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";

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
                { status: 400 }
            );
        }

        const { email, code, password } = validation.data;
        const supabase = await createServiceClient();

        // Sprawdź kod weryfikacyjny
        const { data: verificationCode } = await supabase
            .from("verification_codes")
            .select("*")
            .eq("email", email)
            .eq("code", code)
            .eq("type", "password_reset")
            .single();

        if (!verificationCode) {
            return NextResponse.json(
                { error: "Nieprawidłowy kod resetujący" },
                { status: 400 }
            );
        }

        // Sprawdź czy kod nie wygasł
        if (new Date(verificationCode.expires_at) < new Date()) {
            await supabase
                .from("verification_codes")
                .delete()
                .eq("id", verificationCode.id);

            return NextResponse.json(
                { error: "Kod resetujący wygasł. Poproś o nowy kod." },
                { status: 400 }
            );
        }

        // Pobierz użytkownika po email
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find((u) => u.email === email);

        if (!user) {
            return NextResponse.json(
                { error: "Nie znaleziono użytkownika" },
                { status: 400 }
            );
        }

        // Zaktualizuj hasło użytkownika
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { password }
        );

        if (updateError) {
            logger.error("Update password error:", updateError);
            return NextResponse.json(
                { error: "Nie udało się zaktualizować hasła" },
                { status: 500 }
            );
        }

        // Usuń wykorzystany kod
        await supabase
            .from("verification_codes")
            .delete()
            .eq("id", verificationCode.id);

        logger.info(`Password reset successful for: ${email}`);

        return NextResponse.json({
            success: true,
            message: "Hasło zostało zmienione. Możesz się teraz zalogować.",
        });
    } catch (error) {
        logger.error("Reset password error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas zmiany hasła" },
            { status: 500 }
        );
    }
}

export const POST = withRateLimit(
    {
        keyPrefix: "reset-password",
        limit: RATE_LIMITS.passwordReset || 5,
        errorMessage: "Zbyt wiele prób zmiany hasła. Spróbuj ponownie później.",
    },
    handler
);
