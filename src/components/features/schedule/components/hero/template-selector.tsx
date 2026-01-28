"use client";

import { memo, useEffect, useRef, useState } from "react";
import { X, Flag, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getShiftTypeFromTime } from "@/lib/constants/shift-styles";
import type { ShiftTemplate, LocalShift } from "@/types";

interface TemplateSelectorProps {
    templates: ShiftTemplate[];
    currentShift: LocalShift | null;
    position: "top" | "bottom";
    checkViolation: (template: ShiftTemplate) => boolean;
    onSelectTemplate: (template: ShiftTemplate) => void;
    onSelectCustomTime: (
        startTime: string,
        endTime: string,
        breakMinutes: number
    ) => void;
    onRemoveShift: () => void;
    onAddAbsence?: () => void; // Opcja dodania nieobecności dla pracownika
    cellRect?: DOMRect; // Pozycja komórki dla fixed positioning
}

export const TemplateSelector = memo(function TemplateSelector({
    templates,
    currentShift,
    position,
    checkViolation,
    onSelectTemplate,
    onSelectCustomTime,
    onRemoveShift,
    onAddAbsence,
    cellRect,
}: TemplateSelectorProps) {
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(
        null
    );
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [customStartTime, setCustomStartTime] = useState(
        currentShift?.start_time || "09:00"
    );
    const [customEndTime, setCustomEndTime] = useState(
        currentShift?.end_time || "17:00"
    );
    const [customBreakMinutes, setCustomBreakMinutes] = useState(
        currentShift?.break_minutes || 0
    );
    const selectorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!cellRect || !selectorRef.current) return;

        const selectorHeight = selectorRef.current.offsetHeight;
        const selectorWidth = selectorRef.current.offsetWidth;

        let top: number;
        let left: number;

        // Pozycjonowanie w pionie
        if (position === "top") {
            top = cellRect.top - selectorHeight - 8;
            // Jeśli wykracza poza górę ekranu, pokaż na dole
            if (top < 10) {
                top = cellRect.bottom + 8;
            }
        } else {
            top = cellRect.bottom + 8;
            // Jeśli wykracza poza dół ekranu, pokaż na górze
            if (top + selectorHeight > window.innerHeight - 10) {
                top = cellRect.top - selectorHeight - 8;
            }
        }

        // Pozycjonowanie w poziomie (wycentrowane względem komórki)
        left = cellRect.left + cellRect.width / 2 - selectorWidth / 2;

        // Upewnij się, że nie wykracza poza ekran
        if (left < 10) left = 10;
        if (left + selectorWidth > window.innerWidth - 10) {
            left = window.innerWidth - selectorWidth - 10;
        }

        if (!coords || coords.top !== top || coords.left !== left) {
            // Używamy setTimeout, aby uniknąć "Calling setState synchronously within an effect"
            // Jest to bezpieczne tutaj, bo tylko korygujemy pozycję tooltipa
            setTimeout(() => {
                setCoords({ top, left });
            }, 0);
        }
    }, [cellRect, position, coords]);

    const handleCustomSubmit = () => {
        if (customStartTime && customEndTime) {
            onSelectCustomTime(
                customStartTime,
                customEndTime,
                customBreakMinutes
            );
            setShowCustomForm(false);
        }
    };

    if (!coords) {
        // Renderuj niewidoczny dla pierwszego pomiaru
        return (
            <div
                ref={selectorRef}
                className="fixed opacity-0 pointer-events-none z-9999"
            >
                <div className="bg-white rounded-xl shadow-2xl border border-slate-200/80 p-2 min-w-40 backdrop-blur-sm">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1.5 mb-1.5 border-b border-slate-100">
                        Wybierz zmianę
                    </div>
                    <div className="space-y-0.5">
                        {templates.map((template) => {
                            const type = getShiftTypeFromTime(
                                template.start_time
                            );
                            const bgColor =
                                template.color ||
                                (type === "morning"
                                    ? "#3b82f6"
                                    : type === "afternoon"
                                    ? "#8b5cf6"
                                    : "#64748b");

                            return (
                                <button
                                    key={template.id}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold"
                                >
                                    <div
                                        className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm"
                                        style={{ backgroundColor: bgColor }}
                                    />
                                    <span className="whitespace-nowrap text-slate-700">
                                        {template.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={selectorRef}
            className="fixed z-9999 animate-in fade-in zoom-in-95 duration-200"
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        >
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200/80 p-2 min-w-40 backdrop-blur-sm">
                {!showCustomForm ? (
                    <>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1.5 mb-1.5 border-b border-slate-100">
                            Wybierz zmianę
                        </div>
                        <div className="space-y-0.5 max-h-40 md:max-h-56 overflow-x-hidden overflow-y-auto">
                            {templates.map((template) => {
                                const type = getShiftTypeFromTime(
                                    template.start_time
                                );
                                const hasViolation = checkViolation(template);
                                const bgColor =
                                    template.color ||
                                    (type === "morning"
                                        ? "#3b82f6"
                                        : type === "afternoon"
                                        ? "#8b5cf6"
                                        : "#64748b");

                                return (
                                    <button
                                        key={template.id}
                                        onClick={() =>
                                            !hasViolation &&
                                            onSelectTemplate(template)
                                        }
                                        disabled={hasViolation}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150",
                                            hasViolation
                                                ? "opacity-40 cursor-not-allowed bg-slate-50"
                                                : "hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
                                        )}
                                        title={
                                            hasViolation
                                                ? "Ta zmiana naruszy 11h odpoczynku pracownika"
                                                : undefined
                                        }
                                    >
                                        <div
                                            className={cn(
                                                "w-3.5 h-3.5 rounded-md shrink-0 shadow-sm",
                                                hasViolation && "grayscale"
                                            )}
                                            style={{ backgroundColor: bgColor }}
                                        />
                                        <span
                                            className={cn(
                                                "whitespace-nowrap",
                                                hasViolation
                                                    ? "text-slate-400"
                                                    : "text-slate-700"
                                            )}
                                        >
                                            {template.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="border-t border-slate-100 my-1.5" />
                        <button
                            onClick={() => setShowCustomForm(true)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150"
                        >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Własne godziny</span>
                        </button>

                        {onAddAbsence && (
                            <button
                                onClick={onAddAbsence}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-all duration-150"
                            >
                                <Flag className="w-3.5 h-3.5" />
                                <span>Dodaj nieobecność</span>
                            </button>
                        )}
                        {currentShift && (
                            <button
                                onClick={onRemoveShift}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Usuń zmianę</span>
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1.5 mb-1.5 border-b border-slate-100">
                            Własne godziny
                        </div>
                        <div className="space-y-2 p-1">
                            <div>
                                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                                    Początek
                                </label>
                                <input
                                    type="time"
                                    value={customStartTime}
                                    onChange={(e) =>
                                        setCustomStartTime(e.target.value)
                                    }
                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                                    Koniec
                                </label>
                                <input
                                    type="time"
                                    value={customEndTime}
                                    onChange={(e) =>
                                        setCustomEndTime(e.target.value)
                                    }
                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                                    Przerwa (min)
                                </label>
                                <input
                                    type="number"
                                    value={customBreakMinutes}
                                    onChange={(e) =>
                                        setCustomBreakMinutes(
                                            Number(e.target.value)
                                        )
                                    }
                                    min="0"
                                    max="120"
                                    step="15"
                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="border-t border-slate-100 my-1.5" />
                        <div className="flex gap-1">
                            <button
                                onClick={() => setShowCustomForm(false)}
                                className="flex-1 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all duration-150"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleCustomSubmit}
                                className="flex-1 px-2.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-150"
                            >
                                Zapisz
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

TemplateSelector.displayName = "TemplateSelector";
