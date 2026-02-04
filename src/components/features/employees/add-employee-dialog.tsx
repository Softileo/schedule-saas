"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, type EmployeeInput } from "@/lib/validations/employee";
import {
    getUsedEmployeeColors,
    createEmployee,
} from "@/lib/api/client-helpers";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { getUniqueEmployeeColor } from "@/lib/constants/colors";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { DialogFooterActions } from "@/components/ui/dialog-footer-actions";
import { Plus } from "lucide-react";
import { showToast } from "@/lib/utils/toast";
import { EmployeeFormFields } from "./employee-form-fields";

interface AddEmployeeDialogProps {
    organizationId: string;
    defaultOpen?: boolean;
}

export function AddEmployeeDialog({
    organizationId,
    defaultOpen = false,
}: AddEmployeeDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(defaultOpen);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<EmployeeInput>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            employmentType: "full",
            isSupervisor: false,
        },
    });

    const employmentType = watch("employmentType");

    async function onSubmit(data: EmployeeInput) {
        setIsLoading(true);

        try {
            // Pobierz kolory już używane przez pracowników w organizacji
            const usedColors = await getUsedEmployeeColors(organizationId);

            // Przypisz unikalny kolor
            const uniqueColor = getUniqueEmployeeColor(usedColors);

            const { error } = await createEmployee({
                organization_id: organizationId,
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email || null,
                phone: data.phone || null,
                employment_type: data.employmentType,
                custom_hours:
                    data.employmentType === "custom"
                        ? (data.customHours ?? null)
                        : null,
                color: uniqueColor,
                is_active: true,
                is_supervisor: data.isSupervisor ?? false,
                position: null,
            });

            if (error) throw error;

            showToast.created("pracownik");
            reset();
            setOpen(false);
            router.refresh();
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error adding employee:", message);
            showToast.createError("pracownika");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj pracownika
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Dodaj pracownika</DialogTitle>
                    <DialogDescription>
                        Wprowadź dane nowego pracownika
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <EmployeeFormFields
                        register={register}
                        errors={errors}
                        setValue={setValue}
                        watch={watch}
                        employmentType={employmentType}
                        isLoading={isLoading}
                        showPlaceholders
                    />

                    <DialogFooterActions
                        isLoading={isLoading}
                        onCancel={() => setOpen(false)}
                        submitLabel="Dodaj"
                    />
                </form>
            </DialogContent>
        </Dialog>
    );
}
