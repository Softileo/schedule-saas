import { Metadata } from "next";
import { generateSEOMetadata } from "@/lib/seo/metadata";
import { ROUTES } from "@/lib/constants/routes";
import { RegisterPageContent } from "./register-page-content";

export const metadata: Metadata = generateSEOMetadata({
    title: "Rejestracja",
    description:
        "Załóż darmowe konto w Calenda i zacznij tworzyć grafiki pracy.",
    canonical: ROUTES.REJESTRACJA,
});

export default function RegisterPage() {
    return <RegisterPageContent />;
}
