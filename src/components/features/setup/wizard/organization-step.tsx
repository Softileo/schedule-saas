"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrganizationStepProps {
    orgName: string;
    onOrgNameChange: (name: string) => void;
}

export const OrganizationStep = memo(function OrganizationStep({
    orgName,
    onOrgNameChange,
}: OrganizationStepProps) {
    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                    Jak nazywa się Twoja firma?
                </h2>
                <p className="text-slate-500 mt-1 text-sm">
                    Podaj nazwę organizacji, dla której będziesz tworzyć grafiki
                </p>
            </div>

            <div>
                <Label htmlFor="orgName" className="text-sm font-medium">
                    Nazwa organizacji
                </Label>
                <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => onOrgNameChange(e.target.value)}
                    placeholder="np. Kawiarnia Pod Dębem"
                    className="mt-1.5 h-11"
                    autoFocus
                />
            </div>
        </div>
    );
});
