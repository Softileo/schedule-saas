import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Łączy klasy CSS z obsługą Tailwind merge.
 * @example cn("px-4", isActive && "bg-blue-500", className)
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Tworzy obiekt wariantów klas CSS.
 * Prostsza alternatywa dla cva (class-variance-authority).
 *
 * @example
 * const buttonStyles = variants({
 *   base: "px-4 py-2 rounded font-medium",
 *   variants: {
 *     variant: {
 *       primary: "bg-blue-500 text-white",
 *       secondary: "bg-gray-200 text-gray-800",
 *     },
 *     size: {
 *       sm: "text-sm",
 *       md: "text-base",
 *       lg: "text-lg",
 *     },
 *   },
 *   defaultVariants: {
 *     variant: "primary",
 *     size: "md",
 *   },
 * });
 *
 * buttonStyles({ variant: "secondary", size: "lg" });
 */
export function variants<
    V extends Record<string, Record<string, string>>,
    D extends { [K in keyof V]?: keyof V[K] }
>(config: {
    base?: string;
    variants: V;
    defaultVariants?: D;
}): (
    props?: { [K in keyof V]?: keyof V[K] } & { className?: string }
) => string {
    return (props = {}) => {
        const { className, ...variantProps } = props;
        const classes: string[] = [];

        if (config.base) {
            classes.push(config.base);
        }

        for (const [key, variantOptions] of Object.entries(config.variants)) {
            const selectedVariant =
                variantProps[key as keyof typeof variantProps] ??
                config.defaultVariants?.[key as keyof D];

            if (selectedVariant && variantOptions[selectedVariant as string]) {
                classes.push(variantOptions[selectedVariant as string]);
            }
        }

        if (className) {
            classes.push(className);
        }

        return cn(...classes);
    };
}

// Re-export error utilities from centralized location
export {
    getErrorMessage,
    logError,
    isError,
    isSupabaseError,
} from "./utils/error";
