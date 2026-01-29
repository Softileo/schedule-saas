import { z } from "zod";
import { emailField, passwordField } from "./shared";
import { passwordMatchRefine } from "./helpers";

export const loginSchema = z.object({
    email: emailField,
    password: passwordField,
});

export const registerSchema = passwordMatchRefine(
    z.object({
        fullName: z
            .string()
            .min(1, "Imię i nazwisko jest wymagane")
            .min(2, "Imię i nazwisko musi mieć minimum 2 znaki"),
        email: emailField,
        password: passwordField,
        confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
    }),
);

// Schemat dla API (bez confirmPassword)
export const registerApiSchema = z.object({
    fullName: z
        .string()
        .min(1, "Imię i nazwisko jest wymagane")
        .min(2, "Imię i nazwisko musi mieć minimum 2 znaki"),
    email: emailField,
    password: passwordField,
});

export const verifyCodeSchema = z.object({
    email: emailField,
    code: z
        .string()
        .min(6, "Kod musi mieć 6 cyfr")
        .max(6, "Kod musi mieć 6 cyfr")
        .regex(/^\d+$/, "Kod może zawierać tylko cyfry"),
});

// Password reset schema
export const resetPasswordSchema = z.object({
    email: emailField,
});

export const newPasswordSchema = passwordMatchRefine(
    z.object({
        password: passwordField,
        confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
    }),
);

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

// Aliasy dla zgodności
export type LoginInput = LoginFormData;
export type RegisterInput = RegisterFormData;
export type VerifyCodeInput = VerifyCodeFormData;
