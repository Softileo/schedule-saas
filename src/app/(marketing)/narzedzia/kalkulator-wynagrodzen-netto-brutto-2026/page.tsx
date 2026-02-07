"use client";

import { useState, useMemo } from "react";
import {
    SEOPageLayout,
    UniversalHero,
    FAQSectionDynamic,
    CTABanner,
    Breadcrumbs,
} from "@/components/features/seo";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Calculator,
    Banknote,
    Info,
    TrendingUp,
    Percent,
    Building,
    Heart,
    Shield,
    Briefcase,
    ChevronDown,
} from "lucide-react";

// =============================================================================
// CONSTANTS - Aktualne stawki 2026
// =============================================================================

// Progi podatkowe 2026 (hipotetyczne, oparte na trendach)
const TAX_THRESHOLD = 120000; // Próg 32%
const TAX_RATE_1 = 0.12; // 12% do progu
const TAX_RATE_2 = 0.32; // 32% powyżej progu
const TAX_REDUCTION_AMOUNT = 300; // Kwota zmniejszająca podatek miesięcznie (od lipca 2022)
const TAX_REDUCTION_INCOME_LIMIT = 120000; // Limit dochodu rocznego dla kwoty zmniejszającej

// Składki ZUS 2026 (hipotetyczne)
const ZUS_EMERYTALNE = 0.0976;
const ZUS_RENTOWE = 0.015;
const ZUS_CHOROBOWE = 0.0245;
const ZUS_ZDROWOTNE = 0.09;

// Minimalne wynagrodzenie 2026 (hipotetyczne)
const MIN_WAGE_2026 = 4806; // Przewidywana płaca minimalna

// Koszty uzyskania przychodu
const KOSZTY_PODSTAWOWE = 250;
const KOSZTY_PODWYZSZONE = 300;

// Roczny limit podstawy składek emerytalno-rentowych (30× prognozowane przeciętne wynagrodzenie)
const ZUS_ANNUAL_CAP = 287910;

// Stawki pracodawcy
const EMPLOYER_RENTOWE = 0.065;
const EMPLOYER_WYPADKOWA = 0.0167;
const EMPLOYER_FP = 0.0245;
const EMPLOYER_FGSP = 0.001;
const EMPLOYER_PPK = 0.015;

// Nazwy miesięcy
const MONTHS_PL = [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień",
];

// Zaokrąglanie do groszy
function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

// =============================================================================
// TYPES
// =============================================================================

type CalculationMode = "brutto-to-netto" | "netto-to-brutto";
type ContractType = "employment" | "contract" | "work-agreement";

interface CalculationResult {
    brutto: number;
    emerytalne: number;
    rentowe: number;
    chorobowe: number;
    sumaSkladekPracownik: number;
    podstawaZdrowotne: number;
    zdrowotne: number;
    zdrowotneOdliczane: number;
    podstawaOpodatkowania: number;
    zaliczkaPodatek: number;
    netto: number;
    pracodawcaKoszty: number;
}

interface MonthlyEmployeeRow {
    month: string;
    brutto: number;
    emerytalne: number;
    rentowe: number;
    chorobowe: number;
    zdrowotne: number;
    zaliczka: number;
    ppk: number;
    netto: number;
}

interface MonthlyEmployerRow {
    month: string;
    brutto: number;
    emerytalne: number;
    rentowe: number;
    wypadkowa: number;
    fp: number;
    fgsp: number;
    ppk: number;
    koszty: number;
}

// =============================================================================
// FAQ
// =============================================================================

const faqs = [
    {
        question: "Jak obliczyć wynagrodzenie netto z brutto?",
        answer: "Od kwoty brutto odejmujemy składki ZUS pracownika (emerytalna 9.76%, rentowa 1.5%, chorobowa 2.45%), następnie obliczamy zaliczkę na podatek dochodowy (12% lub 32% powyżej progu) i składkę zdrowotną (9%). Wynik to kwota netto.",
    },
    {
        question: "Ile wynosi płaca minimalna w 2026?",
        answer: `Przewidywana płaca minimalna w 2026 roku wynosi około ${MIN_WAGE_2026} zł brutto. Oznacza to wzrost o ok. 7% w stosunku do 2025 roku. Dokładna kwota zostanie ogłoszona przez rząd.`,
    },
    {
        question: "Co to są koszty uzyskania przychodu?",
        answer: "Koszty uzyskania przychodu to kwota odliczana od dochodu przed obliczeniem podatku. Podstawowe koszty wynoszą 250 zł miesięcznie, a podwyższone (dla dojeżdżających) 300 zł miesięcznie.",
    },
    {
        question: "Czym jest kwota zmniejszająca podatek?",
        answer: "Kwota zmniejszająca podatek to ulga podatkowa obowiązująca od lipca 2022 roku. Wynosi 300 zł miesięcznie i przysługuje dla dochodów do 120 000 zł rocznie. Zmniejsza ona obliczony podatek, nie podstawę opodatkowania.",
    },
    {
        question: "Ile składek płaci pracodawca?",
        answer: "Pracodawca płaci dodatkowo ok. 20% wynagrodzenia brutto na składki ZUS (emerytalna 9.76%, rentowa 6.5%, wypadkowa ok. 1.67%, FP 2.45%, FGŚP 0.1%).",
    },
];

