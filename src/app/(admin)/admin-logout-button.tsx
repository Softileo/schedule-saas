"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogoutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/auth", {
                method: "DELETE",
            });

            if (response.ok) {
                router.push("/admin/logowanie");
                router.refresh();
            }
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
        >
            {loading ? "Wylogowywanie..." : "Wyloguj"}
        </button>
    );
}
