"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/utils/logger";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary dla całej aplikacji.
 * Łapie błędy JavaScript w drzewie komponentów i wyświetla fallback UI.
 */
export class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log do konsoli
        logger.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

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
                            Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć
                            stronę lub wróć do strony głównej.
                        </p>
                        {process.env.NODE_ENV === "development" &&
                            this.state.error && (
                                <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                                    <p className="text-sm font-mono text-red-800 break-all">
                                        {this.state.error.message}
                                    </p>
                                </div>
                            )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
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

        return this.props.children;
    }
}

/**
 * Error Boundary dla sekcji strony (mniejszy, inline)
 */
export class SectionErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        logger.error("SectionErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-red-800 font-medium">
                                Nie udało się załadować tej sekcji
                            </p>
                            <button
                                onClick={this.handleReset}
                                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                            >
                                Spróbuj ponownie
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
