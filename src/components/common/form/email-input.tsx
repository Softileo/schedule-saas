import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldError, Merge, FieldErrorsImpl } from "react-hook-form";

interface EmailInputProps {
    id?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
    register: any;
    optional?: boolean;
}

/**
 * Wspólny komponent dla pola email
 */
export function EmailInput({
    id = "email",
    label = "Email",
    placeholder = "jan@example.com",
    disabled,
    error,
    register,
    optional = false,
}: EmailInputProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>
                {label}
                {optional && " (opcjonalnie)"}
            </Label>
            <Input
                id={id}
                type="email"
                placeholder={placeholder}
                disabled={disabled}
                {...register}
            />
            {error && "message" in error && error.message && (
                <p className="text-sm text-destructive">
                    {String(error.message)}
                </p>
            )}
        </div>
    );
}
