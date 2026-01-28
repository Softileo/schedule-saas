/**
 * Email Templates
 *
 * Wykorzystuje email-components dla spójnego wyglądu.
 */

import {
    EMAIL_BRANDING,
    emailWrapper,
    emailHeader,
    emailParagraph,
    codeBlock,
    successBlock,
    ctaButton,
    helperText,
} from "./email-components";

export function verificationEmailTemplate(code: string, name?: string): string {
    const greeting = name ? `Cześć ${name}!` : "Cześć!";

    const content = `
    ${emailHeader(
        EMAIL_BRANDING.emoji,
        `${EMAIL_BRANDING.name} - Weryfikacja konta`
    )}
    ${emailParagraph(`${greeting} Oto Twój kod weryfikacyjny:`)}
    ${codeBlock(code)}
    ${helperText(
        "Kod jest ważny przez 15 minut. Jeśli nie prosiłeś o ten kod, zignoruj tę wiadomość."
    )}
  `;

    return emailWrapper("Kod weryfikacyjny", content);
}

export function schedulePublishedTemplate(
    employeeName: string,
    month: string,
    year: number,
    organizationName: string
): string {
    const content = `
    ${emailHeader("📅", "Nowy grafik został opublikowany!")}
    ${emailParagraph(`Cześć ${employeeName}!`)}
    ${emailParagraph(
        `Grafik pracy na <strong>${month} ${year}</strong> w organizacji <strong>${organizationName}</strong> został właśnie opublikowany.`
    )}
    ${successBlock(
        "Zaloguj się do aplikacji, aby zobaczyć swój harmonogram pracy."
    )}
    ${ctaButton("Zobacz grafik", `${process.env.NEXT_PUBLIC_APP_URL}/grafik`)}
  `;

    return emailWrapper("Nowy grafik", content);
}

export function passwordResetTemplate(code: string): string {
    const content = `
    ${emailHeader("🔐", "Reset hasła")}
    ${emailParagraph(
        "Otrzymaliśmy prośbę o reset hasła. Użyj poniższego kodu:"
    )}
    ${codeBlock(code)}
    ${helperText(
        "Kod jest ważny przez 15 minut. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość."
    )}
  `;

    return emailWrapper("Reset hasła", content);
}
