"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogFooterActionsProps {
    /** Czy akcja jest w trakcie (pokazuje spinner) */
    isLoading?: boolean;
    /** Etykieta przycisku anulowania */
    cancelLabel?: string;
    /** Etykieta przycisku zatwierdzenia */
    submitLabel?: string;
    /** Handler zamknięcia dialogu */
    onCancel?: () => void;
    /** Wariant przycisku submit */
    submitVariant?:
        | "default"
        | "destructive"
        | "outline"
        | "secondary"
        | "ghost"
        | "link";
    /** Dodatkowe klasy CSS */
    className?: string;
    /** Czy przycisk submit jest wyłączony (poza isLoading) */
    submitDisabled?: boolean;
    /** Typ przycisku submit (domyślnie "submit") */
    submitType?: "submit" | "button";
    /** Handler kliknięcia w przycisk submit (jeśli type="button") */
    onSubmit?: () => void;
}

/**
 * Komponent stopki dialogu z przyciskami Anuluj/Zapisz
 *
 * @example
 * <DialogFooterActions
 *   isLoading={isLoading}
 *   onCancel={() => setOpen(false)}
 *   submitLabel="Dodaj pracownika"
 * />
 *
 * @example
 * // Wariant destrukcyjny (usuwanie)
 * <DialogFooterActions
 *   isLoading={isDeleting}
 *   onCancel={() => setOpen(false)}
 *   submitLabel="Usuń"
 *   submitVariant="destructive"
 * />
 */
export function DialogFooterActions({
    isLoading = false,
    cancelLabel = "Anuluj",
    submitLabel = "Zapisz",
    onCancel,
    submitVariant = "default",
    className,
    submitDisabled = false,
    submitType = "submit",
    onSubmit,
}: DialogFooterActionsProps) {
    return (
        <div className={cn("flex justify-end gap-2 pt-4", className)}>
            <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
            >
                {cancelLabel}
            </Button>
            <Button
                type={submitType}
                variant={submitVariant}
                disabled={isLoading || submitDisabled}
                onClick={submitType === "button" ? onSubmit : undefined}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitLabel}
            </Button>
        </div>
    );
}
