"use client";

import { createClient } from "@/lib/supabase/client";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import { Employee } from "@/types";
import { BaseDialog } from "@/components/common/dialogs";
import { DialogFooterActions } from "@/components/ui/dialog-footer-actions";
import { useAsyncAction } from "@/lib/hooks/use-async-action";

interface DeleteEmployeeDialogProps {
    employee: Employee;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteEmployeeDialog({
    employee,
    open,
    onOpenChange,
}: DeleteEmployeeDialogProps) {
    const { isLoading, execute: handleDelete } = useAsyncAction(
        async () => {
            const supabase = createClient();
            const { error } = await supabase
                .from("employees")
                .delete()
                .eq("id", employee.id);

            if (error) throw error;
        },
        {
            successMessage: "Pracownik został usunięty",
            errorMessagePrefix: "Nie udało się usunąć pracownika",
            onSuccess: () => onOpenChange(false),
        }
    );

    return (
        <BaseDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Usuń pracownika"
            description={
                <>
                    Czy na pewno chcesz usunąć pracownika{" "}
                    <strong>{getEmployeeFullName(employee)}</strong>? Ta akcja
                    jest nieodwracalna.
                </>
            }
        >
            <DialogFooterActions
                isLoading={isLoading}
                onCancel={() => onOpenChange(false)}
                submitLabel="Usuń"
                submitVariant="destructive"
                submitType="button"
                onSubmit={handleDelete}
            />
        </BaseDialog>
    );
}
