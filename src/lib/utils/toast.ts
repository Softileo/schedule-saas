import { toast as sonnerToast } from "sonner";
import { capitalize } from "@/lib/core/employees/utils";

/**
 * Ustandaryzowane komunikaty toast.
 * Zapewnia spójność językową i formatowania w całej aplikacji.
 *
 * @example
 * // Sukces
 * showToast.success("Pracownik został dodany");
 * showToast.created("pracownik");
 *
 * // Błąd
 * showToast.error("Nie udało się zapisać danych");
 * showToast.deleteError("pracownika");
 *
 * // Ostrzeżenie
 * showToast.warning("Pracownik ma nieobecność w tym dniu");
 */

type ToastOptions = {
    description?: string;
    duration?: number;
};

// Predefiniowane komunikaty sukcesu
const SUCCESS_MESSAGES = {
    created: (item: string) => `${capitalize(item)} został dodany`,
    updated: (item: string) => `${capitalize(item)} został zaktualizowany`,
    deleted: (item: string) => `${capitalize(item)} został usunięty`,
    saved: "Zmiany zostały zapisane",
    copied: "Skopiowano do schowka",
    sent: "Wiadomość została wysłana",
} as const;

// Predefiniowane komunikaty błędów
const ERROR_MESSAGES = {
    createError: (item: string) => `Nie udało się dodać ${item}`,
    updateError: (item: string) => `Nie udało się zaktualizować ${item}`,
    deleteError: (item: string) => `Nie udało się usunąć ${item}`,
    loadError: (item: string) => `Nie udało się wczytać ${item}`,
    saveError: "Nie udało się zapisać zmian",
    networkError: "Błąd połączenia z serwerem",
    unknownError: "Wystąpił nieoczekiwany błąd",
} as const;

export const showToast = {
    // Podstawowe metody
    success: (message: string, options?: ToastOptions) => {
        sonnerToast.success(message, options);
    },

    error: (message: string, options?: ToastOptions) => {
        sonnerToast.error(message, options);
    },

    warning: (message: string, options?: ToastOptions) => {
        sonnerToast.warning(message, options);
    },

    info: (message: string, options?: ToastOptions) => {
        sonnerToast.info(message, options);
    },

    // Predefiniowane sukces
    created: (item: string, options?: ToastOptions) => {
        sonnerToast.success(SUCCESS_MESSAGES.created(item), options);
    },

    updated: (item: string, options?: ToastOptions) => {
        sonnerToast.success(SUCCESS_MESSAGES.updated(item), options);
    },

    deleted: (item: string, options?: ToastOptions) => {
        sonnerToast.success(SUCCESS_MESSAGES.deleted(item), options);
    },

    saved: (options?: ToastOptions) => {
        sonnerToast.success(SUCCESS_MESSAGES.saved, options);
    },

    // Predefiniowane błędy
    createError: (item: string, options?: ToastOptions) => {
        sonnerToast.error(ERROR_MESSAGES.createError(item), options);
    },

    updateError: (item: string, options?: ToastOptions) => {
        sonnerToast.error(ERROR_MESSAGES.updateError(item), options);
    },

    deleteError: (item: string, options?: ToastOptions) => {
        sonnerToast.error(ERROR_MESSAGES.deleteError(item), options);
    },

    loadError: (item: string, options?: ToastOptions) => {
        sonnerToast.error(ERROR_MESSAGES.loadError(item), options);
    },

    saveError: (options?: ToastOptions) => {
        sonnerToast.error(ERROR_MESSAGES.saveError, options);
    },

    networkError: (options?: ToastOptions) => {
        sonnerToast.error(ERROR_MESSAGES.networkError, options);
    },

    // Promise toast dla operacji async
    promise: <T>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string;
            error: string;
        }
    ) => {
        return sonnerToast.promise(promise, messages);
    },
};

// Re-eksport oryginalnego toast dla zaawansowanych przypadków
export { sonnerToast as toast };
