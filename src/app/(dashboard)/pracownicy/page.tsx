import { EmployeesList } from "@/components/features/employees/employees-list";
import { AddEmployeeDialog } from "@/components/features/employees/add-employee-dialog";
import { EmptyState } from "@/components/common/feedback";
import { Plus, Users } from "lucide-react";
import { getDashboardContext } from "@/lib/services/dashboard-context";
import { ROUTES } from "@/lib/constants/routes";

export default async function EmployeesPage({
    searchParams,
}: {
    searchParams: Promise<{ org?: string; action?: string }>;
}) {
    const params = await searchParams;
    const { supabase, currentOrg } = await getDashboardContext({
        orgSlug: params.org,
    });

    if (!currentOrg) {
        return (
            <div className="min-h-screen bg-[#f8fafc]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <EmptyState
                        icon={Users}
                        title="Brak organizacji"
                        description="Utwórz organizację, aby móc zarządzać pracownikami"
                        action={{
                            label: "Utwórz organizację",
                            href: ROUTES.USTAWIENIA_ORGANIZACJE,
                            icon: Plus,
                        }}
                        card
                        size="lg"
                    />
                </div>
            </div>
        );
    }

    // Pobierz pracowników
    const { data: employees } = await supabase
        .from("employees")
        .select("* , employee_absences (id)")
        .eq("organization_id", currentOrg.id)
        .order("last_name", { ascending: true });

    const showAddDialog = params.action === "new";
    const activeCount = employees?.filter((e) => e.is_active).length || 0;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                {/* Page Header */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-800">
                                Pracownicy
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">
                                {activeCount > 0 ? (
                                    <>
                                        <span className="font-medium text-slate-700">
                                            {activeCount}
                                        </span>{" "}
                                        {activeCount === 1
                                            ? "aktywny pracownik"
                                            : "aktywnych pracowników"}{" "}
                                        w {currentOrg.name}
                                    </>
                                ) : (
                                    <>Zarządzaj zespołem w {currentOrg.name}</>
                                )}
                            </p>
                        </div>
                        <AddEmployeeDialog
                            organizationId={currentOrg.id}
                            defaultOpen={showAddDialog}
                        />
                    </div>
                </div>

                {/* Employees List */}
                <EmployeesList
                    employees={employees || []}
                    organizationId={currentOrg.id}
                />
            </div>
        </div>
    );
}
