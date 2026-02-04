"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { TEMPLATE_COLORS, getRandomColor } from "@/lib/constants/colors";
import { DEFAULT_WEEKLY_OPENING_HOURS } from "@/lib/constants/time";
import { Building2, Clock, Users, CalendarDays } from "lucide-react";
import { logger } from "@/lib/utils/logger";
import { DAY_KEY_MAP } from "@/lib/constants/days";
import { timeToMinutes } from "@/lib/utils/date-helpers";
import { getTradingSundays } from "@/lib/api/holidays";
import { getShiftValidationError } from "@/lib/validations/shift-template";
import type {
    DayOfWeekEnum,
    OpeningHours,
    DayOpeningHours,
    Json,
} from "@/types";
import { generateSlug } from "@/lib/validations/organization";

// Wydzielone komponenty kroków
import {
    OrganizationStep,
    OpeningHoursStep,
    EmployeesStep,
    ShiftTemplatesStep,
    WizardProgress,
    WizardNavigation,
} from "./wizard";
import type { Employee, ShiftTemplate, EmploymentType } from "./wizard";

// Helper to validate if all shifts together cover opening hours for each day
function validateAllShiftsCoverage(
    templates: ShiftTemplate[],
    openingHours: OpeningHours,
): string | null {
    const validTemplates = templates.filter((t) => t.startTime && t.endTime);
    if (validTemplates.length === 0) return null;

    const uncoveredDays: { day: string; hours: string }[] = [];
    const labels: Record<string, string> = {
        sunday: "Nd",
        monday: "Pn",
        tuesday: "Wt",
        wednesday: "Śr",
        thursday: "Cz",
        friday: "Pt",
        saturday: "Sb",
    };

    const dayKeyToIndex: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
    };

    for (const [dayKey, dayHours] of Object.entries(openingHours)) {
        if (!dayHours.enabled) continue;

        const dayIndex = dayKeyToIndex[dayKey];
        const shiftsForDay = validTemplates.filter((t) =>
            t.applicableDays.includes(dayIndex),
        );

        if (shiftsForDay.length === 0) continue;

        const openMinutes = timeToMinutes(dayHours.open);
        let closeMinutes = timeToMinutes(dayHours.close);
        if (closeMinutes <= openMinutes) closeMinutes += 24 * 60;

        let earliestStart = Infinity;
        let latestEnd = 0;

        for (const shift of shiftsForDay) {
            const startMinutes = timeToMinutes(shift.startTime);
            let endMinutes = timeToMinutes(shift.endTime);
            if (endMinutes <= startMinutes) endMinutes += 24 * 60;

            earliestStart = Math.min(earliestStart, startMinutes);
            latestEnd = Math.max(latestEnd, endMinutes);
        }

        if (earliestStart > openMinutes || latestEnd < closeMinutes) {
            uncoveredDays.push({
                day: labels[dayKey],
                hours: `${dayHours.open}-${dayHours.close}`,
            });
        }
    }

    if (uncoveredDays.length > 0) {
        const details = uncoveredDays
            .map((d) => `${d.day} (${d.hours})`)
            .join(", ");
        return `Zmiany nie pokrywają godzin otwarcia: ${details}`;
    }

    return null;
}

const getDefaultTradingSundays = () =>
    getTradingSundays(new Date().getFullYear());

const STEPS = [
    { id: 1, title: "Organizacja", icon: Building2 },
    { id: 2, title: "Godziny", icon: Clock },
    { id: 3, title: "Pracownicy", icon: Users },
    { id: 4, title: "Zmiany", icon: CalendarDays },
];