// =============================================================================
// CALCULATION FUNCTION
// =============================================================================

function calculateBruttoFromNetto(
    targetNetto: number,
    koszyPodwyzszone: boolean,
    ulga26: boolean,
    ppk: boolean,
    ppkRate: number,
    contractType: ContractType,
): number {
    // Przybliżona iteracja - zaczynamy od netto * 1.4
    let bruttoEstimate = targetNetto * 1.4;
    let iterations = 0;
    const maxIterations = 50;

    while (iterations < maxIterations) {
        const result = calculateSalary(
            bruttoEstimate,
            koszyPodwyzszone,
            ulga26,
            ppk,
            ppkRate,
            contractType,
        );
        const diff = result.netto - targetNetto;

        if (Math.abs(diff) < 0.5) {
            return Math.round(bruttoEstimate);
        }

        // Dostosuj estimate
        bruttoEstimate -= diff * 0.7;
        iterations++;
    }

    return Math.round(bruttoEstimate);
}

function calculateSalary(
    brutto: number,
    koszyPodwyzszone: boolean,
    ulga26: boolean,
    ppk: boolean,
    ppkRate: number,
    contractType: ContractType,
): CalculationResult {
    // Składki społeczne pracownika - zależne od typu umowy
    let emerytalne = 0;
    let rentowe = 0;
    let chorobowe = 0;

    if (contractType === "employment") {
        // Umowa o pracę - pełne składki
        emerytalne = round2(brutto * ZUS_EMERYTALNE);
        rentowe = round2(brutto * ZUS_RENTOWE);
        chorobowe = round2(brutto * ZUS_CHOROBOWE);
    } else if (contractType === "contract") {
        // Umowa zlecenie - bez chorobowej (chyba że dobrowolnie)
        emerytalne = round2(brutto * ZUS_EMERYTALNE);
        rentowe = round2(brutto * ZUS_RENTOWE);
        chorobowe = 0;
    } else {
        // Umowa o dzieło - brak składek ZUS
        emerytalne = 0;
        rentowe = 0;
        chorobowe = 0;
    }

    const sumaSkladekPracownik = round2(emerytalne + rentowe + chorobowe);

    // PPK (jeśli włączone)
    const ppkPracownik = ppk ? round2(brutto * ppkRate) : 0;

    // Podstawa zdrowotnego
    const podstawaZdrowotne = round2(brutto - sumaSkladekPracownik);
    // Składka zdrowotna - dla umowy o dzieło nie ma obowiązku jeśli to dodatkowa umowa
    const zdrowotne =
        contractType === "work-agreement"
            ? 0
            : round2(podstawaZdrowotne * ZUS_ZDROWOTNE);

    // Koszty uzyskania przychodu
    const koszty = koszyPodwyzszone ? KOSZTY_PODWYZSZONE : KOSZTY_PODSTAWOWE;

    // Podstawa opodatkowania
    const podstawaOpodatkowania = Math.max(
        0,
        Math.round(brutto - sumaSkladekPracownik - koszty),
    );

    // Zaliczka na podatek
    let zaliczkaPodatek = 0;
    if (ulga26) {
        // Pełne zwolnienie z podatku dla osób do 26 lat
        // (w rzeczywistości obowiązuje limit 85 528 zł rocznie)
        zaliczkaPodatek = 0;
    } else {
        // Normalny podatek ze skalą progresywną i kwotą zmniejszającą
        const progMiesieczny = TAX_THRESHOLD / 12; // 10 000 zł miesięcznie

        let podatek = 0;
        if (podstawaOpodatkowania <= progMiesieczny) {
            // Cała kwota w pierwszym progu (12%)
            podatek = podstawaOpodatkowania * TAX_RATE_1;
        } else {
            // Część do progu 12%, reszta 32%
            // POPRAWKA: Pierwsza część (do progu) zawsze jest opodatkowana 12%
            const podProgu = progMiesieczny * TAX_RATE_1;
            // Tylko nadwyżka ponad próg jest opodatkowana 32%
            const nadProg =
                (podstawaOpodatkowania - progMiesieczny) * TAX_RATE_2;
            podatek = podProgu + nadProg;
        }

        // Odlicz kwotę zmniejszającą - ale tylko jeśli przysługuje
        // Kwota zmniejszająca przysługuje dla dochodów rocznych do 120 000 zł
        // W kalkulatorze miesięcznym zakładamy, że jeśli podstawa opodatkowania
        // przekracza próg miesięczny (10000 zł), to roczny dochód przekroczy limit
        const kwotaZmniejszajacaLimit = TAX_REDUCTION_INCOME_LIMIT / 12; // 10 000 zł miesięcznie
        const kwotaZmniejszajaca =
            podstawaOpodatkowania <= kwotaZmniejszajacaLimit
                ? TAX_REDUCTION_AMOUNT
                : 0;

        zaliczkaPodatek = Math.max(0, Math.round(podatek - kwotaZmniejszajaca));
    }

    // Netto
    const netto = round2(
        brutto -
            sumaSkladekPracownik -
            zdrowotne -
            zaliczkaPodatek -
            ppkPracownik,
    );

    // Całkowity koszt pracodawcy
    const pracodawcaEmery = round2(brutto * ZUS_EMERYTALNE);
    const pracodawcaRent = round2(brutto * EMPLOYER_RENTOWE);
    const pracodawcaWypad = round2(brutto * EMPLOYER_WYPADKOWA);
    const pracodawcaFP = round2(brutto * EMPLOYER_FP);
    const pracodawcaFGSP = round2(brutto * EMPLOYER_FGSP);
    const pracodawcaPPK = ppk ? round2(brutto * EMPLOYER_PPK) : 0;
    const pracodawcaKoszty = round2(
        brutto +
            pracodawcaEmery +
            pracodawcaRent +
            pracodawcaWypad +
            pracodawcaFP +
            pracodawcaFGSP +
            pracodawcaPPK,
    );

    return {
        brutto,
        emerytalne,
        rentowe,
        chorobowe,
        sumaSkladekPracownik,
        podstawaZdrowotne,
        zdrowotne,
        zdrowotneOdliczane: 0,
        podstawaOpodatkowania,
        zaliczkaPodatek,
        netto,
        pracodawcaKoszty,
    };
}

