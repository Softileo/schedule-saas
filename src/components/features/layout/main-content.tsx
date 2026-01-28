"use client";

import { cn } from "@/lib/utils";

interface MainContentProps {
    children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
    // Sidebar jest zawsze zwinięty (16 = 4rem), rozwija się tylko przy hover
    // Content ma stały padding - nie przesuwa się przy rozwinięciu sidebara
    return (
        <div className={cn("transition-all duration-300 ease-in-out lg:pl-16")}>
            {children}
        </div>
    );
}
