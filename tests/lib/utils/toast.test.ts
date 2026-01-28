/**
 * Testy dla toast.ts
 *
 * Testuje:
 * - SUCCESS_MESSAGES - predefiniowane komunikaty sukcesu
 * - ERROR_MESSAGES - predefiniowane komunikaty błędów
 * - showToast.* - metody wyświetlania toastów
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock sonner przed importem toast
vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
        promise: vi.fn(),
    },
}));

// Import po mockowaniu
import { showToast, toast } from "@/lib/utils/toast";

describe("toast", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // =========================================================================
    // showToast.success
    // =========================================================================
    describe("showToast.success", () => {
        it("should call sonner toast.success with message", () => {
            showToast.success("Operacja udana");

            expect(toast.success).toHaveBeenCalledWith(
                "Operacja udana",
                undefined
            );
        });

        it("should pass options to sonner", () => {
            const options = { duration: 5000, description: "Opis" };
            showToast.success("Test", options);

            expect(toast.success).toHaveBeenCalledWith("Test", options);
        });
    });

    // =========================================================================
    // showToast.error
    // =========================================================================
    describe("showToast.error", () => {
        it("should call sonner toast.error with message", () => {
            showToast.error("Coś poszło nie tak");

            expect(toast.error).toHaveBeenCalledWith(
                "Coś poszło nie tak",
                undefined
            );
        });

        it("should pass options to sonner", () => {
            const options = { duration: 10000 };
            showToast.error("Błąd", options);

            expect(toast.error).toHaveBeenCalledWith("Błąd", options);
        });
    });

    // =========================================================================
    // showToast.warning
    // =========================================================================
    describe("showToast.warning", () => {
        it("should call sonner toast.warning with message", () => {
            showToast.warning("Uwaga!");

            expect(toast.warning).toHaveBeenCalledWith("Uwaga!", undefined);
        });
    });

    // =========================================================================
    // showToast.info
    // =========================================================================
    describe("showToast.info", () => {
        it("should call sonner toast.info with message", () => {
            showToast.info("Informacja");

            expect(toast.info).toHaveBeenCalledWith("Informacja", undefined);
        });
    });

    // =========================================================================
    // showToast.created
    // =========================================================================
    describe("showToast.created", () => {
        it("should show success message for created item", () => {
            showToast.created("pracownik");

            expect(toast.success).toHaveBeenCalledWith(
                "Pracownik został dodany",
                undefined
            );
        });

        it("should capitalize first letter", () => {
            showToast.created("zmiana");

            expect(toast.success).toHaveBeenCalledWith(
                "Zmiana został dodany",
                undefined
            );
        });

        it("should handle lowercase item name", () => {
            showToast.created("szablon");

            expect(toast.success).toHaveBeenCalledWith(
                "Szablon został dodany",
                undefined
            );
        });
    });

    // =========================================================================
    // showToast.updated
    // =========================================================================
    describe("showToast.updated", () => {
        it("should show success message for updated item", () => {
            showToast.updated("grafik");

            expect(toast.success).toHaveBeenCalledWith(
                "Grafik został zaktualizowany",
                undefined
            );
        });
    });

    // =========================================================================
    // showToast.deleted
    // =========================================================================
    describe("showToast.deleted", () => {
        it("should show success message for deleted item", () => {
            showToast.deleted("pracownik");

            expect(toast.success).toHaveBeenCalledWith(
                "Pracownik został usunięty",
                undefined
            );
        });
    });

    // =========================================================================
    // showToast.saved
    // =========================================================================
    describe("showToast.saved", () => {
        it("should show generic saved message", () => {
            showToast.saved();

            expect(toast.success).toHaveBeenCalledWith(
                "Zmiany zostały zapisane",
                undefined
            );
        });

        it("should accept options", () => {
            showToast.saved({ duration: 3000 });

            expect(toast.success).toHaveBeenCalledWith(
                "Zmiany zostały zapisane",
                { duration: 3000 }
            );
        });
    });

    // =========================================================================
    // showToast.createError
    // =========================================================================
    describe("showToast.createError", () => {
        it("should show error message for create failure", () => {
            showToast.createError("pracownika");

            expect(toast.error).toHaveBeenCalledWith(
                "Nie udało się dodać pracownika",
                undefined
            );
        });
    });

    // =========================================================================
    // showToast.updateError
    // =========================================================================
    describe("showToast.updateError", () => {
        it("should show error message for update failure", () => {
            showToast.updateError("grafiku");

            expect(toast.error).toHaveBeenCalledWith(
                "Nie udało się zaktualizować grafiku",
                undefined
            );
        });
    });

    // =========================================================================
    // showToast.deleteError
    // =========================================================================
    describe("showToast.deleteError", () => {
        it("should show error message for delete failure", () => {
            showToast.deleteError("zmiany");

            expect(toast.error).toHaveBeenCalledWith(
                "Nie udało się usunąć zmiany",
                undefined
            );
        });
    });

    // =========================================================================
    // showToast.loadError
    // =========================================================================
    describe("showToast.loadError", () => {
        it("should show error message for load failure", () => {
            showToast.loadError("danych");

            expect(toast.error).toHaveBeenCalledWith(
                "Nie udało się wczytać danych",
                undefined
            );
        });
    });

    // =========================================================================
    // showToast.saveError
    // =========================================================================
    describe("showToast.saveError", () => {
        it("should show generic save error message", () => {
            showToast.saveError();

            expect(toast.error).toHaveBeenCalledWith(
                "Nie udało się zapisać zmian",
                undefined
            );
        });
    });

    // =========================================================================
    // showToast.networkError
    // =========================================================================
    describe("showToast.networkError", () => {
        it("should show network error message", () => {
            showToast.networkError();

            expect(toast.error).toHaveBeenCalledWith(
                "Błąd połączenia z serwerem",
                undefined
            );
        });
    });

    // =========================================================================
    // showToast.promise
    // =========================================================================
    describe("showToast.promise", () => {
        it("should wrap promise with loading/success/error messages", async () => {
            const promise = Promise.resolve("result");
            const messages = {
                loading: "Ładowanie...",
                success: "Gotowe!",
                error: "Błąd!",
            };

            showToast.promise(promise, messages);

            expect(toast.promise).toHaveBeenCalledWith(promise, messages);
        });
    });

    // =========================================================================
    // Polish language correctness
    // =========================================================================
    describe("Polish language", () => {
        it("messages should be in Polish", () => {
            // Sprawdź czy komunikaty są po polsku
            showToast.created("element");
            showToast.updated("element");
            showToast.deleted("element");
            showToast.saved();
            showToast.saveError();
            showToast.networkError();

            // Wszystkie wywołania powinny zawierać polski tekst
            const calls = [
                ...vi.mocked(toast.success).mock.calls,
                ...vi.mocked(toast.error).mock.calls,
            ];

            // Sprawdź że nie ma angielskich słów
            calls.forEach(([message]) => {
                expect(message).not.toMatch(/was|has been|failed|could not/i);
            });
        });
    });

    // =========================================================================
    // Edge cases
    // =========================================================================
    describe("edge cases", () => {
        it("should handle empty item name in created", () => {
            showToast.created("");

            // Capitalize of empty string returns empty
            expect(toast.success).toHaveBeenCalledWith(
                " został dodany",
                undefined
            );
        });

        it("should handle item with spaces", () => {
            showToast.created("nowy pracownik");

            // Only first letter is capitalized
            expect(toast.success).toHaveBeenCalledWith(
                "Nowy pracownik został dodany",
                undefined
            );
        });

        it("should handle already capitalized item", () => {
            showToast.created("Pracownik");

            expect(toast.success).toHaveBeenCalledWith(
                "Pracownik został dodany",
                undefined
            );
        });
    });
});