// =============================================================================
// MONTHLY BREAKDOWN FUNCTIONS
// =============================================================================

function calculateMonthlyEmployee(
    monthlyBrutto: number,
    kosztyPodwyzszone: boolean,
    ulga26: boolean,
    ppk: boolean,
    ppkRate: number,
    contractType: ContractType,
): MonthlyEmployeeRow[] {
    const rows: MonthlyEmployeeRow[] = [];
    let cumulativeBrutto = 0;

    for (let i = 0; i < 12; i++) {
        const brutto = monthlyBrutto;
        const prevCumBrutto = cumulativeBrutto;
        cumulativeBrutto += brutto;

        let emerytalne = 0;
        let rentowe = 0;
        let chorobowe = 0;

        if (contractType === "employment" || contractType === "contract") {
            if (prevCumBrutto >= ZUS_ANNUAL_CAP) {
                emerytalne = 0;
                rentowe = 0;
            } else if (cumulativeBrutto > ZUS_ANNUAL_CAP) {
                const basis = ZUS_ANNUAL_CAP - prevCumBrutto;
                emerytalne = round2(basis * ZUS_EMERYTALNE);
                rentowe = round2(basis * ZUS_RENTOWE);
            } else {
                emerytalne = round2(brutto * ZUS_EMERYTALNE);
                rentowe = round2(brutto * ZUS_RENTOWE);
            }
            if (contractType === "employment") {
                chorobowe = round2(brutto * ZUS_CHOROBOWE);
            }
        }

        const sumaSkladek = round2(emerytalne + rentowe + chorobowe);
        const ppkPracownik = ppk ? round2(brutto * ppkRate) : 0;
        const podstawaZdrowotne = round2(brutto - sumaSkladek);
        const zdrowotne =
            contractType === "work-agreement"
                ? 0
                : round2(podstawaZdrowotne * ZUS_ZDROWOTNE);

        const koszty = kosztyPodwyzszone
            ? KOSZTY_PODWYZSZONE
            : KOSZTY_PODSTAWOWE;
        const podstawaOpodatkowania = Math.max(
            0,
            Math.round(brutto - sumaSkladek - koszty),
        );

        let zaliczka = 0;
        if (!ulga26) {
            const progMiesieczny = TAX_THRESHOLD / 12;
            let podatek = 0;
            if (podstawaOpodatkowania <= progMiesieczny) {
                podatek = podstawaOpodatkowania * TAX_RATE_1;
            } else {
                podatek =
                    progMiesieczny * TAX_RATE_1 +
                    (podstawaOpodatkowania - progMiesieczny) * TAX_RATE_2;
            }
            const kwotaZmniejszajacaLimit = TAX_REDUCTION_INCOME_LIMIT / 12;
            const kwotaZmniejszajaca =
                podstawaOpodatkowania <= kwotaZmniejszajacaLimit
                    ? TAX_REDUCTION_AMOUNT
                    : 0;
            zaliczka = Math.max(0, Math.round(podatek - kwotaZmniejszajaca));
        }

        const netto = round2(
            brutto - sumaSkladek - zdrowotne - zaliczka - ppkPracownik,
        );

        rows.push({
            month: MONTHS_PL[i],
            brutto,
            emerytalne,
            rentowe,
            chorobowe,
            zdrowotne,
            zaliczka,
            ppk: ppkPracownik,
            netto,
        });
    }

    return rows;
}

