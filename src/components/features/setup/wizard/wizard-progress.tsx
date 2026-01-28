"use client";

import { memo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep } from "./types";

interface WizardProgressProps {
    steps: WizardStep[];
    currentStep: number;
    onStepClick: (step: number) => void;
}

export const WizardProgress = memo(function WizardProgress({
    steps,
    currentStep,
    onStepClick,
}: WizardProgressProps) {
    return (
        <div className="flex items-center justify-center mb-6">
            {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                        <button
                            onClick={() => {
                                if (step.id < currentStep) {
                                    onStepClick(step.id);
                                }
                            }}
                            disabled={step.id > currentStep}
                            className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all",
                                currentStep > step.id
                                    ? "bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600"
                                    : currentStep === step.id
                                    ? "bg-primary text-white shadow-md"
                                    : "bg-white text-slate-400 cursor-not-allowed"
                            )}
                        >
                            {currentStep > step.id ? (
                                <Check className="w-5 h-5" />
                            ) : (
                                <step.icon className="w-5 h-5" />
                            )}
                        </button>
                        <span
                            className={cn(
                                "text-xs mt-2 font-medium hidden sm:block",
                                currentStep >= step.id
                                    ? "text-slate-900"
                                    : "text-slate-400"
                            )}
                        >
                            {step.title}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div
                            className={cn(
                                "w-8 sm:w-16 h-0.75 mx-2 sm:mx-3 sm:-mt-4 rounded-full transition-colors",
                                currentStep > step.id
                                    ? "bg-emerald-500"
                                    : "bg-white"
                            )}
                        />
                    )}
                </div>
            ))}
        </div>
    );
});
