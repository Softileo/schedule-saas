"use client";

import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/features/auth/reset-password-form";

function ResetPasswordContent() {
    return (
        <div className="p-8 sm:p-10 animate-slide-fade-in max-w-md mx-auto">
            <ResetPasswordForm />
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="p-8 sm:p-10 max-w-md mx-auto">Ładowanie...</div>
            }
        >
            <ResetPasswordContent />
        </Suspense>
    );
}
