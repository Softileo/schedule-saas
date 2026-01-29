import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, AlertTriangle, Info } from "lucide-react";

interface ResultCardProps {
    title: string;
    icon?: LucideIcon;
    badge?: {
        text: string;
        variant?: "default" | "secondary" | "destructive" | "outline";
    };
    children: React.ReactNode;
}

/**
 * Wspólny komponent karty wyniku dla narzędzi kalkulatorów
 */
export function ResultCard({
    title,
    icon: Icon,
    badge,
    children,
}: ResultCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-5 w-5" />}
                        {title}
                    </div>
                    {badge && (
                        <Badge variant={badge.variant || "secondary"}>
                            {badge.text}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

interface ResultRowProps {
    label: string;
    value: string | number;
    highlighted?: boolean;
    className?: string;
}

/**
 * Wspólny komponent wiersza wyniku
 */
export function ResultRow({
    label,
    value,
    highlighted,
    className,
}: ResultRowProps) {
    return (
        <div
            className={`flex justify-between items-center py-2 ${
                highlighted ? "text-lg font-bold" : ""
            } ${className || ""}`}
        >
            <span className={highlighted ? "" : "text-muted-foreground"}>
                {label}:
            </span>
            <span>{value}</span>
        </div>
    );
}

interface InputFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "number";
    placeholder?: string;
    disabled?: boolean;
    min?: string;
    max?: string;
    step?: string;
}

/**
 * Wspólny komponent pola input dla kalkulatorów
 */
export function InputField({
    id,
    label,
    value,
    onChange,
    type = "number",
    placeholder,
    disabled,
    min,
    max,
    step,
}: InputFieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
            />
        </div>
    );
}

interface WarningsPanelProps {
    warnings: string[];
}

/**
 * Wspólny komponent panelu ostrzeżeń
 */
export function WarningsPanel({ warnings }: WarningsPanelProps) {
    if (warnings.length === 0) return null;

    return (
        <div className="mt-4 space-y-2">
            {warnings.map((warning, index) => (
                <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm"
                >
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-amber-800">{warning}</span>
                </div>
            ))}
        </div>
    );
}

interface InfoBoxProps {
    title: string;
    items: Array<{
        label: string;
        text: string;
    }>;
}

/**
 * Wspólny komponent informacyjnego boxa
 */
export function InfoBox({ title, items }: InfoBoxProps) {
    return (
        <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
                <div className="flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 shrink-0" />
                    <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">{title}</p>
                        <ul className="space-y-1 text-blue-700">
                            {items.map((item, index) => (
                                <li key={index}>
                                    • <strong>{item.label}:</strong> {item.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

interface EmptyStatePanelProps {
    message?: string;
}

/**
 * Wspólny komponent stanu pustego wyniku
 */
export function EmptyStatePanel({
    message = "Wprowadź dane, aby zobaczyć wynik",
}: EmptyStatePanelProps) {
    return <p className="text-center text-muted-foreground py-8">{message}</p>;
}
