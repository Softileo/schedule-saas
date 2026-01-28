export {};
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, BadgeAlert } from "lucide-react";
import Link from "next/link";
import { format, parseISO, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";
import { ROUTES } from "@/lib/constants/routes";
import { NoAbsencesState } from "@/components/features/dashboard/dashboard-empty-states";

interface Absence {
    id: string;
    employeeName: string;
    employeeColor: string;
    absenceLabel: string;
    absenceColor: string;
    startDate: string;
    endDate: string;
}

interface AbsencesSectionProps {
    upcomingAbsences: Absence[];
    today: Date;
}

export default function AbsencesSection({
    upcomingAbsences,
    today,
}: AbsencesSectionProps) {
    return (
        <Card className="shadow-sm bg-linear-to-br from-yellow-50/70 to-orange-100 border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold text-orange-800 flex items-center gap-2">
                    <BadgeAlert className="h-4 w-4 text-orange-500" />
                    Nieobecności
                </CardTitle>
                <Link
                    href={ROUTES.PRACOWNICY}
                    className="text-xs flex items-center gap-0.5 text-orange-800 hover:text-orange-700 font-medium transition-colors"
                >
                    Pracownicy <ChevronRight size={13} />
                </Link>
            </CardHeader>
            <CardContent>
                {upcomingAbsences.length > 0 ? (
                    <div className="space-y-1">
                        {upcomingAbsences.slice(0, 4).map((absence) => {
                            const startDate = parseISO(absence.startDate);
                            const endDate = parseISO(absence.endDate);
                            const isOngoing = startDate <= today;
                            const daysUntil = differenceInDays(
                                startDate,
                                today,
                            );
                            return (
                                <div
                                    key={absence.id}
                                    className="flex items-start gap-3 p-2 rounded-lg -mx-2 bg-transparent group"
                                >
                                    <div
                                        className="w-8 h-8 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0 "
                                        style={{
                                            backgroundColor:
                                                absence.employeeColor,
                                        }}
                                    >
                                        {absence.employeeName
                                            .split(" ")
                                            .map((n) => n[0]?.toUpperCase())
                                            .slice(0, 2)
                                            .join("")}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-medium text-slate-700 truncate leading-none mb-1.5 group-hover:text-slate-900 transition-colors">
                                                {absence.employeeName}
                                            </p>
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                                                {isOngoing
                                                    ? `do ${format(endDate, "d MMM", { locale: pl })}`
                                                    : daysUntil === 0
                                                      ? "Dzisiaj"
                                                      : daysUntil === 1
                                                        ? "Jutro"
                                                        : `za ${daysUntil} dni`}
                                            </span>
                                        </div>
                                        <div className="flex items-center flex-wrap gap-1.5">
                                            <span
                                                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-white"
                                                style={{
                                                    borderColor: `${absence.absenceColor}40`,
                                                    color: absence.absenceColor,
                                                }}
                                            >
                                                {absence.absenceLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <NoAbsencesState />
                )}
            </CardContent>
        </Card>
    );
}
