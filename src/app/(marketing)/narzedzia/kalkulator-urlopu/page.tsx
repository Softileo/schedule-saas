"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    Calculator,
    Calendar,
    Clock,
    Users,
    Info,
    CalendarDays,
    Briefcase,
    GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    SEOPageLayout,
    SchemaScript,
    Breadcrumbs,
    CTABanner,
} from "@/components/features/seo";
import { generateFAQSchema, generateBreadcrumbSchema } from "@/lib/seo/schemas";

// Education years added to work experience
const EDUCATION_YEARS: Record<string, number> = {
    podstawowe: 0,
    zasadnicze: 3,
    srednie_ogolne: 4,
    srednie_zawodowe: 5,
    policealne: 6,
    wyzsze: 8,
};

const EDUCATION_LABELS: Record<string, string> = {
    podstawowe: "Podstawowe",
    zasadnicze: "Zasadnicze zawodowe",
    srednie_ogolne: "Średnie ogólnokształcące",
    srednie_zawodowe: "Średnie zawodowe",
    policealne: "Policealne",
    wyzsze: "Wyższe (licencjat, inżynier, magister)",
};

interface VacationResult {
    baseVacationDays: number;
    totalWorkYears: number;
    educationYears: number;
    actualWorkYears: number;
    proportionalDays: number | null;
    onDemandDays: number;
    parentalDays: number;
    totalDays: number;
    explanation: string;
    warnings: string[];
}

const faqItems = [
    {
        question: "Ile urlopu przysługuje pracownikowi?",
        answer: "20 dni przy stażu pracy poniżej 10 lat lub 26 dni przy stażu 10 lat i więcej. Do stażu wlicza się okresy nauki (np. 8 lat za studia wyższe).",
    },
    {
        question: "Czy studia wliczają się do urlopu?",
        answer: "Tak! Ukończenie studiów wyższych dolicza 8 lat do stażu pracy przy obliczaniu urlopu. Średnia szkoła to 4-5 lat, szkoła policealna 6 lat.",
    },
    {
        question: "Ile wynosi urlop na żądanie?",
        answer: "4 dni w roku kalendarzowym. Urlop na żądanie wlicza się do puli podstawowego urlopu wypoczynkowego (nie jest dodatkowy).",
    },
    {
        question: "Jak liczyć urlop proporcjonalny?",
        answer: "Przy niepełnym roku pracy: wymiar urlopu × liczba miesięcy pracy ÷ 12. Niepełny miesiąc zaokrąglamy w górę. Niepełny dzień urlopu też zaokrąglamy w górę.",
    },
    {
        question: "Czy urlop przepada na koniec roku?",
        answer: "Niewykorzystany urlop nie przepada - przenosi się na następny rok. Należy go wykorzystać do 30 września następnego roku. Po 3 latach roszczenie przedawnia się.",
    },
    {
        question: "Ile urlopu przy pracy na pół etatu?",
        answer: "Urlop liczy się proporcjonalnie do wymiaru etatu. Przy 1/2 etatu to 10 lub 13 dni (zamiast 20 lub 26). Niepełny dzień zaokrągla się w górę.",
    },
];

// Breadcrumbs for UI component (label/href)
const breadcrumbItems = [
    { label: "Narzędzia", href: "/narzedzia" },
    { label: "Kalkulator urlopu" },
];

// Breadcrumbs for JSON-LD schema (name/url)
const breadcrumbSchemaItems = [
    { name: "Strona główna", url: "https://calenda.pl" },
    { name: "Narzędzia", url: "https://calenda.pl/narzedzia" },
    {
        name: "Kalkulator urlopu",
        url: "https://calenda.pl/narzedzia/kalkulator-urlopu",
    },
];

