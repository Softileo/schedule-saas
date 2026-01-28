import { NoOrganizationState } from "@/components/features/dashboard/dashboard-empty-states";
import { ChartSpline, Plus } from "lucide-react";
import { fetchHolidays } from "@/lib/api/holidays";
import { calculateWorkingHours as calculateWorkHours } from "@/lib/core/schedule/work-hours";
import Link from "next/link";
import { parseISO } from "date-fns";
import { EmployeeStatsTable } from "@/components/features/dashboard/employee-stats-table";
import { ScheduleSlider } from "@/components/features/dashboard/schedule-slider";
import {
    getCachedDashboardStats,
    getGreeting,
    getFirstName,
    hasEmployeeStats,
} from "@/lib/services/dashboard.service";
import { getDashboardContext } from "@/lib/services/dashboard-context";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCarousel } from "./components/StatsCarousel";
import HolidaysSection from "./components/HolidaysSection";
import AbsencesSection from "./components/AbsencesSection";
import { formatDatePL, formatName } from "@/lib/utils/index";
import { BackgroundEffects } from "@/components/ui/background-effects";
import { ShareFeedback } from "@/components/common/feedback/share-feedback";

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ org?: string }>;
}) {
    const params = await searchParams;
    const { supabase, user, currentOrg } = await getDashboardContext({
        orgSlug: params.org,
    });

    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,user_feedback")
        .eq("id", user.id)
        .single();

    const userName = getFirstName(profile?.full_name ?? null);
    const hasFeedback = profile?.user_feedback === true;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const holidays = await fetchHolidays(currentYear);
    const nextYearHolidays = await fetchHolidays(currentYear + 1);
    const allHolidays = [...holidays, ...nextYearHolidays];

    const workHours = calculateWorkHours(currentYear, currentMonth, holidays);

    const dashboardStats = currentOrg
        ? await getCachedDashboardStats(
              currentOrg.id,
              currentYear,
              currentMonth,
          )
        : {
              employeeCount: 0,
              totalShiftsThisMonth: 0,
              employeeStats: [],
              yearlyStats: {},
              recentSchedules: [],
              availableYears: [],
              templates: [],
              upcomingAbsences: [],
          };

    const {
        employeeCount,
        employeeStats,
        yearlyStats,
        recentSchedules,
        availableYears,
        templates,
        upcomingAbsences,
    } = dashboardStats;

    const greeting = getGreeting();
    const today = new Date();

    const upcomingHolidays = allHolidays
        .filter((h) => parseISO(h.date) >= today)
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
        .slice(0, 3);

    if (!currentOrg) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">
                        Witaj, {formatName(userName)}{" "}
                        <span className="inline-block animate-wave">👋</span>
                    </h1>
                    <p className="text-slate-500 mt-1 first-letter:uppercase">
                        {formatDatePL(today, "EEEE, d MMMM yyyy")}
                    </p>
                </div>
                <NoOrganizationState
                    actionHref={ROUTES.USTAWIENIA_ORGANIZACJE}
                />
            </div>
        );
    }

    return (
        <>
            {/* <ColorfulGradientBar opacity={0.5} /> */}
            <BackgroundEffects />
            <div className="max-w-7xl mx-auto px-0 sm:px-6 py-6 space-y-8 z-10 relative">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 ">
                    <div className="pb-6 py-12 px-4 sm:p-0 text-center md:text-left ">
                        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-800 tracking-tight">
                            {greeting},{" "}
                            <span className="font-bold bg-linear-to-r from-blue-600 via-blue-500 to-violet-500 bg-clip-text text-transparent">
                                {formatName(userName)}{" "}
                            </span>
                            <span className="inline-block animate-wave">
                                👋
                            </span>
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium first-letter:uppercase">
                            {formatDatePL(today, "EEEE, d MMMM yyyy")}
                        </p>
                    </div>

                    <Button
                        asChild
                        className="h-10 sm:w-auto w-max mx-auto sm:mx-0"
                    >
                        <Link href={ROUTES.GRAFIK}>
                            <Plus />
                            Nowy grafik
                        </Link>
                    </Button>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 ">
                    {/* Left Column (Sidebar) */}
                    <div className="space-y-6 ">
                        {/* Holidays Section */}
                        <HolidaysSection
                            upcomingHolidays={upcomingHolidays}
                            today={today}
                        />

                        {/* Absences Section */}
                        <AbsencesSection
                            upcomingAbsences={upcomingAbsences}
                            today={today}
                        />
                        <ShareFeedback hasFeedback={hasFeedback} />
                    </div>
                    {/* Right Column (Content) */}
                    <div className="lg:col-span-2 space-y-8 ">
                        {/* Stats Row */}
                        <StatsCarousel
                            employeeCount={employeeCount}
                            totalWorkingHours={workHours.totalWorkingHours}
                            totalWorkingDays={workHours.totalWorkingDays}
                        />

                        {/* Recent Schedules */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-base font-semibold text-slate-900">
                                        Historia grafików
                                    </CardTitle>
                                </div>
                            </CardHeader>

                            <ScheduleSlider
                                schedules={recentSchedules}
                                currentYear={currentYear}
                                currentMonth={currentMonth}
                                orgSlug={currentOrg.slug}
                            />
                        </Card>

                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-base font-semibold text-slate-900">
                                    Statystyki pracowników
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="px-0 sm:px-6">
                                {hasEmployeeStats(employeeStats) ? (
                                    <EmployeeStatsTable
                                        data={employeeStats}
                                        yearlyStats={yearlyStats}
                                        availableYears={availableYears}
                                        templates={templates}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 px-4 space-y-6 text-slate-400">
                                        {/* Ikona wykresu */}
                                        <ChartSpline size={64} />

                                        <p className="text-sm text-center">
                                            Brak danych do wyświetlenia. W tym
                                            miejscu pojawi się wykres po dodaniu
                                            statystyk.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
