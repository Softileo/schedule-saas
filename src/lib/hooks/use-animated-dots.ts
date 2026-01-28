"use client";

import { useState, useEffect } from "react";

/**
 * Hook for animated loading dots that cycle: "" -> "." -> ".." -> "..." -> ""
 *
 * @param interval - Interval in milliseconds between dot changes (default: 400ms)
 * @param maxDots - Maximum number of dots before reset (default: 3)
 * @returns Current dots string
 *
 * @example
 * const dots = useAnimatedDots();
 * return <span>Ładowanie{dots}</span>;
 *
 * @example
 * // With custom interval
 * const dots = useAnimatedDots(500);
 * return <span>Generowanie{dots}</span>;
 */
export function useAnimatedDots(interval = 400, maxDots = 3): string {
    const [dots, setDots] = useState("");

    useEffect(() => {
        const id = setInterval(() => {
            setDots((prev) => (prev.length >= maxDots ? "" : prev + "."));
        }, interval);

        return () => clearInterval(id);
    }, [interval, maxDots]);

    return dots;
}
