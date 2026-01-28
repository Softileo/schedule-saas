"use client";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { timeToMinutes } from "@/lib/utils/date-helpers";
import { DayOfWeek, DayOpeningHours, OpeningHours } from "@/types";
import { DAY_NAMES_MAP } from "@/lib/utils/date-helpers";
import { DEFAULT_WEEKLY_OPENING_HOURS } from "@/lib/constants/time";

// Kolejność dni
const DAYS_ORDER: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
];

// Re-eksport dla kompatybilności wstecznej
export const DEFAULT_OPENING_HOURS = DEFAULT_WEEKLY_OPENING_HOURS;

interface OpeningHoursEditorProps {
    value: OpeningHours;
    onChange: (hours: OpeningHours) => void;
    sundayLabel?: string;
    hideSunday?: boolean;
}

export function OpeningHoursEditor({
    value,
    onChange,
    hideSunday = false,
}: OpeningHoursEditorProps) {
    const daysToShow = hideSunday
        ? DAYS_ORDER.filter((day) => day !== "sunday")
        : DAYS_ORDER;

    const updateDayEnabled = (day: DayOfWeek, enabled: boolean) => {
        const newHours = { ...value };
        newHours[day] = { ...newHours[day], enabled };
        onChange(newHours);
    };

    const updateDayHours = (
        day: DayOfWeek,
        field: "open" | "close",
        time: string
    ) => {
        const newHours = { ...value };
        newHours[day] = { ...newHours[day], [field]: time };
        onChange(newHours);
    };

    const calculateDayDuration = (dayHours: DayOpeningHours): string => {
        if (!dayHours.enabled) return "";

        const openMinutes = timeToMinutes(dayHours.open);
        const closeMinutes = timeToMinutes(dayHours.close);
        let totalMinutes = closeMinutes - openMinutes;
        if (totalMinutes < 0) totalMinutes += 24 * 60;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h${minutes > 0 ? `${minutes}m` : ""}`;
    };

    return (
        <div className="space-y-1">
            {/* Lista dni */}
            <div className="rounded-lg border divide-y">
                {daysToShow.map((day) => {
                    const dayHours = value[day] || DEFAULT_OPENING_HOURS[day];

                    return (
                        <div
                            key={day}
                            className={cn(
                                "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-2.5 transition-colors",
                                !dayHours.enabled && "opacity-50"
                            )}
                        >
                            {/* Nagłówek wiersza - nazwa dnia i przełącznik */}
                            <div className="flex items-center gap-3">
                                {/* Przełącznik */}
                                <Switch
                                    checked={dayHours.enabled}
                                    onCheckedChange={(checked) =>
                                        updateDayEnabled(day, checked)
                                    }
                                    className="scale-90"
                                />

                                {/* Nazwa dnia */}
                                <span
                                    className={cn(
                                        "w-10 text-sm font-medium",
                                        !dayHours.enabled &&
                                            "text-muted-foreground"
                                    )}
                                >
                                    {DAY_NAMES_MAP[day]}
                                </span>

                                {/* Status zamknięte na mobile */}
                                {!dayHours.enabled && (
                                    <span className="text-sm text-red-500 sm:hidden">
                                        Zamknięte
                                    </span>
                                )}
                            </div>

                            {/* Godziny */}
                            {dayHours.enabled ? (
                                <div className="flex items-center gap-2 flex-1 pl-11 sm:pl-0">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="time"
                                            value={dayHours.open}
                                            onChange={(e) =>
                                                updateDayHours(
                                                    day,
                                                    "open",
                                                    e.target.value
                                                )
                                            }
                                            className="w-24 px-2 text-center"
                                        />
                                        <span className="text-muted-foreground">
                                            -
                                        </span>
                                        <Input
                                            type="time"
                                            value={dayHours.close}
                                            onChange={(e) =>
                                                updateDayHours(
                                                    day,
                                                    "close",
                                                    e.target.value
                                                )
                                            }
                                            className="w-24 px-2 text-center"
                                        />
                                    </div>

                                    {/* Czas pracy */}
                                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-auto sm:ml-1">
                                        {calculateDayDuration(dayHours)}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-sm text-red-500 hidden sm:block">
                                    Zamknięte
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
