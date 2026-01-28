"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsCard } from "@/components/ui/settings-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { showToast } from "@/lib/utils/toast";

interface ProfileSettingsProps {
    profile: Profile | null;
}

export function ProfileSettings({ profile }: ProfileSettingsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [success, setSuccess] = useState(false);

    const initials =
        profile?.full_name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase() ||
        profile?.email?.[0].toUpperCase() ||
        "U";

    async function handleSave() {
        setIsLoading(true);
        setSuccess(false);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: fullName,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", profile?.id || "");

            if (error) throw error;

            showToast.updated("profil");
            setSuccess(true);
            router.refresh();
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error updating profile:", message);
            showToast.updateError("profilu");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <SettingsCard
                title="Informacje o profilu"
                description="Zaktualizuj swoje dane osobowe"
                contentClassName="space-y-6"
            >
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-2xl">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">
                            {profile?.full_name || "Brak nazwy"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {profile?.email}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={profile?.email || ""}
                            disabled
                            className="bg-slate-50"
                        />
                        <p className="text-xs text-muted-foreground">
                            Email nie może być zmieniony
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fullName">Imię i nazwisko</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {success && (
                    <p className="text-sm text-green-600">
                        Profil został zaktualizowany
                    </p>
                )}

                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading && <Spinner withMargin />}
                    Zapisz zmiany
                </Button>
            </SettingsCard>
        </div>
    );
}
