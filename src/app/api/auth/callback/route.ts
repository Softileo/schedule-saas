import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ROUTES } from "@/lib/constants/routes";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? ROUTES.PANEL;

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Sprawdź czy użytkownik ma profil, jeśli nie - utwórz
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("id", user.id)
                    .single();

                if (!profile) {
                    await supabase.from("profiles").insert({
                        id: user.id,
                        email: user.email!,
                        full_name:
                            user.user_metadata.full_name ||
                            user.user_metadata.name,
                        avatar_url: user.user_metadata.avatar_url,
                    });
                    // Wyślij powiadomienie do admina o nowym użytkowniku (Google OAuth)
                    try {
                        const { count: totalUsers } = await supabase
                            .from("profiles")
                            .select("id", { count: "exact", head: true });
                        const totalUsersCount = totalUsers || 0;
                        // Import funkcji mailowej dynamicznie (unikanie problemów z SSR)
                        const { sendAdminNotificationNewUser } =
                            await import("@/lib/email/nodemailer");
                        await sendAdminNotificationNewUser(
                            "konradwiel@interia.pl",
                            user.email!,
                            user.user_metadata.full_name ||
                                user.user_metadata.name ||
                                user.email!,
                            totalUsersCount,
                        );
                    } catch (adminEmailError) {
                        // Loguj błąd, nie przerywaj logiki
                        if (typeof console !== "undefined") {
                            console.error(
                                "Admin notification error (OAuth):",
                                adminEmailError,
                            );
                        }
                    }
                }
            }

            const forwardedHost = request.headers.get("x-forwarded-host");
            const isLocalEnv = process.env.NODE_ENV === "development";

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }
    }

    return NextResponse.redirect(
        `${origin}/logowanie?error=auth_callback_error`,
    );
}
