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
        <div className="w-full max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center flex-1">
                        <div className="flex flex-col items-center w-full">
                            <button
                                onClick={() => {
                                    if (step.id < currentStep) {
                                        onStepClick(step.id);
                                    }
                                }}
                                disabled={step.id > currentStep}
                                className={cn(
                                    "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all shrink-0",
                                    currentStep > step.id
                                        ? "bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600"
                                        : currentStep === step.id
                                          ? "bg-blue-500 text-white shadow-lg ring-4 ring-blue-100"
                                          : "bg-slate-200 text-slate-400 cursor-not-allowed",
                                )}
                            >
                                {currentStep > step.id ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                )}
                            </button>
                            <span
                                className={cn(
                                    "text-[10px] sm:text-xs mt-1.5 sm:mt-2 font-medium text-center leading-tight max-w-[70px] sm:max-w-none",
                                    currentStep >= step.id
                                        ? "text-slate-900"
                                        : "text-slate-400",
                                )}
                            >
                                {step.title}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    "h-0.5 flex-1 mx-1 sm:mx-2 mb-6 sm:mb-8 rounded-full transition-colors",
                                    currentStep > step.id
                                        ? "bg-emerald-500"
                                        : "bg-slate-200",
                                )}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});
