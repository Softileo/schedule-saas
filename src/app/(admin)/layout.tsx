import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
    title: "Admin Panel | Grafiki",
    description: "Panel administracyjny",
};

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/logowanie");
    }

    // TODO: Dodać sprawdzanie roli admina gdy zostanie zaimplementowana
    // Tymczasowo wszyscy authenticated users mają dostęp

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-900">
                            Panel Administracyjny
                        </h1>
                        <a
                            href="/panel"
                            className="text-sm text-blue-600 hover:text-blue-700"
                        >
                            ← Powrót do panelu
                        </a>
                    </div>
                </div>
            </nav>
            <div className="container mx-auto px-4 py-8">{children}</div>
        </div>
    );
}
