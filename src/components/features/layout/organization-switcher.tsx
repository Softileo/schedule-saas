"use client";

import Link from "next/link";
import { OrganizationWithRole } from "@/types";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useOrgSwitch } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface OrganizationSwitcherProps {
    organizations: OrganizationWithRole[];
    variant?: "default" | "sidebar";
    collapsed?: boolean;
    className?: string;
    onOpenChange?: (open: boolean) => void;
}

export function OrganizationSwitcher({
    organizations,
    variant = "default",
    collapsed = false,
    className,
    onOpenChange,
}: OrganizationSwitcherProps) {
    const { currentOrg, switchOrganization, isCurrentOrg } = useOrgSwitch({
        organizations,
    });

    if (organizations.length === 0) {
        return (
            <Button
                variant={variant === "sidebar" ? "ghost" : "outline"}
                className={cn("w-full justify-start", className)}
                asChild
            >
                <Link href={ROUTES.USTAWIENIA_ORGANIZACJE}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj organizację
                </Link>
            </Button>
        );
    }

    return (
        <DropdownMenu onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>
                {variant === "sidebar" ? (
                    <button
                        className={cn(
                            "flex w-full items-center rounded-xl border border-gray-200 bg-gray-100 p-2 transition-colors hover:bg-slate-100",
                            className,
                        )}
                    >
                        <Building2 className="h-5 w-5 text-primary shrink-0" />
                        <span
                            className={cn(
                                "ml-3 text-sm font-medium text-primary truncate transition-all duration-200",
                                collapsed
                                    ? "w-0 opacity-0"
                                    : "w-auto opacity-100",
                            )}
                        >
                            {currentOrg?.name || "Organizacja"}
                        </span>
                    </button>
                ) : (
                    <Button
                        variant="outline"
                        className={cn("w-full justify-between", className)}
                    >
                        <div className="flex items-center gap-2 truncate">
                            <Building2 className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                                {currentOrg?.name || "Wybierz organizację"}
                            </span>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-60">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">
                    Przełącz organizację
                </div>

                {organizations.map((org) => (
                    <DropdownMenuItem
                        key={org.id}
                        onClick={() => switchOrganization(org.slug)}
                        className={cn(
                            "cursor-pointer",
                            isCurrentOrg(org) && "bg-slate-100",
                        )}
                    >
                        <Building2 className="mr-2 h-4 w-4" />
                        <span className="flex-1 truncate">{org.name}</span>

                        {org.is_owner && (
                            <span className="ml-2 text-xs text-slate-400">
                                Właściciel
                            </span>
                        )}

                        {variant === "default" && isCurrentOrg(org) && (
                            <Check className="ml-2 h-4 w-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link
                        href={ROUTES.USTAWIENIA_ORGANIZACJE}
                        className="cursor-pointer"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Dodaj organizację
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
