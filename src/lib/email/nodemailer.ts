import nodemailer from "nodemailer";
import { randomInt } from "crypto";
import { LOGO_NAME, LOGO_TAGLINE } from "@/components/ui/logo";
import { logger } from "@/lib/utils/logger";
import { emailLayout } from "./email-template";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

interface SendEmailResult {
    success: boolean;
    error?: unknown;
}

export async function sendEmail({
    to,
    subject,
    html,
}: SendEmailOptions): Promise<SendEmailResult> {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html,
        });
        return { success: true };
    } catch (error) {
        logger.error("Email send error:", error);
        return { success: false, error };
    }
}

/**
 * Generates a cryptographically secure 6-digit verification code
 * Uses crypto.randomInt instead of Math.random() for security
 */
export function generateVerificationCode(): string {
    return randomInt(100000, 999999).toString();
}

export async function sendGoogleLoginAttemptNotification({
    timestamp,
    userAgent,
}: {
    timestamp: string;
    userAgent: string;
}) {
    const subject = `Próba logowania Google – ${LOGO_NAME}`;

    const html = emailLayout({
        title: "Próba logowania przez Google OAuth",
        theme: "amber",
        hero: `
            <div class="hero-circle">
                <div class="hero-inner">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="64" />
                </div>
            </div>
        `,
        sections: `
            <div class="section">
                <div class="label">Data</div>
                <div class="value">${new Date(timestamp).toLocaleString("pl-PL")}</div>
            </div>
            <div class="section">
                <div class="label">User-Agent</div>
                <div class="value">${userAgent}</div>
            </div>
        `,
    });

    return sendEmail({
        to: "konradwiel@interia.pl",
        subject,
        html,
    });
}

