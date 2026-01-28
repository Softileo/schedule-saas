"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    Calculator,
    Clock,
    DollarSign,
    Moon,
    Sun,
    Calendar,
    AlertTriangle,
    Info,
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

// Constants for 2026
const MIN_HOURLY_WAGE_2026 = 30.5; // PLN brutto
const MIN_MONTHLY_WAGE_2026 = 4666; // PLN brutto
const STANDARD_MONTHLY_HOURS = 168; // average

interface OvertimeResult {
    baseHourlyRate: number;
    overtimeHours50: number;
    overtimeHours100: number;
    bonus50: number;
    bonus100: number;
    totalBonus: number;
    totalGross: number;
    warnings: string[];
}

const faqItems = [
    {
        question: "Kiedy przysługuje dodatek 50% za nadgodziny?",
        answer: "Dodatek 50% przysługuje za nadgodziny w dni powszednie (poniedziałek-piątek) oraz w soboty, jeśli sobota jest dla pracownika dniem roboczym według grafiku.",
    },
    {
        question: "Kiedy przysługuje dodatek 100% za nadgodziny?",
        answer: "Dodatek 100% przysługuje za nadgodziny w porze nocnej (22:00-6:00), w niedziele i święta niebędące dla pracownika dniami pracy, oraz w dniu wolnym udzielonym za pracę w niedzielę lub święto.",
    },
    {
        question: "Ile wynosi maksymalny limit nadgodzin w roku?",
        answer: "Podstawowy limit to 150 godzin rocznie. W układzie zbiorowym lub regulaminie pracy można go zwiększyć do maksymalnie 416 godzin rocznie (średnio 8 nadgodzin tygodniowo).",
    },
    {
        question: "Czy pracodawca może zmusić do nadgodzin?",
        answer: "Tak, w przypadku szczególnych potrzeb pracodawcy lub akcji ratowniczej. Wyjątki: kobiety w ciąży (bezwzględny zakaz), rodzice dzieci do lat 4 (wymaga zgody), osoby niepełnosprawne (wymaga zgody lekarza).",
    },
    {
        question: "Czy można dostać czas wolny zamiast dodatku?",
        answer: "Tak. Na wniosek pracownika: 1 godzina nadgodziny = 1 godzina wolna. Z inicjatywy pracodawcy: 1 godzina nadgodziny = 1,5 godziny wolnej.",
    },
];

// Breadcrumbs for UI component (label/href)
const breadcrumbItems = [
    { label: "Narzędzia", href: "/narzedzia" },
    { label: "Kalkulator nadgodzin" },
];

// Breadcrumbs for JSON-LD schema (name/url)
const breadcrumbSchemaItems = [
    { name: "Strona główna", url: "https://calenda.pl" },
    { name: "Narzędzia", url: "https://calenda.pl/narzedzia" },
    {
        name: "Kalkulator nadgodzin",
        url: "https://calenda.pl/narzedzia/kalkulator-nadgodzin",
    },
];

