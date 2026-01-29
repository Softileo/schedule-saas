import { Card, CardContent } from "@/components/ui/card";

interface FaqItem {
    question: string;
    answer: string;
}

interface FaqSectionProps {
    faqItems: FaqItem[];
}

export function FaqSection({ faqItems }: FaqSectionProps) {
    return (
        <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-2xl font-bold mb-6 text-center">
                Najczęściej zadawane pytania
            </h2>
            <div className="space-y-4">
                {faqItems.map((item, index) => (
                    <Card key={index}>
                        <CardContent className="pt-6">
                            <h3 className="font-semibold mb-2">
                                {item.question}
                            </h3>
                            <p className="text-muted-foreground">
                                {item.answer}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
