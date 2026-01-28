"use client";

import { Profile, OrganizationWithRole, Employee } from "@/types";
import { ShiftTemplate, OrganizationSettings } from "@/types";
import { ProfileSettings } from "./profile-settings";
import { OrganizationsSettings } from "./organizations-settings";
import { ShiftTemplatesSettings } from "./shift-templates-settings";
import { OrganizationSettingsComponent } from "./organization-settings";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Building2, Clock, Settings } from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
    useRef,
    useLayoutEffect,
} from "react";

interface SettingsTabsProps {
    profile: Profile | null;
    organizations: OrganizationWithRole[];
    defaultTab: string;
    userId: string;
    shiftTemplates: ShiftTemplate[];
    employees?: Employee[];
    currentOrganizationId?: string;
    organizationSettings?: OrganizationSettings | null;
}

const tabs = [
    { id: "profile", label: "Profil", icon: User },
    { id: "organizations", label: "Organizacje", icon: Building2 },
    {
        id: "templates",
        label: "Szablony zmian",
        icon: Clock,
        requiresOrg: true,
    },
    {
        id: "org-settings",
        label: "Ustawienia org.",
        icon: Settings,
        requiresOrg: true,
    },
];

export function SettingsTabs({
    profile,
    organizations,
    defaultTab,
    userId,
    shiftTemplates,
    employees,
    currentOrganizationId,
    organizationSettings,
}: SettingsTabsProps) {
    const searchParams = useSearchParams();

    // Oblicz początkowy tab na podstawie URL
    const initialTab = searchParams.get("tab") || defaultTab;
    const [activeTab, setActiveTab] = useState(initialTab);
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    const availableTabs = tabs.filter(
        (tab) => !tab.requiresOrg || currentOrganizationId
    );

    const updateIndicator = useCallback((tabId: string) => {
        if (!tabsContainerRef.current) return;
        const button = tabsContainerRef.current.querySelector(
            `[data-tab="${tabId}"]`
        ) as HTMLButtonElement;
        if (button) {
            setIndicatorStyle({
                left: button.offsetLeft,
                width: button.offsetWidth,
            });
        }
    }, []);

    useLayoutEffect(() => {
        updateIndicator(activeTab);
    }, [activeTab, updateIndicator]);

    useEffect(() => {
        const handleResize = () => updateIndicator(activeTab);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [activeTab, updateIndicator]);

    // Synchronizuj z URL tylko gdy zmieni się searchParams
    // Ten efekt jest konieczny do synchronizacji URL ↔ state przy nawigacji
    /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
    useEffect(() => {
        const tab = searchParams.get("tab") || defaultTab;
        if (tab !== activeTab && availableTabs.some((t) => t.id === tab)) {
            setActiveTab(tab);
        }
    }, [searchParams, availableTabs, defaultTab]);
    /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

    const handleTabChange = (tabId: string) => {
        if (tabId === activeTab) return;
        setActiveTab(tabId);
        // Zachowaj parametr org przy zmianie taba
        const currentOrg = searchParams.get("org");
        const newParams = new URLSearchParams();
        if (currentOrg) {
            newParams.set("org", currentOrg);
        }
        newParams.set("tab", tabId);
        window.history.replaceState(
            null,
            "",
            `/ustawienia?${newParams.toString()}`
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case "profile":
                return <ProfileSettings profile={profile} />;
            case "organizations":
                return (
                    <OrganizationsSettings
                        organizations={organizations}
                        userId={userId}
                    />
                );
            case "templates":
                return currentOrganizationId ? (
                    <ShiftTemplatesSettings
                        templates={shiftTemplates}
                        organizationId={currentOrganizationId}
                        employees={employees || []}
                    />
                ) : null;
            case "org-settings":
                return currentOrganizationId ? (
                    <OrganizationSettingsComponent
                        organizationId={currentOrganizationId}
                        settings={organizationSettings || null}
                    />
                ) : null;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="relative">
                <div
                    ref={tabsContainerRef}
                    className="flex gap-1 p-1 bg-slate-100 rounded-xl relative"
                >
                    {/* Animated indicator */}
                    <div
                        className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm transition-[left,width] duration-200 ease-out will-change-[left,width]"
                        style={{
                            left: indicatorStyle.left,
                            width: indicatorStyle.width,
                        }}
                    />

                    {availableTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                data-tab={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={cn(
                                    "relative z-10 flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150",
                                    isActive
                                        ? "text-slate-900"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div key={activeTab} className="animate-in fade-in-0 duration-150">
                {renderContent()}
            </div>
        </div>
    );
}
