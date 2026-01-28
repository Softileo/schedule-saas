"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    format,
    getDay,
    startOfYear,
    endOfYear,
    eachDayOfInterval,
} from "date-fns";
import { pl } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { OrganizationSettings, OpeningHours, Json } from "@/types";
import { SettingsCard } from "@/components/ui/settings-card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { showToast } from "@/lib/utils/toast";
import {
    OpeningHoursEditor,
    DEFAULT_OPENING_HOURS,
} from "./opening-hours-editor";
import { useUnsavedChanges } from "@/lib/contexts/unsaved-changes-context";
import { useRegisterSaveFunction } from "@/lib/hooks/use-register-save-function";
import { getTradingSundays } from "@/lib/api/holidays";

interface OrganizationSettingsProps {
    organizationId: string;
    settings: OrganizationSettings | null;
}

// Domyślne niedziele handlowe - obliczane dynamicznie
const getDefaultTradingSundays = () =>
    getTradingSundays(new Date().getFullYear());

export function OrganizationSettingsComponent({
    organizationId,
    settings: initialSettings,
}: OrganizationSettingsProps) {
    const router = useRouter();
    const { setHasUnsavedChanges, setIsSaving } = useUnsavedChanges();

    // Godziny otwarcia dla każdego dnia
    const [openingHours, setOpeningHours] = useState<OpeningHours>(
        (initialSettings?.opening_hours as unknown as OpeningHours) ||
            DEFAULT_OPENING_HOURS
    );
    const [enableTradingSundays, setEnableTradingSundays] = useState(
        initialSettings?.enable_trading_sundays ?? true
    );

    // Niedziele handlowe
    const [mode, setMode] = useState<"all" | "none" | "custom">(
        (initialSettings?.trading_sundays_mode as "all" | "none" | "custom") ||
            "none"
    );
    const [customSundays, setCustomSundays] = useState<string[]>(
        initialSettings?.custom_trading_sundays || getDefaultTradingSundays()
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [defaultShiftDuration, _setDefaultShiftDuration] = useState(
        initialSettings?.default_shift_duration || 8
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [defaultBreakMinutes, _setDefaultBreakMinutes] = useState(
        initialSettings?.default_break_minutes || 0
    );
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Sprawdź czy są niezapisane zmiany
    const hasChanges = useMemo(() => {
        const initialOpeningHours =
            (initialSettings?.opening_hours as unknown as OpeningHours) ||
            DEFAULT_OPENING_HOURS;
        const initialMode = initialSettings?.trading_sundays_mode || "none";
        const initialCustomSundays =
            initialSettings?.custom_trading_sundays ||
            getDefaultTradingSundays();
        const initialShiftDuration =
            initialSettings?.default_shift_duration || 8;
        const initialBreakMinutes = initialSettings?.default_break_minutes || 0;
        const initialEnableTradingSundays =
            initialSettings?.enable_trading_sundays ?? true;

        return (
            JSON.stringify(openingHours) !==
                JSON.stringify(initialOpeningHours) ||
            mode !== initialMode ||
            JSON.stringify(customSundays.sort()) !==
                JSON.stringify([...initialCustomSundays].sort()) ||
            defaultShiftDuration !== initialShiftDuration ||
            defaultBreakMinutes !== initialBreakMinutes ||
            enableTradingSundays !== initialEnableTradingSundays
        );
    }, [
        openingHours,
        mode,
        customSundays,
        defaultShiftDuration,
        defaultBreakMinutes,
        enableTradingSundays,
        initialSettings,
    ]);

    // Synchronizuj stan z globalnym kontekstem
    useEffect(() => {
        setHasUnsavedChanges(hasChanges);
    }, [hasChanges, setHasUnsavedChanges]);

    // Pobierz wszystkie niedziele w wybranym roku
    const getSundaysInYear = (year: number) => {
        const start = startOfYear(new Date(year, 0, 1));
        const end = endOfYear(new Date(year, 0, 1));
        const days = eachDayOfInterval({ start, end });
        return days
            .filter((d) => getDay(d) === 0)
            .map((d) => format(d, "yyyy-MM-dd"));
    };

    const sundaysInYear = getSundaysInYear(selectedYear);

    const toggleSunday = (date: string) => {
        setCustomSundays((prev) =>
            prev.includes(date)
                ? prev.filter((d) => d !== date)
                : [...prev, date]
        );
    };

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const supabase = createClient();

            const settingsData = {
                organization_id: organizationId,
                trading_sundays_mode: mode as "all" | "none" | "custom",
                custom_trading_sundays:
                    mode === "custom" ? customSundays : null,
                default_shift_duration: defaultShiftDuration,
                default_break_minutes: defaultBreakMinutes,
                store_open_time: openingHours.monday.open,
                store_close_time: openingHours.monday.close,
                enable_trading_sundays: enableTradingSundays,
                opening_hours: openingHours as unknown as Json,
                updated_at: new Date().toISOString(),
            };

            if (initialSettings) {
                const { error } = await supabase
                    .from("organization_settings")
                    .update(settingsData)
                    .eq("organization_id", organizationId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("organization_settings")
                    .insert(settingsData);

                if (error) throw error;
            }

            showToast.saved();
            router.refresh();
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            logger.error("Error saving settings:", errorMessage);
            showToast.error(`Błąd podczas zapisywania: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    }, [
        organizationId,
        mode,
        customSundays,
        defaultShiftDuration,
        defaultBreakMinutes,
        openingHours,
        enableTradingSundays,
        initialSettings,
        router,
        setIsSaving,
    ]);

    // Rejestruj funkcję zapisu w globalnym kontekście
    useRegisterSaveFunction(handleSave);

    const groupSundaysByMonth = () => {
        const grouped: { [key: string]: string[] } = {};
        sundaysInYear.forEach((date) => {
            const monthKey = format(new Date(date), "yyyy-MM");
            if (!grouped[monthKey]) grouped[monthKey] = [];
            grouped[monthKey].push(date);
        });
        return grouped;
    };

    const sundaysByMonth = groupSundaysByMonth();

    return (
        <SettingsCard
            title="Godziny otwarcia"
            description="Ustaw godziny pracy dla każdego dnia tygodnia"
        >
            <div className="space-y-4">
                <OpeningHoursEditor
                    value={openingHours}
                    onChange={setOpeningHours}
                    sundayLabel="Niedziela"
                    hideSunday={true}
                />

                {/* Niedziela - osobna sekcja */}
                <div className="rounded-lg border overflow-hidden">
                    {/* Nagłówek niedzieli */}
                    <div
                        className={cn(
                            "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-2.5",
                            !openingHours.sunday?.enabled && "opacity-50"
                        )}
                    >
                        {/* Nagłówek - nazwa i przełącznik */}
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={openingHours.sunday?.enabled ?? false}
                                onCheckedChange={(checked) => {
                                    setOpeningHours({
                                        ...openingHours,
                                        sunday: {
                                            ...openingHours.sunday,
                                            enabled: checked,
                                        },
                                    });
                                    if (checked) setEnableTradingSundays(true);
                                }}
                                className="scale-90"
                            />
                            <span
                                className={cn(
                                    "w-10 text-sm font-medium",
                                    !openingHours.sunday?.enabled &&
                                        "text-muted-foreground"
                                )}
                            >
                                Nd
                            </span>
                            {/* Status zamknięte na mobile */}
                            {!openingHours.sunday?.enabled && (
                                <span className="text-sm text-red-500 sm:hidden">
                                    Zamknięte
                                </span>
                            )}
                        </div>

                        {/* Godziny niedzieli */}
                        {openingHours.sunday?.enabled ? (
                            <div className="flex items-center gap-2 flex-1 pl-11 sm:pl-0">
                                <input
                                    type="time"
                                    value={openingHours.sunday.open}
                                    onChange={(e) =>
                                        setOpeningHours({
                                            ...openingHours,
                                            sunday: {
                                                ...openingHours.sunday,
                                                open: e.target.value,
                                            },
                                        })
                                    }
                                    className="h-9 sm:h-8 w-22 sm:w-24 px-2 text-sm font-mono border rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <span className="text-muted-foreground">—</span>
                                <input
                                    type="time"
                                    value={openingHours.sunday.close}
                                    onChange={(e) =>
                                        setOpeningHours({
                                            ...openingHours,
                                            sunday: {
                                                ...openingHours.sunday,
                                                close: e.target.value,
                                            },
                                        })
                                    }
                                    className="h-9 sm:h-8 w-22 sm:w-24 px-2 text-sm font-mono border rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />

                                {/* Czas pracy */}
                                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-auto sm:ml-1">
                                    {(() => {
                                        const [oH, oM] =
                                            openingHours.sunday.open
                                                .split(":")
                                                .map(Number);
                                        const [cH, cM] =
                                            openingHours.sunday.close
                                                .split(":")
                                                .map(Number);
                                        let mins =
                                            cH * 60 + cM - (oH * 60 + oM);
                                        if (mins < 0) mins += 24 * 60;
                                        return `${Math.floor(mins / 60)}h${
                                            mins % 60 > 0 ? `${mins % 60}m` : ""
                                        }`;
                                    })()}
                                </span>
                            </div>
                        ) : (
                            <span className="text-sm text-red-500 hidden sm:block">
                                Zamknięte
                            </span>
                        )}
                    </div>

                    {/* Opcje niedzieli - które niedziele */}
                    {openingHours.sunday?.enabled && (
                        <div className="p-3 border-t bg-slate-50/50 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <Label className="text-xs text-muted-foreground shrink-0">
                                    Które niedziele?
                                </Label>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setMode("all")}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                            mode === "all"
                                                ? "bg-blue-500 text-white"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        Wszystkie
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode("custom")}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                            mode === "custom"
                                                ? "bg-blue-500 text-white"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        Wybrane
                                    </button>
                                </div>
                            </div>

                            {/* Wybór konkretnych niedziel */}
                            {mode === "custom" && (
                                <div className="space-y-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={selectedYear.toString()}
                                                onChange={(e) =>
                                                    setSelectedYear(
                                                        parseInt(e.target.value)
                                                    )
                                                }
                                                className="h-8 px-2 text-sm border rounded bg-white cursor-pointer"
                                            >
                                                {[2024, 2025, 2026].map((y) => (
                                                    <option key={y} value={y}>
                                                        {y}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="text-xs text-muted-foreground">
                                                {
                                                    customSundays.filter((d) =>
                                                        d.startsWith(
                                                            selectedYear.toString()
                                                        )
                                                    ).length
                                                }
                                                /{sundaysInYear.length}{" "}
                                                wybranych
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCustomSundays(
                                                        sundaysInYear
                                                    )
                                                }
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                wszystkie
                                            </button>
                                            <span className="text-xs text-muted-foreground">
                                                |
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCustomSundays([])
                                                }
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                wyczyść
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-1.5 p-2 rounded-md border bg-white max-h-48 sm:max-h-36 overflow-y-auto">
                                        {Object.entries(sundaysByMonth).map(
                                            ([monthKey, sundays]) => (
                                                <div
                                                    key={monthKey}
                                                    className="space-y-0.5"
                                                >
                                                    <span className="text-[9px] font-semibold text-slate-400 uppercase block">
                                                        {format(
                                                            new Date(
                                                                monthKey + "-01"
                                                            ),
                                                            "LLL",
                                                            { locale: pl }
                                                        )}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1 sm:gap-0.5">
                                                        {sundays.map((date) => {
                                                            const isSelected =
                                                                customSundays.includes(
                                                                    date
                                                                );
                                                            return (
                                                                <button
                                                                    key={date}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        toggleSunday(
                                                                            date
                                                                        )
                                                                    }
                                                                    className={cn(
                                                                        "w-7 h-7 sm:w-5 sm:h-5 rounded text-xs sm:text-[10px] font-medium transition-all",
                                                                        isSelected
                                                                            ? "bg-emerald-500 text-white"
                                                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                                    )}
                                                                >
                                                                    {format(
                                                                        new Date(
                                                                            date
                                                                        ),
                                                                        "d"
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </SettingsCard>
    );
}
