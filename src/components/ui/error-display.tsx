import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorDisplayProps {
    error: Error | null;
    onReset: () => void;
    variant?: "page" | "section";
}

/**
 * Shared error display component for ErrorBoundary
 * Renders error UI with reset button and optional navigation
 */
export function ErrorDisplay({
    error,
    onReset,
    variant = "page",
}: ErrorDisplayProps) {
    if (variant === "page") {
        return (
            <div className="min-h-100 flex items-center justify-center p-8">
                <div className="max-w-md w-full text-center">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                        Coś poszło nie tak
                    </h2>
                    <p className="text-slate-600 mb-6">
                        Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę
                        lub wróć do strony głównej.
                    </p>
                    {process.env.NODE_ENV === "development" && error && (
                        <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                            <p className="text-sm font-mono text-red-800 break-all">
                                {error.message}
                            </p>
                        </div>
                    )}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onReset}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Spróbuj ponownie
                        </button>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <Home className="w-4 h-4" />
                            Strona główna
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-900 mb-1">
                        Wystąpił błąd w tej sekcji
                    </h3>
                    <p className="text-sm text-red-700 mb-3">
                        Nie udało się załadować zawartości. Spróbuj ponownie.
                    </p>
                    {process.env.NODE_ENV === "development" && error && (
                        <div className="mb-3 p-2 bg-red-100 rounded text-xs font-mono text-red-800 break-all">
                            {error.message}
                        </div>
                    )}
                    <button
                        onClick={onReset}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Spróbuj ponownie
                    </button>
                </div>
            </div>
        </div>
    );
}
