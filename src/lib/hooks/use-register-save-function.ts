"use client";

import { useEffect } from "react";
import { useUnsavedChanges } from "@/lib/contexts/unsaved-changes-context";

/**
 * Hook to register a save function with the unsaved changes context.
 * Automatically cleans up when component unmounts.
 *
 * @param saveFunction - The async function to call when saving
 *
 * @example
 * const saveAll = useCallback(async () => {
 *   await saveShifts();
 * }, [saveShifts]);
 *
 * useRegisterSaveFunction(saveAll);
 */
export function useRegisterSaveFunction(
    saveFunction: (() => Promise<void>) | null
): void {
    const { setSaveFunction } = useUnsavedChanges();

    useEffect(() => {
        setSaveFunction(saveFunction);
        return () => setSaveFunction(null);
    }, [saveFunction, setSaveFunction]);
}