function calculateMonthlyEmployer(
    monthlyBrutto: number,
    ppk: boolean,
    contractType: ContractType,
): MonthlyEmployerRow[] {
    const rows: MonthlyEmployerRow[] = [];
    let cumulativeBrutto = 0;

    for (let i = 0; i < 12; i++) {
        const brutto = monthlyBrutto;
        const prevCumBrutto = cumulativeBrutto;
        cumulativeBrutto += brutto;

        let emerytalne = 0;
        let rentowe = 0;
        let wypadkowa = 0;
        let fp = 0;
        let fgsp = 0;

        if (contractType === "employment" || contractType === "contract") {
            if (prevCumBrutto >= ZUS_ANNUAL_CAP) {
                emerytalne = 0;
                rentowe = 0;
            } else if (cumulativeBrutto > ZUS_ANNUAL_CAP) {
                const basis = ZUS_ANNUAL_CAP - prevCumBrutto;
                emerytalne = round2(basis * ZUS_EMERYTALNE);
                rentowe = round2(basis * EMPLOYER_RENTOWE);
            } else {
                emerytalne = round2(brutto * ZUS_EMERYTALNE);
                rentowe = round2(brutto * EMPLOYER_RENTOWE);
            }
            wypadkowa = round2(brutto * EMPLOYER_WYPADKOWA);
            fp = round2(brutto * EMPLOYER_FP);
            fgsp = round2(brutto * EMPLOYER_FGSP);
        }

        const ppkEmployer = ppk ? round2(brutto * EMPLOYER_PPK) : 0;
        const koszty = round2(
            brutto + emerytalne + rentowe + wypadkowa + fp + fgsp + ppkEmployer,
        );

        rows.push({
            month: MONTHS_PL[i],
            brutto,
            emerytalne,
            rentowe,
            wypadkowa,
            fp,
            fgsp,
            ppk: ppkEmployer,
            koszty,
        });
    }

    return rows;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function KalkulatorWynagrodzenPage() {
    const [mode, setMode] = useState<CalculationMode>("brutto-to-netto");
    const [inputValue, setInputValue] = useState<string>(
        MIN_WAGE_2026.toString(),
    );
    const [contractType, setContractType] =
        useState<ContractType>("employment");
    const [kosztyPodwyzszone, setKosztyPodwyzszone] = useState(false);
    const [ulga26, setUlga26] = useState(false);
    const [ppk, setPpk] = useState(false);
    const [ppkRate, setPpkRate] = useState("0.02");
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailTab, setDetailTab] = useState<"employee" | "employer">(
        "employee",
    );

    const inputNum = parseFloat(inputValue) || 0;

    // Oblicz brutto w zależności od trybu
    const bruttoNum = useMemo(() => {
        if (mode === "brutto-to-netto") {
            return inputNum;
        } else {
            return calculateBruttoFromNetto(
                inputNum,
                kosztyPodwyzszone,
                ulga26,
                ppk,
                parseFloat(ppkRate),
                contractType,
            );
        }
    }, [mode, inputNum, kosztyPodwyzszone, ulga26, ppk, ppkRate, contractType]);

    const result = useMemo(
        () =>
            calculateSalary(
                bruttoNum,
                kosztyPodwyzszone,
                ulga26,
                ppk,
                parseFloat(ppkRate),
                contractType,
            ),
        [bruttoNum, kosztyPodwyzszone, ulga26, ppk, ppkRate, contractType],
    );

    const monthlyEmployee = useMemo(
        () =>
            calculateMonthlyEmployee(
                bruttoNum,
                kosztyPodwyzszone,
                ulga26,
                ppk,
                parseFloat(ppkRate),
                contractType,
            ),
        [bruttoNum, kosztyPodwyzszone, ulga26, ppk, ppkRate, contractType],
    );

    const monthlyEmployer = useMemo(
        () => calculateMonthlyEmployer(bruttoNum, ppk, contractType),
        [bruttoNum, ppk, contractType],
    );

    const employeeTotals = useMemo(() => {
        const t = {
            brutto: 0,
            emerytalne: 0,
            rentowe: 0,
            chorobowe: 0,
            zdrowotne: 0,
            zaliczka: 0,
            ppk: 0,
            netto: 0,
        };
        for (const r of monthlyEmployee) {
            t.brutto += r.brutto;
            t.emerytalne += r.emerytalne;
            t.rentowe += r.rentowe;
            t.chorobowe += r.chorobowe;
            t.zdrowotne += r.zdrowotne;
            t.zaliczka += r.zaliczka;
            t.ppk += r.ppk;
            t.netto += r.netto;
        }
        return {
            brutto: round2(t.brutto),
            emerytalne: round2(t.emerytalne),
            rentowe: round2(t.rentowe),
            chorobowe: round2(t.chorobowe),
            zdrowotne: round2(t.zdrowotne),
            zaliczka: round2(t.zaliczka),
            ppk: round2(t.ppk),
            netto: round2(t.netto),
        };
    }, [monthlyEmployee]);

    const employerTotals = useMemo(() => {
        const t = {
            brutto: 0,
            emerytalne: 0,
            rentowe: 0,
            wypadkowa: 0,
            fp: 0,
            fgsp: 0,
            ppk: 0,
            koszty: 0,
        };
        for (const r of monthlyEmployer) {
            t.brutto += r.brutto;
            t.emerytalne += r.emerytalne;
            t.rentowe += r.rentowe;
            t.wypadkowa += r.wypadkowa;
            t.fp += r.fp;
            t.fgsp += r.fgsp;
            t.ppk += r.ppk;
            t.koszty += r.koszty;
        }
        return {
            brutto: round2(t.brutto),
            emerytalne: round2(t.emerytalne),
            rentowe: round2(t.rentowe),
            wypadkowa: round2(t.wypadkowa),
            fp: round2(t.fp),
            fgsp: round2(t.fgsp),
            ppk: round2(t.ppk),
            koszty: round2(t.koszty),
        };
    }, [monthlyEmployer]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("pl-PL", {
            style: "currency",
            currency: "PLN",
            minimumFractionDigits: 2,
        }).format(value);

    const fmt = (value: number) =>
        new Intl.NumberFormat("pl-PL", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);

    return (
        <SEOPageLayout>
            {/* Breadcrumbs */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Breadcrumbs
                    items={[
                        { label: "Narzędzia", href: "/narzedzia" },
                        { label: "Kalkulator wynagrodzeń" },
                    ]}
                />
            </div>

            {/* Hero */}
            <UniversalHero
                badge={{ icon: Calculator, text: "Kalkulator online" }}
                title="Kalkulator Wynagrodzeń"
                titleHighlight="Netto Brutto 2026"
                subtitle="Przelicz dokładnie swoje wynagrodzenie z uwzględnieniem wszystkich składek ZUS i podatków według stawek na 2026 rok."
            />

            {/* Kalkulator */}
            <section className="py-8 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-8">
                            <Card className="p-6 rounded-xl">
                                <div className="mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                        Dane do obliczeń
                                    </h2>

                                    {/* Przełącznik Brutto/Netto */}
                                    <div className="flex items-center justify-center gap-2 p-1 bg-gray-100 rounded-lg">
                                        <button
                                            onClick={() =>
                                                setMode("brutto-to-netto")
                                            }
                                            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                                                mode === "brutto-to-netto"
                                                    ? "bg-white text-blue-600 shadow-sm"
                                                    : "text-gray-600 hover:text-gray-900"
                                            }`}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <Banknote className="w-4 h-4" />
                                                <span>Brutto</span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() =>
                                                setMode("netto-to-brutto")
                                            }
                                            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                                                mode === "netto-to-brutto"
                                                    ? "bg-white text-emerald-600 shadow-sm"
                                                    : "text-gray-600 hover:text-gray-900"
                                            }`}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <TrendingUp className="w-4 h-4" />
                                                <span>Netto</span>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Typ umowy */}
                                    <div>
                                        <Label className="text-xs text-gray-500 mb-2 block">
                                            Wynagrodzenie otrzymuję z tytułu
                                            umowy
                                        </Label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setContractType(
                                                        "employment",
                                                    )
                                                }
                                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                                                    contractType ===
                                                    "employment"
                                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                                }`}
                                            >
                                                o pracę
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setContractType("contract")
                                                }
                                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                                                    contractType === "contract"
                                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                                }`}
                                            >
                                                zlecenie
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setContractType(
                                                        "work-agreement",
                                                    )
                                                }
                                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                                                    contractType ===
                                                    "work-agreement"
                                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                                }`}
                                            >
                                                o dzieło
                                            </button>
                                        </div>
                                    </div>

                                    {/* Input kwoty */}
                                    <div>
                                        <Label className="text-xs text-gray-500 mb-2 block">
                                            {mode === "brutto-to-netto"
                                                ? "Wynagrodzenie brutto"
                                                : "Wynagrodzenie netto"}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={inputValue}
                                                onChange={(e) =>
                                                    setInputValue(
                                                        e.target.value,
                                                    )
                                                }
                                                className="text-lg h-12 pr-12"
                                                placeholder="5000"
                                                min="0"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                                                PLN
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 my-3">
                                            Min. krajowa 2026:{" "}
                                            {formatCurrency(MIN_WAGE_2026)}{" "}
                                            brutto
                                        </p>
                                    </div>

                                    {/* Opcje */}
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700">
                                                    Podwyższone koszty
                                                </Label>
                                                <p className="text-xs text-gray-500">
                                                    Dla dojeżdżających (300
                                                    zł/mies.)
                                                </p>
                                            </div>
                                            <Switch
                                                checked={kosztyPodwyzszone}
                                                onCheckedChange={
                                                    setKosztyPodwyzszone
                                                }
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700">
                                                    Ulga dla młodych (do 26 lat)
                                                </Label>
                                                <p className="text-xs text-gray-500">
                                                    Zwolnienie z PIT do 85 528
                                                    zł/rok
                                                </p>
                                            </div>
                                            <Switch
                                                checked={ulga26}
                                                onCheckedChange={setUlga26}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700">
                                                    PPK (Pracownicze Plany
                                                    Kapitałowe)
                                                </Label>
                                                <p className="text-xs text-gray-500">
                                                    Składka pracownika 2%
                                                </p>
                                            </div>
                                            <Switch
                                                checked={ppk}
                                                onCheckedChange={setPpk}
                                            />
                                        </div>

                                        {ppk && (
                                            <div className="pl-4">
                                                <Label className="text-sm text-gray-600">
                                                    Wysokość składki PPK
                                                </Label>
                                                <Select
                                                    value={ppkRate}
                                                    onValueChange={setPpkRate}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0.02">
                                                            2% (podstawowa)
                                                        </SelectItem>
                                                        <SelectItem value="0.025">
                                                            2.5%
                                                        </SelectItem>
                                                        <SelectItem value="0.03">
                                                            3%
                                                        </SelectItem>
                                                        <SelectItem value="0.035">
                                                            3.5%
                                                        </SelectItem>
                                                        <SelectItem value="0.04">
                                                            4% (maksymalna)
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* Szczegółowe obliczenia */}
                            <Card className="p-6 rounded-xl">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                                    Szczegóły obliczeń
                                </h2>

                                <div className="space-y-4">
                                    {/* Składki ZUS */}
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            Składki ZUS pracownika
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    Emerytalna (9.76%)
                                                </span>
                                                <span className="text-gray-900">
                                                    {formatCurrency(
                                                        result.emerytalne,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    Rentowa (1.5%)
                                                </span>
                                                <span className="text-gray-900">
                                                    {formatCurrency(
                                                        result.rentowe,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    Chorobowa (2.45%)
                                                </span>
                                                <span className="text-gray-900">
                                                    {formatCurrency(
                                                        result.chorobowe,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm font-medium border-t pt-2">
                                                <span className="text-gray-700">
                                                    Razem składki społeczne
                                                </span>
                                                <span className="text-red-600">
                                                    -
                                                    {formatCurrency(
                                                        result.sumaSkladekPracownik,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Zdrowotne */}
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Heart className="w-4 h-4" />
                                            Składka zdrowotna
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    Podstawa
                                                </span>
                                                <span className="text-gray-900">
                                                    {formatCurrency(
                                                        result.podstawaZdrowotne,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-gray-700">
                                                    Zdrowotna (9%)
                                                </span>
                                                <span className="text-red-600">
                                                    -
                                                    {formatCurrency(
                                                        result.zdrowotne,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Podatek */}
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Percent className="w-4 h-4" />
                                            Podatek dochodowy
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    Podstawa opodatkowania
                                                </span>
                                                <span className="text-gray-900">
                                                    {formatCurrency(
                                                        result.podstawaOpodatkowania,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-gray-700">
                                                    Zaliczka na podatek (12%)
                                                </span>
                                                <span className="text-red-600">
                                                    -
                                                    {formatCurrency(
                                                        result.zaliczkaPodatek,
                                                    )}
                                                </span>
                                            </div>
                                            {ulga26 && (
                                                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                                                    <Info className="w-3 h-3" />
                                                    Ulga dla młodych -
                                                    zwolnienie z PIT
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* PPK */}
                                    {ppk && (
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Briefcase className="w-4 h-4" />
                                                PPK
                                            </h3>
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-gray-700">
                                                    Składka pracownika (
                                                    {(
                                                        parseFloat(ppkRate) *
                                                        100
                                                    ).toFixed(1)}
                                                    %)
                                                </span>
                                                <span className="text-red-600">
                                                    -
                                                    {formatCurrency(
                                                        bruttoNum *
                                                            parseFloat(ppkRate),
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Podsumowanie */}
                                    <div className="border-t-2 pt-4 mt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-medium text-gray-600">
                                                Wynagrodzenie brutto
                                            </span>
                                            <span className="text-lg font-semibold text-blue-600">
                                                {formatCurrency(result.brutto)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-semibold text-gray-900">
                                                Do wypłaty (netto)
                                            </span>
                                            <span className="text-2xl font-bold text-emerald-600">
                                                {formatCurrency(result.netto)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            {(
                                                (result.netto / result.brutto) *
                                                100
                                            ).toFixed(1)}
                                            % kwoty brutto
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Szczegółowa tabela miesięczna */}
            <section className="py-12 bg-linear-to-br from-blue-50 via-white to-violet-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
                            Podsumowanie roczne
                        </h2>

                        {/* 3 karty podsumowania */}
                        <div className="grid sm:grid-cols-3 gap-6 mb-8">
                            <Card className="p-6 rounded-2xl bg-linear-to-br from-blue-50 to-blue-100/50 border-blue-200">
                                <div className="text-center space-y-2">
                                    <div className="text-sm font-medium text-blue-700 uppercase tracking-wide">
                                        Brutto
                                    </div>
                                    <div className="text-3xl font-bold text-blue-900">
                                        {formatCurrency(result.brutto)}
                                    </div>
                                    <div className="text-xs text-blue-600">
                                        miesięcznie
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-6 rounded-2xl bg-linear-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 ring-2 ring-emerald-300">
                                <div className="text-center space-y-2">
                                    <div className="text-sm font-medium text-emerald-700 uppercase tracking-wide">
                                        Netto
                                    </div>
                                    <div className="text-3xl font-bold text-emerald-900">
                                        {formatCurrency(result.netto)}
                                    </div>
                                    <div className="text-xs text-emerald-600">
                                        do wypłaty
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-6 rounded-2xl bg-linear-to-br from-violet-50 to-violet-100/50 border-violet-200">
                                <div className="text-center space-y-2">
                                    <div className="text-sm font-medium text-violet-700 uppercase tracking-wide">
                                        Koszt pracodawcy
                                    </div>
                                    <div className="text-3xl font-bold text-violet-900">
                                        {formatCurrency(
                                            result.pracodawcaKoszty,
                                        )}
                                    </div>
                                    <div className="text-xs text-violet-600">
                                        miesięcznie
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Rozwijana tabela */}
                        <Collapsible
                            open={detailsOpen}
                            onOpenChange={setDetailsOpen}
                        >
                            <CollapsibleTrigger asChild>
                                <button className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                                    <span>
                                        {detailsOpen
                                            ? "Ukryj szczegóły"
                                            : "Więcej szczegółów"}
                                    </span>
                                    <ChevronDown
                                        className={`w-4 h-4 transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
                                    />
                                </button>
                            </CollapsibleTrigger>

                            <CollapsibleContent className="mt-6">
                                {/* Przełącznik Pracownik / Pracodawca */}
                                <div className="flex items-center justify-center gap-2 p-1 bg-gray-100 rounded-lg mb-6 max-w-xs mx-auto">
                                    <button
                                        onClick={() => setDetailTab("employee")}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                            detailTab === "employee"
                                                ? "bg-white text-blue-600 shadow-sm"
                                                : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        Pracownik
                                    </button>
                                    <button
                                        onClick={() => setDetailTab("employer")}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                            detailTab === "employer"
                                                ? "bg-white text-violet-600 shadow-sm"
                                                : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        Pracodawca
                                    </button>
                                </div>

                                <Card className="rounded-xl overflow-hidden">
                                    {detailTab === "employee" ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-50">
                                                    <TableHead className="font-semibold text-gray-700">
                                                        Miesiąc
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        Brutto
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        Emerytalna
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        Rentowa
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        Chorobowa
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        Zdrowotna
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        Zaliczka
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        PPK
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-emerald-700">
                                                        Netto
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {monthlyEmployee.map((row) => (
                                                    <TableRow key={row.month}>
                                                        <TableCell className="font-medium text-gray-900">
                                                            {row.month}
                                                        </TableCell>
                                                        <TableCell className="text-right text-gray-700">
                                                            {fmt(row.brutto)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(
                                                                row.emerytalne,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(row.rentowe)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(row.chorobowe)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(row.zdrowotne)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(row.zaliczka)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(row.ppk)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold text-emerald-600">
                                                            {fmt(row.netto)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow className="bg-gray-100 font-semibold">
                                                    <TableCell className="font-bold text-gray-900">
                                                        SUMA
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-gray-900">
                                                        {fmt(
                                                            employeeTotals.brutto,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(
                                                            employeeTotals.emerytalne,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(
                                                            employeeTotals.rentowe,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(
                                                            employeeTotals.chorobowe,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(
                                                            employeeTotals.zdrowotne,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(
                                                            employeeTotals.zaliczka,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(
                                                            employeeTotals.ppk,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-emerald-700">
                                                        {fmt(
                                                            employeeTotals.netto,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-50">
                                                    <TableHead className="font-semibold text-gray-700">
                                                        Miesiąc
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        Brutto
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        Emerytalna
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        Rentowa
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        Wypadkowa
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        FP
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        FGŚP
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-gray-700">
                                                        PPK
                                                    </TableHead>
                                                    <TableHead className="text-right font-semibold text-violet-700">
                                                        Koszty
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {monthlyEmployer.map((row) => (
                                                    <TableRow key={row.month}>
                                                        <TableCell className="font-medium text-gray-900">
                                                            {row.month}
                                                        </TableCell>
                                                        <TableCell className="text-right text-gray-700">
                                                            {fmt(row.brutto)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(
                                                                row.emerytalne,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(row.rentowe)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(row.wypadkowa)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(row.fp)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(row.fgsp)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-red-600">
                                                            {fmt(row.ppk)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold text-violet-600">
                                                            {fmt(row.koszty)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow className="bg-gray-100 font-semibold">
                                                    <TableCell className="font-bold text-gray-900">
                                                        SUMA
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-gray-900">
                                                        {fmt(
                                                            employerTotals.brutto,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(
                                                            employerTotals.emerytalne,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(
                                                            employerTotals.rentowe,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(
                                                            employerTotals.wypadkowa,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(employerTotals.fp)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(
                                                            employerTotals.fgsp,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {fmt(
                                                            employerTotals.ppk,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-violet-700">
                                                        {fmt(
                                                            employerTotals.koszty,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    )}
                                </Card>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                </div>
            </section>

            {/* Tabela stawek */}
            <section className="py-12 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                            Stawki i progi podatkowe{" "}
                            <span className="bg-linear-to-r from-blue-600 to-violet-500 bg-clip-text text-transparent">
                                2026
                            </span>
                        </h2>

                        <div className="grid sm:grid-cols-2 gap-6">
                            <Card className="p-6 rounded-xl">
                                <h3 className="font-semibold text-gray-900 mb-4">
                                    Składki ZUS
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Emerytalna (pracownik)
                                        </span>
                                        <span className="font-medium">
                                            9.76%
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Rentowa (pracownik)
                                        </span>
                                        <span className="font-medium">
                                            1.5%
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Chorobowa
                                        </span>
                                        <span className="font-medium">
                                            2.45%
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Zdrowotna
                                        </span>
                                        <span className="font-medium">9%</span>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 rounded-xl">
                                <h3 className="font-semibold text-gray-900 mb-4">
                                    Podatek PIT
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Stawka podstawowa
                                        </span>
                                        <span className="font-medium">12%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Próg podatkowy
                                        </span>
                                        <span className="font-medium">
                                            120 000 zł/rok
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Stawka powyżej progu
                                        </span>
                                        <span className="font-medium">32%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Kwota wolna
                                        </span>
                                        <span className="font-medium">
                                            30 000 zł/rok
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <Card className="mt-6 p-4 rounded-xl bg-amber-50 border-amber-100">
                            <div className="flex gap-3">
                                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                                <p className="text-sm text-amber-800">
                                    Powyższe stawki są prognozowane na 2026 rok
                                    i mogą ulec zmianie. Ostateczne wartości
                                    zostaną ogłoszone przez Ministerstwo
                                    Finansów.
                                </p>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <FAQSectionDynamic
                title="Najczęściej zadawane pytania"
                faqs={faqs}
            />

            {/* CTA */}
            <CTABanner
                variant="gradient"
                title="Zarządzaj wynagrodzeniami zespołu"
                description="Calenda pomoże Ci planować grafiki i śledzić przepracowane godziny. Obliczenia wynagrodzeń jeszcze nigdy nie były tak proste."
                primaryButton={{
                    text: "Rozpocznij za darmo",
                    href: "/rejestracja",
                }}
                secondaryButton={{
                    text: "Zobacz demo",
                    href: "/#demo",
                }}
            />
        </SEOPageLayout>
    );
}
