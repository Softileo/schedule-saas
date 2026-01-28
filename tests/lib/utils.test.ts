/**
 * Testy dla utils.ts
 *
 * Testuje:
 * - cn() - łączenie klas CSS z Tailwind merge
 * - variants() - tworzenie wariantów klas CSS
 */

import { describe, it, expect } from "vitest";
import { cn, variants } from "@/lib/utils";

// =========================================================================
// cn - class names utility
// =========================================================================
describe("cn", () => {
    describe("basic functionality", () => {
        it("should merge single class", () => {
            expect(cn("px-4")).toBe("px-4");
        });

        it("should merge multiple classes", () => {
            expect(cn("px-4", "py-2")).toBe("px-4 py-2");
        });

        it("should handle empty input", () => {
            expect(cn()).toBe("");
        });

        it("should handle undefined values", () => {
            expect(cn("px-4", undefined, "py-2")).toBe("px-4 py-2");
        });

        it("should handle null values", () => {
            expect(cn("px-4", null, "py-2")).toBe("px-4 py-2");
        });

        it("should handle false values", () => {
            expect(cn("px-4", false, "py-2")).toBe("px-4 py-2");
        });

        it("should handle empty strings", () => {
            expect(cn("px-4", "", "py-2")).toBe("px-4 py-2");
        });
    });

    describe("conditional classes", () => {
        it("should apply class when condition is true", () => {
            const isActive = true;
            expect(cn("base", isActive && "active")).toBe("base active");
        });

        it("should not apply class when condition is false", () => {
            const isActive = false;
            expect(cn("base", isActive && "active")).toBe("base");
        });

        it("should handle ternary operator", () => {
            const isLarge = true;
            expect(cn("btn", isLarge ? "text-lg" : "text-sm")).toBe(
                "btn text-lg"
            );
        });
    });

    describe("Tailwind merge", () => {
        it("should merge conflicting padding classes", () => {
            // Tailwind merge should keep the last padding
            expect(cn("px-4", "px-8")).toBe("px-8");
        });

        it("should merge conflicting margin classes", () => {
            expect(cn("mt-2", "mt-4")).toBe("mt-4");
        });

        it("should merge conflicting text colors", () => {
            expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
        });

        it("should merge conflicting background colors", () => {
            expect(cn("bg-white", "bg-gray-100")).toBe("bg-gray-100");
        });

        it("should keep non-conflicting classes", () => {
            expect(cn("px-4", "py-2", "text-lg")).toBe("px-4 py-2 text-lg");
        });

        it("should merge responsive variants correctly", () => {
            expect(cn("md:px-4", "md:px-8")).toBe("md:px-8");
        });

        it("should not merge different responsive variants", () => {
            const result = cn("sm:px-4", "md:px-8");
            expect(result).toContain("sm:px-4");
            expect(result).toContain("md:px-8");
        });
    });

    describe("object syntax", () => {
        it("should handle object with true values", () => {
            expect(cn({ "px-4": true, "py-2": true })).toBe("px-4 py-2");
        });

        it("should handle object with false values", () => {
            expect(cn({ "px-4": true, "py-2": false })).toBe("px-4");
        });

        it("should handle mixed object and string", () => {
            expect(cn("base", { active: true, disabled: false })).toBe(
                "base active"
            );
        });
    });

    describe("array syntax", () => {
        it("should handle array of classes", () => {
            expect(cn(["px-4", "py-2"])).toBe("px-4 py-2");
        });

        it("should handle nested arrays", () => {
            expect(cn(["px-4", ["py-2", "text-lg"]])).toBe("px-4 py-2 text-lg");
        });
    });

    describe("real-world examples", () => {
        it("should work for button component", () => {
            const isPrimary = true;
            const isDisabled = false;
            const result = cn(
                "px-4 py-2 rounded font-medium",
                isPrimary && "bg-blue-500 text-white",
                isDisabled && "opacity-50 cursor-not-allowed"
            );
            expect(result).toBe(
                "px-4 py-2 rounded font-medium bg-blue-500 text-white"
            );
        });

        it("should work for overriding component styles", () => {
            const baseStyles = "px-4 py-2 text-sm";
            const customStyles = "px-8 text-lg";
            expect(cn(baseStyles, customStyles)).toBe("py-2 px-8 text-lg");
        });
    });
});

