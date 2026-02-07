import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import {
    Check,
    X,
    Minus,
    Table2,
    FileSpreadsheet,
    Sparkles,
} from "lucide-react";


interface ComparisonFeature {
    name: string;
    calenda: "yes" | "no" | "partial";
    excel: "yes" | "no" | "partial";
    paper: "yes" | "no" | "partial";
    calendaNote?: string;
    excelNote?: string;
    paperNote?: string;
}

const comparisonFeatures: ComparisonFeature[] = [
    {
        name: "Automatyczne generowanie grafiku",
        calenda: "yes",
        excel: "no",
        paper: "no",
        calendaNote: "AI w 2 sekundy",
    },
    {
        name: "Walidacja Kodeksu Pracy",
        calenda: "yes",
        excel: "no",
        paper: "no",
        calendaNote: "Automatyczna, na bieżąco",
    },
    {
        name: "Wykrywanie konfliktów zmian",
        calenda: "yes",
        excel: "partial",
        paper: "no",
        excelNote: "Tylko ręcznie",
    },
    {
        name: "Preferencje pracowników",
        calenda: "yes",
        excel: "no",
        paper: "no",
        calendaNote: "Wbudowane w system",
    },
    {
        name: "Eksport do PDF / Excel",
        calenda: "yes",
        excel: "yes",
        paper: "no",
    },
    {
        name: "Dostęp z telefonu",
        calenda: "yes",
        excel: "partial",
        paper: "no",
        excelNote: "Mało czytelne",
    },
    {
        name: "Historia zmian w grafiku",
        calenda: "yes",
        excel: "no",
        paper: "no",
    },
    {
        name: "Obsługa nieobecności i urlopów",
        calenda: "yes",
        excel: "partial",
        paper: "partial",
        excelNote: "Ręcznie",
        paperNote: "Ręcznie",
    },
    {
        name: "Statystyki godzin i nadgodzin",
        calenda: "yes",
        excel: "partial",
        paper: "no",
        excelNote: "Wymaga formuł",
    },
    {
        name: "Czas potrzebny na ułożenie grafiku",
        calenda: "yes",
        excel: "no",
        paper: "no",
        calendaNote: "Sekundy",
        excelNote: "Godziny",
        paperNote: "Godziny",
    },
    {
        name: "Wiele lokalizacji / zespołów",
        calenda: "yes",
        excel: "partial",
        paper: "no",
        excelNote: "Osobne pliki",
    },
    {
        name: "Powiadomienia dla pracowników",
        calenda: "yes",
        excel: "no",
        paper: "no",
    },
];

function StatusIcon({ status }: { status: "yes" | "no" | "partial" }) {
    if (status === "yes") {
        return (
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-600" />
            </div>
        );
    }
    if (status === "partial") {
        return (
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <Minus className="w-4 h-4 text-amber-600" />
            </div>
        );
    }
    return (
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
            <X className="w-4 h-4 text-red-500" />
        </div>
    );
}

export function ComparisonSection() {
    return (
        <section className="py-16 sm:py-24 bg-slate-50" id="porownanie">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
                    <Badge className="mb-4 bg-blue-500/10 text-blue-700 border-blue-200/50">
                        <Table2 className="w-4 h-4 mr-2" />
                        Porównanie
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Calenda vs Excel vs papierowy grafik
                    </h2>
                    <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                        Zobacz dlaczego firmy przechodzą na automatyczne
                        układanie grafików pracy
                    </p>
                </div>

                {/* Desktop comparison table */}
                <div className="hidden md:block max-w-5xl mx-auto">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_180px_140px_140px] bg-blue-50 border-b border-gray-200 items-center">
                            <div className="p-4 sm:p-5">
                                <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">
                                    Funkcja
                                </span>
                            </div>
                            <div className="p-4 sm:p-5 text-center border-l border-gray-200 bg-blue-50/50">
                                <div className="flex items-center justify-center gap-2">
                                    <Logo />
                                </div>
                            </div>
                            <div className="p-4 sm:p-5 text-center border-l border-gray-200">
                                <div className="flex items-center justify-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                    <span className="font-bold text-gray-900">
                                        Excel
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 sm:p-5 text-center border-l border-gray-200">
                                <span className="font-bold text-gray-900">
                                    Papier
                                </span>
                            </div>
                        </div>

                        {/* Table rows */}
                        {comparisonFeatures.map((feature, idx) => (
                            <div
                                key={feature.name}
                                className={`grid grid-cols-[1fr_180px_140px_140px] ${
                                    idx < comparisonFeatures.length - 1
                                        ? "border-b border-gray-100"
                                        : ""
                                } hover:bg-slate-50/50 transition-colors`}
                            >
                                <div className="p-4 sm:px-5 flex items-center">
                                    <span className="text-sm text-gray-700 font-medium">
                                        {feature.name}
                                    </span>
                                </div>
                                <div className="p-4 flex flex-col items-center justify-center border-l border-gray-100 bg-blue-50/20">
                                    <StatusIcon status={feature.calenda} />
                                    {feature.calendaNote && (
                                        <span className="text-[10px] text-blue-600 font-medium mt-1">
                                            {feature.calendaNote}
                                        </span>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col items-center justify-center border-l border-gray-100">
                                    <StatusIcon status={feature.excel} />
                                    {feature.excelNote && (
                                        <span className="text-[10px] text-gray-500 mt-1">
                                            {feature.excelNote}
                                        </span>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col items-center justify-center border-l border-gray-100">
                                    <StatusIcon status={feature.paper} />
                                    {feature.paperNote && (
                                        <span className="text-[10px] text-gray-500 mt-1">
                                            {feature.paperNote}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mobile comparison cards */}
                <div className="md:hidden space-y-3 max-w-lg mx-auto">
                    {comparisonFeatures.map((feature) => (
                        <div
                            key={feature.name}
                            className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
                        >
                            <div className="text-sm font-semibold text-gray-900 mb-3">
                                {feature.name}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-blue-50/50">
                                    <StatusIcon status={feature.calenda} />
                                    <span className="text-[10px] font-bold text-blue-700">
                                        Calenda
                                    </span>
                                    {feature.calendaNote && (
                                        <span className="text-[9px] text-blue-600 text-center">
                                            {feature.calendaNote}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-50">
                                    <StatusIcon status={feature.excel} />
                                    <span className="text-[10px] font-bold text-gray-600">
                                        Excel
                                    </span>
                                    {feature.excelNote && (
                                        <span className="text-[9px] text-gray-500 text-center">
                                            {feature.excelNote}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-50">
                                    <StatusIcon status={feature.paper} />
                                    <span className="text-[10px] font-bold text-gray-600">
                                        Papier
                                    </span>
                                    {feature.paperNote && (
                                        <span className="text-[9px] text-gray-500 text-center">
                                            {feature.paperNote}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                
            </div>
        </section>
    );
}
