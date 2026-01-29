import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCodeSchema } from "@/lib/validations/auth";
import { withRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import { logger } from "@/lib/utils/logger";
import { ROUTES } from "@/lib/constants/routes";
import { sendWelcomeEmail } from "@/lib/email/nodemailer";
import {
    verifyCode,
    deleteVerificationCode,
    findUserByEmail,
} from "@/lib/api/auth-helpers";

async function handler(request: Request) {
    try {
        const body = await request.json();
        const validation = verifyCodeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 },
            );
        }

        const { email, code } = validation.data;

        // Sprawdź kod weryfikacyjny
        const verificationResult = await verifyCode(
            email,
            code,
            "email_verification",
        );
        if (verificationResult instanceof NextResponse) {
            return verificationResult;
        }

        // Pobierz użytkownika
        const userResult = await findUserByEmail(email);
        if (userResult instanceof NextResponse) {
            return userResult;
        }

        const supabase = await createServiceClient();

        // Potwierdź email użytkownika
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            userResult.id,
            { email_confirm: true },
        );

        if (updateError) {
            logger.error("Update user error:", updateError);
            return NextResponse.json(
                { error: "Nie udało się zweryfikować konta" },
                { status: 500 },
            );
        }

        // Usuń wykorzystany kod
        await deleteVerificationCode(verificationResult.id);

        // Pobierz pełne dane użytkownika aby wysłać welcome email
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("email", email)
            .single();

        // Wyślij email powitalny
        if (profile?.full_name) {
            try {
                await sendWelcomeEmail(email, profile.full_name);
            } catch (emailError) {
                // Nie blokuj weryfikacji jeśli email się nie wyśle
                logger.error("Welcome email error:", emailError);
            }
        }

        // Przekieruj do logowania po weryfikacji
        return NextResponse.json({
            success: true,
            message: "Email został zweryfikowany. Możesz się teraz zalogować.",
            redirect: ROUTES.LOGOWANIE,
        });
    } catch (error) {
        logger.error("Verify error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas weryfikacji" },
            { status: 500 },
        );
    }
}

export const POST = withRateLimit(
    {
        keyPrefix: "verify",
        limit: RATE_LIMITS.verify,
        errorMessage: "Zbyt wiele prób weryfikacji. Spróbuj ponownie później.",
    },
    handler,
);
