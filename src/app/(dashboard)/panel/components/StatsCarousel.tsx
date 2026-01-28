"use client";

import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel";
import { Users2, Clock, Briefcase } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

interface StatsCarouselProps {
    employeeCount: number;
    totalWorkingHours: number;
    totalWorkingDays: number;
}

export function StatsCarousel({
    employeeCount,
    totalWorkingHours,
    totalWorkingDays,
}: StatsCarouselProps) {
    return (
        <Carousel opts={{ align: "start" }} className="w-full">
            <CarouselContent className="-ml-4">
                <CarouselItem className="pl-4 basis-3/4 sm:basis-1/3">
                    <StatCard
                        variant="horizontal"
                        label="Pracownicy"
                        value={employeeCount}
                        icon={<Users2 className="h-5 w-5 text-blue-600" />}
                        iconWrapperClassName="bg-blue-50"
                        className="border-slate-200 shadow-sm"
                    />
                </CarouselItem>

                <CarouselItem className="pl-4 basis-3/4 sm:basis-1/3">
                    <StatCard
                        variant="horizontal"
                        label="Godziny"
                        value={totalWorkingHours}
                        suffix="h"
                        icon={<Clock className="h-5 w-5 text-violet-600" />}
                        iconWrapperClassName="bg-violet-50"
                        className="border-slate-200 shadow-sm"
                    />
                </CarouselItem>

                <CarouselItem className="pl-4 basis-3/4 sm:basis-1/3">
                    <StatCard
                        variant="horizontal"
                        label="Dni robocze"
                        value={totalWorkingDays}
                        icon={<Briefcase className="h-5 w-5 text-amber-600" />}
                        iconWrapperClassName="bg-amber-50"
                        className="border-slate-200 shadow-sm"
                    />
                </CarouselItem>
            </CarouselContent>
        </Carousel>
    );
}
