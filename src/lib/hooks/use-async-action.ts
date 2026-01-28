"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UseAsyncActionOptions<T> {
    /** Success message to show in toast */
    successMessage?: string;
    /** Error message prefix (actual error will be appended) */
    errorMessagePrefix?: string;
    /** Whether to refresh router after success */
    refreshOnSuccess?: boolean;
    /** Callback to run on success */
    onSuccess?: (result: T) => void;
    /** Callback to run on error */
    onError?: (error: Error) => void;
    /** Custom toast options */
    showToast?: boolean;
}

interface UseAsyncActionReturn<T, Args extends unknown[]> {
    /** Whether the action is currently running */
    isLoading: boolean;
    /** The error if the action failed */
    error: string | null;
    /** Execute the action */
    execute: (...args: Args) => Promise<T | undefined>;
    /** Reset error state */
    resetError: () => void;
}

/**
 * Hook for handling async actions with loading, error states, toast notifications and router refresh
 *
 * @example
 * const { isLoading, error, execute } = useAsyncAction(
 *   async (data: FormData) => {
 *     const response = await fetch('/api/employee', {
 *       method: 'POST',
 *       body: JSON.stringify(data)
 *     });
 *     if (!response.ok) throw new Error('Failed');
 *     return response.json();
 *   },
 *   {
 *     successMessage: 'Pracownik dodany!',
 *     refreshOnSuccess: true
 *   }
 * );
 */
export function useAsyncAction<T, Args extends unknown[] = []>(
    action: (...args: Args) => Promise<T>,
    options: UseAsyncActionOptions<T> = {}
): UseAsyncActionReturn<T, Args> {
    const {
        successMessage,
        errorMessagePrefix = "Wystąpił błąd",
        refreshOnSuccess = true,
        onSuccess,
        onError,
        showToast = true,
    } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const execute = useCallback(
        async (...args: Args): Promise<T | undefined> => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await action(...args);

                if (successMessage && showToast) {
                    toast.success(successMessage);
                }

                if (refreshOnSuccess) {
                    router.refresh();
                }

                onSuccess?.(result);
                return result;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Nieznany błąd";
                const fullError = `${errorMessagePrefix}: ${errorMessage}`;

                setError(fullError);

                if (showToast) {
                    toast.error(fullError);
                }

                onError?.(err instanceof Error ? err : new Error(errorMessage));
                return undefined;
            } finally {
                setIsLoading(false);
            }
        },
        [
            action,
            successMessage,
            errorMessagePrefix,
            refreshOnSuccess,
            showToast,
            router,
            onSuccess,
            onError,
        ]
    );

    const resetError = useCallback(() => {
        setError(null);
    }, []);

    return {
        isLoading,
        error,
        execute,
        resetError,
    };
}