export default function OvertimeCalculatorPage() {
    // Form state
    const [salaryType, setSalaryType] = useState<"monthly" | "hourly">(
        "monthly"
    );
    const [salary, setSalary] = useState<string>("5000");
    const [overtimeHours50, setOvertimeHours50] = useState<string>("10");
    const [overtimeHours100, setOvertimeHours100] = useState<string>("5");
    const [includeNightBonus, setIncludeNightBonus] = useState(false);
    const [nightHours, setNightHours] = useState<string>("0");

    // Calculate results
    const result = useMemo<OvertimeResult | null>(() => {
        const salaryNum = parseFloat(salary) || 0;
        const hours50 = parseFloat(overtimeHours50) || 0;
        const hours100 = parseFloat(overtimeHours100) || 0;
        const nightHoursNum = includeNightBonus
            ? parseFloat(nightHours) || 0
            : 0;

        if (salaryNum <= 0) return null;

        // Calculate hourly rate
        const hourlyRate =
            salaryType === "hourly"
                ? salaryNum
                : salaryNum / STANDARD_MONTHLY_HOURS;

        // Calculate bonuses
        const bonus50 = hours50 * hourlyRate * 0.5;
        const bonus100 = hours100 * hourlyRate * 1.0;

        // Night work bonus (20% of minimum hourly wage)
        const nightBonus = nightHoursNum * MIN_HOURLY_WAGE_2026 * 0.2;

        const totalBonus = bonus50 + bonus100 + nightBonus;
        const basePayForOvertime = (hours50 + hours100) * hourlyRate;
        const totalGross = basePayForOvertime + totalBonus + nightBonus;

        // Warnings
        const warnings: string[] = [];
        const totalOvertimeHours = hours50 + hours100;

        if (totalOvertimeHours > 150 / 12) {
            warnings.push(
                `Uwaga: ${totalOvertimeHours.toFixed(
                    0
                )}h nadgodzin miesięcznie może przekroczyć roczny limit 150h.`
            );
        }

        if (totalOvertimeHours > 416 / 12) {
            warnings.push(
                "Przekroczono maksymalny limit nadgodzin (416h/rok)!"
            );
        }

        if (salaryType === "hourly" && salaryNum < MIN_HOURLY_WAGE_2026) {
            warnings.push(
                `Stawka poniżej minimalnej (${MIN_HOURLY_WAGE_2026} zł/h brutto w 2026).`
            );
        }

        if (salaryType === "monthly" && salaryNum < MIN_MONTHLY_WAGE_2026) {
            warnings.push(
                `Wynagrodzenie poniżej minimalnego (${MIN_MONTHLY_WAGE_2026} zł brutto w 2026).`
            );
        }

        return {
            baseHourlyRate: hourlyRate,
            overtimeHours50: hours50,
            overtimeHours100: hours100,
            bonus50,
            bonus100,
            totalBonus,
            totalGross,
            warnings,
        };
    }, [
        salary,
        salaryType,
        overtimeHours50,
        overtimeHours100,
        includeNightBonus,
        nightHours,
    ]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("pl-PL", {
            style: "currency",
            currency: "PLN",
            minimumFractionDigits: 2,
        }).format(value);

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
                <div className="max-w-4xl mx-auto text-center my-12">
                    <Badge className="mb-4 bg-orange-100 text-orange-700 hover:bg-orange-100">
                        <Calculator className="w-3 h-3 mr-1" />
                        Kalkulator online
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                        Kalkulator{" "}
                        <span className="bg-linear-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                            nadgodzin
                        </span>{" "}
                        2026
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Oblicz ile wynosi dodatek za nadgodziny. Uwzględnia
                        dodatek 50% i 100% oraz pracę w porze nocnej.
                    </p>
                </div>

                {/* Calculator */}
                <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
                    {/* Input Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-primary" />
                                Dane do obliczeń
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Salary Type */}
                            <div className="space-y-2">
                                <Label>Typ wynagrodzenia</Label>
                                <Select
                                    value={salaryType}
                                    onValueChange={(v) =>
                                        setSalaryType(v as "monthly" | "hourly")
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">
                                            Miesięczne brutto
                                        </SelectItem>
                                        <SelectItem value="hourly">
                                            Stawka godzinowa brutto
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Salary */}
                            <div className="space-y-2">
                                <Label>
                                    {salaryType === "monthly"
                                        ? "Wynagrodzenie miesięczne brutto (zł)"
                                        : "Stawka godzinowa brutto (zł)"}
                                </Label>
                                <Input
                                    type="number"
                                    value={salary}
                                    onChange={(e) => setSalary(e.target.value)}
                                    min={0}
                                    step={salaryType === "hourly" ? 0.5 : 100}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Min. 2026:{" "}
                                    {salaryType === "monthly"
                                        ? `${MIN_MONTHLY_WAGE_2026} zł/mies.`
                                        : `${MIN_HOURLY_WAGE_2026} zł/h`}
                                </p>
                            </div>

                            {/* Overtime 50% */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Sun className="h-4 w-4 text-yellow-500" />
                                    Nadgodziny 50% (dni powszednie)
                                </Label>
                                <Input
                                    type="number"
                                    value={overtimeHours50}
                                    onChange={(e) =>
                                        setOvertimeHours50(e.target.value)
                                    }
                                    min={0}
                                    step={0.5}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Praca w dniach roboczych ponad normę
                                </p>
                            </div>

                            {/* Overtime 100% */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-red-500" />
                                    Nadgodziny 100% (niedziele/święta/noc)
                                </Label>
                                <Input
                                    type="number"
                                    value={overtimeHours100}
                                    onChange={(e) =>
                                        setOvertimeHours100(e.target.value)
                                    }
                                    min={0}
                                    step={0.5}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Praca w niedziele, święta lub w porze nocnej
                                </p>
                            </div>

                            {/* Night bonus */}
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="nightBonus"
                                        checked={includeNightBonus}
                                        onCheckedChange={(checked) =>
                                            setIncludeNightBonus(
                                                checked as boolean
                                            )
                                        }
                                    />
                                    <Label
                                        htmlFor="nightBonus"
                                        className="flex items-center gap-2"
                                    >
                                        <Moon className="h-4 w-4 text-indigo-500" />
                                        Dodaj dodatek za pracę w nocy
                                    </Label>
                                </div>
                                {includeNightBonus && (
                                    <div className="space-y-2 pl-6">
                                        <Label>
                                            Godziny pracy nocnej (22:00-6:00)
                                        </Label>
                                        <Input
                                            type="number"
                                            value={nightHours}
                                            onChange={(e) =>
                                                setNightHours(e.target.value)
                                            }
                                            min={0}
                                            step={0.5}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Dodatek: 20% minimalnej stawki
                                            godzinowej
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results */}
                    <div className="space-y-6">
                        <Card className="bg-linear-to-br from-orange-50 to-red-50 border-orange-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-orange-600" />
                                    Wynik obliczeń
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {result ? (
                                    <div className="space-y-4">
                                        {/* Base rate */}
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-muted-foreground">
                                                Stawka godzinowa:
                                            </span>
                                            <span className="font-semibold">
                                                {formatCurrency(
                                                    result.baseHourlyRate
                                                )}
                                                /h
                                            </span>
                                        </div>

                                        {/* 50% bonus */}
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-muted-foreground">
                                                Dodatek 50% (
                                                {result.overtimeHours50}h):
                                            </span>
                                            <span className="font-semibold text-yellow-600">
                                                +
                                                {formatCurrency(result.bonus50)}
                                            </span>
                                        </div>

                                        {/* 100% bonus */}
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-muted-foreground">
                                                Dodatek 100% (
                                                {result.overtimeHours100}h):
                                            </span>
                                            <span className="font-semibold text-red-600">
                                                +
                                                {formatCurrency(
                                                    result.bonus100
                                                )}
                                            </span>
                                        </div>

                                        {/* Total bonus */}
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-muted-foreground">
                                                Suma dodatków:
                                            </span>
                                            <span className="font-bold text-orange-600">
                                                {formatCurrency(
                                                    result.totalBonus
                                                )}
                                            </span>
                                        </div>

                                        {/* Total gross */}
                                        <div className="flex justify-between items-center py-3 bg-orange-100 rounded-lg px-3 mt-4">
                                            <span className="font-semibold">
                                                Łącznie za nadgodziny (brutto):
                                            </span>
                                            <span className="text-2xl font-bold text-orange-700">
                                                {formatCurrency(
                                                    result.totalGross
                                                )}
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
                                                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
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
                                                • <strong>Dodatek 50%:</strong>{" "}
                                                wynagrodzenie + połowa stawki
                                                godzinowej
                                            </li>
                                            <li>
                                                • <strong>Dodatek 100%:</strong>{" "}
                                                wynagrodzenie + pełna stawka
                                                godzinowa
                                            </li>
                                            <li>
                                                • <strong>Praca nocna:</strong>{" "}
                                                +20% minimalnej stawki (
                                                {(
                                                    MIN_HOURLY_WAGE_2026 * 0.2
                                                ).toFixed(2)}{" "}
                                                zł/h w 2026)
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Overtime rules table */}
                <div className="max-w-4xl mx-auto mb-16">
                    <h2 className="text-2xl font-bold mb-6 text-center">
                        Kiedy jaki dodatek?
                    </h2>
                    <Card>
                        <CardContent className="pt-6 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4">
                                            Sytuacja
                                        </th>
                                        <th className="text-center py-3 px-4">
                                            Dodatek
                                        </th>
                                        <th className="text-left py-3 px-4">
                                            Przykład
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b">
                                        <td className="py-3 px-4">
                                            Nadgodziny w dni powszednie
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <Badge className="bg-yellow-100 text-yellow-700">
                                                50%
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            Praca po 16:00 w środę
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-3 px-4">
                                            Nadgodziny w porze nocnej (22-6)
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <Badge className="bg-red-100 text-red-700">
                                                100%
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            Praca o 23:00 w czwartek
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-3 px-4">
                                            Nadgodziny w niedzielę (nie wg
                                            grafiku)
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <Badge className="bg-red-100 text-red-700">
                                                100%
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            Wezwanie do pracy w wolną niedzielę
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-3 px-4">
                                            Nadgodziny w święto
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <Badge className="bg-red-100 text-red-700">
                                                100%
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            Praca 1 maja, 11 listopada
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4">
                                            Przekroczenie średniotygodniowej
                                            normy
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <Badge className="bg-red-100 text-red-700">
                                                100%
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            &gt;40h średnio w okresie
                                            rozliczeniowym
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>

                {/* Limits section */}
                <div className="max-w-4xl mx-auto mb-16">
                    <h2 className="text-2xl font-bold mb-6 text-center">
                        Limity nadgodzin
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="text-center">
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold text-primary mb-2">
                                    150h
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Podstawowy limit roczny
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    ~12,5h miesięcznie
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="text-center">
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold text-orange-600 mb-2">
                                    416h
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Maksymalny limit roczny
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Wymaga regulaminu/układu
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="text-center">
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold text-red-600 mb-2">
                                    48h
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Tygodniowy limit łączny
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Średnio w okresie rozliczeniowym
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
                        Powiązane narzędzia i poradniki
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Link href="/narzedzia/wymiar-czasu-pracy-2026">
                            <Card className="h-full hover:shadow-lg transition-shadow group">
                                <CardContent className="pt-6">
                                    <Clock className="h-8 w-8 text-primary mb-3" />
                                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                                        Kalkulator czasu pracy
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Ile godzin pracy w miesiącu/roku
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/narzedzia/kalkulator-wynagrodzen-netto-brutto-2026">
                            <Card className="h-full hover:shadow-lg transition-shadow group">
                                <CardContent className="pt-6">
                                    <DollarSign className="h-8 w-8 text-primary mb-3" />
                                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                                        Kalkulator wynagrodzeń
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Brutto-netto, koszty pracodawcy
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/poradniki/czas-pracy/nadgodziny">
                            <Card className="h-full hover:shadow-lg transition-shadow group">
                                <CardContent className="pt-6">
                                    <AlertTriangle className="h-8 w-8 text-primary mb-3" />
                                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                                        Poradnik: Nadgodziny
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Limity, przepisy, odmowa
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

                {/* CTA */}
                <CTABanner
                    variant="gradient"
                    title="Automatyczne liczenie nadgodzin"
                    description="Calenda automatycznie zlicza nadgodziny i generuje raporty zgodne z Kodeksem Pracy."
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
