"use client";

import { memo } from "react";
import { getShiftTypeFromTime } from "@/lib/constants/shift-styles";
import type { ShiftTemplate } from "@/types";

interface ShiftLegendProps {
    templates: ShiftTemplate[];
}

export const ShiftLegend = memo(function ShiftLegend({
    templates,
}: ShiftLegendProps) {
    if (templates.length === 0) return null;

    return (
        <div className="border border-slate-200 rounded-2xl bg-white p-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="font-medium text-slate-400 tracking-wide">
                    Legenda:
                </span>
                <div className="flex flex-wrap items-center gap-4">
                    {templates.map((template) => {
                        const type = getShiftTypeFromTime(template.start_time);
                        const color =
                            template.color ||
                            (type === "morning"
                                ? "#3b82f6"
                                : type === "afternoon"
                                ? "#8b5cf6"
                                : "#64748b");
                        return (
                            <div
                                key={template.id}
                                className="flex items-center gap-2 text-sm"
                            >
                                <div
                                    className="w-6 h-6 rounded-lg border shadow-sm flex items-center justify-center text-[10px] font-bold"
                                    style={{
                                        backgroundColor: `${color}15`,
                                        borderColor: `${color}35`,
                                        color: color,
                                    }}
                                >
                                    {template.start_time.slice(0, 2)}
                                </div>
                                <span className="font-medium text-slate-600">
                                    {template.start_time.slice(0, 5)}-
                                    {template.end_time.slice(0, 5)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

ShiftLegend.displayName = "ShiftLegend";
