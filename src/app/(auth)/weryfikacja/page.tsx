"use client";

import { Suspense } from "react";
import { authPageAnimationCSS } from "../shared-styles";
import { VerifyCodeForm } from "@/components/features/auth/verify-code-form";
import { Spinner } from "@/components/ui/spinner";

function VerifyFormLoading() {
    return (
        <div className="flex items-center justify-center p-6">
            <Spinner size="lg" />
        </div>
    );
}

export default function VerifyPage() {
    return (
        <>
            <div className="p-8 sm:p-10 animate-slide-fade-in max-w-md mx-auto">
                {/* Headline */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Weryfikacja konta
                    </h1>
                    <p className="text-base text-gray-600">
                        Wpisz kod, który wysłaliśmy na Twój adres
                    </p>
                </div>

                {/* Form */}
                <Suspense fallback={<VerifyFormLoading />}>
                    <VerifyCodeForm />
                </Suspense>
            </div>
            <style jsx>{authPageAnimationCSS}</style>
        </>
    );
}
