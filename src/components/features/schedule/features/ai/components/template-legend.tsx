"use client";

/**
 * =============================================================================
 * TEMPLATE LEGEND - Legenda szablonów zmian
 * =============================================================================
 */

import type { EmployeeStats } from "./types";

interface TemplateLegendProps {
    stats: EmployeeStats[];
}

/**
 * Legenda kolorów szablonów zmian
 */
export function TemplateLegend({ stats }: TemplateLegendProps) {
    // Zbierz unikalne szablony ze wszystkich pracowników
    const templatesMap = new Map<
        string,
        { name: string; color: string; startTime: string }
    >();

    stats.forEach((stat) => {
        stat.shiftsByTemplate?.forEach((tpl) => {
            if (!templatesMap.has(tpl.templateId)) {
                templatesMap.set(tpl.templateId, {
                    name: tpl.templateName,
                    color: tpl.templateColor,
                    startTime: tpl.templateStartTime,
                });
            }
        });
    });

    if (templatesMap.size === 0) return null;

    // Sortuj po godzinie rozpoczęcia
    const sortedTemplates = Array.from(templatesMap.values()).sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
    );

    return (
        <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            <span className="text-slate-400">Legenda:</span>
            {sortedTemplates.map((tpl, idx) => (
                <span key={idx} className="flex items-center gap-1">
                    <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tpl.color }}
                    />
                    <span style={{ color: tpl.color }} className="font-medium">
                        {tpl.name}
                    </span>
                </span>
            ))}
        </div>
    );
}
