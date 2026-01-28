"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface ClearScheduleButtonProps {
    scheduleId: string;
    monthName: string;
    shiftsCount: number;
    onClear?: () => void;
    /** Wariant: "button" z tekstem lub "icon" sama ikona */
    variant?: "button" | "icon";
}

export function ClearScheduleButton({
    scheduleId,
    monthName,
    shiftsCount,
    onClear,
    variant = "button",
}: ClearScheduleButtonProps) {
    const router = useRouter();
    const [isClearing, setIsClearing] = useState(false);
    const [open, setOpen] = useState(false);

    async function handleClear() {
        setIsClearing(true);

        try {
            const supabase = createClient();

            // Usuń wszystkie zmiany dla tego grafiku
            const { error } = await supabase
                .from("shifts")
                .delete()
                .eq("schedule_id", scheduleId);

            if (error) throw error;

            setOpen(false);

            // Call callback if exists
            if (onClear) {
                onClear();
            } else {
                router.refresh();
            }
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error clearing schedule:", message);
        } finally {
            setIsClearing(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                {variant === "icon" ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        disabled={shiftsCount === 0}
                        title="Wyczyść grafik"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                        disabled={shiftsCount === 0}
                    >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Wyczyść
                    </Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Wyczyścić grafik?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>
                                Czy na pewno chcesz usunąć{" "}
                                <strong>wszystkie zmiany</strong> z grafiku na{" "}
                                <strong>{monthName}</strong>?
                            </p>
                            <p className="text-red-600 font-medium">
                                Ta operacja usunie {shiftsCount}{" "}
                                {shiftsCount === 1
                                    ? "zmianę"
                                    : shiftsCount < 5
                                    ? "zmiany"
                                    : "zmian"}{" "}
                                i nie może być cofnięta!
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isClearing}>
                        Anuluj
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleClear}
                        disabled={isClearing}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isClearing && <Spinner withMargin />}
                        Tak, wyczyść
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
