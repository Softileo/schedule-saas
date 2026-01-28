"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateAction {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: "default" | "outline" | "secondary" | "ghost";
    icon?: LucideIcon;
}

interface EmptyStateProps {
    /** Ikona do wyświetlenia */
    icon: LucideIcon;
    /** Główny tytuł */
    title: string;
    /** Opis/podtytuł */
    description?: string;
    /** Akcja główna (przycisk) */
    action?: EmptyStateAction;
    /** Akcja dodatkowa */
    secondaryAction?: EmptyStateAction;
    /** Czy wyświetlić w karcie z tłem */
    card?: boolean;
    /** Dodatkowe klasy CSS */
    className?: string;
    /** Rozmiar */
    size?: "sm" | "md" | "lg";
    /** Kolor ikony (Tailwind text color) */
    iconColor?: string;
    /** Kolor tła ikony (Tailwind bg color) */
    iconBgColor?: string;
}

const sizeClasses = {
    sm: {
        container: "py-8",
        iconWrapper: "w-10 h-10 rounded-lg",
        icon: "h-4 w-4",
        title: "text-sm",
        description: "text-xs",
        buttonSize: "sm" as const,
    },
    md: {
        container: "py-12",
        iconWrapper: "w-12 h-12 rounded-xl",
        icon: "h-5 w-5",
        title: "text-base",
        description: "text-sm",
        buttonSize: "default" as const,
    },
    lg: {
        container: "py-16",
        iconWrapper: "w-16 h-16 rounded-2xl",
        icon: "h-7 w-7",
        title: "text-lg",
        description: "text-sm",
        buttonSize: "default" as const,
    },
};

/**
 * Komponent pustego stanu
 *
 * @example
 * <EmptyState
 *   icon={Briefcase}
 *   title="Brak organizacji"
 *   description="Utwórz organizację, aby rozpocząć."
 *   action={{ label: "Utwórz", href: "/setup" }}
 * />
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    secondaryAction,
    card = true,
    className,
    size = "md",
    iconColor = "text-slate-500",
    iconBgColor = "bg-slate-100",
}: EmptyStateProps) {
    const classes = sizeClasses[size];

    const content = (
        <div
            className={cn(
                "flex flex-col items-center justify-center text-center",
                classes.container,
                className
            )}
        >
            <div
                className={cn(
                    "flex items-center justify-center mb-4",
                    classes.iconWrapper,
                    iconBgColor
                )}
            >
                <Icon className={cn(classes.icon, iconColor)} />
            </div>
            <h2
                className={cn(
                    "font-semibold text-slate-800 mb-1",
                    classes.title
                )}
            >
                {title}
            </h2>
            {description && (
                <p
                    className={cn(
                        "text-slate-500 mb-5 max-w-sm",
                        classes.description
                    )}
                >
                    {description}
                </p>
            )}
            {(action || secondaryAction) && (
                <div className="flex items-center gap-3">
                    {action && (
                        <Button
                            size={classes.buttonSize}
                            variant={action.variant || "default"}
                            asChild={!!action.href}
                            onClick={action.onClick}
                        >
                            {action.href ? (
                                <Link href={action.href}>
                                    {action.icon && (
                                        <action.icon className="mr-2 h-4 w-4" />
                                    )}
                                    {action.label}
                                </Link>
                            ) : (
                                <>
                                    {action.icon && (
                                        <action.icon className="mr-2 h-4 w-4" />
                                    )}
                                    {action.label}
                                </>
                            )}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button
                            size={classes.buttonSize}
                            variant={secondaryAction.variant || "outline"}
                            asChild={!!secondaryAction.href}
                            onClick={secondaryAction.onClick}
                        >
                            {secondaryAction.href ? (
                                <Link href={secondaryAction.href}>
                                    {secondaryAction.icon && (
                                        <secondaryAction.icon className="mr-2 h-4 w-4" />
                                    )}
                                    {secondaryAction.label}
                                </Link>
                            ) : (
                                <>
                                    {secondaryAction.icon && (
                                        <secondaryAction.icon className="mr-2 h-4 w-4" />
                                    )}
                                    {secondaryAction.label}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );

    if (card) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                {content}
            </div>
        );
    }

    return content;
}
