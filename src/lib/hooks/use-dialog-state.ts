"use client";

import { useState, useCallback } from "react";

/**
 * Hook do zarządzania stanem dialogu z opcjonalnym wybranym elementem
 *
 * @example
 * // Dialog z zaznaczonym elementem (np. edycja pracownika)
 * const { isOpen, selected, open, close } = useDialogState<Employee>();
 *
 * // Otwarcie dialogu z danymi
 * <Button onClick={() => open(employee)}>Edytuj</Button>
 *
 * // W komponencie
 * {selected && (
 *   <EditDialog
 *     open={isOpen}
 *     onOpenChange={(open) => !open && close()}
 *     employee={selected}
 *   />
 * )}
 *
 * @example
 * // Prosty dialog bez danych
 * const addDialog = useDialogState();
 *
 * <Button onClick={addDialog.open}>Dodaj</Button>
 * <AddDialog open={addDialog.isOpen} onOpenChange={addDialog.setOpen} />
 */
export function useDialogState<T = void>() {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState<T | null>(null);

    const open = useCallback((data?: T) => {
        if (data !== undefined) {
            setSelected(data);
        }
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        // Opóźnij czyszczenie selected, aby animacja zamknięcia była płynna
        setTimeout(() => setSelected(null), 200);
    }, []);

    const setOpen = useCallback(
        (open: boolean) => {
            if (open) {
                setIsOpen(true);
            } else {
                close();
            }
        },
        [close]
    );

    return {
        /** Czy dialog jest otwarty */
        isOpen,
        /** Setter dla isOpen (kompatybilny z onOpenChange) */
        setOpen,
        /** Wybrany element (może być null) */
        selected,
        /** Otwórz dialog, opcjonalnie z danymi */
        open,
        /** Zamknij dialog i wyczyść selected */
        close,
    };
}

/**
 * Hook do zarządzania dialogami pracowników
 * Predefiniowane dialogi: edit, delete, preferences, absences
 */
export function useEmployeeDialogs<T>() {
    const editDialog = useDialogState<T>();
    const deleteDialog = useDialogState<T>();
    const preferencesDialog = useDialogState<T>();
    const absencesDialog = useDialogState<T>();
    const addDialog = useDialogState();

    return {
        editDialog,
        deleteDialog,
        preferencesDialog,
        absencesDialog,
        addDialog,
        // Convenience methods
        openEdit: editDialog.open,
        openDelete: deleteDialog.open,
        openPreferences: preferencesDialog.open,
        openAbsences: absencesDialog.open,
        openAdd: addDialog.open,
    };
}
