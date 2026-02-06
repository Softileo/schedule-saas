"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { FeedbackDialog } from "./feedback-dialog";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => setIsOpen(true)}
                            className={cn(
                                "fixed bottom-4 right-4 z-50 ",
                                "w-11 h-11 md:w-12 md:h-12 rounded-full ",
                                "bg-linear-to-br from-pink-300 via-red-400 to-rose-500",
                                "text-white shadow-lg shadow-indigo-500/30",
                                "flex items-center justify-center",
                                "hover:scale-110 hover:shadow-xl hover:shadow-indigo-500/40",
                                "active:scale-95",
                                "transition-all duration-200",
                                "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            )}
                            aria-label="Zgłoś błąd lub sugestię"
                        >
                            <Flag className="w-5 h-5 " />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent
                        side="left"
                        className="bg-slate-900 text-white"
                    >
                        <p>Zgłoś błąd lub sugestię</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <FeedbackDialog open={isOpen} onOpenChange={setIsOpen} />
        </>
    );
}
