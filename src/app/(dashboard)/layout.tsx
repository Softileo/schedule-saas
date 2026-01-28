import { getDashboardContext } from "@/lib/services/dashboard-context";

import { Header } from "@/components/features/layout/header";
import { MainContent } from "@/components/features/layout/main-content";
import { UnsavedChangesProvider } from "@/lib/contexts/unsaved-changes-context";
import { FeedbackButton } from "@/components/common/feedback";
import { Sidebar } from "@/components/features/layout/Sidebar";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Używamy helpera getDashboardContext, który obsługuje:
    // 1. Sprawdzenie sesji (redirect do logowania)
    // 2. Pobranie usera i profilu
    // 3. Pobranie organizacji
    // 4. Sprawdzenie onboardingu (redirect do konfiguracji)
    const { organizations, profile } = await getDashboardContext();

    return (
        <UnsavedChangesProvider>
            <div className="min-h-dvh">
                <Sidebar organizations={organizations} user={profile} />
                <MainContent>
                    <Header user={profile} organizations={organizations} />
                    <main className="p-4 sm:p-6">{children}</main>
                </MainContent>
                <FeedbackButton />
            </div>
        </UnsavedChangesProvider>
    );
}
