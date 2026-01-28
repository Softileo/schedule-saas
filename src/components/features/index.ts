/**
 * =============================================================================
 * FEATURES COMPONENTS - Barrel Export
 * =============================================================================
 *
 * Feature-specific components organized by domain.
 */

// Auth
export * from "./auth/login-form";
export * from "./auth/register-form";
export * from "./auth/verify-code-form";
export * from "./auth/auth-screens";
export * from "./auth/google-button";

// Layout
export * from "./layout/header";
export * from "./layout/main-content";
export * from "./layout/Sidebar";
export * from "./layout/mobile-sidebar";
export * from "./layout/organization-switcher";

// Landing
export * from "./landing";

// Dashboard
export * from "./dashboard/quick-actions";
export * from "./dashboard/schedule-slider";
export * from "./dashboard/dashboard-empty-states";

// Schedule - główny eksport przez index
export * from "./schedule";

// Settings
export * from "./settings/settings-tabs";
export * from "./settings/profile-settings";
export * from "./settings/organization-settings";
export * from "./settings/organizations-settings";
export * from "./settings/shift-templates-settings";
export * from "./settings/opening-hours-editor";

// Setup
export * from "./setup/onboarding-wizard";
