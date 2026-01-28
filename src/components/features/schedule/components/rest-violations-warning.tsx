"use client";

import { memo, useState } from "react";
import { ChevronDown, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ScheduleViolation } from "@/lib/hooks/use-schedule-violations";

interface ScheduleViolationsWarningProps {
    violations: ScheduleViolation[];
}

export const RestViolationsWarning = memo(function RestViolationsWarning({
    violations,
}: ScheduleViolationsWarningProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (violations.length === 0) return null;

    // Używamy stylów spójnych z tooltipem pracownika
    const containerClasses = cn(
        "bg-white border shadow-xl backdrop-blur-sm pointer-events-auto transition-all duration-200",
        "border-red-100 shadow-red-500/10",
        isOpen ? "rounded-xl mt-4" : "rounded-b-xl",
    );

    const headerClasses = cn(
        "px-4 py-2.5 flex items-center gap-3 cursor-pointer select-none",
        "bg-red-50/80 text-red-900",
        // Jeśli jest otwarty, dodajemy border na dole nagłówka
        isOpen && "border-b border-red-100",
    );

    const iconColor = "text-red-600";
    const dotColor = "bg-red-400";
    const textColor = "text-slate-800";
    const subtextColor = "text-slate-500";

    return (
        <div className="fixed top-16 lg:top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
                className={containerClasses}
            >
                <CollapsibleTrigger className="w-full">
                    <div className={headerClasses}>
                        <OctagonAlert
                            className={cn("h-4 w-4 shrink-0", iconColor)}
                        />
                        <span className="text-xs md:text-sm font-semibold flex-1 text-left">
                            Wykryto naruszenia
                            <span className="ml-1.5 opacity-70 font-normal">
                                ({violations.length})
                            </span>
                        </span>
                        <ChevronDown
                            className={cn(
                                "h-4 w-4 shrink-0 transition-transform duration-200 opacity-50",
                                isOpen ? "rotate-180" : "",
                            )}
                        />
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="p-3 bg-white space-y-3 max-h-[80vh] overflow-y-auto">
                        {violations.map((v, i) => {
                            return (
                                <div
                                    key={i}
                                    className="flex gap-2.5 items-start"
                                >
                                    <div
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                                            dotColor,
                                        )}
                                    />
                                    <div className="text-xs space-y-0.5 min-w-0">
                                        <div
                                            className={cn(
                                                "font-medium leading-tight",
                                                textColor,
                                            )}
                                        >
                                            <span className="font-semibold">
                                                {v.employeeName}:
                                            </span>{" "}
                                            {v.description}
                                        </div>
                                        {v.details && (
                                            <div
                                                className={cn(
                                                    "leading-tight",
                                                    subtextColor,
                                                )}
                                            >
                                                {v.details}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
});
