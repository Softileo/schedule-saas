import { ReactNode } from "react";
import { MarketingHeader } from "@/components/features/marketing";
import { FooterSection } from "@/components/features/landing";

interface MarketingLayoutProps {
    children: ReactNode;
}

/**
 * Layout dla stron marketingowych/SEO
 * Zawiera header z nawigacją i wspólne style
 */
export default function MarketingLayout({ children }: MarketingLayoutProps) {
    return (
        <div className="min-h-screen">
            {/* Header */}
            <MarketingHeader variant="transparent" />

            {/* Main content with top padding for fixed header */}
            <main className="pt-10">{children}</main>

            {/* Footer */}
            <FooterSection />
        </div>
    );
}
