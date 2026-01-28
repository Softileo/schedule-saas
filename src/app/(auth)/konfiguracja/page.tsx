import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/features/setup/onboarding-wizard";
import { ROUTES } from "@/lib/constants/routes";

export const metadata = {
    title: "Konfiguracja początkowa | Calenda",
    description: "Skonfiguruj swoje konto i stwórz pierwszą organizację",
};

export default async function SetupPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(ROUTES.LOGOWANIE);
    }

    // Check if user already completed onboarding
    const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

    if (profile?.onboarding_completed) {
        redirect(ROUTES.PANEL);
    }

    // Check if user already has organizations
    const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1);

    if (memberships && memberships.length > 0) {
        // User has orgs but onboarding not marked - mark it now and redirect
        await supabase
            .from("profiles")
            .update({ onboarding_completed: true })
            .eq("id", user.id);
        redirect(ROUTES.PANEL);
    }

    return <OnboardingWizard />;
}
