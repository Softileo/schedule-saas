"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, type EmployeeInput } from "@/lib/validations/employee";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { Employee } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseDialogForm } from "@/components/common/dialogs";
import { DialogFooterActions } from "@/components/ui/dialog-footer-actions";
import { Palette } from "lucide-react";
import { showToast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import {
    DEFAULT_EMPLOYEE_COLOR,
    getEmployeeInitials,
    getEmployeeFullName,
} from "@/lib/core/employees/utils";
import { PRESET_COLORS } from "@/lib/constants/colors";
import { EmployeeFormFields } from "./employee-form-fields";

interface EditEmployeeDialogProps {
    employee: Employee;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditEmployeeDialog({
    employee,
    open,
    onOpenChange,
}: EditEmployeeDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedColor, setSelectedColor] = useState(
        employee.color || DEFAULT_EMPLOYEE_COLOR,
    );

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<EmployeeInput>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            firstName: employee.first_name,
            lastName: employee.last_name,
            email: employee.email || "",
            phone: employee.phone || "",
            employmentType: employee.employment_type ?? "full",
            customHours: employee.custom_hours ?? undefined,
            isSupervisor: employee.is_supervisor ?? false,
        },
    });

    const employmentType = watch("employmentType");

    async function onSubmit(data: EmployeeInput) {
        setIsLoading(true);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("employees")
                .update({
                    first_name: data.firstName,
                    last_name: data.lastName,
                    email: data.email || null,
                    phone: data.phone || null,
                    employment_type: data.employmentType,
                    custom_hours:
                        data.employmentType === "custom"
                            ? data.customHours
                            : null,
                    color: selectedColor,
                    is_supervisor: data.isSupervisor ?? false,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", employee.id);

            if (error) throw error;

            showToast.updated("pracownik");
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error updating employee:", message);
            showToast.updateError("pracownika");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <BaseDialogForm
            open={open}
            onOpenChange={onOpenChange}
            title="Edytuj pracownika"
            description={`Zmień dane pracownika ${getEmployeeFullName(
                employee,
            )}`}
            maxWidth="lg"
            onSubmit={handleSubmit(onSubmit)}
        >
            <EmployeeFormFields
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                employmentType={employmentType}
                isLoading={isLoading}
            />

            {/* Color Picker */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <Label>Kolor pracownika</Label>
                </div>
                <div className="flex items-center gap-3">
                    <div
                        className="w-13 h-10 rounded-lg border-2 border-muted flex items-center justify-center text-white font-semibold text-sm shadow-sm"
                        style={{ backgroundColor: selectedColor }}
                    >
                        {getEmployeeInitials(employee)}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedColor(color)}
                                className={cn(
                                    "w-7 h-7 rounded-full transition-all hover:scale-110",
                                    selectedColor === color
                                        ? "ring-2 ring-offset-2 ring-primary"
                                        : "hover:ring-2 hover:ring-offset-1 hover:ring-muted-foreground/30",
                                )}
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-1 py-2">
                    <Label>Własny kolor</Label>
                    <Input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="h-10 w-24 p-1 cursor-pointer"
                        disabled={isLoading}
                    />
                </div>
            </div>

            <DialogFooterActions
                isLoading={isLoading}
                onCancel={() => onOpenChange(false)}
                submitLabel="Zapisz"
            />
        </BaseDialogForm>
    );
}
