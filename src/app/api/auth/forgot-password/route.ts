import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { withRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import { logger } from "@/lib/utils/logger";
import {
    sendPasswordResetCode,
    generateVerificationCode,
} from "@/lib/email/nodemailer";

async function handler(request: Request) {
    try {
        const body = await request.json();
        const validation = resetPasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Nieprawidłowy adres email" },
                { status: 400 }
            );
        }

        const { email } = validation.data;
        const supabase = await createServiceClient();

        // Sprawdź czy użytkownik istnieje
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .single();

        // Z bezpieczeństwa zawsze zwracamy sukces (nie ujawniamy czy user istnieje)
        if (!profile) {
            logger.warn(
                `Password reset attempt for non-existent email: ${email}`
            );
            return NextResponse.json({
                success: true,
                message: "Jeśli konto istnieje, kod został wysłany na email",
            });
        }

        // Wygeneruj kod resetujący
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minut

        // Usuń stare kody resetowania dla tego email
        await supabase
            .from("verification_codes")
            .delete()
            .eq("email", email)
            .eq("type", "password_reset");

        // Zapisz nowy kod
        const { error: saveError } = await supabase
            .from("verification_codes")
            .insert({
                email,
                code,
                type: "password_reset",
                expires_at: expiresAt.toISOString(),
            });

        if (saveError) {
            logger.error("Error saving reset code:", saveError);
            return NextResponse.json(
                { error: "Nie udało się wysłać kodu resetującego" },
                { status: 500 }
            );
        }

        // Wyślij email z kodem
        await sendPasswordResetCode(email, code);

        logger.info(`Password reset code sent to: ${email}`);

        return NextResponse.json({
            success: true,
            message: "Kod resetujący został wysłany na email",
        });
    } catch (error) {
        logger.error("Forgot password error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas resetowania hasła" },
            { status: 500 }
        );
    }
}

export const POST = withRateLimit(
    {
        keyPrefix: "forgot-password",
        limit: RATE_LIMITS.passwordReset || 3, // Max 3 próby na godzinę
        errorMessage:
            "Zbyt wiele prób resetowania hasła. Spróbuj ponownie za godzinę.",
    },
    handler
);
