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
const ZUS_ANNUAL_CAP = 282600;

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

        // Kwota zmniejszająca podatek - 300 zł miesięcznie (PIT-2)
        const kwotaZmniejszajaca = TAX_REDUCTION_AMOUNT;

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
// MONTHLY BREAKDOWN FUNCTIONS (CUMULATIVE TRACKING)
// =============================================================================

interface CumulativeState {
    brutto: number;
    taxBase: number;
}

function calculateOneMonthEmployee(
    brutto: number,
    cumState: CumulativeState,
    kosztyPodwyzszone: boolean,
    ulga26: boolean,
    ppk: boolean,
    ppkRate: number,
    contractType: ContractType,
): { row: MonthlyEmployeeRow; newCumState: CumulativeState } {
    const prevCumBrutto = cumState.brutto;
    const newCumBrutto = prevCumBrutto + brutto;

    let emerytalne = 0;
    let rentowe = 0;
    let chorobowe = 0;

    if (contractType === "employment" || contractType === "contract") {
        if (prevCumBrutto >= ZUS_ANNUAL_CAP) {
            emerytalne = 0;
            rentowe = 0;
        } else if (newCumBrutto > ZUS_ANNUAL_CAP) {
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

    const koszty = kosztyPodwyzszone ? KOSZTY_PODWYZSZONE : KOSZTY_PODSTAWOWE;
    const podstawaOpodatkowania = Math.max(
        0,
        Math.round(brutto - sumaSkladek - koszty),
    );

    let zaliczka = 0;
    if (!ulga26) {
        const prevCumTaxBase = cumState.taxBase;
        const newCumTaxBase = prevCumTaxBase + podstawaOpodatkowania;

        let podatek = 0;
        if (prevCumTaxBase >= TAX_THRESHOLD) {
            // Cały miesiąc w II progu
            podatek = podstawaOpodatkowania * TAX_RATE_2;
        } else if (newCumTaxBase > TAX_THRESHOLD) {
            // Miesiąc przekracza próg
            const inFirst = TAX_THRESHOLD - prevCumTaxBase;
            const inSecond = podstawaOpodatkowania - inFirst;
            podatek = inFirst * TAX_RATE_1 + inSecond * TAX_RATE_2;
        } else {
            // Cały miesiąc w I progu
            podatek = podstawaOpodatkowania * TAX_RATE_1;
        }

        // Kwota zmniejszająca podatek - 300 zł miesięcznie (PIT-2)
        zaliczka = Math.max(0, Math.round(podatek - TAX_REDUCTION_AMOUNT));
    }

    const netto = round2(
        brutto - sumaSkladek - zdrowotne - zaliczka - ppkPracownik,
    );

    return {
        row: {
            month: "",
            brutto: round2(brutto),
            emerytalne,
            rentowe,
            chorobowe,
            zdrowotne,
            zaliczka,
            ppk: ppkPracownik,
            netto,
        },
        newCumState: {
            brutto: newCumBrutto,
            taxBase: cumState.taxBase + podstawaOpodatkowania,
        },
    };
}

function calculateMonthlyEmployee(
    monthlyBrutto: number,
    kosztyPodwyzszone: boolean,
    ulga26: boolean,
    ppk: boolean,
    ppkRate: number,
    contractType: ContractType,
): MonthlyEmployeeRow[] {
    const rows: MonthlyEmployeeRow[] = [];
    let cumState: CumulativeState = { brutto: 0, taxBase: 0 };

    for (let i = 0; i < 12; i++) {
        const { row, newCumState } = calculateOneMonthEmployee(
            monthlyBrutto,
            cumState,
            kosztyPodwyzszone,
            ulga26,
            ppk,
            ppkRate,
            contractType,
        );
        row.month = MONTHS_PL[i];
        rows.push(row);
        cumState = newCumState;
    }

    return rows;
}

function calculateMonthlyFromNetto(
    targetNetto: number,
    kosztyPodwyzszone: boolean,
    ulga26: boolean,
    ppk: boolean,
    ppkRate: number,
    contractType: ContractType,
): MonthlyEmployeeRow[] {
    const rows: MonthlyEmployeeRow[] = [];
    let cumState: CumulativeState = { brutto: 0, taxBase: 0 };

    for (let i = 0; i < 12; i++) {
        // Iteracyjne szukanie brutto dla danego netto
        let bruttoEst = targetNetto * 1.5;

        for (let iter = 0; iter < 100; iter++) {
            const { row } = calculateOneMonthEmployee(
                bruttoEst,
                cumState,
                kosztyPodwyzszone,
                ulga26,
                ppk,
                ppkRate,
                contractType,
            );
            const diff = row.netto - targetNetto;
            if (Math.abs(diff) < 0.01) break;
            bruttoEst -= diff * 0.75;
        }

        const { row, newCumState } = calculateOneMonthEmployee(
            bruttoEst,
            cumState,
            kosztyPodwyzszone,
            ulga26,
            ppk,
            ppkRate,
            contractType,
        );
        row.month = MONTHS_PL[i];
        row.brutto = round2(bruttoEst);
        // Przelicz netto z zaokrąglonym brutto
        const finalCalc = calculateOneMonthEmployee(
            row.brutto,
            cumState,
            kosztyPodwyzszone,
            ulga26,
            ppk,
            ppkRate,
            contractType,
        );
        finalCalc.row.month = MONTHS_PL[i];
        rows.push(finalCalc.row);
        cumState = finalCalc.newCumState;
    }

    return rows;
}

function calculateMonthlyEmployer(
    monthlyBruttos: number[],
    ppk: boolean,
    contractType: ContractType,
): MonthlyEmployerRow[] {
    const rows: MonthlyEmployerRow[] = [];
    let cumulativeBrutto = 0;

    for (let i = 0; i < 12; i++) {
        const brutto = monthlyBruttos[i] || 0;
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

    const monthlyEmployee = useMemo(() => {
        if (mode === "brutto-to-netto") {
            return calculateMonthlyEmployee(
                bruttoNum,
                kosztyPodwyzszone,
                ulga26,
                ppk,
                parseFloat(ppkRate),
                contractType,
            );
        } else {
            return calculateMonthlyFromNetto(
                inputNum,
                kosztyPodwyzszone,
                ulga26,
                ppk,
                parseFloat(ppkRate),
                contractType,
            );
        }
    }, [
        mode,
        inputNum,
        bruttoNum,
        kosztyPodwyzszone,
        ulga26,
        ppk,
        ppkRate,
        contractType,
    ]);

    const monthlyEmployer = useMemo(
        () =>
            calculateMonthlyEmployer(
                monthlyEmployee.map((r) => r.brutto),
                ppk,
                contractType,
            ),
        [monthlyEmployee, ppk, contractType],
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

            {/* Poradnik - treści edukacyjne */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
                            Poradnik:{" "}
                            <span className="bg-linear-to-r from-blue-600 to-violet-500 bg-clip-text text-transparent">
                                Kalkulator wynagrodzeń
                            </span>
                        </h2>

                        <div className="space-y-10 text-gray-700 leading-relaxed text-[15px]">
                            {/* Czym jest kalkulator */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Czym jest kalkulator wynagrodzeń brutto
                                    netto?
                                </h3>
                                <p>
                                    Kalkulator wynagrodzeń brutto netto jest
                                    narzędziem pozwalającym obliczyć wysokość
                                    miesięcznej pensji dla określonych
                                    parametrów. Dzięki temu dowiemy się, jaką
                                    konkretnie kwotę otrzymamy każdego miesiąca
                                    &quot;na rękę&quot;. Kalkulator wynagrodzeń
                                    brutto netto przygotowany został z myślą o
                                    pracownikach i pracodawcach. Ci pierwsi mogą
                                    sprawdzić, jak wysokość wynagrodzenia brutto
                                    netto będzie kształtować się każdego
                                    miesiąca oraz w ujęciu rocznym. Pracodawcy
                                    natomiast mogą dokładnie określić, jakie
                                    dodatkowe składki muszą doliczyć do płacy
                                    brutto z uwzględnieniem różnych form
                                    zatrudnienia.
                                </p>
                                <p className="mt-3">
                                    Przeliczając nasze wynagrodzenie z kwoty
                                    brutto na kwotę netto dowiemy się dokładnie,
                                    ile wynosi składka rentowa, składka
                                    chorobowa, składka zdrowotna i emerytalna
                                    oraz zaliczka na podatek dochodowy. Jeśli
                                    korzystamy z Pracowniczych Planów
                                    Kapitałowych (PPK), kalkulator obliczy
                                    również zmniejszenia z tego tytułu. Z kolei
                                    pracodawcy mogą sprawdzić dokładne
                                    obciążenia płacy brutto wynikające z
                                    konieczności naliczenia składki emerytalnej,
                                    składki rentowej, składki wypadkowej,
                                    składki na Fundusz Pracy (FP), składki na
                                    Fundusz Gwarantowanych Świadczeń
                                    Pracowniczych (FGŚP). Kalkulator wynagrodzeń
                                    zwraca również koszt PPK po stronie
                                    pracodawcy.
                                </p>
                            </div>

                            {/* Brutto i netto */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Wynagrodzenie brutto i netto - co oznacza?
                                </h3>
                                <p>
                                    Podejmując się pracy i skupiając się na
                                    kwestiach zarobkowych najbardziej interesuje
                                    nas, jaka kwota wpłynie każdego miesiąca na
                                    nasze konto bankowe. W trakcie rozmów o
                                    pracę rekruterzy najczęściej operują kwotami
                                    brutto, które są wyraźnie wyższe, niż suma,
                                    którą otrzymamy za wykonaną pracę.
                                </p>
                                <div className="mt-4 space-y-3">
                                    <Card className="p-4 rounded-lg border-blue-100 bg-blue-50/50">
                                        <p>
                                            <strong className="text-blue-800">
                                                Wynagrodzenie brutto
                                            </strong>{" "}
                                            - to wynagrodzenie zawierające
                                            podatek dochodowy oraz pozostałe
                                            składki, których liczba i kwota
                                            zależy od podstawy zatrudnienia.
                                            Wynagrodzenie brutto najczęściej
                                            pojawia się w ogłoszeniach o pracę
                                            czy zapisywane jest w umowie
                                            zawartej z pracodawcą.
                                        </p>
                                    </Card>
                                    <Card className="p-4 rounded-lg border-emerald-100 bg-emerald-50/50">
                                        <p>
                                            <strong className="text-emerald-800">
                                                Wynagrodzenie netto
                                            </strong>{" "}
                                            - jest to kwota do naszej
                                            dyspozycji, którą otrzymujemy po
                                            uwzględnieniu wszystkich obciążeń,
                                            jak składki ZUS i zaliczka na
                                            podatek dochodowy od osób
                                            fizycznych. Liczba i rodzaj potrąceń
                                            wynika m.in. z rodzaju zawartej
                                            umowy.
                                        </p>
                                    </Card>
                                </div>
                            </div>

                            {/* Jak działa kalkulator */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Jak działa kalkulator wynagrodzeń?
                                </h3>
                                <p>
                                    Kalkulator wynagrodzeń pozwala przeliczyć
                                    zarobki netto brutto oraz koszty pracodawcy
                                    na podstawie szeregu kluczowych parametrów.
                                    W pierwszej kolejności trzeba określić, w
                                    jakim roku podatkowym otrzymywaliśmy lub
                                    otrzymujemy wynagrodzenie. To ważne,
                                    ponieważ z uwagi na zmieniające się przepisy
                                    kwoty potrąceń mogą się od siebie różnić.
                                </p>
                                <p className="mt-3">
                                    Kalkulator wynagrodzeń pozwala również
                                    przeprowadzać obliczenia na podstawie kwot
                                    brutto i netto. Jest to przydatne np. w
                                    sytuacji, kiedy wiemy ile chcemy zarabiać
                                    każdego miesiąca na rękę, ale nie mamy
                                    pojęcia, jaka to kwota brutto. Kolejnym
                                    etapem jest określenie, z jakiej tytułu
                                    umowy pobieramy wynagrodzenie. Do wyboru
                                    jest umowa o pracę, umowa o dzieło i umowa
                                    zlecenie. Wybór każdej z opcji wpływa na
                                    zmiany w pobranych składkach i zaliczkach na
                                    podatek dochodowy.
                                </p>
                            </div>

                            {/* Umowa o pracę */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Kalkulator wynagrodzeń - zatrudnienie
                                    tytułem umowy o pracę
                                </h3>
                                <p>
                                    Dla umowy o pracę możemy wziąć pod uwagę np.
                                    kwotę wolną od podatku, pracę poza miejscem
                                    zamieszkania, PPK, autorskie koszty
                                    uzyskania przychodu, ulgę na powrót, ulgę
                                    dla rodzin 4+, ulgę dla osób do 26 roku
                                    życia. Bez problemu możemy sprawdzić również
                                    koszty pracodawcy, na które oprócz składek
                                    na ubezpieczenia społeczne wpływają także
                                    składki na Fundusz Pracy i FGŚP.
                                </p>
                            </div>

                            {/* Umowa zlecenie */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Kalkulator wynagrodzeń - praca na umowę
                                    zlecenie
                                </h3>
                                <p>
                                    W przypadku umowy zlecenie możemy
                                    doprecyzować formę zatrudnienia. Każda z
                                    opcji może wpływać na wysokość składek i
                                    kwotę zaliczki na podatek dochodowy. Możemy
                                    również określić czy jesteśmy w&nbsp;wieku
                                    poniżej 26 lat, co związane jest ze
                                    skorzystaniem z ulgi dla młodych, którzy
                                    osiągają w roku podatkowym dochody nie
                                    wyższe niż 85&nbsp;528 zł rocznie.
                                </p>
                            </div>

                            {/* Umowa o dzieło */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Kalkulator wynagrodzeń - praca na umowę o
                                    dzieło
                                </h3>
                                <p>
                                    Kalkulator płac pozwala także oszacować
                                    wynagrodzenie netto lub wynagrodzenie brutto
                                    w sytuacji, kiedy osiągamy dochody na
                                    podstawie umowy o dzieło. W tym wariancie
                                    mamy możliwość wskazania, że jesteśmy
                                    zatrudnieni na podstawie umowy o dzieło u
                                    obecnego pracodawcy, co skutkować będzie
                                    naliczeniem składki emerytalnej, rentowej,
                                    chorobowej i składki zdrowotnej.
                                </p>
                            </div>

                            {/* Jak obliczyć brutto z netto */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Jak obliczyć wynagrodzenie brutto znając
                                    kwotę netto?
                                </h3>
                                <p>
                                    Aby obliczyć, o jaką kwotę nasze miesięczne
                                    wynagrodzenie brutto będzie wyższe niż
                                    miesięczne zarobki netto, należy powiększyć
                                    je o odpowiednie składki ZUS i zaliczkę na
                                    podatek dochodowy od osób fizycznych. Rodzaj
                                    składek zależy m.in. od podstawy
                                    zatrudnienia, naszego wieku czy zarobionej
                                    kwoty.
                                </p>
                                <Card className="mt-4 p-4 rounded-lg">
                                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                                        Składki ZUS - pracownik
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Emerytalna</span>
                                            <span className="font-medium">
                                                9,76% (od wynagrodzenia brutto)
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Rentowa</span>
                                            <span className="font-medium">
                                                1,50% (od wynagrodzenia brutto)
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Chorobowa</span>
                                            <span className="font-medium">
                                                2,45% (od wynagrodzenia brutto)
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Zdrowotna</span>
                                            <span className="font-medium">
                                                9,00% (od podstawy wymiaru)
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Wpływ rodzaju umowy */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Jak rodzaj umowy wpływa na wynagrodzenie
                                    brutto i netto?
                                </h3>
                                <p>
                                    Jednym z kluczowych elementów wpływających
                                    na różnicę pomiędzy kwotą wynagrodzenia
                                    brutto i netto jest podstawa zatrudnienia. W
                                    przypadku umowy o pracę wynagrodzenie
                                    pomniejszane jest o składkę zdrowotną,
                                    emerytalną, rentową, chorobową oraz zaliczkę
                                    na podatek dochodowy.
                                </p>
                                <p className="mt-3">
                                    Jeśli jesteśmy zatrudnieni na podstawie
                                    umowy zlecenia i jest nasza jedyna umowa, to
                                    pobierane są składki ZUS na ubezpieczenie
                                    społeczne i zdrowotne. Natomiast pracodawcę
                                    obciążają składki na FGŚP oraz Fundusz
                                    Pracy.
                                </p>
                                <p className="mt-3">
                                    Sytuacja wygląda inaczej, kiedy jesteśmy
                                    zatrudnieni na podstawie umowy o dzieło.
                                    Jeśli kontrakt nie jest podpisany z
                                    dotychczasowym pracodawcą, to jedynym
                                    czynnikiem zmniejszającym płacę brutto jest
                                    zaliczka na podatek dochodowy od osób
                                    fizycznych.
                                </p>
                            </div>

                            {/* Podatek dochodowy */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Jak wysokość wynagrodzenia wpływa na podatek
                                    dochodowy?
                                </h3>
                                <p>
                                    Aktualnie w Polsce podatek dochodowy od osób
                                    fizycznych pobierany jest według dwóch
                                    stawek. Pierwszy próg podatkowy obowiązuje
                                    do kwoty dochodów nie wyższej niż
                                    120&nbsp;000&nbsp;zł rocznie, a danina
                                    naliczana jest według stawki 12%. Drugi próg
                                    podatkowy zaczyna się od dochodów powyżej
                                    120&nbsp;000&nbsp;zł rocznie, które
                                    opodatkowane są stawką 32% (tylko nadwyżka
                                    ponad wskazaną kwotę). Ostatni próg
                                    podatkowy wyznacza tzw. danina
                                    solidarnościowa obejmująca podatników,
                                    których roczne dochody przekroczyły
                                    1&nbsp;mln&nbsp;zł (stawka 4%).
                                </p>
                            </div>

                            {/* Zerowy PIT */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Zerowy PIT dla młodych - na czym polega?
                                </h3>
                                <p>
                                    Od 1 sierpnia 2019 roku ustawodawca
                                    wprowadził ulgę &quot;zerowy PIT dla
                                    młodych&quot;. Osoby do 26 roku życia nie
                                    płacą podatku dochodowego od osób
                                    fizycznych. Ulga ma zastosowanie, kiedy
                                    jesteśmy zatrudnieni z tytułu umowy o pracę
                                    lub umowy zlecenie. Roczny limit przychodów
                                    uprawniający do skorzystania z ulgi wynosi
                                    85&nbsp;528&nbsp;zł.
                                </p>
                            </div>

                            {/* Kwota wolna */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Czym jest kwota wolna od podatku?
                                </h3>
                                <p>
                                    Kwota wolna od podatku jest sumą, od której
                                    każdego roku nie mamy obowiązku odprowadzać
                                    podatku dochodowego od osób fizycznych. Od
                                    stycznia 2022 roku kwota wolna od podatku
                                    wzrosła z 8&nbsp;000 do 30&nbsp;000&nbsp;zł.
                                    Z kwoty wolnej od podatku skorzystać mogą
                                    wyłącznie osoby podlegające opodatkowaniu
                                    według skali podatkowej (PIT-37 i PIT-36).
                                </p>
                            </div>

                            {/* Koszty uzyskania przychodu */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Czym są dla pracownika koszty uzyskania
                                    przychodu?
                                </h3>
                                <p>
                                    Koszty uzyskania przychodów to koszty, które
                                    zostały poniesione przez pracownika w celu
                                    osiągnięcia przychodów. Ich kwota wpływa na
                                    wysokość dochodów podlegających PIT. Jeśli
                                    mieszkamy w miejscowości, w której znajduje
                                    się nasze miejsce pracy, to koszty uzyskania
                                    przychodu wynosić będą 250&nbsp;zł
                                    miesięcznie. Natomiast jeśli dojeżdżamy do
                                    firmy z innej miejscowości to przysługują
                                    nam koszty uzyskania przychodu na poziomie
                                    300&nbsp;zł miesięcznie.
                                </p>
                            </div>

                            {/* PPK */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Czym są Pracownicze Plany Kapitałowe?
                                </h3>
                                <p>
                                    Pracownicze Plany Kapitałowe (PPK) są
                                    dobrowolnym systemem oszczędzania, w którym
                                    partycypują zarówno pracownicy, jak i
                                    pracodawcy i państwo. Na PPK w ramach wpłaty
                                    podstawowej przekazywane jest 2% naszego
                                    wynagrodzenia. Pracodawca na konto PPK musi
                                    wpłacać co najmniej 1,5% wynagrodzenia. W
                                    ramach wpłat dodatkowych możemy zwiększyć
                                    swój udział w PPK do 4% wynagrodzenia
                                    brutto. Dodatkowo ze strony państwa możemy
                                    liczyć na wpłatę powitalną w wysokości
                                    250&nbsp;zł i dopłatę roczną w wysokości
                                    240&nbsp;zł.
                                </p>
                            </div>

                            {/* Koszty pracodawcy */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Jak obliczane są koszty pracodawcy?
                                </h3>
                                <p>
                                    W przypadku zatrudnienia w oparciu o umowę o
                                    pracę pracodawca zobligowany jest do
                                    opłacania składek ZUS w pełnym wymiarze:
                                    składka emerytalna (9,76%), ubezpieczenie
                                    rentowe (6,50%), Fundusz Pracy (2,45%), FGŚP
                                    (0,1%) i ubezpieczenie wypadkowe (1,67%).
                                </p>
                                <Card className="mt-4 p-4 rounded-lg">
                                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                                        Składki ZUS i koszty - pracodawca
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Emerytalna</span>
                                            <span className="font-medium">
                                                9,76%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Rentowa</span>
                                            <span className="font-medium">
                                                6,50%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Wypadkowa</span>
                                            <span className="font-medium">
                                                1,67%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Fundusz Pracy</span>
                                            <span className="font-medium">
                                                2,45%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>FGŚP</span>
                                            <span className="font-medium">
                                                0,10%
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                                <p className="mt-3">
                                    Dodatkowym kosztem po stronie pracodawcy
                                    może być wpłata na Pracownicze Plany
                                    Kapitałowe, o ile zdecydujemy się na takie
                                    rozwiązanie. Wpłata nie może przekroczyć 4%
                                    wynagrodzenia.
                                </p>
                            </div>

                            {/* Fundusz Pracy */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Czym jest Fundusz Pracy?
                                </h3>
                                <p>
                                    Fundusz Pracy jest państwowym funduszem
                                    celowym. Jego główne zadania skupiają się na
                                    łagodzeniu skutków bezrobocia, promocji
                                    zatrudnienia i aktywizacji zawodowej. Środki
                                    wpłacane na Fundusz Pracy przekazywane są
                                    m.in. na zasiłki dla bezrobotnych, stypendia
                                    naukowe, koszty szkolenia pracowników,
                                    dodatki aktywizacyjne czy refundację kosztów
                                    wyposażenia stanowiska pracy. Wysokość
                                    składki na Fundusz Pracy to 2,45% wymiaru
                                    składki.
                                </p>
                            </div>

                            {/* FGŚP */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Czym jest Fundusz Gwarantowanych Świadczeń
                                    Pracowniczych?
                                </h3>
                                <p>
                                    FGŚP jest funduszem celowym, który ma za
                                    zadanie chronić pracowników na wypadek
                                    niewypłacalności pracodawcy. Składki na
                                    fundusz są obowiązkowo odprowadzane przez
                                    pracodawcę, którego łączy z pracownikiem
                                    m.in. umowa o pracę, umowa o pracę nakładczą
                                    czy umowa zlecenie. Składka na FGŚP wynosi
                                    0,1% wymiaru składki.
                                </p>
                            </div>

                            {/* Czy warto */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Kalkulator wynagrodzeń - czy warto?
                                </h3>
                                <p>
                                    Kalkulator wynagrodzeń jest intuicyjnym
                                    narzędziem pozwalającym w szybki i łatwy
                                    sposób obliczyć, jak zmienia się
                                    wynagrodzenie w ujęciu brutto netto.
                                    Rozwiązanie to adresowane jest głównie dla
                                    osób, których z pracodawcą łączy umowa o
                                    pracę, umowa zlecenie i umowa o dzieło.
                                    Możliwość uwzględnienia dodatkowych
                                    parametrów, tj.&nbsp;kwota wolna od podatku,
                                    ulga dla rodzin 4+ czy autorskie koszty
                                    uzyskania przychodów, pozwala przeprowadzać
                                    symulacje dla bardzo szczegółowych
                                    scenariuszy.
                                </p>
                                <p className="mt-3">
                                    Po wprowadzeniu kwoty brutto i uwzględnieniu
                                    pozostałych elementów otrzymujemy
                                    szczegółowe zestawienie składek ZUS i innych
                                    kosztów. Kalkulator wynagrodzeń daje również
                                    możliwość zmiany płacy brutto w
                                    poszczególnych miesiącach roku. Z drugiej
                                    strony można też sprawdzić, jakie koszty
                                    zatrudnienia pracownika ponosi pracodawca,
                                    co dobrze obrazuje, że wysokość naszego
                                    wynagrodzenia brutto nie jest jedynym jego
                                    kosztem.
                                </p>
                            </div>
                        </div>
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
