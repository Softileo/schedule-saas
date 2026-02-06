"use client";

import { memo } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileDown, Sparkles, UserX } from "lucide-react";
import { ShiftTemplatesManager } from "./shift-templates-manager";
import { ClearScheduleButton } from "./clear-schedule-button";
import type { ShiftTemplate, Employee } from "@/types";
import Link from "next/link";

interface ActionToolbarProps {
    shiftTemplates: ShiftTemplate[];
    organizationId: string;
    employees: Employee[];
    onOpenPDFDialog: () => void;
    onOpenAIDialog: () => void;
    onClearSchedule: () => void;
    scheduleId: string;
    year: number;
    month: number;
    shiftsCount: number;
}

export const ActionToolbar = memo(function ActionToolbar({
    shiftTemplates,
    organizationId,
    onOpenPDFDialog,
    onOpenAIDialog,
    onClearSchedule,
    scheduleId,
    year,
    month,
    shiftsCount,
}: ActionToolbarProps) {
    const monthName = format(new Date(year, month - 1), "LLLL yyyy", {
        locale: pl,
    });

    return (
        <div className="flex fixed sm:static bottom-4 z-50 scale-110 sm:scale-100 items-center gap-2 bg-white/95 border border-slate-200 rounded-xl p-1.5 ">
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            className="px-3 m-0.5 group relative overflow-hidden text-violet-600 hover:text-blue-500 bg-violet-50 rounded-full transition-colors sm:rounded-md"
                            onClick={onOpenAIDialog}
                        >
                            <div className="bg-linear-30 from-transparent via-white/80 to-transparent w-1/2 h-full -left-full absolute animate-shimmer2 z-10" />
                            <div className="relative">
                                <Sparkles size={22} />
                                <span className="absolute sm:hidden animate-pulse rounded-full z-0 -top-2 -right-1.5 text-[8px] font-bold">
                                    AI
                                </span>
                            </div>

                            <span className="hidden sm:block">
                                <span className="bg-linear-to-r group-hover:bg-linear-to-bl from-blue-600 via-blue-500 to-violet-500 bg-clip-text text-transparent font-semibold">
                                    Generuj
                                </span>
                            </span>
                        </Button>
                    </TooltipTrigger>

                    <TooltipContent>
                        <p>Generuj grafik AI</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <div>
                            <ShiftTemplatesManager
                                templates={shiftTemplates}
                                organizationId={organizationId}
                                variant="icon"
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Zarządzaj zmianami</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        {/* <div>
                            <EmployeesDropdown
                                organizationId={organizationId}
                                employees={employees}
                                variant="icon"
                            />
                        </div> */}
                        <Link href="/pracownicy">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                            >
                                <UserX className="h-4 w-4" />
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Dodaj nieobecność</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={onOpenPDFDialog}
                            className="h-8 w-8 p-0"
                        >
                            <FileDown className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Eksportuj do PDF</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <div>
                            <ClearScheduleButton
                                scheduleId={scheduleId}
                                monthName={monthName}
                                shiftsCount={shiftsCount}
                                onClear={onClearSchedule}
                                variant="icon"
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Wyczyść grafik</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
});
