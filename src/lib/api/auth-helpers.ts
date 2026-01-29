import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Wspólna funkcja do sprawdzania autoryzacji użytkownika
 * @returns Tuple: [user, supabase] lub NextResponse z błędem
 */
export async function checkUserAuth(): Promise<
    | [user: { id: string; email?: string }, supabase: SupabaseClient]
    | NextResponse
> {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json(
            { error: "Brak autoryzacji" },
            { status: 401 },
        );
    }

    return [user, supabase];
}

/**
 * Sprawdza czy użytkownik ma dostęp do organizacji
 * @param supabase - klient Supabase
 * @param userId - ID użytkownika
 * @param organizationId - ID organizacji
 * @returns true jeśli ma dostęp, false jeśli nie
 */
export async function checkOrganizationAccess(
    supabase: SupabaseClient,
    userId: string,
    organizationId: string,
): Promise<boolean> {
    const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .single();

    return !!membership;
}

/**
 * Sprawdza czy użytkownik ma dostęp do organizacji i zwraca błąd jeśli nie
 * @param supabase - klient Supabase
 * @param userId - ID użytkownika
 * @param organizationId - ID organizacji
 * @returns NextResponse z błędem lub null jeśli ma dostęp
 */
export async function verifyOrganizationAccess(
    supabase: SupabaseClient,
    userId: string,
    organizationId: string,
): Promise<NextResponse | null> {
    const hasAccess = await checkOrganizationAccess(
        supabase,
        userId,
        organizationId,
    );

    if (!hasAccess) {
        return NextResponse.json(
            { error: "Brak dostępu do tej organizacji" },
            { status: 403 },
        );
    }

    return null;
}

/**
 * Interfejs dla kodu weryfikacyjnego
 */
export interface VerificationCode {
    id: string;
    email: string;
    code: string;
    type: "email_verification" | "password_reset";
    expires_at: string;
    created_at: string;
}

/**
 * Sprawdza kod weryfikacyjny w bazie danych
 * @param email - adres email
 * @param code - kod weryfikacyjny
 * @param type - typ kodu (email_verification lub password_reset)
 * @returns Kod weryfikacyjny lub NextResponse z błędem
 */
export async function verifyCode(
    email: string,
    code: string,
    type: VerificationCode["type"],
): Promise<VerificationCode | NextResponse> {
    const supabase = await createServiceClient();

    const { data: verificationCode, error: codeError } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("email", email)
        .eq("code", code)
        .eq("type", type)
        .single();

    if (codeError || !verificationCode) {
        return NextResponse.json(
            { error: "Nieprawidłowy kod weryfikacyjny" },
            { status: 400 },
        );
    }

    // Sprawdź czy kod nie wygasł
    if (new Date(verificationCode.expires_at) < new Date()) {
        await supabase
            .from("verification_codes")
            .delete()
            .eq("id", verificationCode.id);

        return NextResponse.json(
            { error: "Kod weryfikacyjny wygasł. Poproś o nowy kod." },
            { status: 400 },
        );
    }

    return verificationCode as VerificationCode;
}

/**
 * Usuwa kod weryfikacyjny z bazy danych
 * @param verificationCodeId - ID kodu weryfikacyjnego
 */
export async function deleteVerificationCode(
    verificationCodeId: string,
): Promise<void> {
    const supabase = await createServiceClient();
    await supabase
        .from("verification_codes")
        .delete()
        .eq("id", verificationCodeId);
}

/**
 * Znajduje użytkownika po adresie email
 * @param email - adres email
 * @returns Użytkownik lub NextResponse z błędem
 */
export async function findUserByEmail(
    email: string,
): Promise<{ id: string; email?: string } | NextResponse> {
    const supabase = await createServiceClient();
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find((u) => u.email === email);

    if (!user) {
        return NextResponse.json(
            { error: "Nie znaleziono użytkownika" },
            { status: 400 },
        );
    }

    return user;
}
