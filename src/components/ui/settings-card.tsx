"use client";

import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface SettingsCardProps {
    /** Tytuł karty */
    title: string;
    /** Opis karty (opcjonalny) */
    description?: string;
    /** Akcja w nagłówku (np. przycisk) */
    headerAction?: React.ReactNode;
    /** Zawartość karty */
    children: React.ReactNode;
    /** Dodatkowe klasy CSS dla karty */
    className?: string;
    /** Dodatkowe klasy CSS dla zawartości */
    contentClassName?: string;
    /** Czy zawartość ma padding */
    noPadding?: boolean;
}

/**
 * Karta ustawień z nagłówkiem i opcjonalną akcją
 *
 * @example
 * <SettingsCard
 *   title="Szablony zmian"
 *   description="Zarządzaj szablonami zmian"
 *   headerAction={<Button>Dodaj</Button>}
 * >
 *   <Table>...</Table>
 * </SettingsCard>
 */
export function SettingsCard({
    title,
    description,
    headerAction,
    children,
    className,
    contentClassName,
    noPadding = false,
}: SettingsCardProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{title}</CardTitle>
                        {description && (
                            <CardDescription>{description}</CardDescription>
                        )}
                    </div>
                    {headerAction}
                </div>
            </CardHeader>
            <CardContent className={cn(noPadding && "p-0", contentClassName)}>
                {children}
            </CardContent>
        </Card>
    );
}

interface SettingsSectionProps {
    /** Tytuł sekcji */
    title: string;
    /** Opis sekcji (opcjonalny) */
    description?: string;
    /** Zawartość sekcji */
    children: React.ReactNode;
    /** Dodatkowe klasy CSS */
    className?: string;
}

/**
 * Sekcja ustawień bez karty (do grupowania)
 */
export function SettingsSection({
    title,
    description,
    children,
    className,
}: SettingsSectionProps) {
    return (
        <div className={cn("space-y-4", className)}>
            <div>
                <h3 className="text-lg font-medium">{title}</h3>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}
