import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Admin Login | Grafiki",
    description: "Logowanie do panelu administracyjnego",
};

export default async function AdminAuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Check if already authenticated - redirect to admin panel
    const cookieStore = await cookies();
    const adminAuth = cookieStore.get("admin-auth");

    if (adminAuth?.value === "authenticated") {
        redirect("/admin");
    }

    // This layout doesn't require authentication - it's for auth pages
    // It prevents the parent (admin) layout from checking auth by rendering before it
    return <>{children}</>;
}
