import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowRight,
    Sparkles,
    CheckCircle2,
    Twitter,
    Linkedin,
    Mail,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { Logo } from "@/components/ui/logo";
import { GradientOrbsLight } from "@/components/ui/background-effects";

const ctaFeatures = [
    "14 dni za darmo",
    "Bez karty kredytowej",
    "Pełny dostęp do funkcji",
];

const footerLinks = {
    product: [
        { label: "Funkcje", href: "#funkcje" },
        { label: "FAQ", href: "#faq" },
    ],
    company: [
        { label: "O nas", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Kontakt", href: "#" },
    ],
    legal: [
        { label: "Regulamin", href: "#" },
        { label: "Prywatność", href: "#" },
    ],
};

const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export function CTASection() {
    return (
        <section className="py-16 sm:py-24 bg-linear-to-r from-blue-500 via-indigo-600 to-violet-600 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-size-[4rem_4rem]" />
            </div>

            <GradientOrbsLight />

            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center animate-fade-in-up">
                    <Badge className="mb-6 bg-white/20 text-white border-white/20 backdrop-blur-sm">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Zacznij już dziś
                    </Badge>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4 sm:mb-6">
                        Gotowy na automatyczne grafiki?
                    </h2>

                    <p className="text-base sm:text-xl text-blue-100 mb-6 sm:mb-8 max-w-2xl mx-auto">
                        Dołącz do firm, które już oszczędzają godziny tygodniowo
                        na planowaniu grafiku pracy.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4 mb-8">
                        {ctaFeatures.map((feature) => (
                            <div
                                key={feature}
                                className="flex items-center gap-2 text-blue-100"
                            >
                                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button
                            asChild
                            size="lg"
                            className="h-14 px-8 bg-white text-blue-700 hover:bg-blue-50 shadow-lg rounded-xl font-medium"
                        >
                            <Link href={ROUTES.REJESTRACJA}>
                                Wypróbuj za darmo
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="h-14 px-8 border-white/30 text-white bg-white/10 rounded-xl font-medium backdrop-blur-sm"
                        >
                            <Link href="#demo">Obejrzyj demo</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function FooterSection() {
    return (
        <footer className="bg-gray-900 text-gray-300 py-10 sm:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Logo />
                        <p className="text-sm text-gray-400 my-4">
                            Automatyczne grafiki pracy z AI. Oszczędzaj czas i
                            eliminuj błędy.
                        </p>
                        <div className="flex gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                                    aria-label={social.label}
                                >
                                    <social.icon className="w-4 h-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">
                            Produkt
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm hover:text-white transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Firma</h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm hover:text-white transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">
                            Prawne
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm hover:text-white transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-gray-500">
                            © 2026 Calenda. Wszelkie prawa zastrzeżone.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Mail className="w-4 h-4" />
                            <a
                                href="mailto:kontakt@calenda.pl"
                                className="hover:text-white transition-colors"
                            >
                                kontakt@calenda.pl
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
