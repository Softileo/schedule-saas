"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { PDFTemplateType, PDFTemplateConfig } from "./pdf-types";

interface TemplatePreviewProps {
    template: PDFTemplateConfig;
    isSelected: boolean;
    onSelect: () => void;
}

// Klasyczny podgląd - tradycyjny z wyraźnymi liniami
function ClassicPreview() {
    return (
        <div className="w-full h-full bg-white p-2 text-[4px] overflow-hidden">
            {/* Header */}
            <div className="border-b-2 border-slate-800 pb-1 mb-1">
                <div className="font-bold text-[6px] text-slate-800">
                    Grafik pracy - Styczeń 2025
                </div>
                <div className="text-slate-500">Nazwa firmy</div>
            </div>
            {/* Table */}
            <div className="border border-slate-300">
                {/* Header row */}
                <div className="flex bg-slate-50 border-b border-slate-300">
                    <div className="w-8 p-0.5 border-r border-slate-300 text-[3px] font-bold">
                        Pracownik
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <div
                            key={d}
                            className={cn(
                                "flex-1 p-0.5 text-center border-r border-slate-200 text-[3px]",
                                d === 6 ? "bg-slate-100" : "",
                                d === 7 ? "bg-blue-100" : ""
                            )}
                        >
                            {d}
                        </div>
                    ))}
                </div>
                {/* Data rows */}
                {[1, 2, 3].map((row) => (
                    <div key={row} className="flex border-b border-slate-200">
                        <div className="w-8 p-0.5 border-r border-slate-300 bg-slate-50 text-[3px]">
                            Jan K.
                        </div>
                        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                            <div
                                key={d}
                                className={cn(
                                    "flex-1 p-0.5 text-center text-[2px] border-r border-slate-200",
                                    d === 6 ? "bg-slate-100" : "",
                                    d === 7 ? "bg-blue-100" : "",
                                    d === 3 && row === 1 ? "bg-red-200" : ""
                                )}
                            >
                                {d <= 5 && row <= 2 && "8:00"}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Kolorowy podgląd - pastelowy, minimalistyczny jak /grafik
function ColorfulPreview() {
    const colors = ["#6366f1", "#ef4444", "#22c55e"];
    return (
        <div className="w-full h-full bg-white p-2 text-[4px] overflow-hidden">
            {/* Header - minimalistyczny */}
            <div className="flex justify-between items-end pb-1 mb-1.5 border-b border-slate-200">
                <div>
                    <div className="font-bold text-[6px] text-slate-800">
                        Nazwa firmy
                    </div>
                    <div className="text-slate-400 text-[3px]">
                        Grafik pracy
                    </div>
                </div>
                <div className="text-[3px] text-slate-400 uppercase tracking-wide">
                    Styczeń 2025
                </div>
            </div>
            {/* Table */}
            <div>
                {/* Header row */}
                <div className="flex border-b border-slate-200 pb-0.5 mb-0.5">
                    <div className="w-10 text-[3px] text-slate-400 uppercase">
                        Pracownik
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <div
                            key={d}
                            className={cn(
                                "flex-1 text-center text-[3px] font-bold text-slate-600",
                                d === 6 ? "bg-slate-50" : "",
                                d === 7 ? "bg-blue-50" : ""
                            )}
                        >
                            {d}
                        </div>
                    ))}
                </div>
                {/* Data rows */}
                {[0, 1, 2].map((row) => (
                    <div key={row} className="flex border-b border-slate-50">
                        <div className="w-10 p-0.5 flex items-center gap-0.5">
                            <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: colors[row] }}
                            />
                            <span className="text-[3px] text-slate-700">
                                Jan K.
                            </span>
                        </div>
                        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                            <div
                                key={d}
                                className={cn(
                                    "flex-1 p-0.5 flex items-center justify-center",
                                    d === 6 ? "bg-slate-50" : "",
                                    d === 7 ? "bg-blue-50" : ""
                                )}
                            >
                                {d <= 5 && (
                                    <div
                                        className="px-0.5 py-px rounded border text-[2px] flex flex-col items-center"
                                        style={{
                                            backgroundColor: `${colors[row]}10`,
                                            borderColor: `${colors[row]}25`,
                                        }}
                                    >
                                        <span
                                            className="font-bold"
                                            style={{ color: colors[row] }}
                                        >
                                            8:00
                                        </span>
                                        <span
                                            style={{
                                                color: colors[row],
                                                opacity: 0.6,
                                            }}
                                        >
                                            16:00
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Minimalistyczny podgląd - ultra czysty, tylko tekst
function MinimalPreview() {
    return (
        <div className="w-full h-full bg-white p-2.5 text-[4px] overflow-hidden">
            {/* Header - minimalistyczny */}
            <div className="flex justify-between items-baseline mb-2">
                <div>
                    <div className="font-bold text-[7px] text-gray-800 tracking-tight">
                        Nazwa firmy
                    </div>
                    <div className="text-gray-400 text-[3px]">Grafik pracy</div>
                </div>
                <div className="text-[3px] text-gray-400">Styczeń 2025</div>
            </div>
            {/* Table */}
            <div>
                {/* Header row */}
                <div className="flex border-b border-gray-200 pb-0.5 mb-0.5">
                    <div className="w-10 text-[3px] text-gray-400 uppercase">
                        Pracownik
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <div
                            key={d}
                            className={cn(
                                "flex-1 text-center",
                                d === 6 ? "bg-gray-50" : "",
                                d === 7 ? "bg-blue-50" : ""
                            )}
                        >
                            <div className="text-[3px] font-bold text-gray-600">
                                {d}
                            </div>
                            <div className="text-[2px] text-gray-300 uppercase">
                                {
                                    ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"][
                                        d - 1
                                    ]
                                }
                            </div>
                        </div>
                    ))}
                </div>
                {/* Data rows */}
                {[1, 2, 3].map((row) => (
                    <div key={row} className="flex py-0.5">
                        <div className="w-10 text-[3px] text-gray-600">
                            Jan K.
                        </div>
                        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                            <div
                                key={d}
                                className={cn(
                                    "flex-1 flex flex-col items-center justify-center",
                                    d === 6 ? "bg-gray-50" : "",
                                    d === 7 ? "bg-blue-50" : ""
                                )}
                            >
                                {d <= 5 && row <= 2 && (
                                    <div className="flex flex-col items-center">
                                        <div className="text-[2px] font-bold text-gray-600">
                                            8:00
                                        </div>
                                        <div className="text-[2px] text-gray-400">
                                            16:00
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TemplatePreview({
    template,
    isSelected,
    onSelect,
}: TemplatePreviewProps) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                "relative flex flex-col rounded-lg border-2 transition-all overflow-hidden",
                "hover:border-indigo-300 hover:shadow-md",
                isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-200"
                    : "border-slate-200"
            )}
        >
            {/* Preview */}
            <div className="w-full h-max border-b border-slate-200">
                {template.id === "classic" && <ClassicPreview />}
                {template.id === "colorful" && <ColorfulPreview />}
                {template.id === "minimal" && <MinimalPreview />}
            </div>

            {/* Info */}
            <div className="p-3 text-left bg-white">
                <div className="font-medium text-slate-900">
                    {template.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                    {template.description}
                </div>
            </div>

            {/* Selected indicator */}
            {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                </div>
            )}
        </button>
    );
}

interface TemplatePreviewGridProps {
    selectedTemplate: PDFTemplateType;
    onSelectTemplate: (template: PDFTemplateType) => void;
    templates: PDFTemplateConfig[];
}

export function TemplatePreviewGrid({
    selectedTemplate,
    onSelectTemplate,
    templates,
}: TemplatePreviewGridProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
                <TemplatePreview
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate === template.id}
                    onSelect={() => onSelectTemplate(template.id)}
                />
            ))}
        </div>
    );
}
