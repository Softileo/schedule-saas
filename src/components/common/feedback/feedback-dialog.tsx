"use client";

import { useState } from "react";
import {
    Bug,
    Lightbulb,
    Send,
    CheckCircle2,
    MessageSquarePlus,
    Sparkles,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface FeedbackDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type FeedbackType = "bug" | "suggestion";

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
    const [type, setType] = useState<FeedbackType>("bug");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, title, description }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Wystąpił błąd");
            }

            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Wystąpił błąd");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setTimeout(() => {
            setType("bug");
            setTitle("");
            setDescription("");
            setIsSuccess(false);
            setError(null);
        }, 200);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="sm:max-w-xl p-0 gap-0">
                {isSuccess ? (
                    // Ekran sukcesu
                    <div className="py-12 px-8 text-center">
                        <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">
                            Dziękujemy za zgłoszenie
                        </h2>
                        <p className="text-slate-600 mb-6">
                            Twoja opinia pomaga nam ulepszać aplikację
                        </p>
                        <Button onClick={handleClose} variant="outline">
                            Zamknij
                        </Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="p-6 pb-4 space-y-2">
                            <DialogTitle className="text-xl font-semibold text-slate-900">
                                Zgłoś opinię
                            </DialogTitle>
                            <DialogDescription className="text-slate-600">
                                Pomóż nam ulepszyć aplikację
                            </DialogDescription>
                        </DialogHeader>

                        <form
                            onSubmit={handleSubmit}
                            className="px-6 pb-6 space-y-5"
                        >
                            {/* Typ zgłoszenia */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">
                                    Typ
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setType("bug")}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-lg border transition-all",
                                            type === "bug"
                                                ? "border-rose-300 bg-rose-50"
                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                                                type === "bug"
                                                    ? "bg-rose-100 text-rose-600"
                                                    : "bg-slate-100 text-slate-600",
                                            )}
                                        >
                                            <Bug className="w-5 h-5" />
                                        </div>
                                        <span className="font-medium text-slate-900">
                                            Błąd
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setType("suggestion")}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-lg border transition-all",
                                            type === "suggestion"
                                                ? "border-blue-300 bg-blue-50"
                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                                                type === "suggestion"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : "bg-slate-100 text-slate-600",
                                            )}
                                        >
                                            <Lightbulb className="w-5 h-5" />
                                        </div>
                                        <span className="font-medium text-slate-900">
                                            Sugestia
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Tytuł */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="title"
                                    className="text-sm font-medium text-slate-700"
                                >
                                    Tytuł
                                </Label>
                                <Input
                                    id="title"
                                    placeholder={
                                        type === "bug"
                                            ? "np. Nie mogę zapisać grafiku"
                                            : "np. Dodanie eksportu do Excela"
                                    }
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Opis */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="description"
                                    className="text-sm font-medium text-slate-700"
                                >
                                    Opis
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder={
                                        type === "bug"
                                            ? "Opisz problem i kroki do jego odtworzenia..."
                                            : "Opisz swoją propozycję..."
                                    }
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    required
                                    rows={4}
                                    className="resize-none"
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClose}
                                >
                                    Anuluj
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        isSubmitting || !title || !description
                                    }
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spinner withMargin />
                                            Wysyłanie...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Wyślij
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
