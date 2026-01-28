import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendScheduleNotification } from "@/lib/email/nodemailer";
import { MONTH_NAMES } from "@/lib/utils/date-helpers";
import { logger } from "@/lib/utils/logger";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { scheduleId } = body;

        if (!scheduleId) {
            return NextResponse.json(
                { error: "scheduleId jest wymagany" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // AUTH: Sprawdź czy użytkownik jest zalogowany
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json(
                { error: "Brak autoryzacji" },
                { status: 401 }
            );
        }

        // Pobierz grafik z organizacją
        const { data: schedule, error: scheduleError } = await supabase
            .from("schedules")
            .select(
                `
        *,
        organization:organizations (
          id,
          name
        )
      `
            )
            .eq("id", scheduleId)
            .single();

        if (scheduleError || !schedule) {
            return NextResponse.json(
                { error: "Nie znaleziono grafiku" },
                { status: 404 }
            );
        }

        // SECURITY: Sprawdź czy użytkownik ma dostęp do organizacji grafiku
        const organizationId = (schedule.organization as { id: string }).id;
        const { data: membership } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .eq("organization_id", organizationId)
            .single();

        if (!membership) {
            return NextResponse.json(
                { error: "Brak dostępu do tej organizacji" },
                { status: 403 }
            );
        }

        // Pobierz pracowników z emailami dla tej organizacji
        const { data: employees } = await supabase
            .from("employees")
            .select("id, first_name, last_name, email")
            .eq("organization_id", (schedule.organization as { id: string }).id)
            .eq("is_active", true)
            .not("email", "is", null);

        if (!employees || employees.length === 0) {
            return NextResponse.json({
                success: true,
                message: "Brak pracowników z adresami email",
                sent: 0,
            });
        }

        // Oznacz grafik jako opublikowany
        await supabase
            .from("schedules")
            .update({
                is_published: true,
                published_at: new Date().toISOString(),
            })
            .eq("id", scheduleId);

        // Wyślij powiadomienia
        const monthName = MONTH_NAMES[schedule.month - 1];
        const organizationName = (schedule.organization as { name: string })
            .name;
        let sentCount = 0;

        for (const employee of employees) {
            if (employee.email) {
                const result = await sendScheduleNotification(
                    employee.email,
                    `${employee.first_name} ${employee.last_name}`,
                    organizationName,
                    monthName,
                    schedule.year
                );

                if (result.success) {
                    sentCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Wysłano ${sentCount} powiadomień`,
            sent: sentCount,
            total: employees.length,
        });
    } catch (error) {
        logger.error("Error sending notifications:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas wysyłania powiadomień" },
            { status: 500 }
        );
    }
}
