"use client";

import { useState, useMemo, useCallback } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { BaseDialog } from "@/components/common/dialogs";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplatePreviewGrid, PDF_TEMPLATES } from "../components/pdf";
import type { PDFTemplateType, SchedulePDFData } from "../components/pdf";
import type {
    Employee,
    ShiftTemplate,
    PublicHoliday,
    OrganizationSettings,
} from "@/types";
import type { LocalShift } from "../views/schedule-calendar-dnd";
import { MONTH_NAMES } from "@/lib/utils/date-helpers";
import { exportToExcel } from "../components/excel/excel-export";

interface ExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationName: string;
    year: number;
    month: number;
    employees: Employee[];
    shifts: LocalShift[];
    shiftTemplates: ShiftTemplate[];
    holidays: PublicHoliday[];
    organizationSettings: OrganizationSettings | null;
    employeeHours: Map<string, { scheduled: number; required: number }>;
}

export function ExportDialog({
    open,
    onOpenChange,
    organizationName,
    year,
    month,
    employees,
    shifts,
    shiftTemplates,
    holidays,
    organizationSettings,
    employeeHours,
}: ExportDialogProps) {
    const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
    const [selectedTemplate, setSelectedTemplate] =
        useState<PDFTemplateType>("classic");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
    const [isGenerating, setIsGenerating] = useState(false);

    // Przygotuj dane (wspólne dla PDF i Excel)
    const filteredData = useMemo(() => {
        const filteredEmployees =
            selectedEmployeeId === "all"
                ? employees
                : employees.filter((e) => e.id === selectedEmployeeId);

        const filteredShifts =
            selectedEmployeeId === "all"
                ? shifts
                : shifts.filter((s) => s.employee_id === selectedEmployeeId);

        return {
            employees: filteredEmployees,
            shifts: filteredShifts,
        };
    }, [employees, shifts, selectedEmployeeId]);

    // Dane specyficzne dla PDF
    const pdfData: SchedulePDFData = useMemo(() => {
        return {
            organizationName,
            year,
            month,
            employees: filteredData.employees,
            shifts: filteredData.shifts,
            shiftTemplates,
            holidays,
            organizationSettings,
            employeeHours,
        };
    }, [
        organizationName,
        year,
        month,
        filteredData.employees,
        filteredData.shifts,
        shiftTemplates,
        holidays,
        organizationSettings,
        employeeHours,
    ]);

    // Nazwa pliku PDF (Excel generuje nazwę wewnątrz funkcji, ale można to ujednolicić)
    const pdfFileName = useMemo(() => {
        const baseName = `grafik-${organizationName
            .toLowerCase()
            .replace(/\s+/g, "-")}-${MONTH_NAMES[
            month - 1
        ].toLowerCase()}-${year}`;

        if (selectedEmployeeId !== "all") {
            const emp = employees.find((e) => e.id === selectedEmployeeId);
            if (emp) {
                return `${baseName}-${emp.first_name.toLowerCase()}-${emp.last_name.toLowerCase()}.pdf`;
            }
        }
        return `${baseName}.pdf`;
    }, [organizationName, month, year, selectedEmployeeId, employees]);

    // Generowanie i pobieranie PDF
    const handleDownloadPDF = useCallback(async () => {
        setIsGenerating(true);

        try {
            // Dynamiczny import react-pdf i szablonów
            const [
                { pdf },
                { PDFTemplateClassic },
                { PDFTemplateColorful },
                { PDFTemplateMinimal },
            ] = await Promise.all([
                import("@react-pdf/renderer"),
                import("../components/pdf/pdf-template-classic"),
                import("../components/pdf/pdf-template-colorful"),
                import("../components/pdf/pdf-template-minimal"),
            ]);

            // Wybierz odpowiedni szablon
            let PDFDocument;
            switch (selectedTemplate) {
                case "classic":
                    PDFDocument = <PDFTemplateClassic data={pdfData} />;
                    break;
                case "colorful":
                    PDFDocument = <PDFTemplateColorful data={pdfData} />;
                    break;
                case "minimal":
                    PDFDocument = <PDFTemplateMinimal data={pdfData} />;
                    break;
                default:
                    PDFDocument = <PDFTemplateClassic data={pdfData} />;
            }

            // Generuj PDF blob
            const blob = await pdf(PDFDocument).toBlob();

            // Download file
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = pdfFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Close dialog after download
            onOpenChange(false);
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error generating PDF:", message);
        } finally {
            setIsGenerating(false);
        }
    }, [selectedTemplate, pdfData, pdfFileName, onOpenChange]);

    const handleDownloadExcel = useCallback(async () => {
        setIsGenerating(true);
        try {
            exportToExcel({
                organizationName,
                year,
                month,
                employees: filteredData.employees,
                shifts: filteredData.shifts,
                holidays,
            });
            onOpenChange(false);
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error("Error generating Excel:", message);
        } finally {
            setIsGenerating(false);
        }
    }, [organizationName, year, month, filteredData, holidays, onOpenChange]);

    const handleDownload = () => {
        if (exportFormat === "pdf") {
            handleDownloadPDF();
        } else {
            handleDownloadExcel();
        }
    };

    return (
        <BaseDialog
            open={open}
            onOpenChange={onOpenChange}
            title={"Eksportuj grafik"}
            description={`Pobierz grafik pracy w formacie PDF lub Excel dla ${
                MONTH_NAMES[month - 1]
            } ${year}.`}
            maxWidth="3xl"
        >
            <div className="py-4 space-y-6">
                <Tabs
                    value={exportFormat}
                    onValueChange={(v) => setExportFormat(v as "pdf" | "excel")}
                >
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="pdf">PDF (do druku)</TabsTrigger>
                        <TabsTrigger value="excel">
                            Excel (do edycji)
                        </TabsTrigger>
                    </TabsList>

                    <div className="space-y-4">
                        <div className="space-y-3">
                            <Label>Zakres pracowników</Label>
                            <Select
                                value={selectedEmployeeId}
                                onValueChange={setSelectedEmployeeId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Wybierz pracownika" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Wszyscy pracownicy
                                    </SelectItem>
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.first_name} {emp.last_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <TabsContent value="pdf" className="mt-0 space-y-3 ">
                            <Label>Wybierz szablon PDF</Label>
                            <TemplatePreviewGrid
                                selectedTemplate={selectedTemplate}
                                onSelectTemplate={setSelectedTemplate}
                                templates={PDF_TEMPLATES}
                            />
                        </TabsContent>

                        <TabsContent value="excel" className="mt-0">
                            <div className="p-4 border rounded-md bg-muted/20 text-sm text-muted-foreground flex items-start gap-3">
                                <FileSpreadsheet className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-foreground mb-1">
                                        Eksport do Excela (.xlsx)
                                    </p>
                                    <p>
                                        Plik będzie zawierał zestawienie godzin
                                        i harmonogram dla wybranych pracowników
                                        w układzie tabelarycznym, gotowym do
                                        dalszej obróbki.
                                    </p>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Anuluj
                </Button>
                <Button onClick={handleDownload} disabled={isGenerating}>
                    {isGenerating ? (
                        <>
                            <Spinner withMargin />
                            Generowanie...
                        </>
                    ) : (
                        <>
                            {exportFormat === "pdf" ? (
                                <FileDown className="mr-2 h-4 w-4" />
                            ) : (
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                            )}
                            {exportFormat === "pdf"
                                ? "Pobierz PDF"
                                : "Pobierz Excel"}
                        </>
                    )}
                </Button>
            </DialogFooter>
        </BaseDialog>
    );
}
