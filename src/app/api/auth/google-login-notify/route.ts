import { NextResponse } from "next/server";
import { sendGoogleLoginAttemptNotification } from "@/lib/email/nodemailer";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { timestamp, userAgent } = body;
        await sendGoogleLoginAttemptNotification({ timestamp, userAgent });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: "Błąd wysyłki powiadomienia" },
            { status: 500 },
        );
    }
}
