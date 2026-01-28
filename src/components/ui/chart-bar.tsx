import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    LabelList,
} from "recharts";
import React from "react";

interface ChartBarProps {
    data: { name: string; value: number; color?: string }[];
    label: string;
    barColor?: string;
}

export function ChartBar({ data, label, barColor }: ChartBarProps) {
    return (
        <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 16, right: 24, left: 8, bottom: 24 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar
                        dataKey="value"
                        radius={[8, 8, 0, 0]}
                        fill={barColor || "#6366f1"}
                    >
                        <LabelList
                            dataKey="value"
                            position="top"
                            style={{ fontWeight: 600, fontSize: 13 }}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
