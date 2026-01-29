"use client";

import Link from "next/link";
import { authPageAnimationCSS } from "../shared-styles";
import { LoginForm } from "@/components/features/auth/login-form";
import { ROUTES } from "@/lib/constants/routes";

export function LoginPageContent() {
    return (
        <div className="p-8 sm:p-10 animate-slide-fade-in max-w-md mx-auto">
            {/* Headline */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Witaj z powrotem
                </h1>
                <p className="text-base text-gray-600">
                    Zaloguj się, aby kontynuować
                </p>
            </div>

            {/* Form */}
            <LoginForm />

            {/* Footer link */}
            <div className="text-center text-sm text-gray-600 mt-2">
                Nie masz konta?{" "}
                <Link
                    href={ROUTES.REJESTRACJA}
                    className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                    utwórz konto
                </Link>
            </div>
            <style jsx>{authPageAnimationCSS}</style>
        </div>
    );
}
