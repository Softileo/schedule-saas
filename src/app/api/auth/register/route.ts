import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
    sendVerificationCode,
    generateVerificationCode,
    sendAdminNotificationNewUser,
} from "@/lib/email/nodemailer";
import { registerApiSchema } from "@/lib/validations/auth";
import { logger } from "@/lib/utils/logger";
import { withRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";

async function handler(request: Request) {
    try {
        const body = await request.json();
        const validation = registerApiSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 },
            );
        }

        const { email, password, fullName } = validation.data;
        const supabase = await createServiceClient();

        // Sprawdź czy użytkownik już istnieje
        const { data: existingUser } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { error: "Użytkownik z tym adresem email już istnieje" },
                { status: 400 },
            );
        }

        // Utwórz użytkownika w Supabase Auth (bez automatycznego potwierdzenia)
        const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: false, // Wymagaj weryfikacji
                user_metadata: {
                    full_name: fullName,
                },
            });

        if (authError) {
            logger.error("Auth error:", authError);
            return NextResponse.json(
                { error: "Nie udało się utworzyć konta" },
                { status: 500 },
            );
        }

        // Create user profile
        if (authData.user) {
            await supabase.from("profiles").insert({
                id: authData.user.id,
                email,
                full_name: fullName,
            });
        }

        // Generate verification code (cryptographically secure)
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Remove old codes for this email
        await supabase.from("verification_codes").delete().eq("email", email);

        // Save new code
        const { error: insertCodeError } = await supabase
            .from("verification_codes")
            .insert({
                email,
                code,
                expires_at: expiresAt.toISOString(),
            });

        if (insertCodeError) {
            logger.error("Insert verification code error:", insertCodeError);
        }

        // Send email with code
        await sendVerificationCode(email, code);

        // Send admin notification
        const adminEmail = "konradwiel@interia.pl";
        try {
            // Get total user count
            const { count: totalUsers } = await supabase
                .from("profiles")
                .select("id", { count: "exact", head: true });

            const totalUsersCount = totalUsers || 0;

            // Send admin notification
            await sendAdminNotificationNewUser(
                adminEmail,
                email,
                fullName,
                totalUsersCount,
            );
        } catch (adminEmailError) {
            logger.error("Admin notification error:", adminEmailError);
            // Don't fail the registration if admin email fails
        }

        return NextResponse.json({
            success: true,
            message: "Kod weryfikacyjny został wysłany na email",
        });
    } catch (error) {
        logger.error("Register error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas rejestracji" },
            { status: 500 },
        );
    }
}

export const POST = withRateLimit(
    {
        keyPrefix: "register",
        limit: RATE_LIMITS.register,
        errorMessage: "Zbyt wiele prób rejestracji. Spróbuj ponownie później.",
    },
    handler,
);
