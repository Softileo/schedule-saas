import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface UniversalHeroProps {
    badge?: {
        icon?: LucideIcon;
        text: string;
    };
    title: string;
    titleHighlight?: string;
    subtitle?: string;
    children?: React.ReactNode;
}

/**
 * Uniwersalny hero section dla stron SEO
 */
export function UniversalHero({
    badge,
    title,
    titleHighlight,
    subtitle,
    children,
}: UniversalHeroProps) {
    return (
        <section className="relative pt-16 pb-8 lg:pt-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    {badge && (
                        <div className="flex justify-center mb-8 animate-fade-in-up">
                            <Badge className="px-4 py-2 text-sm font-medium bg-blue-500/10 text-blue-700 border-blue-200/50 hover:bg-blue-500/20 transition-colors">
                                {badge.icon && (
                                    <badge.icon className="w-4 h-4 mr-2" />
                                )}
                                {badge.text}
                            </Badge>
                        </div>
                    )}

                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6 animate-fade-in-up animate-delay-100">
                        {title}
                        {titleHighlight && (
                            <>
                                <br />
                                <span className="bg-linear-to-r from-blue-600 via-blue-500 to-violet-500 bg-clip-text text-transparent">
                                    {titleHighlight}
                                </span>
                            </>
                        )}
                    </h1>

                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in-up animate-delay-200">
                            {subtitle}
                        </p>
                    )}

                    {/* Additional content (buttons, etc.) */}
                    {children && (
                        <div className="animate-fade-in-up animate-delay-300">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
