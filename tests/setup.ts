/**
 * =============================================================================
 * VITEST TEST SETUP
 * =============================================================================
 *
 * Konfiguracja środowiska testowego.
 * Ten plik jest automatycznie ładowany przed każdym testem.
 */

import "@testing-library/jest-dom";
import { vi, afterEach } from "vitest";

// =============================================================================
// MOCK: SUPABASE
// =============================================================================

const mockSupabaseClient = {
    auth: {
        getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn().mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
        }),
    },
    from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: vi.fn(),
    }),
};

vi.mock("@/lib/supabase/client", () => ({
    createClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
    createServiceClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// =============================================================================
// MOCK: NEXT.JS
// =============================================================================

vi.mock("next/navigation", () => ({
    useRouter: vi.fn(() => ({
        push: vi.fn(),
        replace: vi.fn(),
        refresh: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        prefetch: vi.fn(),
    })),
    useSearchParams: vi.fn(() => new URLSearchParams()),
    usePathname: vi.fn(() => "/"),
    redirect: vi.fn(),
    notFound: vi.fn(),
}));

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        getAll: vi.fn().mockReturnValue([]),
    })),
    headers: vi.fn(() => new Headers()),
}));

// =============================================================================
// MOCK: SONNER (TOASTS)
// =============================================================================

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    },
    Toaster: vi.fn(() => null),
}));

// =============================================================================
// GLOBAL TEST HELPERS
// =============================================================================

/**
 * Helper do tworzenia mocka pracownika
 */
export function createMockEmployee(overrides = {}) {
    return {
        id: "emp-1",
        organization_id: "org-1",
        first_name: "Jan",
        last_name: "Kowalski",
        email: "jan@example.com",
        phone: null,
        employment_type: "full" as const,
        custom_hours: null,
        color: "#3b82f6",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

/**
 * Helper do tworzenia mocka zmiany
 */
export function createMockShift(overrides = {}) {
    return {
        id: "shift-1",
        schedule_id: "schedule-1",
        employee_id: "emp-1",
        date: "2026-01-05",
        start_time: "08:00",
        end_time: "16:00",
        break_minutes: 30,
        notes: null,
        color: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

/**
 * Helper do tworzenia mocka organizacji
 */
export function createMockOrganization(overrides = {}) {
    return {
        id: "org-1",
        name: "Test Organization",
        slug: "test-org",
        description: null,
        owner_id: "user-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

/**
 * Helper do tworzenia mocka szablonu zmiany
 */
export function createMockShiftTemplate(overrides = {}) {
    return {
        id: "template-1",
        organization_id: "org-1",
        name: "Poranna",
        start_time: "06:00",
        end_time: "14:00",
        break_minutes: 30,
        color: "#22c55e",
        min_employees: 2,
        applicable_days: [1, 2, 3, 4, 5],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

// =============================================================================
// GLOBAL SETUP
// =============================================================================

// Wycisz console w testach (opcjonalne)
// beforeAll(() => {
//     vi.spyOn(console, 'log').mockImplementation(() => {});
//     vi.spyOn(console, 'warn').mockImplementation(() => {});
// });

// Cleanup po każdym teście
afterEach(() => {
    vi.clearAllMocks();
});
