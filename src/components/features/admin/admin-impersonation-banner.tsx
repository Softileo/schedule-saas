"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/utils/toast";

interface ImpersonationStatus {
    isImpersonating: boolean;
    organization?: {
        id: string;
        name: string;
        slug: string;
        profiles: {
            full_name: string | null;
            email: string;
        };
    };
}

export function AdminImpersonationBanner() {
    const router = useRouter();
    const [status, setStatus] = useState<ImpersonationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        checkImpersonationStatus();
    }, []);

    async function checkImpersonationStatus() {
        try {
            const response = await fetch("/api/admin/impersonation-status");
            if (response.ok) {
                const data = await response.json();
                setStatus(data);
            }
        } catch (error) {
            console.error("Error checking impersonation status:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleExitImpersonation() {
        setExiting(true);
        try {
            const response = await fetch("/api/admin/exit-impersonation", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to exit impersonation");
            }

            const data = await response.json();
            showToast.success("Wyszedłeś z trybu podglądu organizacji");

            // Przekieruj do panelu admina
            router.push(data.redirectUrl);
        } catch (error) {
            console.error("Error exiting impersonation:", error);
            showToast.error("Nie udało się wyjść z trybu podglądu");
            setExiting(false);
        }
    }

    if (loading || !status?.isImpersonating) {
        return null;
    }

    return (
        <div className="bg-amber-500 text-white">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">
                                Tryb podglądu organizacji jako Administrator
                            </p>
                            <p className="text-xs text-amber-100 mt-0.5">
                                Jesteś zalogowany jako:{" "}
                                <span className="font-medium">
                                    {status.organization?.name}
                                </span>{" "}
                                (właściciel:{" "}
                                {status.organization?.profiles?.full_name ||
                                    status.organization?.profiles?.email}
                                )
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={handleExitImpersonation}
                        disabled={exiting}
                        size="sm"
                        variant="secondary"
                        className="bg-white text-amber-600 hover:bg-amber-50 shrink-0"
                    >
                        {exiting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Wychodzenie...
                            </>
                        ) : (
                            <>
                                <X className="mr-2 h-4 w-4" />
                                Wyjdź z podglądu
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
