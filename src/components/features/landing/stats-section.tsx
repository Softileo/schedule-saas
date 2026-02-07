"use client";

import { useRef, useEffect, useState } from "react";
import { Clock, Users, TrendingUp, Shield } from "lucide-react";

const stats = [
    {
        value: 90,
        suffix: "%",
        label: "mniej czasu na planowanie",
        icon: Clock,
        description: "w porownaniu do Excela",
    },
    {
        value: 50,
        suffix: "+",
        label: "firm korzysta z Calenda",
        icon: Users,
        description: "i ich liczba rosnie",
    },
    {
        value: 100,
        suffix: "%",
        label: "zgodnosc z prawem",
        icon: Shield,
        description: "Kodeks Pracy wbudowany",
    },
    {
        value: 4.9,
        suffix: "/5",
        label: "srednia ocena",
        icon: TrendingUp,
        description: "z 50+ opinii",
    },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: "-100px" },
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        let start: number | null = null;
        const duration = 2000;

        const animate = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = easeOutQuart * value;

            setCount(
                value % 1 === 0
                    ? Math.floor(currentValue)
                    : Math.round(currentValue * 10) / 10,
            );

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(value);
            }
        };

        requestAnimationFrame(animate);
    }, [isVisible, value]);

    return (
        <span ref={ref} className="tabular-nums">
            {value % 1 === 0 ? count : count.toFixed(1)}
            {suffix}
        </span>
    );
}

export function StatsSection() {
    return (
        <section className="py-12 sm:py-20 bg-white border-y border-gray-100 relative overflow-hidden">
            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10 sm:mb-16 animate-fade-in-up">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Liczby mowia same za siebie
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Dolacz do firm, ktore juz oszczedzaja czas i pieniadze
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 stagger-children">
                    {stats.map((stat) => (
                        <div key={stat.label} className="relative group">
                            <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-600 mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
                                    <AnimatedNumber
                                        value={stat.value}
                                        suffix={stat.suffix}
                                    />
                                </div>
                                <div className="text-sm font-medium text-gray-900 mb-1">
                                    {stat.label}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {stat.description}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function LogoCloudSection() {
    return null;
}
