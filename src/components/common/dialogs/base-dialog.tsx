"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface BaseDialogProps {
    /** Czy dialog jest otwarty */
    open: boolean;
    /** Handler zmiany stanu otwarcia */
    onOpenChange: (open: boolean) => void;
    /** Tytuł dialogu */
    title: React.ReactNode;
    /** Opis dialogu (opcjonalny) */
    description?: React.ReactNode;
    /** Ikona przy tytule (opcjonalna) */
    icon?: LucideIcon;
    /** Kolor ikony (domyślnie slate-500) */
    iconClassName?: string;
    /** Maksymalna szerokość dialogu */
    maxWidth?:
        | "sm"
        | "md"
        | "lg"
        | "xl"
        | "2xl"
        | "3xl"
        | "4xl"
        | "5xl"
        | "full";
    /** Zawartość dialogu */
    children: React.ReactNode;
    /** Dodatkowe klasy CSS dla DialogContent */
    className?: string;
}

const maxWidthClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    "4xl": "sm:max-w-4xl",
    "5xl": "sm:max-w-5xl",
    full: "sm:max-w-full",
};

/**
 * BaseDialog - uniwersalny wrapper dla dialogów
 *
 * @example
 * // Prosty dialog
 * <BaseDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Tytuł dialogu"
 *   description="Opis co ten dialog robi"
 * >
 *   <YourContent />
 * </BaseDialog>
 *
 * @example
 * // Dialog z ikoną
 * <BaseDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Edytuj zmianę"
 *   icon={Clock}
 *   iconClassName="text-indigo-600"
 *   maxWidth="lg"
 * >
 *   <YourForm />
 * </BaseDialog>
 */
export function BaseDialog({
    open,
    onOpenChange,
    title,
    description,
    icon: Icon,
    iconClassName = "text-slate-500",
    maxWidth = "md",
    children,
    className,
}: BaseDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(maxWidthClasses[maxWidth], className)}>
                <DialogHeader>
                    <DialogTitle
                        className={cn(Icon && "flex items-center gap-2")}
                    >
                        {Icon && (
                            <Icon className={cn("h-5 w-5", iconClassName)} />
                        )}
                        {title}
                    </DialogTitle>
                    {description && (
                        <DialogDescription>{description}</DialogDescription>
                    )}
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    );
}

/**
 * Wariant BaseDialog z wbudowanym formularzem
 * Automatycznie opakowuje children w <form>
 */
interface BaseDialogFormProps extends Omit<BaseDialogProps, "children"> {
    /** Handler submit formularza */
    onSubmit: (e: React.FormEvent) => void;
    /** Zawartość formularza */
    children: React.ReactNode;
    /** Klasy CSS dla formularza */
    formClassName?: string;
}

export function BaseDialogForm({
    onSubmit,
    children,
    formClassName,
    ...dialogProps
}: BaseDialogFormProps) {
    return (
        <BaseDialog {...dialogProps}>
            <form
                onSubmit={onSubmit}
                className={cn("space-y-4", formClassName)}
            >
                {children}
            </form>
        </BaseDialog>
    );
}
