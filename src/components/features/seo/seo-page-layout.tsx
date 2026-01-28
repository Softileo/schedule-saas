"use client";

import { ReactNode } from "react";
import { BackgroundEffects } from "@/components/ui/background-effects";

interface SEOPageLayoutProps {
    children: ReactNode;
    showFooter?: boolean;
}

/**
 * Wspólny layout dla stron SEO/marketingowych
 * Zachowuje spójność z landing page (gradient, orbs, grid)
 */
export function SEOPageLayout({
    children,
}: SEOPageLayoutProps) {
    return (
        <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50/50">
            <BackgroundEffects
                gridClassName="fixed pointer-events-none"
                orbsClassName="fixed pointer-events-none"
            />

            {/* Content */}
            <div className="relative">{children}</div>
        </div>
    );
}
