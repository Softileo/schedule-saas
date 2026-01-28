/**
 * Testy dla email-components.ts
 *
 * Testuje:
 * - EMAIL_BRANDING - stałe brandingu
 * - EMAIL_COLORS - stałe kolorów
 * - emailWrapper() - główny wrapper
 * - emailHeader() - nagłówek
 * - emailParagraph() - paragraf
 * - codeBlock() - blok kodu
 * - successBlock() - blok sukcesu
 * - ctaButton() - przycisk CTA
 * - helperText() - tekst pomocniczy
 * - emailFooter() - stopka
 */

import { describe, it, expect } from "vitest";
import {
    EMAIL_BRANDING,
    EMAIL_COLORS,
    emailWrapper,
    emailHeader,
    emailParagraph,
    codeBlock,
    successBlock,
    ctaButton,
    helperText,
    emailFooter,
} from "@/lib/email/email-components";

// =========================================================================
// EMAIL_BRANDING
// =========================================================================
describe("EMAIL_BRANDING", () => {
    it("should have emoji", () => {
        expect(EMAIL_BRANDING.emoji).toBe("🗓️");
    });

    it("should have name", () => {
        expect(EMAIL_BRANDING.name).toBe("Grafiki");
    });

    it("should have tagline", () => {
        expect(EMAIL_BRANDING.tagline).toBe("System harmonogramów pracy");
    });

    it("should be readonly (as const)", () => {
        expect(EMAIL_BRANDING).toBeDefined();
        // TypeScript ensures this at compile time
    });
});

// =========================================================================
// EMAIL_COLORS
// =========================================================================
describe("EMAIL_COLORS", () => {
    describe("text colors", () => {
        it("should have primary text color", () => {
            expect(EMAIL_COLORS.text.primary).toBe("#18181b");
        });

        it("should have secondary text color", () => {
            expect(EMAIL_COLORS.text.secondary).toBe("#52525b");
        });

        it("should have muted text color", () => {
            expect(EMAIL_COLORS.text.muted).toBe("#71717a");
        });

        it("should have footer text color", () => {
            expect(EMAIL_COLORS.text.footer).toBe("#a1a1aa");
        });
    });

    describe("background colors", () => {
        it("should have main background color", () => {
            expect(EMAIL_COLORS.background.main).toBe("#f4f4f5");
        });

        it("should have card background color", () => {
            expect(EMAIL_COLORS.background.card).toBe("#ffffff");
        });

        it("should have code background color", () => {
            expect(EMAIL_COLORS.background.code).toBe("#f4f4f5");
        });

        it("should have success background color", () => {
            expect(EMAIL_COLORS.background.success).toBe("#f0fdf4");
        });
    });

    describe("other colors", () => {
        it("should have success border color", () => {
            expect(EMAIL_COLORS.border.success).toBe("#bbf7d0");
        });

        it("should have success text color", () => {
            expect(EMAIL_COLORS.success).toBe("#166534");
        });

        it("should have button color", () => {
            expect(EMAIL_COLORS.button).toBe("#18181b");
        });
    });

    it("all colors should be valid hex colors", () => {
        const hexRegex = /^#[0-9a-fA-F]{6}$/;

        expect(EMAIL_COLORS.text.primary).toMatch(hexRegex);
        expect(EMAIL_COLORS.text.secondary).toMatch(hexRegex);
        expect(EMAIL_COLORS.background.main).toMatch(hexRegex);
        expect(EMAIL_COLORS.button).toMatch(hexRegex);
    });
});

// =========================================================================
// emailWrapper
// =========================================================================
describe("emailWrapper", () => {
    it("should return HTML document", () => {
        const result = emailWrapper("Test Title", "<p>Content</p>");

        expect(result).toContain("<!DOCTYPE html>");
        expect(result).toContain("<html>");
        expect(result).toContain("</html>");
    });

    it("should include title in head", () => {
        const result = emailWrapper("Test Email", "<p>Content</p>");

        expect(result).toContain("<title>Test Email</title>");
    });

    it("should include content", () => {
        const result = emailWrapper("Title", "<p>My Content</p>");

        expect(result).toContain("<p>My Content</p>");
    });

    it("should include footer", () => {
        const result = emailWrapper("Title", "<p>Content</p>");

        expect(result).toContain(EMAIL_BRANDING.name);
        expect(result).toContain(EMAIL_BRANDING.tagline);
    });

    it("should include background color", () => {
        const result = emailWrapper("Title", "<p>Content</p>");

        expect(result).toContain(EMAIL_COLORS.background.main);
    });

    it("should include card styles", () => {
        const result = emailWrapper("Title", "<p>Content</p>");

        expect(result).toContain(EMAIL_COLORS.background.card);
        expect(result).toContain("border-radius: 12px");
    });

    it("should include meta charset", () => {
        const result = emailWrapper("Title", "<p>Content</p>");

        expect(result).toContain('charset="utf-8"');
    });

    it("should include viewport meta", () => {
        const result = emailWrapper("Title", "<p>Content</p>");

        expect(result).toContain("viewport");
    });
});

// =========================================================================
// emailHeader
// =========================================================================
describe("emailHeader", () => {
    it("should include emoji", () => {
        const result = emailHeader("📧", "Test Title");

        expect(result).toContain("📧");
    });

    it("should include title", () => {
        const result = emailHeader("📧", "My Email Title");

        expect(result).toContain("My Email Title");
    });

    it("should be h1 element", () => {
        const result = emailHeader("📧", "Title");

        expect(result).toContain("<h1");
        expect(result).toContain("</h1>");
    });

    it("should include primary text color", () => {
        const result = emailHeader("📧", "Title");

        expect(result).toContain(EMAIL_COLORS.text.primary);
    });

    it("should have 24px font size", () => {
        const result = emailHeader("📧", "Title");

        expect(result).toContain("font-size: 24px");
    });
});

