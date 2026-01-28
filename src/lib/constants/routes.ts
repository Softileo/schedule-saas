/**
 * Centralizacja ścieżek aplikacji
 *
 * Używać zamiast hardcoded stringów dla:
 * - Łatwiejszej refaktoryzacji
 * - Unikania literówek
 * - Type-safety
 */

export const ROUTES = {
    // Auth
    LOGOWANIE: "/logowanie",
    REJESTRACJA: "/rejestracja",
    WERYFIKACJA: "/weryfikacja",
    KONFIGURACJA: "/konfiguracja",
    ZAPOMNIALEM_HASLA: "/zapomnialem-hasla",
    RESET_HASLA: "/reset-hasla",

    // Dashboard
    PANEL: "/panel",
    GRAFIK: "/grafik",
    PRACOWNICY: "/pracownicy",
    ZMIANY: "/zmiany",
    USTAWIENIA: "/ustawienia",

    // Landing
    HOME: "/",

    // Marketing / SEO
    NARZEDZIA: "/narzedzia",
    NIEDZIELE_HANDLOWE: "/narzedzia/niedziele-handlowe-2026",
    KALKULATOR_CZASU: "/narzedzia/wymiar-czasu-pracy-2026",
    KALKULATOR_WYNAGRODZEN:
        "/narzedzia/kalkulator-wynagrodzen-netto-brutto-2026",
    KALENDARZ_DNI_ROBOCZYCH: "/narzedzia/kalendarz-dni-roboczych-2026",
    GRAFIK_PRACY: "/grafik-pracy",
    GRAFIK_SZABLONY: "/grafik-pracy/szablony",
    BLOG: "/blog",

    // Settings tabs
    USTAWIENIA_ORGANIZACJE: "/ustawienia?tab=organizations",
    USTAWIENIA_PROFIL: "/ustawienia?tab=profile",
} as const;

/**
 * Ścieżki publiczne (nie wymagające autoryzacji)
 */
export const PUBLIC_ROUTES = [
    ROUTES.HOME,
    ROUTES.LOGOWANIE,
    ROUTES.REJESTRACJA,
    ROUTES.WERYFIKACJA,
    ROUTES.ZAPOMNIALEM_HASLA,
    ROUTES.RESET_HASLA,
    ROUTES.NARZEDZIA,
    ROUTES.NIEDZIELE_HANDLOWE,
    ROUTES.KALKULATOR_CZASU,
    ROUTES.KALKULATOR_WYNAGRODZEN,
    ROUTES.KALENDARZ_DNI_ROBOCZYCH,
    ROUTES.GRAFIK_PRACY,
    ROUTES.GRAFIK_SZABLONY,
    ROUTES.BLOG,
] as const;

/**
 * Ścieżki auth (dla middleware)
 */
export const AUTH_ROUTES = [
    ROUTES.LOGOWANIE,
    ROUTES.REJESTRACJA,
    ROUTES.WERYFIKACJA,
    ROUTES.ZAPOMNIALEM_HASLA,
    ROUTES.RESET_HASLA,
] as const;

/**
 * Ścieżki wymagające organizacji
 */
export const ORG_REQUIRED_ROUTES = [
    ROUTES.PANEL,
    ROUTES.GRAFIK,
    ROUTES.PRACOWNICY,
    ROUTES.ZMIANY,
    ROUTES.USTAWIENIA,
    ROUTES.KONFIGURACJA,
] as const;

/**
 * Sprawdza czy ścieżka jest publiczna
 */
export function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
}

/**
 * Sprawdza czy ścieżka wymaga auth
 */
export function isAuthRoute(pathname: string): boolean {
    return AUTH_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
}
