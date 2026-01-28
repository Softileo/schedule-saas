"use client";

import Link from "next/link";
import { RegisterForm } from "@/components/features/auth/register-form";
import { ROUTES } from "@/lib/constants/routes";

export function RegisterPageContent() {
    return (
        <div className="p-8 sm:p-10 animate-slide-fade-in max-w-md mx-auto">
            {/* Headline */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Utwórz konto
                </h1>
                <p className="text-base text-gray-600">
                    Twórz grafiki pracy w sekundy z AI
                </p>
            </div>

            {/* Form */}
            <RegisterForm />

            {/* Footer link */}
            <div className="text-center text-sm text-gray-600 mt-2">
                Masz już konto?{" "}
                <Link
                    href={ROUTES.LOGOWANIE}
                    className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                    Zaloguj się
                </Link>
            </div>
            <style jsx>{`
                @keyframes slide-fade-in {
                    0% {
                        opacity: 0;
                        transform: translateY(20px) scale(0.98);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .animate-slide-fade-in {
                    animation: slide-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)
                        forwards;
                }
            `}</style>
        </div>
    );
}
