import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Shield,
    Clock,
    AlertTriangle,
    Calendar,
    Scale,
    BookOpen,
    CheckCircle2,
    ArrowRight,
    Ban,
    Timer,
    Moon,
    Sun,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

interface LaborLawRule {
    icon: ComponentType<{ className?: string }>;
    title: string;
    article: string;
    description: string;
    example: string;
    severity: "critical" | "warning" | "info";
}

const laborLawRules: LaborLawRule[] = [
    {
        icon: Moon,
        title: "Odpoczynek dobowy — min. 11 godzin",
        article: "Art. 132 KP",
        description:
            "Między końcem jednej zmiany a początkiem następnej musi upłynąć co najmniej 11 godzin nieprzerwanego odpoczynku. Calenda automatycznie blokuje przydzielanie zmian, które naruszałyby tę zasadę.",
        example:
            "Pracownik kończy zmianę o 22:00 → najwcześniejszy start następnego dnia to 09:00.",
        severity: "critical",
    },
    {
        icon: Sun,
        title: "Odpoczynek tygodniowy — min. 35 godzin",
        article: "Art. 133 KP",
        description:
            "W każdym tygodniu pracownik ma prawo do co najmniej 35 godzin nieprzerwanego odpoczynku, obejmującego co najmniej 11 godzin odpoczynku dobowego.",
        example:
            "Jeśli pracownik pracuje do soboty wieczorem, niedziela musi być wolna.",
        severity: "critical",
    },
    {
        icon: Timer,
        title: "Limit nadgodzin — 150h rocznie",
        article: "Art. 151 KP",
        description:
            "Roczny limit nadgodzin wynosi 150 godzin (chyba że regulamin lub układ zbiorowy stanowią inaczej, maks. 416h). System sumuje nadgodziny i ostrzega przed przekroczeniem limitu.",
        example:
            "Pracownik ma 140h nadgodzin w roku → system zablokuje nadmiarowe zmiany.",
        severity: "warning",
    },
    {
        icon: Ban,
        title: "Niedziele handlowe",
        article: "Ustawa z 2018 r.",
        description:
            "Handel w niedziele jest zakazany z wyjątkiem wyznaczonych niedziel handlowych (7 rocznie w 2026). Calenda ma wbudowany kalendarz niedziel handlowych i automatycznie to weryfikuje.",
        example:
            "System blokuje planowanie zmian sklepowych w niedziele niehandlowe.",
        severity: "critical",
    },
    {
        icon: Clock,
        title: "Doba pracownicza — 24 godziny",
        article: "Art. 128 KP",
        description:
            "Doba pracownicza to 24 kolejne godziny od początku zmiany. Nie można rozpocząć drugiej zmiany w tej samej dobie pracowniczej, nawet jeśli minęło 11h odpoczynku.",
        example:
            "Start zmiany o 06:00 = doba 06:00-06:00. Następna zmiana najwcześniej po 06:00 dnia następnego.",
        severity: "warning",
    },
    {
        icon: Calendar,
        title: "Ewidencja czasu pracy",
        article: "Art. 149 KP",
        description:
            "Pracodawca ma obowiązek prowadzenia ewidencji czasu pracy. Calenda automatycznie generuje zestawienia godzin, nadgodzin i nieobecności — gotowe do kontroli PIP.",
        example:
            "Eksport raportu godzin za miesiąc jednym kliknięciem — PDF lub Excel.",
        severity: "info",
    },
];

const severityColors = {
    critical: {
        bg: "bg-red-50",
        border: "border-red-200",
        badge: "bg-red-100 text-red-700",
        icon: "text-red-500",
    },
    warning: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        badge: "bg-amber-100 text-amber-700",
        icon: "text-amber-500",
    },
    info: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        badge: "bg-blue-100 text-blue-700",
        icon: "text-blue-500",
    },
};

export function ComplianceSection() {
    return (
        <section className="py-16 sm:py-24 bg-slate-50" id="kodeks-pracy">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
                    <Badge className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-200/50">
                        <Shield className="w-4 h-4 mr-2" />
                        Zgodność z Kodeksem Pracy
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Grafik pracy zgodny z prawem — automatycznie
                    </h2>
                    <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        Kodeks Pracy nakłada na pracodawcę dziesiątki obowiązków
                        dotyczących czasu pracy. Calenda pilnuje ich wszystkich
                        za Ciebie — w czasie rzeczywistym.
                    </p>
                </div>

                {/* Warning banner */}
                <div className="max-w-4xl mx-auto mb-10 sm:mb-12">
                    <div className="flex items-start gap-3 sm:gap-4 bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5">
                        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-amber-900 mb-1 text-sm sm:text-base">
                                Kary PIP za błędy w grafiku: do 30 000 zł
                            </h4>
                            <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                                Państwowa Inspekcja Pracy może nałożyć karę
                                grzywny za naruszenie przepisów o czasie pracy.
                                Częste błędy to brak odpoczynku dobowego,
                                przekroczenie limitu nadgodzin i nieprawidłowa
                                ewidencja czasu pracy. Calenda eliminuje te
                                ryzyka automatycznie.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Rules grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto stagger-children">
                    {laborLawRules.map((rule) => {
                        const colors = severityColors[rule.severity];
                        return (
                            <div
                                key={rule.title}
                                className={`rounded-2xl border ${colors.border} ${colors.bg} p-5 sm:p-6 transition-shadow hover:shadow-lg`}
                            >
                                {/* Header */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div
                                        className={`w-10 h-10 rounded-lg bg-white border ${colors.border} flex items-center justify-center shrink-0`}
                                    >
                                        <rule.icon
                                            className={`w-5 h-5 ${colors.icon}`}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                                            {rule.title}
                                        </h3>
                                        <Badge
                                            variant="outline"
                                            className={`mt-1 text-[10px] ${colors.badge} border-0`}
                                        >
                                            <BookOpen className="w-3 h-3 mr-1" />
                                            {rule.article}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3">
                                    {rule.description}
                                </p>

                                {/* Example */}
                                <div className="bg-white/80 rounded-lg p-3 border border-white">
                                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                        Przykład
                                    </div>
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                        {rule.example}
                                    </p>
                                </div>

                                {/* Calenda check */}
                                <div className="flex items-center gap-2 mt-3 text-xs text-emerald-700 font-medium">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Calenda weryfikuje automatycznie
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom CTA */}
                <div className="text-center mt-10 sm:mt-14">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-full px-5 py-2.5 mb-6">
                        <Scale className="w-4 h-4 text-blue-600" />
                        Aktualne przepisy na 2026 rok wbudowane w system
                    </div>
                    <br />
                    <Button
                        asChild
                        size="lg"
                        className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg"
                    >
                        <Link href={ROUTES.REJESTRACJA}>
                            Układaj grafik zgodnie z prawem
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
