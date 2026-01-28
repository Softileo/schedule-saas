/**
 * Email Components
 *
 * Reusable email template components.
 * Centralizes common email HTML patterns.
 */

// Stałe brandingu
export const EMAIL_BRANDING = {
    emoji: "🗓️",
    name: "Grafiki",
    tagline: "System harmonogramów pracy",
} as const;

// Stałe kolorów
export const EMAIL_COLORS = {
    text: {
        primary: "#18181b",
        secondary: "#52525b",
        muted: "#71717a",
        footer: "#a1a1aa",
    },
    background: {
        main: "#f4f4f5",
        card: "#ffffff",
        code: "#f4f4f5",
        success: "#f0fdf4",
    },
    border: {
        success: "#bbf7d0",
    },
    success: "#166534",
    button: "#18181b",
} as const;

/**
 * Wrapper dla wszystkich emaili - nagłówek i stopka
 */
export function emailWrapper(title: string, content: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${
        EMAIL_COLORS.background.main
    };">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td>
            <div style="background-color: ${
                EMAIL_COLORS.background.card
            }; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              ${content}
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Stopka emaila
 */
export function emailFooter(): string {
    return `
    <p style="color: ${
        EMAIL_COLORS.text.footer
    }; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
      © ${new Date().getFullYear()} ${EMAIL_BRANDING.name} - ${
        EMAIL_BRANDING.tagline
    }
    </p>
  `;
}

/**
 * Nagłówek emaila z tytułem
 */
export function emailHeader(emoji: string, title: string): string {
    return `
    <h1 style="color: ${EMAIL_COLORS.text.primary}; font-size: 24px; margin: 0 0 16px 0;">
      ${emoji} ${title}
    </h1>
  `;
}

/**
 * Paragraf tekstu
 */
export function emailParagraph(
    text: string,
    marginBottom: number = 24
): string {
    return `
    <p style="color: ${EMAIL_COLORS.text.secondary}; font-size: 16px; line-height: 1.6; margin: 0 0 ${marginBottom}px 0;">
      ${text}
    </p>
  `;
}

/**
 * Blok z kodem weryfikacyjnym
 */
export function codeBlock(code: string): string {
    return `
    <div style="background-color: ${EMAIL_COLORS.background.code}; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${EMAIL_COLORS.text.primary};">
        ${code}
      </span>
    </div>
  `;
}

/**
 * Blok sukcesu (zielone tło)
 */
export function successBlock(text: string): string {
    return `
    <div style="background-color: ${EMAIL_COLORS.background.success}; border: 1px solid ${EMAIL_COLORS.border.success}; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="color: ${EMAIL_COLORS.success}; font-size: 14px; margin: 0;">
        ✅ ${text}
      </p>
    </div>
  `;
}

/**
 * Przycisk CTA
 */
export function ctaButton(text: string, href: string): string {
    return `
    <a href="${href}" style="display: inline-block; background-color: ${EMAIL_COLORS.button}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
      ${text}
    </a>
  `;
}

/**
 * Tekst pomocniczy (mniejszy, wyciszony)
 */
export function helperText(text: string): string {
    return `
    <p style="color: ${EMAIL_COLORS.text.muted}; font-size: 14px; line-height: 1.6; margin: 0;">
      ${text}
    </p>
  `;
}
