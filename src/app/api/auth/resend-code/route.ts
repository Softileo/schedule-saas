import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
    sendVerificationCode,
    generateVerificationCode,
} from "@/lib/email/nodemailer";
import { withRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import { logger } from "@/lib/utils/logger";

async function handler(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: "Email jest wymagany" },
                { status: 400 }
            );
        }

        const supabase = await createServiceClient();

        // Sprawdź czy użytkownik istnieje
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .single();

        if (!profile) {
            return NextResponse.json(
                { error: "Nie znaleziono użytkownika z tym adresem email" },
                { status: 400 }
            );
        }

        // Generate new secure code
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Remove old codes for this email
        await supabase.from("verification_codes").delete().eq("email", email);

        // Save new code
        await supabase.from("verification_codes").insert({
            email,
            code,
            type: "register" as const,
            expires_at: expiresAt.toISOString(),
        });

        // Send email with code
        await sendVerificationCode(email, code);

        return NextResponse.json({
            success: true,
            message: "Nowy kod został wysłany na email",
        });
    } catch (error) {
        logger.error("Resend code error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas wysyłania kodu" },
            { status: 500 }
        );
    }
}

export const POST = withRateLimit(
    {
        keyPrefix: "resend",
        limit: RATE_LIMITS.resendCode,
        errorMessage:
            "Zbyt wiele prób wysłania kodu. Spróbuj ponownie za kilka minut.",
    },
    handler
);
