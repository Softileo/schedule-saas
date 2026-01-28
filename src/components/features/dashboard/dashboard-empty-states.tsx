"use client";

import { EmptyState } from "@/components/common/feedback";
import { Briefcase, Plus, UserMinus } from "lucide-react";

interface NoOrganizationStateProps {
    actionHref: string;
}

export function NoOrganizationState({ actionHref }: NoOrganizationStateProps) {
    return (
        <EmptyState
            icon={Briefcase}
            title="Utwórz pierwszą organizację"
            description="Aby rozpocząć planowanie grafików, utwórz organizację i dodaj pracowników."
            action={{
                label: "Nowa organizacja",
                href: actionHref,
                icon: Plus,
            }}
            card
        />
    );
}

export function NoAbsencesState() {
    return (
        <EmptyState
            icon={UserMinus}
            title="Brak nieobecności"
            size="sm"
            card={false}
        />
    );
}
