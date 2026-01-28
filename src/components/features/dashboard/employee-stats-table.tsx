"use client";

import { useState, useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    LabelList,
    Legend,
} from "recharts";

interface TemplateShiftCount {
    templateId: string;
    templateName: string;
    templateColor: string;
    templateStartTime: string;
    count: number;
}

interface ShiftTemplate {
    id: string;
    name: string;
    color: string;
    start_time: string;
    end_time: string;
}

interface EmployeeStats {
    name: string;
    color?: string;
    weekends: number;
    tradingSundays: number;
    shiftsByTemplate?: TemplateShiftCount[];
    totalShifts: number;
    // Legacy fields
    morningShifts: number;
    afternoonShifts: number;
    eveningShifts: number;
}

interface EmployeeStatsTableProps {
    data: EmployeeStats[];
    yearlyStats: Record<number, EmployeeStats[]>;
    availableYears: number[];
    templates?: ShiftTemplate[];
}

export function EmployeeStatsTable({
    data,
    yearlyStats,
    availableYears,
    templates = [],
}: EmployeeStatsTableProps) {
    const [selectedYear, setSelectedYear] = useState<string>("current");
    const [statType, setStatType] = useState<string>("weekends");
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");

    const displayData =
        selectedYear === "current"
            ? data
            : yearlyStats[parseInt(selectedYear)] || [];

    // Sort templates by start time
    const sortedTemplates = useMemo(
        () =>
            [...templates].sort((a, b) =>
                a.start_time.localeCompare(b.start_time),
            ),
        [templates],
    );

    // Chart data generators
    const getChartData = () => {
        if (statType === "weekends") {
            return displayData.map((e) => ({
                name: e.name,
                value: e.weekends,
                color: e.color,
            }));
        }
        if (statType === "tradingSundays") {
            return displayData.map((e) => ({
                name: e.name,
                value: e.tradingSundays,
                color: e.color,
            }));
        }
        if (statType.startsWith("template:") && selectedTemplate) {
            const templateId = selectedTemplate;
            return displayData.map((e) => {
                const found = e.shiftsByTemplate?.find(
                    (t) => t.templateId === templateId,
                );
                return {
                    name: e.name,
                    value: found?.count || 0,
                    color: e.color,
                };
            });
        }
        if (statType === "totalShifts") {
            return displayData.map((e) => ({
                name: e.name,
                value: e.totalShifts,
                color: e.color,
            }));
        }
        return [];
    };

    // UI for stat type selection
    const statOptions = [
        { key: "weekends", label: "Soboty" },
        { key: "tradingSundays", label: "Niedziele handlowe" },
        ...sortedTemplates.map((t) => ({
            key: `template:${t.id}`,
            label: `${t.name}`,
            templateId: t.id,
        })),
        { key: "totalShifts", label: "Suma zmian" },
    ];

    const chartData = getChartData();
    const barColor =
        statType.startsWith("template:") && selectedTemplate
            ? sortedTemplates.find((t) => t.id === selectedTemplate)?.color ||
              "#6366f1"
            : statType === "weekends"
              ? "#8b5cf6"
              : statType === "tradingSundays"
                ? "#f59e42"
                : "#6366f1";

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 px-6 pb-2">
                <div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {statOptions.map((opt) => (
                            <button
                                key={opt.key}
                                className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${statType === opt.key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200 hover:bg-indigo-50"}`}
                                onClick={() => {
                                    setStatType(opt.key);
                                    if (
                                        opt.key.startsWith("template:") &&
                                        "templateId" in opt
                                    )
                                        setSelectedTemplate(opt.templateId);
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                        Okres
                    </label>
                    <select
                        className="w-36 h-8 text-xs bg-slate-50 border-slate-200 text-slate-600 rounded-lg px-2"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        <option value="current">Bieżący miesiąc</option>
                        {availableYears.map((year) => (
                            <option key={year} value={year.toString()}>
                                Rok {year}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div>
                {chartData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                        Brak danych dla wybranego okresu/statystyki
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={340}>
                        <BarChart
                            data={chartData}
                            margin={{
                                top: 24,
                                right: 40,
                                left: -20,
                                bottom: 32,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="name"
                                interval={0}
                                tick={(props) => {
                                    const { x, y, payload } = props;
                                    const name = payload.value as string;
                                    if (!name) return null;
                                    const parts = name.split(" ");
                                    const label =
                                        parts.length === 1
                                            ? parts[0]
                                            : `${parts[0]} ${parts[1][0]?.toUpperCase() || ""}.`;
                                    return (
                                        <text
                                            x={x}
                                            y={y}
                                            textAnchor="end"
                                            fontSize={10}
                                            className="hidden sm:block"
                                            transform={`rotate(-50, ${x}, ${y})`}
                                            fill="#081931"
                                        >
                                            {label}
                                        </text>
                                    );
                                }}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 13 }}
                            />
                            <Tooltip />
                            {/* <Legend /> */}
                            <Bar
                                dataKey="value"
                                radius={[8, 8, 0, 0]}
                                fill={barColor}
                            >
                                <LabelList
                                    dataKey="value"
                                    position="top"
                                    style={{ fontWeight: 600, fontSize: 14 }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
                <div className="text-xs text-slate-400 mt-4 text-center">
                    Kliknij wybraną statystykę powyżej, aby zobaczyć wykres.
                </div>
            </div>
        </div>
    );
}
