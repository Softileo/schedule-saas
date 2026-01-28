"use client";

import { useState } from "react";
import {
    Bug,
    Lightbulb,
    Send,
    CheckCircle2,
    MessageSquarePlus,
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
type Priority = "low" | "medium" | "high";

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
    const [type, setType] = useState<FeedbackType>("bug");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<Priority>("medium");
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
                body: JSON.stringify({ type, title, description, priority }),
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
        // Reset form on close
        setTimeout(() => {
            setType("bug");
            setTitle("");
            setDescription("");
            setPriority("medium");
            setIsSuccess(false);
            setError(null);
        }, 200);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="sm:max-w-lg">
                {isSuccess ? (
                    // Ekran sukcesu
                    <div className="py-8 text-center">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">
                            Dziękujemy za zgłoszenie! 🎉
                        </h2>
                        <p className="text-slate-600 mb-6">
                            Twoja opinia pomaga nam ulepszać aplikację.
                            <br />
                            Doceniamy każde zgłoszenie!
                        </p>
                        <Button onClick={handleClose}>Zamknij</Button>
                    </div>
                ) : (
                    // Formularz
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <MessageSquarePlus className="h-5 w-5 text-indigo-600" />
                                Zgłoś błąd lub sugestię
                            </DialogTitle>
                            <DialogDescription>
                                Pomóż nam ulepszyć aplikację! Twoje zgłoszenie
                                zostanie przesłane do zespołu.
                            </DialogDescription>
                        </DialogHeader>

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-4 mt-4"
                        >
                            {/* Typ zgłoszenia */}
                            <div className="space-y-2">
                                <Label>Typ zgłoszenia</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setType("bug")}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                                            type === "bug"
                                                ? "border-red-500 bg-red-50 text-red-700"
                                                : "border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        <Bug className="w-5 h-5" />
                                        <span className="font-medium">
                                            Błąd
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType("suggestion")}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                                            type === "suggestion"
                                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                                : "border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        <Lightbulb className="w-5 h-5" />
                                        <span className="font-medium">
                                            Sugestia
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Tytuł */}
                            <div className="space-y-2">
                                <Label htmlFor="title">Tytuł</Label>
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

                            {/* Priorytet (tylko dla błędów) */}
                            {type === "bug" && (
                                <div className="space-y-2">
                                    <Label>Priorytet</Label>
                                    <div className="flex gap-2">
                                        {[
                                            {
                                                value: "low",
                                                label: "Niski",
                                                color: "green",
                                            },
                                            {
                                                value: "medium",
                                                label: "Średni",
                                                color: "yellow",
                                            },
                                            {
                                                value: "high",
                                                label: "Wysoki",
                                                color: "red",
                                            },
                                        ].map((p) => (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() =>
                                                    setPriority(
                                                        p.value as Priority
                                                    )
                                                }
                                                className={cn(
                                                    "flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                                                    priority === p.value
                                                        ? p.color === "green"
                                                            ? "border-green-500 bg-green-50 text-green-700"
                                                            : p.color ===
                                                              "yellow"
                                                            ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                                                            : "border-red-500 bg-red-50 text-red-700"
                                                        : "border-slate-200 hover:border-slate-300"
                                                )}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Opis */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Opis</Label>
                                <Textarea
                                    id="description"
                                    placeholder={
                                        type === "bug"
                                            ? "Opisz szczegółowo co się dzieje, kiedy występuje problem i jakie kroki prowadzą do błędu..."
                                            : "Opisz swoją propozycję - jak funkcja powinna działać i dlaczego byłaby przydatna..."
                                    }
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    required
                                    rows={5}
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <div className="flex justify-end gap-2 pt-2">
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
                                            Wyślij zgłoszenie
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
