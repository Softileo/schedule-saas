import { Badge } from "@/components/ui/badge";
import {
    UserPlus,
    Settings,
    Sparkles,
    CheckCircle,
    Send,
    ArrowRight,
} from "lucide-react";

const steps = [
    {
        number: "01",
        icon: UserPlus,
        title: "Dodaj pracowników",
        description: "Wprowadź dane zespołu.",
        color: "blue",
    },
    {
        number: "02",
        icon: Settings,
        title: "Skonfiguruj zmiany",
        description: "Określ godziny i szablony.",
        color: "violet",
    },
    {
        number: "03",
        icon: Sparkles,
        title: "Wygeneruj grafik",
        description: "Kliknij - AI zrobi resztę.",
        color: "emerald",
    },
    {
        number: "04",
        icon: CheckCircle,
        title: "Sprawdź i dostosuj",
        description: "Przejrzyj propozycje.",
        color: "amber",
    },
    {
        number: "05",
        icon: Send,
        title: "Opublikuj",
        description: "Udostępnij zespołowi.",
        color: "rose",
    },
];

const colorClasses: Record<string, string> = {
    blue: "bg-blue-500 text-white",
    violet: "bg-violet-500 text-white",
    emerald: "bg-emerald-500 text-white",
    amber: "bg-amber-500 text-white",
    rose: "bg-rose-500 text-white",
};

const bgColorClasses: Record<string, string> = {
    blue: "bg-blue-50",
    violet: "bg-violet-50",
    emerald: "bg-emerald-50",
    amber: "bg-amber-50",
    rose: "bg-rose-50",
};

export function TimelineSection() {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 animate-fade-in-up">
                    <Badge className="mb-4 bg-violet-500/10 text-violet-700 border-violet-200/50">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Jak to działa
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        5 prostych kroków
                    </h2>
                    <p className="text-lg text-gray-600">
                        Od rejestracji do gotowego grafiku w kilka minut
                    </p>
                </div>

                {/* Mobile */}
                <div className="lg:hidden max-w-md mx-auto stagger-children">
                    {steps.map((step, i) => (
                        <div key={step.number} className="flex gap-4 mb-8">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-12 h-12 rounded-xl ${
                                        colorClasses[step.color]
                                    } flex items-center justify-center shrink-0`}
                                >
                                    <step.icon className="w-6 h-6" />
                                </div>
                                {i < steps.length - 1 && (
                                    <div className="w-0.5 flex-1 bg-gray-200 my-2" />
                                )}
                            </div>
                            <div className="pt-1 pb-4">
                                <div className="text-xs font-bold text-gray-400 mb-1">
                                    {step.number}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    {step.title}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop */}
                <div className="hidden lg:grid lg:grid-cols-5 gap-4 max-w-6xl mx-auto stagger-children">
                    {steps.map((step, i) => (
                        <div key={step.number} className="relative">
                            <div
                                className={`h-full ${
                                    bgColorClasses[step.color]
                                } rounded-2xl p-6 hover:shadow-lg transition-shadow`}
                            >
                                <div className="text-xs font-bold text-gray-400 mb-3">
                                    {step.number}
                                </div>
                                <div
                                    className={`w-12 h-12 rounded-xl ${
                                        colorClasses[step.color]
                                    } flex items-center justify-center mb-4`}
                                >
                                    <step.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {step.description}
                                </p>
                            </div>
                            {i < steps.length - 1 && (
                                <div className="absolute top-1/2 -right-2 -translate-y-1/2 z-10">
                                    <ArrowRight className="w-4 h-4 text-gray-300" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
