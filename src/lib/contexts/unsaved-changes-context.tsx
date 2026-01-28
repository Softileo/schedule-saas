"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
    useMemo,
    ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getErrorMessage } from "@/lib/utils/error";

interface UnsavedChangesContextType {
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: (value: boolean) => void;
    saveFunction: (() => Promise<void>) | null;
    setSaveFunction: (fn: (() => Promise<void>) | null) => void;
    isSaving: boolean;
    setIsSaving: (value: boolean) => void;
    confirmNavigation: (onConfirm: () => void) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | null>(
    null
);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveFunctionState, setSaveFunctionState] = useState<
        (() => Promise<void>) | null
    >(null);
    const [isSaving, setIsSaving] = useState(false);

    // Wrapper do poprawnego ustawiania funkcji w stanie React
    const setSaveFunction = useCallback((fn: (() => Promise<void>) | null) => {
        setSaveFunctionState(() => fn);
    }, []);
    const [showDialog, setShowDialog] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<
        (() => void) | null
    >(null);

    // Przechowuj kopię saveFunction dla popstate
    const saveFunctionRef = useRef<(() => Promise<void>) | null>(null);
    const hasUnsavedChangesRef = useRef(false);

    useEffect(() => {
        saveFunctionRef.current = saveFunctionState;
    }, [saveFunctionState]);

    useEffect(() => {
        hasUnsavedChangesRef.current = hasUnsavedChanges;
    }, [hasUnsavedChanges]);

    // Obsługa zamknięcia/odświeżenia strony
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChangesRef.current) {
                e.preventDefault();
                e.returnValue =
                    "Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?";
                return e.returnValue;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    // Obsługa przycisku wstecz w przeglądarce
    useEffect(() => {
        const handlePopState = () => {
            if (hasUnsavedChangesRef.current) {
                // Wróć do poprzedniej strony w historii (cofnij popstate)
                window.history.pushState(null, "", window.location.href);
                // Pokaż dialog
                setPendingNavigation(() => () => {
                    window.history.back();
                });
                setShowDialog(true);
            }
        };

        // Dodaj wpis do historii gdy są niezapisane zmiany
        if (hasUnsavedChanges) {
            window.history.pushState(null, "", window.location.href);
        }

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [hasUnsavedChanges]);

    // Reset stanu przy zmianie strony
    useEffect(() => {
        setHasUnsavedChanges(false);
        setSaveFunction(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const confirmNavigation = useCallback(
        (onConfirm: () => void) => {
            if (hasUnsavedChanges) {
                setPendingNavigation(() => onConfirm);
                setShowDialog(true);
            } else {
                onConfirm();
            }
        },
        [hasUnsavedChanges]
    );

    const handleDiscard = () => {
        setShowDialog(false);
        setHasUnsavedChanges(false);
        if (pendingNavigation) {
            pendingNavigation();
            setPendingNavigation(null);
        }
    };

    const handleSaveAndContinue = async () => {
        const currentSaveFunction = saveFunctionRef.current;
        if (currentSaveFunction) {
            setIsSaving(true);
            try {
                await currentSaveFunction();
                setHasUnsavedChanges(false);
                setShowDialog(false);
                if (pendingNavigation) {
                    pendingNavigation();
                    setPendingNavigation(null);
                }
            } catch (error) {
                getErrorMessage(error);
                // Error already handled by getErrorMessage
            } finally {
                setIsSaving(false);
            }
        } else {
            // Jeśli nie ma funkcji zapisu, po prostu odrzuć zmiany
            handleDiscard();
        }
    };

    const handleCancel = () => {
        setShowDialog(false);
        setPendingNavigation(null);
    };

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(
        () => ({
            hasUnsavedChanges,
            setHasUnsavedChanges,
            saveFunction: saveFunctionState,
            setSaveFunction,
            isSaving,
            setIsSaving,
            confirmNavigation,
        }),
        [
            hasUnsavedChanges,
            saveFunctionState,
            setSaveFunction,
            isSaving,
            confirmNavigation,
        ]
    );

    return (
        <UnsavedChangesContext.Provider value={contextValue}>
            {children}

            <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Niezapisane zmiany</AlertDialogTitle>
                        <AlertDialogDescription>
                            Masz niezapisane zmiany. Co chcesz zrobić?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-2 sm:space-x-2">
                        <AlertDialogCancel onClick={handleCancel}>
                            Anuluj
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDiscard}
                            className="bg-slate-500 hover:bg-slate-600"
                        >
                            Odrzuć zmiany
                        </AlertDialogAction>
                        <AlertDialogAction
                            onClick={handleSaveAndContinue}
                            disabled={isSaving || !saveFunctionRef.current}
                        >
                            {isSaving ? "Zapisuję..." : "Zapisz i kontynuuj"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </UnsavedChangesContext.Provider>
    );
}

export function useUnsavedChanges() {
    const context = useContext(UnsavedChangesContext);
    if (!context) {
        throw new Error(
            "useUnsavedChanges must be used within UnsavedChangesProvider"
        );
    }
    return context;
}
