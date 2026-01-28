/**
 * Subtle grid pattern effect used across the site
 * Provides a subtle background texture
 */
export function GridPattern({ className = "" }: { className?: string }) {
    return (
        <div
            className={`absolute inset-0 bg-[linear-gradient(to_right,#8881_1px,transparent_1px),linear-gradient(to_bottom,#8881_1px,transparent_1px)] bg-size-[14px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] ${className}`}
        />
    );
}

/**
 * Gradient orbs effect - creates soft colored circles in background
 * Used for visual depth and brand consistency
 */
export function GradientOrbs({ className = "" }: { className?: string }) {
    return (
        <>
            <div
                className={`absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl ${className}`}
            />
            <div
                className={`absolute top-20 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl ${className}`}
            />
        </>
    );
}

/**
 * White gradient orbs for dark backgrounds (like CTA sections)
 */
export function GradientOrbsLight({ className = "" }: { className?: string }) {
    return (
        <>
            <div
                className={`absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl ${className}`}
            />
            <div
                className={`absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl ${className}`}
            />
        </>
    );
}

/**
 * Combined background effects - grid + orbs
 * Use this for consistent background styling across pages
 */
export function BackgroundEffects({
    gridClassName = "",
    orbsClassName = "",
}: {
    gridClassName?: string;
    orbsClassName?: string;
}) {
    return (
        <>
            <GridPattern className={gridClassName} />
            <GradientOrbs className={orbsClassName} />
        </>
    );
}