export async function sendVerificationCode(email: string, code: string) {
    const subject = `Kod weryfikacyjny - ${LOGO_NAME}`;
    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<style>
  body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; }
  .container { max-width: 600px; margin: 0 auto; padding: 24px; }
  .card { background: #ffffff; border-radius: 16px; padding: 32px 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; }
  .hero-circle { width: 120px; height: 120px; margin: 0 auto 20px; border-radius: 9999px; background: linear-gradient(135deg, #6366f1, #4f46e5); display: flex; align-items: center; justify-content: center; box-shadow: 0 15px 30px rgba(79, 70, 229, 0.2); }
  .code-box { font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #4f46e5; background: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px dashed #cbd5e1; }
  .hero-title { font-size: 22px; font-weight: 700; margin: 0; color: #1e293b; }
  .text { color: #64748b; font-size: 15px; line-height: 1.6; margin-top: 12px; }
  .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="hero-circle">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4-4-4"></path><path d="M3 3h18c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2Z"></path><path d="m2 7 8 7.5 3-2.5"></path></svg>
      </div>
      <h1 class="hero-title">Weryfikacja adresu email</h1>
      <p class="text">Użyj poniższego kodu, aby dokończyć proces rejestracji. Kod jest ważny przez 15 minut.</p>
      <div class="code-box">${code}</div>
      <p class="text" style="font-size: 13px;">Jeśli to nie Ty zakładałeś konto, po prostu zignoruj tę wiadomość.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} ${LOGO_NAME} · ${LOGO_TAGLINE}</div>
  </div>
</body>
</html>`;
    return sendEmail({ to: email, subject, html });
}

export async function sendPasswordResetCode(email: string, code: string) {
    const subject = `Reset hasła - ${LOGO_NAME}`;
    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<style>
  body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; }
  .container { max-width: 600px; margin: 0 auto; padding: 24px; }
  .card { background: #ffffff; border-radius: 16px; padding: 32px 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; }
  .hero-circle { width: 120px; height: 120px; margin: 0 auto 20px; border-radius: 9999px; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; box-shadow: 0 15px 30px rgba(217, 119, 6, 0.2); }
  .code-box { font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #d97706; background: #fffbeb; padding: 24px; border-radius: 12px; margin: 24px 0; border: 2px solid #fef3c7; }
  .warning-box { background: #fff1f2; border-left: 4px solid #e11d48; padding: 16px; text-align: left; margin-top: 24px; border-radius: 4px; }
  .hero-title { font-size: 22px; font-weight: 700; margin: 0; }
  .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="hero-circle">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      </div>
      <h1 class="hero-title">Resetowanie hasła</h1>
      <p style="color: #64748b;">Otrzymaliśmy prośbę o zmianę hasła. Wprowadź poniższy kod w aplikacji:</p>
      <div class="code-box">${code}</div>
      <div class="warning-box">
        <p style="margin: 0; font-size: 13px; color: #9f1239; font-weight: 600;">⚠️ Uwaga dotycząca bezpieczeństwa</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #be123c;">Jeśli to nie Ty prosiłeś o reset hasła, zignoruj tę wiadomość i natychmiast zaloguj się do konta, aby sprawdzić jego bezpieczeństwo.</p>
      </div>
    </div>
    <div class="footer">© ${new Date().getFullYear()} ${LOGO_NAME} · ${LOGO_TAGLINE}</div>
  </div>
</body>
</html>`;
    return sendEmail({ to: email, subject, html });
}

export async function sendScheduleNotification(
    email: string,
    employeeName: string,
    organizationName: string,
    month: string,
    year: number,
) {
    const subject = `Nowy grafik - ${month} ${year}`;
    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<style>
  body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; padding: 24px; }
  .card { background: #ffffff; border-radius: 16px; padding: 32px 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
  .hero-circle { width: 100px; height: 100px; margin: 0 auto 24px; border-radius: 9999px; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; }
  .info-row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f1f5f9; }
  .label { color: #64748b; font-size: 13px; }
  .value { font-weight: 600; color: #0f172a; font-size: 14px; }
  .btn { display: block; text-align: center; background: #059669; color: white; padding: 14px; border-radius: 10px; text-decoration: none; font-weight: 700; margin-top: 24px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); }
  .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="hero-circle">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
      </div>
      <h2 style="text-align: center; margin: 0 0 8px 0;">Cześć ${employeeName}!</h2>
      <p style="text-align: center; color: #64748b; margin-bottom: 24px;">Twój nowy grafik pracy jest już dostępny.</p>
      
      <div class="info-row"><span class="label">Organizacja</span><span class="value">${organizationName}</span></div>
      <div class="info-row"><span class="label">Okres</span><span class="value">${month} ${year}</span></div>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/panel" class="btn">Sprawdź grafik w aplikacji</a>
    </div>
    <div class="footer">© ${new Date().getFullYear()} ${LOGO_NAME} · ${LOGO_TAGLINE}</div>
  </div>
</body>
</html>`;
    return sendEmail({ to: email, subject, html });
}

export async function sendWelcomeEmail(email: string, fullName: string) {
    const subject = `Witamy w ${LOGO_NAME}! 🎉`;
    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<style>
  body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; padding: 24px; }
  .card { background: #ffffff; border-radius: 24px; padding: 40px 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.06); }
  .badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
  .feature-item { display: flex; align-items: flex-start; margin-bottom: 20px; }
  .feature-icon { background: #f1f5f9; padding: 10px; border-radius: 12px; margin-right: 16px; font-size: 20px; }
  .btn { display: block; text-align: center; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 700; margin-top: 32px; }
  .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="badge">REJESTRACJA POMYŚLNA</div>
      <h1 style="margin: 0; font-size: 26px;">Witaj w ${LOGO_NAME}, ${fullName.split(" ")[0]}! 🎉</h1>
      <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin-top: 16px;">Twoje konto zostało zweryfikowane. Jesteśmy gotowi, by pomóc Ci przejąć kontrolę nad grafikami pracy.</p>
      
      <div style="margin-top: 32px;">
        <div class="feature-item">
          <div class="feature-icon">📅</div>
          <div><b style="font-size: 15px;">Inteligentne Grafiki</b><br/><span style="font-size: 13px; color: #64748b;">Twórz harmonogramy w kilka sekund z pomocą AI.</span></div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">👥</div>
          <div><b style="font-size: 15px;">Zarządzanie Zespołem</b><br/><span style="font-size: 13px; color: #64748b;">Wszystkie urlopy i dane pracowników w jednym miejscu.</span></div>
        </div>
      </div>

      <a style="color: #ffffff;" href="${process.env.NEXT_PUBLIC_APP_URL || "https://calenda.pl"}/logowanie" class="btn">Zacznij korzystać teraz</a>
    </div>
    <div class="footer">© ${new Date().getFullYear()} ${LOGO_NAME} · ${LOGO_TAGLINE}</div>
  </div>
</body>
</html>`;
    return sendEmail({ to: email, subject, html });
}

export async function sendAdminNotificationNewUser(
    adminEmail: string,
    newUserEmail: string,
    newUserName: string,
    totalUsersCount: number,
) {
    const subject = `🎉 Nowy użytkownik ${LOGO_NAME}`;

    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<style>
  body {
    margin: 0;
    padding: 0;
    background: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
    padding: 32px 24px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    position: relative;
    overflow: hidden;
  }

  /* Konfetti */
  .confetti {
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle, #22c55e 2px, transparent 2px),
      radial-gradient(circle, #4ade80 2px, transparent 2px),
      radial-gradient(circle, #86efac 2px, transparent 2px);
    background-size: 40px 40px, 55px 55px, 70px 70px;
    background-position: 0 0, 20px 30px, 10px 50px;
    opacity: 0.15;
    pointer-events: none;
  }

  .hero {
    position: relative;
    text-align: center;
    margin-bottom: 32px;
  }

  .users-circle {
    width: 180px;
    height: 180px;
    margin: 0 auto 16px;
    border-radius: 9999px;
    background: linear-gradient(135deg, #22c55e, #16a34a);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 20px 40px rgba(22,163,74,0.35);
  }

  .users-circle-inner {
    width: 140px;
    height: 140px;
    border-radius: 9999px;
    background: #15803d;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .users-count {
    font-size: 56px;
    font-weight: 800;
    color: #ffffff;
    line-height: 1;
  }

  .hero-title {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
  }

  .section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
  }

  .label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
  }

  .value {
    font-size: 15px;
    font-weight: 600;
    margin-top: 4px;
  }

  .footer {
    text-align: center;
    margin-top: 32px;
    font-size: 12px;
    color: #64748b;
  }
</style>
</head>

<body>
  <div class="container">
    <div class="card">
      <div class="confetti"></div>

      <div class="hero">
        <div class="users-circle">
          <div class="users-circle-inner">
            <div class="users-count">${totalUsersCount}</div>
          </div>
        </div>

        <p class="hero-title">
          Aplikacja <strong>Calenda</strong> ma już ${totalUsersCount} użytkowników
        </p>
      </div>

      <div class="section">
        <div class="label">Nowy użytkownik</div>
        <div class="value">${newUserName}</div>
      </div>

      <div class="section">
        <div class="label">Email</div>
        <div class="value">${newUserEmail}</div>
      </div>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} ${LOGO_NAME} · ${LOGO_TAGLINE}
    </div>
  </div>
</body>
</html>
`;

    return sendEmail({
        to: adminEmail,
        subject,
        html,
    });
}
