import { Metadata } from "next";
import { generateSEOMetadata } from "@/lib/seo/metadata";
import { ROUTES } from "@/lib/constants/routes";
import { LoginPageContent } from "./login-page-content";

export const metadata: Metadata = generateSEOMetadata({
    title: "Logowanie",
    description: "Zaloguj się do Calenda i zarządzaj grafikami pracy.",
    canonical: ROUTES.LOGOWANIE,
});

export default function LoginPage() {
    return <LoginPageContent />;
}