export default function VacationCalculatorPage() {
    // Form state
    const [workYears, setWorkYears] = useState<string>("5");
    const [workMonths, setWorkMonths] = useState<string>("0");
    const [education, setEducation] = useState<string>("wyzsze");
    const [partTimeNumerator, setPartTimeNumerator] = useState<string>("1");
    const [partTimeDenominator, setPartTimeDenominator] = useState<string>("1");
    const [isProportional, setIsProportional] = useState(false);
    const [employmentMonths, setEmploymentMonths] = useState<string>("12");
    const [hasChildren, setHasChildren] = useState(false);
    const [childAge, setChildAge] = useState<string>("5");

    // Calculate results
    const result = useMemo<VacationResult | null>(() => {
        const actualYears = parseFloat(workYears) || 0;
        const actualMonths = parseFloat(workMonths) || 0;
        const eduYears = EDUCATION_YEARS[education] || 0;
        const ptNum = parseFloat(partTimeNumerator) || 1;
        const ptDen = parseFloat(partTimeDenominator) || 1;
        const empMonths = isProportional
            ? parseFloat(employmentMonths) || 12
            : 12;
        const childAgeNum = hasChildren ? parseFloat(childAge) || 0 : 0;

        // Total work experience (actual + education, max education)
        const totalActualYears = actualYears + actualMonths / 12;
        const totalWorkYears = totalActualYears + eduYears;

        // Base vacation days
        const baseVacation = totalWorkYears >= 10 ? 26 : 20;

        // Part-time adjustment
        const partTimeRatio = ptNum / ptDen;
        const adjustedVacation = Math.ceil(baseVacation * partTimeRatio);

        // Proportional calculation
        let proportionalDays: number | null = null;
        if (isProportional && empMonths < 12) {
            proportionalDays = Math.ceil((adjustedVacation * empMonths) / 12);
        }

        // Parental days (2 days if child under 14)
        const parentalDays = hasChildren && childAgeNum < 14 ? 2 : 0;

        // On-demand days (part of base vacation, not additional)
        const onDemandDays = Math.min(4, proportionalDays || adjustedVacation);

        const totalDays = (proportionalDays || adjustedVacation) + parentalDays;

        // Warnings
        const warnings: string[] = [];

        if (partTimeRatio < 1) {
            warnings.push(
                `Urlop przeliczony proporcjonalnie do ${ptNum}/${ptDen} etatu.`
            );
        }

        if (totalWorkYears >= 9 && totalWorkYears < 10) {
            warnings.push(
                `Za ${Math.ceil(
                    10 - totalWorkYears
                )} rok przysługuje 26 dni urlopu (zamiast 20).`
            );
        }

        // Explanation
        let explanation = `Staż pracy: ${totalActualYears.toFixed(
            1
        )} lat rzeczywistych`;
        if (eduYears > 0) {
            explanation += ` + ${eduYears} lat za wykształcenie = ${totalWorkYears.toFixed(
                1
            )} lat łącznie`;
        }

        return {
            baseVacationDays: baseVacation,
            totalWorkYears,
            educationYears: eduYears,
            actualWorkYears: totalActualYears,
            proportionalDays,
            onDemandDays,
            parentalDays,
            totalDays,
            explanation,
            warnings,
        };
    }, [
        workYears,
        workMonths,
        education,
        partTimeNumerator,
        partTimeDenominator,
        isProportional,
        employmentMonths,
        hasChildren,
        childAge,
    ]);

    return (
        <SEOPageLayout>
            <SchemaScript
                schema={[
                    generateFAQSchema(faqItems),
                    generateBreadcrumbSchema(breadcrumbSchemaItems),
                ]}
            />

            <div className="container mx-auto px-4 pt-12">
                {/* Breadcrumbs */}
                <Breadcrumbs items={breadcrumbItems} />

                {/* Hero */}
                <div className="max-w-4xl mx-auto text-center mb-12">
                    <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-100">
                        <Calendar className="w-3 h-3 mr-1" />
                        Kalkulator online
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                        Kalkulator{" "}
                        <span className="bg-linear-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                            urlopu wypoczynkowego
                        </span>{" "}
                        2026
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Oblicz ile dni urlopu Ci przysługuje. Uwzględnia staż
                        pracy, wykształcenie i wymiar etatu.
                    </p>
                </div>

                {/* Calculator */}
                <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
                    {/* Input Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-primary" />
                                Dane do obliczeń
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Work experience */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-500" />
                                    Staż pracy (rzeczywisty)
                                </Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Input
                                            type="number"
                                            value={workYears}
                                            onChange={(e) =>
                                                setWorkYears(e.target.value)
                                            }
                                            min={0}
                                            max={50}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            lat
                                        </span>
                                    </div>
                                    <div>
                                        <Input
                                            type="number"
                                            value={workMonths}
                                            onChange={(e) =>
                                                setWorkMonths(e.target.value)
                                            }
                                            min={0}
                                            max={11}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            miesięcy
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Education */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4 text-purple-500" />
                                    Wykształcenie (najwyższe ukończone)
                                </Label>
                                <Select
                                    value={education}
                                    onValueChange={setEducation}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(EDUCATION_LABELS).map(
                                            ([value, label]) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label} (+
                                                    {
                                                        EDUCATION_YEARS[value]
                                                    }{" "}
                                                    lat)
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Wykształcenie dolicza się do stażu przy
                                    urlopie
                                </p>
                            </div>

                            {/* Part-time */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-orange-500" />
                                    Wymiar etatu
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={partTimeNumerator}
                                        onChange={(e) =>
                                            setPartTimeNumerator(e.target.value)
                                        }
                                        min={1}
                                        max={8}
                                        className="w-20"
                                    />
                                    <span className="text-xl">/</span>
                                    <Input
                                        type="number"
                                        value={partTimeDenominator}
                                        onChange={(e) =>
                                            setPartTimeDenominator(
                                                e.target.value
                                            )
                                        }
                                        min={1}
                                        max={8}
                                        className="w-20"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        etatu
                                    </span>
                                </div>
                            </div>

                            {/* Proportional */}
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="proportional"
                                        checked={isProportional}
                                        onCheckedChange={(checked) =>
                                            setIsProportional(
                                                checked as boolean
                                            )
                                        }
                                    />
                                    <Label htmlFor="proportional">
                                        Urlop proporcjonalny (niepełny rok)
                                    </Label>
                                </div>
                                {isProportional && (
                                    <div className="space-y-2 pl-6">
                                        <Label>
                                            Liczba miesięcy zatrudnienia w tym
                                            roku
                                        </Label>
                                        <Input
                                            type="number"
                                            value={employmentMonths}
                                            onChange={(e) =>
                                                setEmploymentMonths(
                                                    e.target.value
                                                )
                                            }
                                            min={1}
                                            max={12}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Children */}
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="children"
                                        checked={hasChildren}
                                        onCheckedChange={(checked) =>
                                            setHasChildren(checked as boolean)
                                        }
                                    />
                                    <Label htmlFor="children">
                                        Mam dziecko (dodatkowe 2 dni opieki)
                                    </Label>
                                </div>
                                {hasChildren && (
                                    <div className="space-y-2 pl-6">
                                        <Label>Wiek najmłodszego dziecka</Label>
                                        <Input
                                            type="number"
                                            value={childAge}
                                            onChange={(e) =>
                                                setChildAge(e.target.value)
                                            }
                                            min={0}
                                            max={18}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            2 dni opieki przysługują do 14 roku
                                            życia dziecka
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results */}
                    <div className="space-y-6">
                        <Card className="bg-linear-to-br from-green-50 to-emerald-50 border-green-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarDays className="h-5 w-5 text-green-600" />
                                    Twój urlop
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {result ? (
                                    <div className="space-y-4">
                                        {/* Total years */}
                                        <div className="p-3 bg-white/50 rounded-lg">
                                            <p className="text-sm text-muted-foreground">
                                                {result.explanation}
                                            </p>
                                        </div>

                                        {/* Base vacation */}
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-muted-foreground">
                                                Podstawowy wymiar:
                                            </span>
                                            <span className="font-semibold">
                                                {result.baseVacationDays} dni
                                            </span>
                                        </div>

                                        {/* Proportional */}
                                        {result.proportionalDays !== null && (
                                            <div className="flex justify-between items-center py-2 border-b">
                                                <span className="text-muted-foreground">
                                                    Proporcjonalnie (
                                                    {employmentMonths}/12
                                                    mies.):
                                                </span>
                                                <span className="font-semibold text-orange-600">
                                                    {result.proportionalDays}{" "}
                                                    dni
                                                </span>
                                            </div>
                                        )}

                                        {/* On demand */}
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-muted-foreground">
                                                W tym na żądanie:
                                            </span>
                                            <span className="font-medium">
                                                {result.onDemandDays} dni
                                            </span>
                                        </div>

                                        {/* Parental */}
                                        {result.parentalDays > 0 && (
                                            <div className="flex justify-between items-center py-2 border-b">
                                                <span className="text-muted-foreground">
                                                    Opieka nad dzieckiem:
                                                </span>
                                                <span className="font-semibold text-purple-600">
                                                    +{result.parentalDays} dni
                                                </span>
                                            </div>
                                        )}

                                        {/* Total */}
                                        <div className="flex justify-between items-center py-3 bg-green-100 rounded-lg px-3 mt-4">
                                            <span className="font-semibold">
                                                Łącznie dni wolnych:
                                            </span>
                                            <span className="text-3xl font-bold text-green-700">
                                                {result.totalDays}
                                            </span>
                                        </div>

                                        {/* Warnings */}
                                        {result.warnings.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                {result.warnings.map(
                                                    (warning, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm"
                                                        >
                                                            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                                            <span className="text-amber-800">
                                                                {warning}
                                                            </span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">
                                        Wprowadź dane, aby zobaczyć wynik
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Info box */}
                        <Card className="border-blue-200 bg-blue-50">
                            <CardContent className="pt-6">
                                <div className="flex gap-3">
                                    <Info className="h-5 w-5 text-blue-600 shrink-0" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium mb-1">
                                            Jak to działa?
                                        </p>
                                        <ul className="space-y-1 text-blue-700">
                                            <li>
                                                •{" "}
                                                <strong>
                                                    &lt;10 lat stażu:
                                                </strong>{" "}
                                                20 dni urlopu
                                            </li>
                                            <li>
                                                •{" "}
                                                <strong>≥10 lat stażu:</strong>{" "}
                                                26 dni urlopu
                                            </li>
                                            <li>
                                                •{" "}
                                                <strong>Wykształcenie:</strong>{" "}
                                                dolicza się do stażu (studia =
                                                +8 lat)
                                            </li>
                                            <li>
                                                •{" "}
                                                <strong>Niepełny etat:</strong>{" "}
                                                urlop proporcjonalny,
                                                zaokrąglony w górę
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Education years table */}
                <div className="max-w-4xl mx-auto mb-16">
                    <h2 className="text-2xl font-bold mb-6 text-center">
                        Ile lat dolicza wykształcenie?
                    </h2>
                    <Card>
                        <CardContent className="pt-6 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4">
                                            Poziom wykształcenia
                                        </th>
                                        <th className="text-center py-3 px-4">
                                            Doliczane lata
                                        </th>
                                        <th className="text-center py-3 px-4">
                                            Przykład
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b">
                                        <td className="py-3 px-4">
                                            Wyższe (magister, inżynier,
                                            licencjat)
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <Badge className="bg-purple-100 text-purple-700">
                                                8 lat
                                            </Badge>
                                        </td>
                                        <td className="text-center py-3 px-4 text-muted-foreground">
                                            2 lata pracy + 8 = 10 → 26 dni
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-3 px-4">
                                            Policealne
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <Badge className="bg-blue-100 text-blue-700">
                                                6 lat
                                            </Badge>
                                        </td>
                                        <td className="text-center py-3 px-4 text-muted-foreground">
                                            4 lata pracy + 6 = 10 → 26 dni
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-3 px-4">
                                            Średnie zawodowe
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <Badge className="bg-green-100 text-green-700">
                                                5 lat
                                            </Badge>
                                        </td>
                                        <td className="text-center py-3 px-4 text-muted-foreground">
                                            5 lat pracy + 5 = 10 → 26 dni
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-3 px-4">
                                            Średnie ogólnokształcące
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <Badge className="bg-yellow-100 text-yellow-700">
                                                4 lata
                                            </Badge>
                                        </td>
                                        <td className="text-center py-3 px-4 text-muted-foreground">
                                            6 lat pracy + 4 = 10 → 26 dni
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-3 px-4">
                                            Zasadnicze zawodowe
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <Badge className="bg-orange-100 text-orange-700">
                                                3 lata
                                            </Badge>
                                        </td>
                                        <td className="text-center py-3 px-4 text-muted-foreground">
                                            7 lat pracy + 3 = 10 → 26 dni
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4">
                                            Podstawowe/gimnazjalne
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <Badge className="bg-gray-100 text-gray-700">
                                                0 lat
                                            </Badge>
                                        </td>
                                        <td className="text-center py-3 px-4 text-muted-foreground">
                                            10 lat pracy → 26 dni
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>

                {/* Key numbers */}
                <div className="max-w-4xl mx-auto mb-16">
                    <h2 className="text-2xl font-bold mb-6 text-center">
                        Kluczowe liczby
                    </h2>
                    <div className="grid md:grid-cols-4 gap-4">
                        <Card className="text-center">
                            <CardContent className="pt-6">
                                <div className="text-3xl font-bold text-primary mb-1">
                                    20
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    dni przy stażu &lt;10 lat
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="text-center">
                            <CardContent className="pt-6">
                                <div className="text-3xl font-bold text-green-600 mb-1">
                                    26
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    dni przy stażu ≥10 lat
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="text-center">
                            <CardContent className="pt-6">
                                <div className="text-3xl font-bold text-orange-600 mb-1">
                                    4
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    dni na żądanie
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="text-center">
                            <CardContent className="pt-6">
                                <div className="text-3xl font-bold text-purple-600 mb-1">
                                    2
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    dni opieki (dziecko &lt;14)
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="max-w-4xl mx-auto mb-16">
                    <h2 className="text-2xl font-bold mb-6 text-center">
                        Najczęściej zadawane pytania
                    </h2>
                    <div className="space-y-4">
                        {faqItems.map((item, index) => (
                            <Card key={index}>
                                <CardContent className="pt-6">
                                    <h3 className="font-semibold mb-2">
                                        {item.question}
                                    </h3>
                                    <p className="text-muted-foreground">
                                        {item.answer}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Related links */}
                <div className="max-w-4xl mx-auto mb-16">
                    <h2 className="text-2xl font-bold mb-6 text-center">
                        Powiązane narzędzia
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Link href="/narzedzia/kalendarz-dni-roboczych-2026">
                            <Card className="h-full hover:shadow-lg transition-shadow group">
                                <CardContent className="pt-6">
                                    <Calendar className="h-8 w-8 text-primary mb-3" />
                                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                                        Kalendarz dni roboczych
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Święta i dni wolne 2026
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/narzedzia/wymiar-czasu-pracy-2026">
                            <Card className="h-full hover:shadow-lg transition-shadow group">
                                <CardContent className="pt-6">
                                    <Clock className="h-8 w-8 text-primary mb-3" />
                                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                                        Kalkulator czasu pracy
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Ile godzin pracy w miesiącu
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/narzedzia/kalkulator-nadgodzin">
                            <Card className="h-full hover:shadow-lg transition-shadow group">
                                <CardContent className="pt-6">
                                    <Calculator className="h-8 w-8 text-primary mb-3" />
                                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                                        Kalkulator nadgodzin
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Dodatki 50% i 100%
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

                {/* CTA */}
                <CTABanner
                    variant="gradient"
                    title="Automatyczne planowanie urlopów"
                    description="Calenda automatycznie pilnuje limitów urlopowych i zapobiega konfliktom w grafikach."
                    primaryButton={{
                        text: "Wypróbuj za darmo",
                        href: "/rejestracja",
                    }}
                    secondaryButton={{
                        text: "Zobacz jak działa",
                        href: "/grafik-pracy",
                    }}
                />
            </div>
        </SEOPageLayout>
    );
}
