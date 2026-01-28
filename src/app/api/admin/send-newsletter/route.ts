import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/nodemailer";
import { LOGO_NAME, LOGO_TAGLINE } from "@/components/ui/logo";
import { logger } from "@/lib/utils/logger";

interface Recipient {
    email: string;
    name: string | null;
}

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient();

        // Sprawdź czy użytkownik jest zalogowany
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { campaignId, subject, content, recipients } = body;

        if (!campaignId || !subject || !content || !recipients) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Wyślij emaile do wszystkich odbiorców
        const sendPromises = (recipients as Recipient[]).map(
            async (recipient) => {
                const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px; color: white; }
              .header h1 { margin: 0; font-size: 32px; }
              .content { background: #ffffff; padding: 30px; border-radius: 12px; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
              .unsubscribe { text-align: center; margin-top: 20px; }
              .unsubscribe a { color: #666; font-size: 11px; text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${LOGO_NAME}</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${LOGO_TAGLINE}</p>
              </div>
              <div class="content">
                ${
                    recipient.name
                        ? `<p>Cześć ${recipient.name}!</p>`
                        : "<p>Cześć!</p>"
                }
                ${content}
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${LOGO_NAME} - ${LOGO_TAGLINE}</p>
              </div>
              <div class="unsubscribe">
                <p><a href="${
                    process.env.NEXT_PUBLIC_APP_URL || "https://grafiki.pl"
                }/newsletter/unsubscribe?email=${encodeURIComponent(
                    recipient.email
                )}">Wypisz się z newslettera</a></p>
              </div>
            </div>
          </body>
          </html>
        `;

                return sendEmail({
                    to: recipient.email,
                    subject,
                    html,
                });
            }
        );

        // Czekaj na wysłanie wszystkich emaili
        const results = await Promise.allSettled(sendPromises);

        // Policz sukcesy i błędy
        const successful = results.filter(
            (r) => r.status === "fulfilled" && r.value.success
        ).length;
        const failed = results.length - successful;

        logger.info(
            `Newsletter sent: ${successful} successful, ${failed} failed`
        );

        return NextResponse.json({
            success: true,
            sent: successful,
            failed,
        });
    } catch (error) {
        logger.error("Send newsletter error:", error);
        return NextResponse.json(
            { error: "Failed to send newsletter" },
            { status: 500 }
        );
    }
}
