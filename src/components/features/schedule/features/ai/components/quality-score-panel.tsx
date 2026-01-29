"use client";

/**
 * =============================================================================
 * QUALITY SCORE PANEL - Wyświetla wynik jakości grafiku
 * =============================================================================
 */

import { Sparkles } from "lucide-react";
import { QualityScoreDisplay } from "@/components/common/quality-score-display";
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
    const subtitle = optimization?.executionTimeMs
        ? `AI zoptymalizowało w ${optimization.executionTimeMs}ms`
        : undefined;

    return (
        <QualityScoreDisplay
            score={quality.qualityPercent}
            icon={Sparkles}
            title="Jakość grafiku"
            subtitle={subtitle}
            className="text-violet-900"
        />
    );
}