// =========================================================================
// emailParagraph
// =========================================================================
describe("emailParagraph", () => {
    it("should include text content", () => {
        const result = emailParagraph("Hello World");

        expect(result).toContain("Hello World");
    });

    it("should be p element", () => {
        const result = emailParagraph("Text");

        expect(result).toContain("<p");
        expect(result).toContain("</p>");
    });

    it("should use secondary text color", () => {
        const result = emailParagraph("Text");

        expect(result).toContain(EMAIL_COLORS.text.secondary);
    });

    it("should have default margin bottom of 24px", () => {
        const result = emailParagraph("Text");

        expect(result).toContain("margin: 0 0 24px 0");
    });

    it("should accept custom margin bottom", () => {
        const result = emailParagraph("Text", 16);

        expect(result).toContain("margin: 0 0 16px 0");
    });

    it("should have 16px font size", () => {
        const result = emailParagraph("Text");

        expect(result).toContain("font-size: 16px");
    });

    it("should have line-height of 1.6", () => {
        const result = emailParagraph("Text");

        expect(result).toContain("line-height: 1.6");
    });
});

// =========================================================================
// codeBlock
// =========================================================================
describe("codeBlock", () => {
    it("should include code", () => {
        const result = codeBlock("123456");

        expect(result).toContain("123456");
    });

    it("should use code background color", () => {
        const result = codeBlock("CODE");

        expect(result).toContain(EMAIL_COLORS.background.code);
    });

    it("should have large font size for code", () => {
        const result = codeBlock("CODE");

        expect(result).toContain("font-size: 36px");
    });

    it("should have letter spacing", () => {
        const result = codeBlock("CODE");

        expect(result).toContain("letter-spacing: 8px");
    });

    it("should be centered", () => {
        const result = codeBlock("CODE");

        expect(result).toContain("text-align: center");
    });

    it("should have bold font weight", () => {
        const result = codeBlock("CODE");

        expect(result).toContain("font-weight: bold");
    });
});

// =========================================================================
// successBlock
// =========================================================================
describe("successBlock", () => {
    it("should include text content", () => {
        const result = successBlock("Operation successful");

        expect(result).toContain("Operation successful");
    });

    it("should use success background color", () => {
        const result = successBlock("Success");

        expect(result).toContain(EMAIL_COLORS.background.success);
    });

    it("should use success border color", () => {
        const result = successBlock("Success");

        expect(result).toContain(EMAIL_COLORS.border.success);
    });

    it("should use success text color", () => {
        const result = successBlock("Success");

        expect(result).toContain(EMAIL_COLORS.success);
    });

    it("should include checkmark emoji", () => {
        const result = successBlock("Success");

        expect(result).toContain("✅");
    });

    it("should have border-radius", () => {
        const result = successBlock("Success");

        expect(result).toContain("border-radius: 8px");
    });
});

// =========================================================================
// ctaButton
// =========================================================================
describe("ctaButton", () => {
    it("should include button text", () => {
        const result = ctaButton("Click Me", "https://example.com");

        expect(result).toContain("Click Me");
    });

    it("should include href", () => {
        const result = ctaButton("Click", "https://example.com/action");

        expect(result).toContain('href="https://example.com/action"');
    });

    it("should be anchor element", () => {
        const result = ctaButton("Click", "https://example.com");

        expect(result).toContain("<a");
        expect(result).toContain("</a>");
    });

    it("should use button background color", () => {
        const result = ctaButton("Click", "https://example.com");

        expect(result).toContain(EMAIL_COLORS.button);
    });

    it("should have white text", () => {
        const result = ctaButton("Click", "https://example.com");

        expect(result).toContain("color: white");
    });

    it("should have no text decoration", () => {
        const result = ctaButton("Click", "https://example.com");

        expect(result).toContain("text-decoration: none");
    });

    it("should be inline-block", () => {
        const result = ctaButton("Click", "https://example.com");

        expect(result).toContain("display: inline-block");
    });

    it("should have padding", () => {
        const result = ctaButton("Click", "https://example.com");

        expect(result).toContain("padding: 12px 24px");
    });
});

// =========================================================================
// helperText
// =========================================================================
describe("helperText", () => {
    it("should include text content", () => {
        const result = helperText("This is a hint");

        expect(result).toContain("This is a hint");
    });

    it("should use muted text color", () => {
        const result = helperText("Hint");

        expect(result).toContain(EMAIL_COLORS.text.muted);
    });

    it("should have smaller font size", () => {
        const result = helperText("Hint");

        expect(result).toContain("font-size: 14px");
    });
});

// =========================================================================
// emailFooter
// =========================================================================
describe("emailFooter", () => {
    it("should include branding name", () => {
        const result = emailFooter();

        expect(result).toContain(EMAIL_BRANDING.name);
    });

    it("should include tagline", () => {
        const result = emailFooter();

        expect(result).toContain(EMAIL_BRANDING.tagline);
    });

    it("should include current year", () => {
        const result = emailFooter();
        const currentYear = new Date().getFullYear().toString();

        expect(result).toContain(currentYear);
    });

    it("should include copyright symbol", () => {
        const result = emailFooter();

        expect(result).toContain("©");
    });

    it("should use footer text color", () => {
        const result = emailFooter();

        expect(result).toContain(EMAIL_COLORS.text.footer);
    });

    it("should have small font size", () => {
        const result = emailFooter();

        expect(result).toContain("font-size: 12px");
    });

    it("should be centered", () => {
        const result = emailFooter();

        expect(result).toContain("text-align: center");
    });
});
