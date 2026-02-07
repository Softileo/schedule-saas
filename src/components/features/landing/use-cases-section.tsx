import { Badge } from "@/components/ui/badge";
import {
    Building2,
    UtensilsCrossed,
    Hotel,
    Factory,
    ShoppingCart,
    Warehouse,
    ArrowRight,
    Users,
    Clock,
    CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

const useCases = [
    {
        icon: ShoppingCart,
        industry: "Handel detaliczny",
        title: "Grafik pracy w sklepie",
        description:
            "Sieć sklepów spożywczych lub odzieżowych? Calenda automatycznie planuje grafik z uwzględnieniem godzin otwarcia, sezonowego obłożenia i zakazu pracy w niedziele handlowe.",
        stats: { employees: "5-50", shifts: "2-3 zmiany", saving: "4h/tyg" },
        challenges: [
            "Zmienny ruch klientów w ciągu dnia",
            "Niedziele handlowe i wolne",
            "Wielu pracowników na niepełny etat",
            "Rotacja personelu",
        ],
        color: "blue",
    },
    {
        icon: UtensilsCrossed,
        industry: "Gastronomia",
        title: "Grafik pracy w restauracji",
        description:
            "Restauracja, kawiarnia lub bar? Algorytm uwzględnia godziny szczytu, weekendy i sprawiedliwy podział popularnych zmian między kelnerów i kucharzy.",
        stats: { employees: "10-30", shifts: "Split shifts", saving: "5h/tyg" },
        challenges: [
            "Zmienny grafik weekendowy",
            "Podział zmian (split shifts)",
            "Sezonowe wahania personelu",
            "Różne stanowiska (kuchnia/sala)",
        ],
        color: "amber",
    },
    {
        icon: Hotel,
        industry: "Hotelarstwo",
        title: "Grafik pracy w hotelu",
        description:
            "Hotel wymaga obsługi 24/7. Calenda zarządza zmianami recepcji, housekeepingu i obsługi gości z zachowaniem odpoczynku dobowego i tygodniowego.",
        stats: { employees: "20-100", shifts: "24/7", saving: "8h/tyg" },
        challenges: [
            "Praca całodobowa, 7 dni w tygodniu",
            "Zmienne obłożenie sezonowe",
            "Wielojęzyczny personel",
            "Koordynacja wielu działów",
        ],
        color: "violet",
    },
    {
        icon: Factory,
        industry: "Produkcja",
        title: "Grafik pracy na produkcji",
        description:
            "Zakłady produkcyjne pracujące na 2 lub 3 zmiany? System automatycznie rotuje pracowników, pilnuje norm BHP i minimalizuje nadgodziny.",
        stats: {
            employees: "50-200+",
            shifts: "System 3-zmianowy",
            saving: "10h/tyg",
        },
        challenges: [
            "System 3-zmianowy non-stop",
            "Kwalifikacje operatorów maszyn",
            "Normy BHP i odzież ochronna",
            "Minimalizacja nadgodzin",
        ],
        color: "rose",
    },
    {
        icon: Warehouse,
        industry: "Logistyka",
        title: "Grafik pracy w magazynie",
        description:
            "Centrum logistyczne lub dystrybucyjne? Calenda optymalizuje obsadę zmian pod kątem terminów dostaw, kompletacji zamówień i sezonu e-commerce.",
        stats: { employees: "30-150", shifts: "Elastyczne", saving: "6h/tyg" },
        challenges: [
            "Piki sezonowe (Black Friday, święta)",
            "Różne strefy magazynowe",
            "Uprawnienia wózków widłowych",
            "Elastyczny czas pracy",
        ],
        color: "emerald",
    },
    {
        icon: Building2,
        industry: "Usługi",
        title: "Grafik pracy w biurze / call center",
        description:
            "Biura obsługi klienta, centra telefoniczne i firmy usługowe? Zapewnij ciągłość obsługi z optymalną obsadą w godzinach szczytu.",
        stats: { employees: "10-80", shifts: "Równoważny", saving: "3h/tyg" },
        challenges: [
            "Godziny szczytu telefonów/wizyt",
            "Równoważny system czasu pracy",
            "Praca zdalna i hybrydowa",
            "Szkolenia i onboarding",
        ],
        color: "cyan",
    },
];

const colorClasses: Record<
    string,
    { card: string; icon: string; badge: string }
> = {
    blue: {
        card: "hover:border-blue-200 hover:bg-blue-50/20",
        icon: "bg-blue-100 text-blue-600",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
    },
    amber: {
        card: "hover:border-amber-200 hover:bg-amber-50/20",
        icon: "bg-amber-100 text-amber-600",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
    },
    violet: {
        card: "hover:border-violet-200 hover:bg-violet-50/20",
        icon: "bg-violet-100 text-violet-600",
        badge: "bg-violet-50 text-violet-700 border-violet-200",
    },
    rose: {
        card: "hover:border-rose-200 hover:bg-rose-50/20",
        icon: "bg-rose-100 text-rose-600",
        badge: "bg-rose-50 text-rose-700 border-rose-200",
    },
    emerald: {
        card: "hover:border-emerald-200 hover:bg-emerald-50/20",
        icon: "bg-emerald-100 text-emerald-600",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    cyan: {
        card: "hover:border-cyan-200 hover:bg-cyan-50/20",
        icon: "bg-cyan-100 text-cyan-600",
        badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
    },
};

export function UseCasesSection() {
    return (
        <section className="py-16 sm:py-24 bg-white" id="dla-kogo">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
                    <Badge className="mb-4 bg-rose-500/10 text-rose-700 border-rose-200/50">
                        <Building2 className="w-4 h-4 mr-2" />
                        Dla kogo
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Generator grafiku pracy dla każdej branży
                    </h2>
                    <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
                        Niezależnie od tego, czy zarządzasz 5 czy 200
                        pracownikami — Calenda dostosowuje się do specyfiki
                        Twojej branży
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto stagger-children">
                    {useCases.map((useCase) => {
                        const colors = colorClasses[useCase.color];
                        return (
                            <div
                                key={useCase.title}
                                className={`group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 transition-all duration-300 hover:shadow-lg ${colors.card}`}
                            >
                                {/* Header */}
                                <div className="flex items-start gap-3 mb-4">
                                    <div
                                        className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center shrink-0`}
                                    >
                                        <useCase.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <Badge
                                            variant="outline"
                                            className={`mb-1.5 text-[10px] ${colors.badge}`}
                                        >
                                            {useCase.industry}
                                        </Badge>
                                        <h3 className="text-base sm:text-lg font-bold text-gray-900">
                                            {useCase.title}
                                        </h3>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                    {useCase.description}
                                </p>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-slate-50 rounded-xl">
                                    <div className="text-center">
                                        <Users className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                                        <div className="text-xs font-bold text-gray-900">
                                            {useCase.stats.employees}
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                            pracowników
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <Clock className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                                        <div className="text-xs font-bold text-gray-900">
                                            {useCase.stats.shifts}
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                            system
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                                        <div className="text-xs font-bold text-emerald-600">
                                            {useCase.stats.saving}
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                            oszczędność
                                        </div>
                                    </div>
                                </div>

                                {/* Challenges */}
                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                        Wyzwania, które rozwiązujemy
                                    </div>
                                    {useCase.challenges.map((challenge) => (
                                        <div
                                            key={challenge}
                                            className="flex items-center gap-2 text-xs text-gray-600"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            {challenge}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="text-center mt-10 sm:mt-14">
                    <p className="text-sm text-gray-500 mb-4">
                        Nie widzisz swojej branży? Calenda działa wszędzie,
                        gdzie potrzebny jest grafik pracy.
                    </p>
                    <Button
                        asChild
                        size="lg"
                        className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg"
                    >
                        <Link href={ROUTES.REJESTRACJA}>
                            Wypróbuj za darmo
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
