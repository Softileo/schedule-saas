"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Building2,
    Users,
    Calendar,
    Search,
    ArrowRight,
    Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/utils/toast";

interface Organization {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    owner_id: string;
    profiles: {
        full_name: string | null;
        email: string;
    };
    membersCount: number;
    employeesCount: number;
}

export default function AdminOrganizationsPage() {
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);

    useEffect(() => {
        fetchOrganizations();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const filtered = organizations.filter(
                (org) =>
                    org.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    org.profiles?.email
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    org.slug.toLowerCase().includes(searchQuery.toLowerCase()),
            );
            setFilteredOrgs(filtered);
        } else {
            setFilteredOrgs(organizations);
        }
    }, [searchQuery, organizations]);

    async function fetchOrganizations() {
        try {
            const response = await fetch("/api/admin/organizations");
            if (!response.ok) {
                throw new Error("Failed to fetch organizations");
            }
            const data = await response.json();
            setOrganizations(data.organizations || []);
            setFilteredOrgs(data.organizations || []);
        } catch (error) {
            console.error("Error fetching organizations:", error);
            showToast.error("Nie udało się pobrać organizacji");
        } finally {
            setLoading(false);
        }
    }

    async function handleSwitchOrganization(orgId: string) {
        setSwitchingOrgId(orgId);
        try {
            const response = await fetch("/api/admin/switch-organization", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ organizationId: orgId }),
            });

            if (!response.ok) {
                throw new Error("Failed to switch organization");
            }

            const data = await response.json();
            showToast.success(
                `Przełączono na organizację: ${data.organization.name}`,
            );

            // Przekieruj do dashboardu organizacji
            router.push(data.redirectUrl);
        } catch (error) {
            console.error("Error switching organization:", error);
            showToast.error("Nie udało się przełączyć organizacji");
            setSwitchingOrgId(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-100">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    Organizacje w systemie
                </h1>
                <p className="text-slate-600">
                    Wybierz organizację, aby zalogować się jako jej
                    administrator
                </p>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Szukaj po nazwie, emailu lub slug..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">
                                Wszystkie organizacje
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {organizations.length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">
                                Aktywne pracowników
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {organizations.reduce(
                                    (sum, org) => sum + org.employeesCount,
                                    0,
                                )}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Calendar className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">
                                Znaleziono wyników
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {filteredOrgs.length}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Organizations List */}
            <div className="space-y-3">
                {filteredOrgs.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Building2 className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                        <p className="text-slate-600">
                            {searchQuery
                                ? "Nie znaleziono organizacji"
                                : "Brak organizacji w systemie"}
                        </p>
                    </Card>
                ) : (
                    filteredOrgs.map((org) => (
                        <Card
                            key={org.id}
                            className="p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <Building2 className="h-6 w-6 text-blue-600" />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold text-slate-900">
                                                {org.name}
                                            </h3>
                                            <Badge
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                {org.slug}
                                            </Badge>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-sm text-slate-600">
                                                <span className="font-medium">
                                                    Właściciel:
                                                </span>{" "}
                                                {org.profiles?.full_name ||
                                                    "Brak danych"}{" "}
                                                ({org.profiles?.email})
                                            </p>

                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                <span>
                                                    <Users className="inline h-4 w-4 mr-1" />
                                                    {org.membersCount}{" "}
                                                    {org.membersCount === 1
                                                        ? "członek"
                                                        : "członków"}
                                                </span>
                                                <span>
                                                    <Calendar className="inline h-4 w-4 mr-1" />
                                                    {org.employeesCount}{" "}
                                                    {org.employeesCount === 1
                                                        ? "pracownik"
                                                        : "pracowników"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={() =>
                                        handleSwitchOrganization(org.id)
                                    }
                                    disabled={switchingOrgId === org.id}
                                    className="ml-4"
                                >
                                    {switchingOrgId === org.id ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Przełączanie...
                                        </>
                                    ) : (
                                        <>
                                            Przełącz
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
