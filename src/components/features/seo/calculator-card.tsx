import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from "lucide-react";

interface CalculatorCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    href: string;
    buttonText?: string;
}

/**
 * Karta kalkulatora/narzędzia
 */
export function CalculatorCard({
    icon: Icon,
    title,
    description,
    href,
    buttonText = "Otwórz kalkulator",
}: CalculatorCardProps) {
    return (
        <Card className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow group">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {description}
                    </p>
                    <Button asChild variant="outline" size="sm">
                        <Link href={href}>
                            {buttonText}
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </Card>
    );
}
