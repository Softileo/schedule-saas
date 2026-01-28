"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface WizardNavigationProps {
    currentStep: number;
    totalSteps: number;
    canProceed: boolean;
    isLoading: boolean;
    onBack: () => void;
    onNext: () => void;
    onComplete: () => void;
}

export const WizardNavigation = memo(function WizardNavigation({
    currentStep,
    totalSteps,
    canProceed,
    isLoading,
    onBack,
    onNext,
    onComplete,
}: WizardNavigationProps) {
    return (
        <div className="flex items-center max-w-md mx-auto justify-between mt-6 pt-4 border-t border-slate-100">
            <Button
                variant="ghost"
                onClick={onBack}
                disabled={currentStep === 1}
                className="gap-1.5 text-slate-600 hover:text-slate-900"
            >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Wstecz</span>
            </Button>

            {currentStep < totalSteps ? (
                <Button
                    onClick={onNext}
                    disabled={!canProceed}
                    className="gap-1.5"
                >
                    Dalej
                    <ChevronRight className="w-4 h-4" />
                </Button>
            ) : (
                <Button
                    onClick={onComplete}
                    disabled={!canProceed || isLoading}
                    className="gap-1.5"
                >
                    {isLoading ? (
                        <>
                            <Spinner className="w-4 h-4" />
                            Zapisuję...
                        </>
                    ) : (
                        <>
                            Zakończ
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </Button>
            )}
        </div>
    );
});
