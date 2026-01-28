import { cn } from "@/lib/utils";

/**
 * Skeleton component for loading states
 * Used for content placeholders while data is loading
 */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Whether to show shimmer animation */
    animate?: boolean;
}

export function Skeleton({
    className,
    animate = true,
    ...props
}: SkeletonProps) {
    return (
        <div
            className={cn(
                "rounded-md bg-slate-200/80 dark:bg-slate-700/50",
                animate && "animate-pulse",
                className
            )}
            {...props}
        />
    );
}

/**
 * Table skeleton for loading table content
 */
export function TableSkeleton({
    rows = 5,
    columns = 4,
}: {
    rows?: number;
    columns?: number;
}) {
    return (
        <div className="w-full space-y-3">
            {/* Header */}
            <div className="flex gap-4">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={`header-${i}`} className="h-8 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex gap-4">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton
                            key={`cell-${rowIndex}-${colIndex}`}
                            className="h-12 flex-1"
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * Card skeleton for loading card content
 */
export function CardSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "rounded-xl border bg-white p-6 space-y-4",
                className
            )}
        >
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-24 w-full" />
        </div>
    );
}

/**
 * Schedule grid skeleton for calendar loading
 */
export function ScheduleGridSkeleton() {
    return (
        <div className="space-y-4">
            {/* Week header */}
            <div className="grid grid-cols-8 gap-2">
                <Skeleton className="h-10" /> {/* Employee column */}
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={`day-${i}`} className="h-10" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: 6 }).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="grid grid-cols-8 gap-2">
                    <Skeleton className="h-16" /> {/* Employee name */}
                    {Array.from({ length: 7 }).map((_, colIndex) => (
                        <Skeleton
                            key={`cell-${rowIndex}-${colIndex}`}
                            className="h-16"
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * Stats skeleton for dashboard statistics
 */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={`stat-${i}`}
                    className="rounded-xl border bg-white p-6 space-y-3"
                >
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-24" />
                </div>
            ))}
        </div>
    );
}

/**
 * Employee list skeleton
 */
export function EmployeeListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={`employee-${i}`}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                >
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                </div>
            ))}
        </div>
    );
}

/**
 * Form skeleton
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
    return (
        <div className="space-y-6">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={`field-${i}`} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
            <Skeleton className="h-10 w-32" />
        </div>
    );
}
