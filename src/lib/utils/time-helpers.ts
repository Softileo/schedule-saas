/**
 * =============================================================================
 * TIME HELPERS - Utility functions for time calculations
 * =============================================================================
 *
 * Centralne funkcje do obliczeń czasowych.
 */

/**
 * Oblicza liczbę godzin zmiany z uwzględnieniem przerwy.
 * Obsługuje zmiany nocne (przez północ).
 *
 * @param startTime - Czas rozpoczęcia w formacie "HH:MM"
 * @param endTime - Czas zakończenia w formacie "HH:MM"
 * @param breakMinutes - Długość przerwy w minutach (domyślnie 0)
 * @returns Liczba godzin pracy (po odjęciu przerwy)
 *
 * @example
 * calculateShiftHours("08:00", "16:00", 30) // 7.5 (8h - 30min przerwy)
 * calculateShiftHours("22:00", "06:00", 0)  // 8 (zmiana nocna przez północ)
 */
export function calculateShiftHours(
    startTime: string,
    endTime: string,
    breakMinutes: number = 0
): number {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let durationMinutes = endH * 60 + endM - (startH * 60 + startM);

    // Obsługa zmian nocnych (przez północ)
    if (durationMinutes < 0) {
        durationMinutes += 24 * 60;
    }

    // Odejmij przerwę
    const actualWorkMinutes = Math.max(0, durationMinutes - breakMinutes);

    return actualWorkMinutes / 60;
}
