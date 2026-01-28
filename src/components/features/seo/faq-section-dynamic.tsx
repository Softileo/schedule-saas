"use client";

import { Badge } from "@/components/ui/badge";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export interface FAQItem {
    question: string;
    answer: string;
}

interface FAQSectionDynamicProps {
    title?: string;
    subtitle?: string;
    faqs: FAQItem[];
    showBadge?: boolean;
}

/**
 * Dynamiczna sekcja FAQ przyjmująca dane przez props
 */
export function FAQSectionDynamic({
    title = "Często zadawane pytania",
    subtitle,
    faqs,
    showBadge = true,
}: FAQSectionDynamicProps) {
    if (faqs.length === 0) return null;

    return (
        <section className="py-16 md:py-24" id="faq">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12 md:mb-16">
                    {showBadge && (
                        <Badge className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-200/50">
                            <HelpCircle className="w-4 h-4 mr-2" />
                            FAQ
                        </Badge>
                    )}
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* FAQ Accordion */}
                <div className="max-w-3xl mx-auto">
                    <Accordion type="single" collapsible className="space-y-3">
                        {faqs.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="border border-gray-100 rounded-xl bg-white px-6 data-[state=open]:shadow-sm hover:border-gray-200 transition-colors"
                            >
                                <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline py-5">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-gray-600 pb-5 leading-relaxed">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </div>
        </section>
    );
}
