"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Plus, Trash2, Loader2, CheckCircle } from "lucide-react";

interface TradingSunday {
    id: string;
    date: string;
    year: number;
    month: number;
    day: number;
    description: string | null;
    is_active: boolean;
    created_at: string | null;
}

export default function TradingSundaysAdminPage() {
    const [sundays, setSundays] = useState<TradingSunday[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Stan formularza
    const [newDate, setNewDate] = useState("");
    const [newDescription, setNewDescription] = useState("");

    const supabase = createClient();

    useEffect(() => {
        loadSundays();
    }, [selectedYear]);

    const loadSundays = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("trading_sundays")
                .select("*")
                .eq("year", selectedYear)
                .order("date", { ascending: true });

            if (error) throw error;
            setSundays(data || []);
        } catch (error) {
            logger.error("Error loading trading sundays:", error);
            toast.error("Nie udało się załadować danych");
        } finally {
            setLoading(false);
        }
    };

    const addSunday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDate) return;

        // Sprawdź czy data to niedziela
        const date = new Date(newDate);
        if (date.getDay() !== 0) {
            toast.error("Wybrana data nie jest niedzielą");
            return;
        }

        try {
            const { error } = await supabase.from("trading_sundays").insert({
                date: newDate,
                description: newDescription || null,
            });

            if (error) throw error;

            toast.success("Dodano niedzielę handlową");
            setNewDate("");
            setNewDescription("");
            loadSundays();
        } catch (error: any) {
            logger.error("Error adding trading sunday:", error);
            if (error.code === "23505") {
                toast.error("Ta niedziela już istnieje");
            } else {
                toast.error("Nie udało się dodać niedzieli");
            }
        }
    };

    const toggleActive = async (id: string, currentActive: boolean) => {
        try {
            const { error } = await supabase
                .from("trading_sundays")
                .update({ is_active: !currentActive })
                .eq("id", id);

            if (error) throw error;

            toast.success(
                currentActive
                    ? "Niedziela została zdezaktywowana"
                    : "Niedziela została aktywowana",
            );
            loadSundays();
        } catch (error) {
            logger.error("Error toggling trading sunday active status:", error);
            toast.error("Nie udało się zmienić statusu");
        }
    };

    const deleteSunday = async (id: string) => {
        if (!confirm("Czy na pewno chcesz usunąć tę niedzielę handlową?"))
            return;

        try {
            const { error } = await supabase
                .from("trading_sundays")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast.success("Usunięto niedzielę handlową");
            loadSundays();
        } catch (error) {
            logger.error("Error deleting trading sunday:", error);
            toast.error("Nie udało się usunąć niedzieli");
        }
    };

    const years = [
        selectedYear - 1,
        selectedYear,
        selectedYear + 1,
        selectedYear + 2,
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    Niedziele handlowe
                </h1>
                <p className="text-slate-600">
                    Zarządzaj kalendarzem niedziel handlowych w Polsce
                </p>
            </div>

            {/* Statystyki */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Calendar className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">
                                Aktywne niedziele
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {sundays.filter((s) => s.is_active).length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Wszystkie</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {sundays.length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">
                                Wybrany rok
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {selectedYear}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filtr roku */}
            <Card className="p-6 mb-6">
                <Label className="mb-2 block">Wybierz rok</Label>
                <div className="flex gap-2">
                    {years.map((year) => (
                        <Button
                            key={year}
                            variant={
                                year === selectedYear ? "default" : "outline"
                            }
                            onClick={() => setSelectedYear(year)}
                        >
                            {year}
                        </Button>
                    ))}
                </div>
            </Card>

            {/* Formularz dodawania */}
            <Card className="p-6 mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                    Dodaj niedzielę handlową
                </h2>
                <form onSubmit={addSunday} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label htmlFor="date">
                                Data <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Data musi być niedzielą
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="description">Opis</Label>
                            <Input
                                id="description"
                                type="text"
                                value={newDescription}
                                onChange={(e) =>
                                    setNewDescription(e.target.value)
                                }
                                placeholder="Ostatnia niedziela miesiąca"
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full md:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Dodaj niedzielę handlową
                    </Button>
                </form>
            </Card>

            {/* Lista niedziel */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                    Niedziele handlowe {selectedYear}
                </h2>
                <div className="space-y-2">
                    {sundays.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">
                            Brak niedziel handlowych w {selectedYear} roku
                        </p>
                    ) : (
                        sundays.map((sunday) => (
                            <div
                                key={sunday.id}
                                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                                    sunday.is_active
                                        ? "bg-green-50 border-green-200"
                                        : "bg-slate-50 border-slate-200 opacity-60"
                                }`}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <Calendar
                                            className={`h-5 w-5 ${
                                                sunday.is_active
                                                    ? "text-green-600"
                                                    : "text-slate-400"
                                            }`}
                                        />
                                        <div>
                                            <p className="font-semibold text-slate-900">
                                                {new Date(
                                                    sunday.date,
                                                ).toLocaleDateString("pl-PL", {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </p>
                                            {sunday.description && (
                                                <p className="text-sm text-slate-600">
                                                    {sunday.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            toggleActive(
                                                sunday.id,
                                                sunday.is_active,
                                            )
                                        }
                                    >
                                        {sunday.is_active
                                            ? "Dezaktywuj"
                                            : "Aktywuj"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteSunday(sunday.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Informacja o API */}
            <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">
                    API Integration
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                    Niedziele handlowe są automatycznie uwzględniane w
                    generowaniu grafików. System oznacza te dni jako dostępne do
                    planowania zmian, w przeciwieństwie do zwykłych niedziel.
                </p>
                <div className="bg-white p-3 rounded border border-blue-200">
                    <code className="text-xs text-slate-700">
                        SELECT * FROM trading_sundays WHERE is_active = true AND
                        date &gt;= CURRENT_DATE;
                    </code>
                </div>
            </Card>
        </div>
    );
}
