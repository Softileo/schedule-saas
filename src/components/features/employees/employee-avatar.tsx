"use client";

import { cn } from "@/lib/utils";
import {
    getEmployeeColor,
    getEmployeeInitials,
} from "@/lib/core/employees/utils";

/**
 * Typ pracownika wymagany przez komponent
 */
interface EmployeeForAvatar {
    first_name: string;
    last_name: string;
    color?: string | null;
}

/**
 * Rozmiary avatara
 */
const sizeClasses = {
    micro: "w-3.5 h-3.5 text-[7px]",
    xxs: "w-4 h-4 text-[8px]",
    xs: "w-5 h-5 text-[10px]",
    sm: "w-6 h-6 text-xs",
    md: "w-7 h-7 text-sm",
    lg: "w-8 h-8 text-sm",
    xl: "w-10 h-10 text-base",
    "2xl": "w-12 h-12 text-sm",
} as const;

/**
 * Warianty kształtu
 */
const variantClasses = {
    circle: "rounded-full",
    rounded: "rounded-lg",
    square: "rounded",
} as const;

export interface EmployeeAvatarProps {
    /** Obiekt pracownika z danymi */
    employee: EmployeeForAvatar;
    /** Rozmiar avatara */
    size?: keyof typeof sizeClasses;
    /** Kształt avatara */
    variant?: keyof typeof variantClasses;
    /** Dodatkowe klasy CSS */
    className?: string;
    /** Czy pokazać imię obok avatara */
    showName?: boolean;
    /** Czy pokazać pełne imię i nazwisko (tylko gdy showName=true) */
    showFullName?: boolean;
}

/**
 * Komponent avatara pracownika
 *
 * Wyświetla kolorowy awatar z inicjałami pracownika.
 * Można opcjonalnie pokazać imię lub pełne imię i nazwisko.
 *
 * @example
 * <EmployeeAvatar employee={employee} />
 * <EmployeeAvatar employee={employee} size="lg" variant="circle" />
 * <EmployeeAvatar employee={employee} showName />
 */
export function EmployeeAvatar({
    employee,
    size = "md",
    variant = "rounded",
    className,
    showName = false,
    showFullName = false,
}: EmployeeAvatarProps) {
    const initials = getEmployeeInitials(employee);
    const color = getEmployeeColor(
        employee as Parameters<typeof getEmployeeColor>[0]
    );

    const avatar = (
        <div
            className={cn(
                "flex items-center justify-center text-white font-bold shrink-0",
                sizeClasses[size],
                variantClasses[variant],
                className
            )}
            style={{ backgroundColor: color }}
        >
            {initials}
        </div>
    );

    if (showName) {
        const name = showFullName
            ? `${employee.first_name} ${employee.last_name}`
            : employee.first_name;

        return (
            <div className="flex items-center gap-2">
                {avatar}
                <span className="truncate text-sm">{name}</span>
            </div>
        );
    }

    return avatar;
}