export function OnboardingWizard() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1 - Organization
    const [orgName, setOrgName] = useState("");

    // Step 2 - Opening Hours
    const [openingHours, setOpeningHours] = useState<OpeningHours>(
        DEFAULT_WEEKLY_OPENING_HOURS,
    );
    const [sundayMode, setSundayMode] = useState<"all" | "custom">("custom");
    const [customSundays] = useState<string[]>(getDefaultTradingSundays());

    // Step 3 - Employees
    const [employees, setEmployees] = useState<Employee[]>([
        {
            id: "1",
            firstName: "",
            lastName: "",
            color: TEMPLATE_COLORS[0],
            employmentType: "full",
        },
    ]);

    // Step 4 - Shift Templates
    const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([
        {
            id: "1",
            startTime: "06:00",
            endTime: "14:00",
            minEmployees: 0,
            maxEmployees: 0,
            color: TEMPLATE_COLORS[0],
            assignedEmployees: [],
            applicableDays: [1, 2, 3, 4, 5],
        },
    ]);

    // Handlers for Opening Hours
    const updateOpeningHours = useCallback(
        (
            day: keyof OpeningHours,
            field: keyof DayOpeningHours,
            value: string | boolean,
        ) => {
            setOpeningHours((prev) => ({
                ...prev,
                [day]: { ...prev[day], [field]: value },
            }));
        },
        [],
    );

    // Handlers for Employees
    const addEmployee = useCallback(() => {
        const usedColors = employees.map((e) => e.color);
        setEmployees((prev) => [
            ...prev,
            {
                id: String(Date.now()),
                firstName: "",
                lastName: "",
                color: getRandomColor(usedColors),
                employmentType: "full" as EmploymentType,
            },
        ]);
    }, [employees]);

    const removeEmployee = useCallback(
        (id: string) => {
            if (employees.length > 1) {
                setEmployees((prev) => prev.filter((e) => e.id !== id));
            }
        },
        [employees.length],
    );

    const updateEmployee = useCallback(
        (id: string, field: keyof Employee, value: string | number) => {
            setEmployees((prev) =>
                prev.map((e) => {
                    if (e.id !== id) return e;
                    if (field === "employmentType" && value !== "custom") {
                        return {
                            ...e,
                            [field]: value as EmploymentType,
                            customHours: undefined,
                        };
                    }
                    return { ...e, [field]: value };
                }),
            );
        },
        [],
    );

    const batchImportEmployees = useCallback(
        (importedEmployees: Array<Omit<Employee, "id">>) => {
            setEmployees(
                importedEmployees.map((emp, index) => ({
                    ...emp,
                    id: String(Date.now() + index),
                })),
            );
        },
        [],
    );

    // Handlers for Shift Templates
    const addShiftTemplate = useCallback(() => {
        const usedColors = shiftTemplates.map((t) => t.color);
        setShiftTemplates((prev) => [
            ...prev,
            {
                id: String(Date.now()),
                startTime: "10:00",
                endTime: "18:00",
                minEmployees: 0,
                maxEmployees: 0,
                color: getRandomColor(usedColors),
                assignedEmployees: [],
                applicableDays: [1, 2, 3, 4, 5],
            },
        ]);
    }, [shiftTemplates]);

    const removeShiftTemplate = useCallback(
        (id: string) => {
            if (shiftTemplates.length > 1) {
                setShiftTemplates((prev) => prev.filter((t) => t.id !== id));
            }
        },
        [shiftTemplates.length],
    );

    const updateShiftTemplate = useCallback(
        (
            id: string,
            field: keyof ShiftTemplate,
            value: string | string[] | number | number[],
        ) => {
            setShiftTemplates((prev) =>
                prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
            );
        },
        [],
    );

    const toggleDayForTemplate = useCallback(
        (templateId: string, dayIndex: number) => {
            setShiftTemplates((prev) =>
                prev.map((t) => {
                    if (t.id !== templateId) return t;
                    const isSelected = t.applicableDays.includes(dayIndex);
                    return {
                        ...t,
                        applicableDays: isSelected
                            ? t.applicableDays.filter((d) => d !== dayIndex)
                            : [...t.applicableDays, dayIndex].sort(
                                  (a, b) => a - b,
                              ),
                    };
                }),
            );
        },
        [],
    );

    const toggleEmployeeAssignment = useCallback(
        (templateId: string, employeeId: string) => {
            setShiftTemplates((prev) =>
                prev.map((t) => {
                    if (t.id !== templateId) return t;
                    const isAssigned = t.assignedEmployees.includes(employeeId);
                    return {
                        ...t,
                        assignedEmployees: isAssigned
                            ? t.assignedEmployees.filter(
                                  (id) => id !== employeeId,
                              )
                            : [...t.assignedEmployees, employeeId],
                    };
                }),
            );
        },
        [],
    );

    // Validation
    const canProceed = useCallback(() => {
        switch (currentStep) {
            case 1:
                return orgName.trim().length >= 2;
            case 2:
                return Object.values(openingHours).some((day) => day.enabled);
            case 3:
                return employees.some(
                    (e) => e.firstName.trim() && e.lastName.trim(),
                );
            case 4: {
                const hasValidTemplate = shiftTemplates.some(
                    (t) => t.startTime && t.endTime,
                );
                if (!hasValidTemplate) return false;
                const hasErrors = shiftTemplates.some(
                    (t) => getShiftValidationError(t, openingHours) !== null,
                );
                return !hasErrors;
            }
            default:
                return true;
        }
    }, [currentStep, orgName, openingHours, employees, shiftTemplates]);

    // Save everything
    const handleComplete = async () => {
        const coverageError = validateAllShiftsCoverage(
            shiftTemplates,
            openingHours,
        );
        if (coverageError) {
            toast.error(coverageError);
            return;
        }

        setIsLoading(true);

        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                toast.error("Błąd autoryzacji");
                return;
            }

            // 1. Create organization
            const slug = generateSlug(orgName) + "-" + Date.now().toString(36);
            const { data: org, error: orgError } = await supabase
                .from("organizations")
                .insert({ name: orgName.trim(), slug, owner_id: user.id })
                .select()
                .single();

            if (orgError) {
                logger.error("Error creating organization:", orgError);
                throw new Error(
                    orgError.message || "Błąd tworzenia organizacji",
                );
            }
            if (!org) {
                throw new Error("Nie udało się utworzyć organizacji");
            }

            // 2. Add user as member
            const { error: memberError } = await supabase
                .from("organization_members")
                .insert({
                    organization_id: org.id,
                    user_id: user.id,
                });

            if (memberError) {
                logger.error("Error adding member:", memberError);
                throw new Error(
                    memberError.message || "Błąd dodawania członka organizacji",
                );
            }

            // 3. Save opening hours and Sunday settings
            const { error: settingsError } = await supabase
                .from("organization_settings")
                .upsert({
                    organization_id: org.id,
                    opening_hours: openingHours as unknown as Json,
                    trading_sundays_mode: openingHours.sunday?.enabled
                        ? sundayMode === "all"
                            ? "all"
                            : "custom"
                        : "none",
                    custom_trading_sundays:
                        openingHours.sunday?.enabled && sundayMode === "custom"
                            ? customSundays
                            : null,
                    enable_trading_sundays:
                        openingHours.sunday?.enabled ?? false,
                });

            if (settingsError) {
                logger.error("Error saving settings:", settingsError);
                throw new Error(
                    settingsError.message || "Błąd zapisywania ustawień",
                );
            }

            // 4. Create employees
            const validEmployees = employees.filter(
                (e) => e.firstName.trim() && e.lastName.trim(),
            );
            const employeeIdMap = new Map<string, string>();

            for (const emp of validEmployees) {
                const { data: newEmp, error: empError } = await supabase
                    .from("employees")
                    .insert({
                        organization_id: org.id,
                        first_name: emp.firstName.trim(),
                        last_name: emp.lastName.trim(),
                        color: emp.color,
                        employment_type: emp.employmentType,
                        custom_hours:
                            emp.employmentType === "custom"
                                ? emp.customHours
                                : null,
                    })
                    .select()
                    .single();

                if (empError) {
                    logger.error(
                        `Error creating employee ${emp.firstName} ${emp.lastName}:`,
                        empError,
                    );
                    // Kontynuuj mimo błędu dla pojedynczego pracownika
                    continue;
                }

                if (newEmp) {
                    employeeIdMap.set(emp.id, newEmp.id);
                }
            }

            // 5. Create shift templates
            const validTemplates = shiftTemplates.filter(
                (t) => t.startTime && t.endTime,
            );

            for (const template of validTemplates) {
                const applicableDaysEnum: DayOfWeekEnum[] | null =
                    template.applicableDays.length > 0
                        ? template.applicableDays.map(
                              (idx) => DAY_KEY_MAP[idx] as DayOfWeekEnum,
                          )
                        : null;

                const generatedName = `${template.startTime}-${template.endTime}`;

                const { data: newTemplate, error: templateError } =
                    await supabase
                        .from("shift_templates")
                        .insert({
                            organization_id: org.id,
                            name: generatedName,
                            start_time: template.startTime,
                            end_time: template.endTime,
                            color: template.color,
                            break_minutes: 0, // Przerwy usunięte - zawsze 0
                            min_employees: template.minEmployees || 0,
                            max_employees:
                                template.maxEmployees &&
                                template.maxEmployees > 0
                                    ? template.maxEmployees
                                    : null,
                            applicable_days: applicableDaysEnum,
                        })
                        .select()
                        .single();

                if (templateError) {
                    logger.error(
                        `Error creating template ${generatedName}:`,
                        templateError,
                    );
                    // Kontynuuj mimo błędu dla pojedynczego szablonu
                    continue;
                }

                // 6. Create template assignments
                if (newTemplate && template.assignedEmployees.length > 0) {
                    const assignments = template.assignedEmployees
                        .map((localId) => employeeIdMap.get(localId))
                        .filter((id): id is string => id !== undefined)
                        .map((employeeId) => ({
                            template_id: newTemplate.id,
                            employee_id: employeeId,
                        }));

                    if (assignments.length > 0) {
                        const { error: assignError } = await supabase
                            .from("shift_template_assignments")
                            .insert(assignments);

                        if (assignError) {
                            logger.error(
                                "Error saving template assignments:",
                                assignError,
                            );
                        }
                    }
                }
            }

            // 7. Mark onboarding as completed
            await supabase
                .from("profiles")
                .update({ onboarding_completed: true })
                .eq("id", user.id);

            toast.success("Konfiguracja zakończona!");
            router.push(`/grafik?org=${org.slug}`);
            router.refresh();
        } catch (error) {
            logger.error("Onboarding error:", error);
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Wystąpił błąd podczas zapisywania";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Render current step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <OrganizationStep
                        orgName={orgName}
                        onOrgNameChange={setOrgName}
                    />
                );
            case 2:
                return (
                    <OpeningHoursStep
                        openingHours={openingHours}
                        sundayMode={sundayMode}
                        customSundaysCount={customSundays.length}
                        onUpdateOpeningHours={updateOpeningHours}
                        onSundayModeChange={setSundayMode}
                    />
                );
            case 3:
                return (
                    <EmployeesStep
                        employees={employees}
                        onAddEmployee={addEmployee}
                        onRemoveEmployee={removeEmployee}
                        onUpdateEmployee={updateEmployee}
                        onBatchImport={batchImportEmployees}
                    />
                );
            case 4:
                return (
                    <ShiftTemplatesStep
                        shiftTemplates={shiftTemplates}
                        employees={employees}
                        openingHours={openingHours}
                        sundayMode={sundayMode}
                        onAddShiftTemplate={addShiftTemplate}
                        onRemoveShiftTemplate={removeShiftTemplate}
                        onUpdateShiftTemplate={updateShiftTemplate}
                        onToggleDayForTemplate={toggleDayForTemplate}
                        onToggleEmployeeAssignment={toggleEmployeeAssignment}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen">
            <div className="py-4 sm:py-6 px-3 sm:px-6">
                <WizardProgress
                    steps={STEPS}
                    currentStep={currentStep}
                    onStepClick={setCurrentStep}
                />

                <div className="bg-transparent mt-4 sm:mt-6">
                    <div className="py-4 sm:py-6">
                        {renderStepContent()}

                        <div className="mt-6 sm:mt-8">
                            <WizardNavigation
                                currentStep={currentStep}
                                totalSteps={STEPS.length}
                                canProceed={canProceed()}
                                isLoading={isLoading}
                                onBack={() =>
                                    setCurrentStep((prev) => prev - 1)
                                }
                                onNext={() =>
                                    setCurrentStep((prev) => prev + 1)
                                }
                                onComplete={handleComplete}
                            />
                        </div>
                    </div>
                </div>

                <p className="text-center text-xs text-green-600 mt-4 px-4">
                    Wszystkie ustawienia możesz później zmienić w panelu
                </p>
            </div>
        </div>
    );
}
