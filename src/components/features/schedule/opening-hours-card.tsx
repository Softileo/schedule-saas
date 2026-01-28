"use client";

import { useMemo } from "react";
import Link from "next/link";
import { OpeningHours, DayOfWeek } from "@/types";
import { DEFAULT_OPENING_HOURS } from "@/components/features/settings/opening-hours-editor";
import { Clock, ExternalLink } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

interface OpeningHoursCardProps {
    initialData: OpeningHours | null;
}

// Helpers
const DAYS_ORDER: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
];

const SHORT_DAY_NAMES: Record<DayOfWeek, string> = {
    monday: "Pn",
    tuesday: "Wt",
    wednesday: "Śr",
    thursday: "Czw",
    friday: "Pt",
    saturday: "Sb",
    sunday: "Nd",
};

function formatOpeningHoursSummary(
    hours: OpeningHours
): { label: string; status: "open" | "closed" }[] {
    const groups: {
        start: DayOfWeek;
        end: DayOfWeek;
        open: string;
        close: string;
        enabled: boolean;
    }[] = [];

    let currentGroup = {
        start: DAYS_ORDER[0],
        end: DAYS_ORDER[0],
        open: hours[DAYS_ORDER[0]].open,
        close: hours[DAYS_ORDER[0]].close,
        enabled: hours[DAYS_ORDER[0]].enabled,
    };

    for (let i = 1; i < DAYS_ORDER.length; i++) {
        const day = DAYS_ORDER[i];
        const dayConfig = hours[day];

        if (
            dayConfig.enabled === currentGroup.enabled &&
            (!dayConfig.enabled ||
                (dayConfig.open === currentGroup.open &&
                    dayConfig.close === currentGroup.close))
        ) {
            currentGroup.end = day;
        } else {
            groups.push({ ...currentGroup });
            currentGroup = {
                start: day,
                end: day,
                open: dayConfig.open,
                close: dayConfig.close,
                enabled: dayConfig.enabled,
            };
        }
    }
    groups.push(currentGroup);

    return groups.map((g) => {
        const dayRange =
            g.start === g.end
                ? SHORT_DAY_NAMES[g.start]
                : `${SHORT_DAY_NAMES[g.start]}-${SHORT_DAY_NAMES[g.end]}`;

        if (!g.enabled) {
            return {
                label: `${dayRange} Zamknięte`,
                status: "closed",
            };
        }

        return {
            label: `${dayRange} ${g.open}-${g.close}`,
            status: "open",
        };
    });
}

export function OpeningHoursCard({ initialData }: OpeningHoursCardProps) {
    const openingHours = initialData || DEFAULT_OPENING_HOURS;
    const summaries = useMemo(
        () => formatOpeningHoursSummary(openingHours),
        [openingHours]
    );

    return (
        <Link
            href={`${ROUTES.USTAWIENIA}?tab=org-settings`}
            className="block mb-6 group"
        >
            <div className="bg-white py-4 rounded-lg border-slate-200 border transition-all">
                <div className="flex items-start justify-between px-5">
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg transition-colors">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900 ">
                                Godziny otwarcia
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                                {summaries.length > 0 ? (
                                    summaries.map((summary, index) => (
                                        <span
                                            key={index}
                                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                                summary.status === "open"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                    : "bg-red-50 text-red-700 border-red-100"
                                            }`}
                                        >
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                    summary.status === "open"
                                                        ? "bg-emerald-500"
                                                        : "bg-red-500"
                                                }`}
                                            />
                                            {summary.label}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-slate-500">
                                        Brak zdefiniowanych godzin otwarcia
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900 transition-colors">
                        <span className="hidden sm:inline">Zarządzaj</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
