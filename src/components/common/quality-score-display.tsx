import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface QualityScoreDisplayProps {
    score: number;
    icon?: LucideIcon;
    title: string;
    subtitle?: string;
    className?: string;
}

/**
 * Wspólny komponent do wyświetlania wyniku jakości/metryki
 */
export function QualityScoreDisplay({
    score,
    icon: Icon,
    title,
    subtitle,
    className,
}: QualityScoreDisplayProps) {
    const getScoreColor = (value: number): string => {
        if (value >= 80) return "text-emerald-600";
        if (value >= 60) return "text-amber-600";
        return "text-red-600";
    };

    const getBgColor = (value: number): string => {
        if (value >= 80)
            return "from-emerald-50 to-green-50 border-emerald-100";
        if (value >= 60) return "from-amber-50 to-yellow-50 border-amber-100";
        return "from-red-50 to-rose-50 border-red-100";
    };

    return (
        <div
            className={cn(
                "bg-gradient-to-r rounded-lg p-4 border",
                getBgColor(score),
                className,
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {Icon && <Icon className="h-5 w-5" />}
                    <div>
                        <span className="font-medium">{title}</span>
                        {subtitle && (
                            <p className="text-xs mt-0.5">{subtitle}</p>
                        )}
                    </div>
                </div>
                <span
                    className={cn("text-3xl font-bold", getScoreColor(score))}
                >
                    {score.toFixed(0)}%
                </span>
            </div>
        </div>
    );
}
