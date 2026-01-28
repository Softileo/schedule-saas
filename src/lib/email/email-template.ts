import { LOGO_NAME, LOGO_TAGLINE } from "@/components/ui/logo";

const themes = {
    green: {
        gradient: "linear-gradient(135deg, #22c55e, #16a34a)",
        shadow: "rgba(22,163,74,0.35)",
        accent: "#15803d",
        soft: "#dcfce7",
    },
    indigo: {
        gradient: "linear-gradient(135deg, #4f46e5, #6366f1)",
        shadow: "rgba(79,70,229,0.3)",
        accent: "#4338ca",
        soft: "#e0e7ff",
    },
    amber: {
        gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
        shadow: "rgba(217,119,6,0.35)",
        accent: "#b45309",
        soft: "#fffbeb",
    },
};

export function emailLayout({
    title,
    hero,
    sections,
    theme = "indigo",
}: {
    title: string;
    hero: string;
    sections: string;
    theme?: keyof typeof themes;
}) {
    const t = themes[theme];

    return `
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
    border-radius: 20px;
    padding: 36px 28px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    position: relative;
    overflow: hidden;
}
.confetti {
    position: absolute;
    inset: 0;
    background-image:
        radial-gradient(circle, ${t.soft} 2px, transparent 2px),
        radial-gradient(circle, ${t.accent} 2px, transparent 2px);
    background-size: 40px 40px, 70px 70px;
    opacity: 0.15;
}
.hero {
    text-align: center;
    margin-bottom: 32px;
    position: relative;
}
.hero-circle {
    width: 180px;
    height: 180px;
    margin: 0 auto 16px;
    border-radius: 9999px;
    background: ${t.gradient};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 20px 40px ${t.shadow};
}
.hero-inner {
    width: 140px;
    height: 140px;
    border-radius: 9999px;
    background: ${t.accent};
    display: flex;
    align-items: center;
    justify-content: center;
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
    word-break: break-word;
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
            ${hero}
            <p class="hero-title">${title}</p>
        </div>

        ${sections}
    </div>

    <div class="footer">
        © ${new Date().getFullYear()} ${LOGO_NAME} · ${LOGO_TAGLINE}
    </div>
</div>
</body>
</html>
`;
}