// =========================================================================
// variants - class variance authority alternative
// =========================================================================
describe("variants", () => {
    describe("basic functionality", () => {
        it("should return base class only", () => {
            const styles = variants({
                base: "btn",
                variants: {},
            });

            expect(styles()).toBe("btn");
        });

        it("should apply default variants", () => {
            const styles = variants({
                base: "btn",
                variants: {
                    size: {
                        sm: "text-sm",
                        md: "text-base",
                        lg: "text-lg",
                    },
                },
                defaultVariants: {
                    size: "md",
                },
            });

            expect(styles()).toBe("btn text-base");
        });

        it("should override default variants", () => {
            const styles = variants({
                base: "btn",
                variants: {
                    size: {
                        sm: "text-sm",
                        md: "text-base",
                        lg: "text-lg",
                    },
                },
                defaultVariants: {
                    size: "md",
                },
            });

            expect(styles({ size: "lg" })).toBe("btn text-lg");
        });
    });

    describe("multiple variants", () => {
        const buttonStyles = variants({
            base: "px-4 py-2 rounded font-medium",
            variants: {
                variant: {
                    primary: "bg-blue-500 text-white",
                    secondary: "bg-gray-200 text-gray-800",
                    outline: "border border-gray-300 bg-transparent",
                },
                size: {
                    sm: "text-sm px-2 py-1",
                    md: "text-base",
                    lg: "text-lg px-6 py-3",
                },
            },
            defaultVariants: {
                variant: "primary",
                size: "md",
            },
        });

        it("should apply both default variants", () => {
            const result = buttonStyles();
            expect(result).toContain("bg-blue-500");
            expect(result).toContain("text-base");
        });

        it("should apply one variant and default for other", () => {
            const result = buttonStyles({ variant: "secondary" });
            expect(result).toContain("bg-gray-200");
            expect(result).toContain("text-base");
        });

        it("should apply both custom variants", () => {
            const result = buttonStyles({ variant: "outline", size: "lg" });
            expect(result).toContain("border");
            expect(result).toContain("text-lg");
        });
    });

    describe("className override", () => {
        it("should append custom className", () => {
            const styles = variants({
                base: "btn",
                variants: {
                    size: {
                        sm: "text-sm",
                    },
                },
            });

            expect(styles({ size: "sm", className: "mt-4" })).toBe(
                "btn text-sm mt-4"
            );
        });

        it("should merge conflicting className with Tailwind", () => {
            const styles = variants({
                base: "px-4",
                variants: {},
            });

            // className should override base
            expect(styles({ className: "px-8" })).toBe("px-8");
        });
    });

    describe("edge cases", () => {
        it("should handle no base class", () => {
            const styles = variants({
                variants: {
                    size: {
                        sm: "text-sm",
                    },
                },
            });

            expect(styles({ size: "sm" })).toBe("text-sm");
        });

        it("should handle empty variants object", () => {
            const styles = variants({
                base: "btn",
                variants: {},
            });

            expect(styles()).toBe("btn");
        });

        it("should handle undefined variant value", () => {
            const styles = variants({
                base: "btn",
                variants: {
                    size: {
                        sm: "text-sm",
                        md: "text-base",
                    },
                },
            });

            expect(styles({ size: undefined })).toBe("btn");
        });

        it("should handle empty props", () => {
            const styles = variants({
                base: "btn",
                variants: {
                    size: {
                        sm: "text-sm",
                    },
                },
            });

            expect(styles({})).toBe("btn");
        });

        it("should handle no defaultVariants", () => {
            const styles = variants({
                base: "btn",
                variants: {
                    variant: {
                        primary: "bg-blue-500",
                    },
                },
            });

            // Without default, no variant class applied
            expect(styles()).toBe("btn");
        });
    });

    describe("real-world examples", () => {
        it("should work for badge component", () => {
            const badgeStyles = variants({
                base: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                variants: {
                    variant: {
                        default: "bg-gray-100 text-gray-800",
                        success: "bg-green-100 text-green-800",
                        warning: "bg-yellow-100 text-yellow-800",
                        error: "bg-red-100 text-red-800",
                    },
                },
                defaultVariants: {
                    variant: "default",
                },
            });

            expect(badgeStyles({ variant: "success" })).toContain(
                "bg-green-100"
            );
            expect(badgeStyles({ variant: "error" })).toContain("bg-red-100");
        });

        it("should work for input component", () => {
            const inputStyles = variants({
                base: "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                variants: {
                    state: {
                        default: "border-gray-300 focus:ring-blue-500",
                        error: "border-red-500 focus:ring-red-500",
                        success: "border-green-500 focus:ring-green-500",
                    },
                    size: {
                        sm: "py-1 text-xs",
                        md: "py-2 text-sm",
                        lg: "py-3 text-base",
                    },
                },
                defaultVariants: {
                    state: "default",
                    size: "md",
                },
            });

            const result = inputStyles({ state: "error", size: "lg" });
            expect(result).toContain("border-red-500");
            expect(result).toContain("py-3");
        });
    });
});
