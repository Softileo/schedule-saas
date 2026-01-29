"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { logger } from "@/lib/utils/logger";
import { ErrorDisplay } from "./error-display";

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
                <ErrorDisplay
                    error={this.state.error}
                    onReset={this.handleReset}
                    variant="page"
                />
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
