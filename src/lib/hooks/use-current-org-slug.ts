/**
 * Hook do pobierania aktualnego slug organizacji z URL
 * Wykorzystywany w komponentach layout do nawigacji między organizacjami
 */
"use client";

import { useSearchParams } from "next/navigation";

/**
 * Pobiera aktualny slug organizacji z parametrów URL
 * @returns Slug organizacji lub null jeśli nie wybrano
 */
export function useCurrentOrgSlug(): string | null {
    const searchParams = useSearchParams();
    return searchParams.get("org");
}
