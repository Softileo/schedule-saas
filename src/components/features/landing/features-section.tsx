import { Badge } from "@/components/ui/badge";
import {
    Sparkles,
    Users,
    Shield,
    Zap,
    Clock,
    BarChart3,
    Bell,
    FileText,
    Smartphone,
    CalendarOff,
    SlidersHorizontal,
    CalendarDays,
} from "lucide-react";

const features = [
    {
        icon: Sparkles,
        title: "Generator AI",
        description:
            "Jeden klik i grafik gotowy. Algorytm uwzglednia dostepnosc, preferencje i przepisy.",
        color: "blue",
        size: "large",
    },
    {
        icon: Shield,
        title: "Kodeks Pracy",
        description:
            "Automatyczna walidacja: 11h odpoczynku, limity nadgodzin, niedziele handlowe.",
        color: "emerald",
        size: "medium",
    },
    {
        icon: SlidersHorizontal,
        title: "Preferencje pracowników",
        description:
            "Np. brak pracy w poniedziałki, stałe dni wolne lub preferowane godziny.",
        color: "lime",
        size: "medium",
    },
        {
        icon: FileText,
        title: "Eksport PDF",
        description: "Pobierz i wydrukuj grafik jednym kliknieciem.",
        color: "orange",
        size: "small",
    },
    {
        icon: Users,
        title: "Export Exel",
        description: "Eksportuj grafik do Excela i edytuj go według własnych potrzeb.",
        color: "violet",
        size: "medium",
    },
    {
        icon: CalendarOff,
        title: "Nieobecności",
        description:
            "Urlopy, L4 i inne nieobecności automatycznie blokują zmiany w grafiku.",
        color: "amber",
        size: "medium",
    },
    {
        icon: Clock,
        title: "Szablony zmian",
        description: "Twórz szablony i przypisuj je automatycznie.",
        color: "rose",
        size: "small",
    },
    {
        icon: Bell,
        title: "Powiadomienia",
        description: "Email i push gdy grafik sie zmieni.",
        color: "cyan",
        size: "small",
    },

    {
    icon: CalendarDays,
    title: "Nadchodzące święta",
    description:
        "Automatyczna lista świąt i dni wolnych z uwzględnieniem planowania grafiku.",
    color: "sky",
    size: "small",
},
    {
        icon: Smartphone,
        title: "Mobile",
        description: "Przeglądaj i edytuj z telefonu.",
        color: "indigo",
        size: "small",
    },
    {
        icon: BarChart3,
        title: "Statystyki",
        description: "Sledz godziny, nadgodziny i dostepnosc.",
        color: "teal",
        size: "small",
    },
];

const colorClasses = {
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    sky: "bg-sky-50 text-sky-600 group-hover:bg-sky-100",
    emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    lime: "bg-lime-50 text-lime-600 group-hover:bg-lime-100",
    violet: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
    cyan: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100",
    orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-100",
    indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
    teal: "bg-teal-50 text-teal-600 group-hover:bg-teal-100",
};

export function FeaturesSection() {
    return (
        <section
            className="py-24 bg-slate-50 relative overflow-hidden"
            id="funkcje"
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 animate-fade-in-up">
                    <Badge className="mb-4 bg-blue-500/10 text-blue-700 border-blue-200/50">
                        <Zap className="w-4 h-4 mr-2" />
                        Funkcje
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        Wszystko czego potrzebujesz
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Kompleksowe narzedzie do zarzadzania grafikami pracy
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-6xl mx-auto stagger-children">
                    {/* Large card - AI Generator */}
                    <div className="col-span-2 row-span-2 group">
                        <div className="h-full bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                            <div
                                className={`w-14 h-14 rounded-xl ${colorClasses.blue} flex items-center justify-center mb-6 transition-colors`}
                            >
                                <Sparkles className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">
                                Generator AI
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Jeden klik i grafik gotowy. Algorytm analizuje
                                dostepnosc pracownikow, ich preferencje i
                                przepisy prawa pracy, by stworzyc optymalny
                                harmonogram.
                            </p>
                            <div className="mt-6 flex items-center gap-2 text-sm text-blue-600 font-medium">
                                <Zap className="w-4 h-4" />
                                Sredni czas generowania: 2.3s
                            </div>
                        </div>
                    </div>

                    {/* Medium cards */}
                    {features.slice(1, 3).map((feature) => (
                        <div key={feature.title} className="col-span-2 group">
                            <div className="h-full bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                                <div
                                    className={`w-12 h-12 rounded-xl ${
                                        colorClasses[
                                            feature.color as keyof typeof colorClasses
                                        ]
                                    } flex items-center justify-center mb-4 transition-colors`}
                                >
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Small cards */}
                    {features.slice(3).map((feature) => (
                        <div
                            key={feature.title}
                            className="col-span-1 sm:col-span-1 group"
                        >
                            <div className="h-full bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                                <div
                                    className={`w-10 h-10 rounded-lg ${
                                        colorClasses[
                                            feature.color as keyof typeof colorClasses
                                        ]
                                    } flex items-center justify-center mb-3 transition-colors`}
                                >
                                    <feature.icon className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">
                                    {feature.title}
                                </h3>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
