"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Users } from "lucide-react";

interface TemplateDownloadDialogProps {
    /** The format to download: "pdf" or "csv" */
    format: "pdf" | "csv";
    /** Year for the template */
    year?: number;
    /** Month for the template (1-12), optional */
    month?: number;
    /** Trigger element */
    children: React.ReactNode;
}

export function TemplateDownloadDialog({
    format,
    year = 2026,
    month,
    children,
}: TemplateDownloadDialogProps) {
    const [open, setOpen] = useState(false);
    const [employeeCount, setEmployeeCount] = useState(10);

    const handleDownload = () => {
        const params = new URLSearchParams();
        params.set("year", String(year));
        if (month) params.set("month", String(month));
        params.set("employees", String(employeeCount));

        const url = `/api/schedule/template/${format}?${params.toString()}`;

        if (format === "pdf") {
            window.open(url, "_blank");
        } else {
            const link = document.createElement("a");
            link.href = url;
            link.download = "";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        setOpen(false);
    };

    return (
        <>
            <span onClick={() => setOpen(true)} className="contents">
                {children}
            </span>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            Pobierz szablon {format === "pdf" ? "PDF" : "CSV"}
                        </DialogTitle>
                        <DialogDescription>
                            Podaj liczbę pracowników, dla których chcesz
                            wygenerować szablon grafiku.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="employee-count">
                                Liczba pracowników
                            </Label>
                            <Input
                                id="employee-count"
                                type="number"
                                min={1}
                                max={50}
                                value={employeeCount}
                                onChange={(e) =>
                                    setEmployeeCount(
                                        Math.min(
                                            50,
                                            Math.max(
                                                1,
                                                parseInt(e.target.value) || 1,
                                            ),
                                        ),
                                    )
                                }
                                className="w-full"
                            />
                            <p className="text-xs text-gray-500">
                                Od 1 do 50 pracowników
                            </p>
                        </div>
                        <Button
                            onClick={handleDownload}
                            className="w-full"
                            disabled={employeeCount < 1 || employeeCount > 50}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {format === "pdf"
                                ? "Otwórz do druku"
                                : "Pobierz szablon"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
