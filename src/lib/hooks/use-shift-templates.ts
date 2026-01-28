"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { ShiftTemplate } from "@/types";
import { toast } from "sonner";

// Schema walidacji UUID dla bezpieczeństwa
const uuidSchema = z.string().uuid("Nieprawidłowy identyfikator");

export function useShiftTemplates() {
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] =
        useState<ShiftTemplate | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    function openCreateDialog() {
        setEditingTemplate(null);
        setDialogOpen(true);
    }

    function openEditDialog(template: ShiftTemplate) {
        setEditingTemplate(template);
        setDialogOpen(true);
    }

    async function handleDelete(templateId: string) {
        // Walidacja UUID przed operacją
        const validation = uuidSchema.safeParse(templateId);
        if (!validation.success) {
            toast.error("Nieprawidłowy identyfikator szablonu");
            return;
        }

        setDeletingId(templateId);

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("shift_templates")
                .delete()
                .eq("id", templateId);

            if (error) throw error;
            toast.success("Szablon został usunięty");
            router.refresh();
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error deleting template:", message);
            toast.error("Wystąpił błąd podczas usuwania");
        } finally {
            setDeletingId(null);
        }
    }

    return {
        dialogOpen,
        setDialogOpen,
        editingTemplate,
        deletingId,
        openCreateDialog,
        openEditDialog,
        handleDelete,
    };
}
