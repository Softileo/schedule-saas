import { sendEmail } from "@/lib/email/nodemailer";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api/response";

const FEEDBACK_EMAIL = "konradwiel@interia.pl";

interface FeedbackRequest {
    type: "bug" | "suggestion";
    title: string;
    description: string;
    priority?: "low" | "medium" | "high";
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const body: FeedbackRequest = await request.json();
        const { type, title, description, priority = "medium" } = body;

        // Walidacja
        if (!type || !title || !description) {
            return apiError(
                ErrorCodes.INVALID_INPUT,
                "Wszystkie pola są wymagane",
                400
            );
        }

        // Pobierz dane użytkownika
        let userInfo = "Użytkownik niezalogowany";
        let userEmail = "Brak";

        if (user) {
            userEmail = user.email || "Brak";
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", user.id)
                .single();

            if (profile && profile.full_name) {
                userInfo = `${profile.full_name} (${userEmail})`;
            } else {
                userInfo = userEmail;
            }
        }

        // Mapowanie typu i priorytetu na polski
        const typeLabel =
            type === "bug" ? "🐛 Zgłoszenie błędu" : "💡 Propozycja ulepszenia";
        const priorityLabels = {
            low: "🟢 Niski",
            medium: "🟡 Średni",
            high: "🔴 Wysoki",
        };
        const priorityLabel = priorityLabels[priority];

        // Szablon maila
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; }
        .field { margin-bottom: 16px; }
        .label { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
        .value { background: white; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .description { white-space: pre-wrap; }
        .meta { background: #f1f5f9; padding: 16px; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748b; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .badge-bug { background: #fee2e2; color: #dc2626; }
        .badge-suggestion { background: #dbeafe; color: #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${typeLabel}</h1>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">Tytuł</div>
                <div class="value"><strong>${title}</strong></div>
            </div>
            <div class="field">
                <div class="label">Priorytet</div>
                <div class="value">${priorityLabel}</div>
            </div>
            <div class="field">
                <div class="label">Opis</div>
                <div class="value description">${description.replace(
                    /\n/g,
                    "<br>"
                )}</div>
            </div>
            <div class="field">
                <div class="label">Zgłoszone przez</div>
                <div class="value">${userInfo}</div>
            </div>
        </div>
        <div class="meta">
            <div>📅 Data: ${new Date().toLocaleString("pl-PL", {
                dateStyle: "full",
                timeStyle: "short",
            })}</div>
            <div>🌐 User Agent: ${
                request.headers.get("user-agent")?.substring(0, 100) || "Brak"
            }</div>
        </div>
    </div>
</body>
</html>
        `;

        // Wyślij email
        const result = await sendEmail({
            to: FEEDBACK_EMAIL,
            subject: `[Grafiki.app] ${
                type === "bug" ? "Bug" : "Sugestia"
            }: ${title}`,
            html,
        });

        if (!result.success) {
            logger.error("Failed to send feedback email:", result.error);
            return apiError(
                ErrorCodes.INTERNAL_ERROR,
                "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.",
                500
            );
        }

        return apiSuccess(null);
    } catch (error) {
        logger.error("Feedback API error:", error);
        return apiError(
            ErrorCodes.INTERNAL_ERROR,
            "Wystąpił błąd podczas wysyłania zgłoszenia",
            500
        );
    }
}
