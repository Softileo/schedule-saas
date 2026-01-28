"use client";

/**
 * =============================================================================
 * QUALITY SCORE PANEL - Wyświetla wynik jakości grafiku
 * =============================================================================
 */

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleQuality, OptimizationInfo } from "./types";

interface QualityScorePanelProps {
    quality: ScheduleQuality;
    optimization: OptimizationInfo | null;
}

/**
 * Panel z wynikiem jakości grafiku
 */
export function QualityScorePanel({
    quality,
    optimization,
}: QualityScorePanelProps) {
    return (
        <div className="bg-linear-to-r from-violet-50 to-purple-50 rounded-lg p-4 border border-violet-100">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    <div>
                        <span className="font-medium text-violet-900">
                            Jakość grafiku
                        </span>
                        {optimization?.executionTimeMs && (
                            <p className="text-xs text-violet-600 mt-0.5">
                                AI zoptymalizowało w{" "}
                                {optimization.executionTimeMs}ms
                            </p>
                        )}
                    </div>
                </div>
                <span
                    className={cn(
                        "text-3xl font-bold",
                        quality.qualityPercent >= 80
                            ? "text-emerald-600"
                            : quality.qualityPercent >= 60
                            ? "text-amber-600"
                            : "text-red-600"
                    )}
                >
                    {quality.qualityPercent.toFixed(0)}%
                </span>
            </div>
        </div>
    );
}
