"use client";

import { UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";
import { EmployeeInput } from "@/lib/validations/employee";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmailInput } from "@/components/common/form/email-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    EMPLOYMENT_TYPES,
    type EmploymentType,
} from "@/lib/constants/employment";

interface EmployeeFormFieldsProps {
    register: UseFormRegister<EmployeeInput>;
    errors: FieldErrors<EmployeeInput>;
    setValue: UseFormSetValue<EmployeeInput>;
    employmentType: EmploymentType;
    isLoading: boolean;
    showPlaceholders?: boolean;
}

/**
 * Shared form fields for employee add/edit dialogs.
 * Reduces duplication between AddEmployeeDialog and EditEmployeeDialog.
 */
export function EmployeeFormFields({
    register,
    errors,
    setValue,
    employmentType,
    isLoading,
    showPlaceholders = false,
}: EmployeeFormFieldsProps) {
    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">Imię</Label>
                    <Input
                        id="firstName"
                        placeholder={showPlaceholders ? "Jan" : undefined}
                        disabled={isLoading}
                        {...register("firstName")}
                    />
                    {errors.firstName && (
                        <p className="text-sm text-destructive">
                            {errors.firstName.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lastName">Nazwisko</Label>
                    <Input
                        id="lastName"
                        placeholder={showPlaceholders ? "Kowalski" : undefined}
                        disabled={isLoading}
                        {...register("lastName")}
                    />
                    {errors.lastName && (
                        <p className="text-sm text-destructive">
                            {errors.lastName.message}
                        </p>
                    )}
                </div>
            </div>

            <EmailInput
                label={showPlaceholders ? "Email (opcjonalnie)" : "Email"}
                placeholder={showPlaceholders ? "jan@example.com" : undefined}
                disabled={isLoading}
                error={errors.email}
                register={register("email")}
                optional={showPlaceholders}
            />

            <div className="space-y-2">
                <Label htmlFor="phone">
                    Telefon{showPlaceholders ? " (opcjonalnie)" : ""}
                </Label>
                <Input
                    id="phone"
                    type="tel"
                    placeholder={
                        showPlaceholders ? "+48 123 456 789" : undefined
                    }
                    disabled={isLoading}
                    {...register("phone")}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="employmentType">Wymiar etatu</Label>
                <Select
                    value={employmentType}
                    onValueChange={(value) =>
                        setValue("employmentType", value as EmploymentType)
                    }
                    disabled={isLoading}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Wybierz wymiar etatu" />
                    </SelectTrigger>
                    <SelectContent>
                        {EMPLOYMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                                {type.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {employmentType === "custom" && (
                <div className="space-y-2">
                    <Label htmlFor="customHours">Godziny dziennie</Label>
                    <Input
                        id="customHours"
                        type="number"
                        min="1"
                        max="12"
                        placeholder={showPlaceholders ? "np. 6" : undefined}
                        disabled={isLoading}
                        {...register("customHours", {
                            valueAsNumber: true,
                        })}
                    />
                    {errors.customHours && (
                        <p className="text-sm text-destructive">
                            {errors.customHours.message}
                        </p>
                    )}
                </div>
            )}
        </>
    );
}
