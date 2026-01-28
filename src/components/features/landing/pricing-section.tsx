"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

const plans = [
    {
        name: "Darmowy",
        description: "Idealny na początek dla małych zespołów",
        price: "0",
        period: "zł/miesiąc",
        features: [
            "Do 5 pracowników",
            "Generator AI",
            "Kalendarz świąt",
            "Niedziele handlowe",
            "Eksport PDF",
            "Drag & Drop",
        ],
        cta: "Rozpocznij za darmo",
        highlighted: false,
    },
    {
        name: "Pro",
        description: "Dla rosnących zespołów",
        price: "49",
        period: "zł/miesiąc",
        features: [
            "Do 25 pracowników",
            "Nieograniczony generator AI",
            "3 szablony PDF",
            "Eksport Excel/CSV",
            "Multi-organizacja",
            "Priorytetowe wsparcie",
        ],
        cta: "Wypróbuj 14 dni za darmo",
        highlighted: true,
    },
    {
        name: "Enterprise",
        description: "Dla dużych organizacji",
        price: "Kontakt",
        period: "",
        features: [
            "Nieograniczona liczba pracowników",
            "Dedykowany opiekun",
            "SLA 99.9%",
            "Integracje API",
            "Szkolenia on-site",
            "Wsparcie 24/7",
        ],
        cta: "Skontaktuj się",
        highlighted: false,
    },
];

export function PricingSection() {
    return (
        <section id="cennik" className="py-20 lg:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        Prosty cennik
                    </h2>
                    <p className="text-lg text-gray-600">
                        Zacznij za darmo i skaluj w miarę wzrostu. Bez ukrytych opłat.
                    </p>
                </div>

                {/* Pricing cards */}
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`rounded-xl border p-8 ${
                                plan.highlighted
                                    ? "border-blue-200 bg-blue-50 ring-2 ring-blue-600"
                                    : "border-gray-200 bg-white"
                            }`}
                        >
                            {plan.highlighted && (
                                <div className="inline-block px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-medium mb-4">
                                    Najpopularniejszy
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {plan.name}
                            </h3>
                            <p className="text-gray-600 mb-4">{plan.description}</p>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-gray-900">
                                    {plan.price}
                                </span>
                                <span className="text-gray-500">{plan.period}</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <span className="text-gray-600">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button
                                asChild
                                className={`w-full h-11 ${
                                    plan.highlighted
                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                                }`}
                            >
                                <Link href={ROUTES.REJESTRACJA}>{plan.cta}</Link>
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
