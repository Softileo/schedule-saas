import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AdminLogoutButton from "../../admin-logout-button";

export const metadata: Metadata = {
    title: "Admin Panel | Grafiki",
    description: "Panel administracyjny",
};

export default async function AdminProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const adminAuth = cookieStore.get("admin-auth");

    // Check if admin is authenticated
    if (adminAuth?.value !== "authenticated") {
        redirect("/admin/logowanie");
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-900">
                            Calenda Admin
                        </h1>
                        <div className="flex items-center gap-4">
                            <a
                                href="/admin"
                                className="text-sm text-blue-600 hover:text-blue-700"
                            >
                                ← Powrót do panelu
                            </a>
                            <AdminLogoutButton />
                        </div>
                    </div>
                </div>
            </nav>
            <div className="container mx-auto px-4 py-8">{children}</div>
        </div>
    );
}
