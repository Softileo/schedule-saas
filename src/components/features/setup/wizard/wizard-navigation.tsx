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
        <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto px-1">
            <Button
                variant="ghost"
                onClick={onBack}
                disabled={currentStep === 1}
                className="gap-1.5 text-slate-600 hover:text-slate-900 h-11 px-4"
            >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden xs:inline">Wstecz</span>
            </Button>

            {currentStep < totalSteps ? (
                <Button
                    onClick={onNext}
                    disabled={!canProceed}
                    className="gap-1.5 h-11 px-6 flex-1 sm:flex-none"
                >
                    <span>Dalej</span>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            ) : (
                <Button
                    onClick={onComplete}
                    disabled={!canProceed || isLoading}
                    className="gap-1.5 h-11 px-6 flex-1 sm:flex-none"
                >
                    {isLoading ? (
                        <>
                            <Spinner className="w-4 h-4" />
                            <span>Zapisuję...</span>
                        </>
                    ) : (
                        <>
                            <span>Zakończ</span>
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </Button>
            )}
        </div>
    );
});
