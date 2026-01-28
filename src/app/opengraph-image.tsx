import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Grafik Pracy Online - Calenda";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 128,
                    background: "white",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background:
                            "linear-gradient(to bottom right, #eff6ff, #ffffff)",
                        zIndex: -1,
                    }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                    {/* Simple Logo Placeholder or similar */}
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            background: "#2563eb",
                            borderRadius: 16,
                        }}
                    />
                    <div
                        style={{
                            fontSize: 80,
                            fontWeight: 800,
                            letterSpacing: "-0.04em",
                            color: "#1e293b",
                        }}
                    >
                        Calenda
                    </div>
                </div>
                <div
                    style={{
                        marginTop: 40,
                        fontSize: 32,
                        color: "#64748b",
                        textAlign: "center",
                        maxWidth: 800,
                        lineHeight: 1.4,
                    }}
                >
                    Inteligentny grafik pracy dla Twojej firmy
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
