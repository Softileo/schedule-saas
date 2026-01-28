import { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/features/auth/forgot-password-form";
import { ROUTES } from "@/lib/constants/routes";
import { generateSEOMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = generateSEOMetadata({
    title: "Reset hasła",
    description: "Zresetuj hasło do swojego konta w Calenda.",
    canonical: ROUTES.ZAPOMNIALEM_HASLA,
});

export default function ForgotPasswordPage() {
    return (
        <div className="p-8 sm:p-10 animate-slide-fade-in transition-all max-w-md mx-auto">
            <ForgotPasswordForm />

            {/* Footer - link back to login */}
            <div className="text-center text-sm text-gray-600 mt-6">
                Pamiętasz hasło?{" "}
                <Link
                    href={ROUTES.LOGOWANIE}
                    className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                    Zaloguj się
                </Link>
            </div>
        </div>
    );
}
