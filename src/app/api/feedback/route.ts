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
                400,
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

        // Mapowanie typu na polski
        const isBug = type === "bug";
        const typeIcon = isBug ? "🐛" : "💡";
        const typeLabel = isBug ? "Zgłoszenie błędu" : "Propozycja ulepszenia";
        const typeColor = isBug ? "#f87171" : "#60a5fa";
        const typeBg = isBug ? "#fee2e2" : "#dbeafe";

        // Szablon maila
        const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #0f172a;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 24px;
        }
        .card {
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }
        .header {
            background: ${typeBg};
            padding: 24px;
            text-align: center;
        }
        .icon-circle {
            width: 64px;
            height: 64px;
            margin: 0 auto 12px;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .type-label {
            color: ${typeColor};
            font-weight: 700;
            font-size: 18px;
            margin: 0;
        }
        .content {
            padding: 32px 24px;
        }
        .field {
            margin-bottom: 24px;
        }
        .label {
            font-weight: 600;
            color: #64748b;
            font-size: 13px;
            margin-bottom: 8px;
        }
        .value {
            background: #f8fafc;
            padding: 14px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            color: #0f172a;
            font-size: 15px;
            line-height: 1.5;
        }
        .value strong {
            color: #0f172a;
        }
        .description {
            white-space: pre-wrap;
            min-height: 60px;
        }
        .footer {
            background: #f1f5f9;
            padding: 20px 24px;
            font-size: 13px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }
        .footer-item {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .footer-item:last-child {
            margin-bottom: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <div class="icon-circle">${typeIcon}</div>
                <h1 class="type-label">${typeLabel}</h1>
            </div>
            
            <div class="content">
                <div class="field">
                    <div class="label">Tytuł</div>
                    <div class="value"><strong>${title}</strong></div>
                </div>
                
                <div class="field">
                    <div class="label">Opis</div>
                    <div class="value description">${description.replace(
                        /\n/g,
                        "<br>",
                    )}</div>
                </div>
                
                <div class="field">
                    <div class="label">Zgłoszone przez</div>
                    <div class="value">${userInfo}</div>
                </div>
            </div>
            
            <div class="footer">
                <div class="footer-item">
                    📅 ${new Date().toLocaleString("pl-PL", {
                        dateStyle: "full",
                        timeStyle: "short",
                    })}
                </div>
                <div class="footer-item">
                    🌐 ${
                        request.headers.get("user-agent")?.substring(0, 80) ||
                        "Brak"
                    }
                </div>
            </div>
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
                500,
            );
        }

        return apiSuccess(null);
    } catch (error) {
        logger.error("Feedback API error:", error);
        return apiError(
            ErrorCodes.INTERNAL_ERROR,
            "Wystąpił błąd podczas wysyłania zgłoszenia",
            500,
        );
    }
}
