"use client";

import { cn } from "@/lib/utils";

interface StatCardProps {
    /** Etykieta statystyki */
    label: string;
    /** Wartość do wyświetlenia */
    value: string | number;
    /** Ikona (React element) - opcjonalna dla variant="centered" */
    icon?: React.ReactNode;
    /** Dodatkowy tekst (np. jednostka, trend) */
    suffix?: string;
    /** Opis lub podtytuł */
    description?: string;
    /** Dodatkowe klasy CSS */
    className?: string;
    /** Rozmiar karty */
    size?: "sm" | "md" | "lg";
    /** Wariant layoutu */
    variant?: "default" | "horizontal" | "centered";
    /** Klasy CSS dla wrappera ikony (dla variant="horizontal") */
    iconWrapperClassName?: string;
    /** Klasy CSS dla wartości (kolor tekstu) */
    valueClassName?: string;
    /** Klasy CSS dla etykiety */
    labelClassName?: string;
}

const sizeClasses = {
    sm: {
        card: "p-3",
        label: "text-[10px]",
        value: "text-lg",
        iconWrapper: "gap-1.5",
        horizontalIcon: "w-8 h-8",
        horizontalIconSize: "h-4 w-4",
    },
    md: {
        card: "p-4",
        label: "text-xs",
        value: "text-2xl",
        iconWrapper: "gap-2",
        horizontalIcon: "w-10 h-10",
        horizontalIconSize: "h-5 w-5",
    },
    lg: {
        card: "p-6",
        label: "text-sm",
        value: "text-3xl",
        iconWrapper: "gap-2.5",
        horizontalIcon: "w-12 h-12",
        horizontalIconSize: "h-6 w-6",
    },
};

/**
 * Karta statystyki do dashboardu
 *
 * @example Default variant (icon + label on top, value below)
 * <StatCard
 *   label="Pracownicy"
 *   value={12}
 *   icon={<Users className="h-4 w-4 text-slate-500" />}
 * />
 *
 * @example Horizontal variant (icon in colored bg on left, value + label on right)
 * <StatCard
 *   variant="horizontal"
 *   label="Aktywnych"
 *   value={12}
 *   icon={<Users className="h-5 w-5 text-blue-500" />}
 *   iconWrapperClassName="bg-blue-50"
 * />
 *
 * @example Centered variant (value + label centered, colored background)
 * <StatCard
 *   variant="centered"
 *   label="Weekendy"
 *   value={15}
 *   className="bg-blue-50"
 *   valueClassName="text-blue-600"
 *   labelClassName="text-blue-600/70"
 * />
 *
 * @example With suffix and description
 * <StatCard
 *   label="Godziny pracy"
 *   value={168}
 *   suffix="h"
 *   icon={<Clock className="h-4 w-4 text-blue-500" />}
 *   description="ten miesiąc"
 * />
 */
export function StatCard({
    label,
    value,
    icon,
    suffix,
    description,
    className,
    size = "md",
    variant = "default",
    iconWrapperClassName,
    valueClassName,
    labelClassName,
}: StatCardProps) {
    const classes = sizeClasses[size];

    // Centered variant - wartość i etykieta wycentrowane, bez ikony
    if (variant === "centered") {
        return (
            <div className={cn("rounded-lg p-3 text-center", className)}>
                <div className={cn("text-2xl font-bold", valueClassName)}>
                    {value}
                    {suffix && <span className="ml-0.5">{suffix}</span>}
                </div>
                <div className={cn("text-xs", labelClassName)}>{label}</div>
            </div>
        );
    }

    // Horizontal variant
    if (variant === "horizontal") {
        return (
            <div
                className={cn(
                    "bg-white rounded-xl border border-slate-200 shadow-sm",
                    classes.card,
                    className
                )}
            >
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            "rounded-xl flex items-center justify-center",
                            classes.horizontalIcon,
                            iconWrapperClassName
                        )}
                    >
                        {icon}
                    </div>
                    <div>
                        <p
                            className={cn(
                                "font-bold text-slate-800",
                                classes.value
                            )}
                        >
                            {value}
                            {suffix && (
                                <span className="text-base font-normal text-slate-500 ml-1">
                                    {suffix}
                                </span>
                            )}
                        </p>
                        <p className={cn("text-slate-500", classes.label)}>
                            {label}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "bg-white rounded-xl border border-slate-200 shadow-sm",
                classes.card,
                className
            )}
        >
            <div
                className={cn(
                    "flex items-center text-slate-500 mb-2",
                    classes.iconWrapper
                )}
            >
                {icon}
                <span className={cn("font-medium", classes.label)}>
                    {label}
                </span>
            </div>
            <p className={cn("font-semibold text-slate-800", classes.value)}>
                {value}
                {suffix && (
                    <span className="text-base font-normal text-slate-500 ml-1">
                        {suffix}
                    </span>
                )}
            </p>
            {description && (
                <p className="text-xs text-slate-500 mt-1">{description}</p>
            )}
        </div>
    );
}

/**
 * Grid do wyświetlania wielu kart statystyk
 */
export function StatCardGrid({
    children,
    columns = 4,
    className,
}: {
    children: React.ReactNode;
    columns?: 2 | 3 | 4 | 5 | 6;
    className?: string;
}) {
    const gridCols = {
        2: "grid-cols-1 sm:grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
        6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
    };

    return (
        <div className={cn("grid gap-4", gridCols[columns], className)}>
            {children}
        </div>
    );
}
