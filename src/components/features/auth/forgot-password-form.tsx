"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { resetPasswordSchema } from "@/lib/validations/auth";

type FormValues = z.infer<typeof resetPasswordSchema>;

export function ForgotPasswordForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    async function onSubmit(values: FormValues) {
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Wystąpił błąd");
            }

            setEmailSent(true);
            toast.success(
                "Kod do resetowania hasła został wysłany na podany adres email"
            );
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Nie udało się wysłać linku resetującego"
            );
        } finally {
            setIsLoading(false);
        }
    }

    if (emailSent) {
        return (
            <div className="space-y-6 text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Mail className="w-8 h-8 text-green-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Sprawdź swoją skrzynkę email
                    </h2>
                    <p className="text-slate-600">
                        Wysłaliśmy kod weryfikacyjny (6 cyfr) na adres{" "}
                        <strong>{form.getValues("email")}</strong>
                    </p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-left">
                    <p className="font-medium text-blue-900 mb-1">
                        Nie otrzymałeś email?
                    </p>
                    <ul className="text-blue-800 space-y-1 ml-4 list-disc">
                        <li>Sprawdź folder spam/junk</li>
                        <li>Poczekaj kilka minut</li>
                        <li>Upewnij się, że podałeś prawidłowy adres email</li>
                    </ul>
                </div>
                <Button asChild className="w-full">
                    <Link
                        href={`/reset-hasla?email=${encodeURIComponent(
                            form.getValues("email")
                        )}`}
                    >
                        Wprowadź kod i zmień hasło
                    </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                    <Link href="/logowanie">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Wróć do logowania
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Zapomniałeś hasła?
                </h2>
                <p className="text-slate-600">
                    Podaj adres email, a wyślemy Ci kod weryfikacyjny do
                    resetowania hasła.
                </p>
            </div>

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Adres email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="twoj@email.pl"
                                        {...field}
                                        disabled={isLoading}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Wysyłanie...
                            </>
                        ) : (
                            "Wyślij kod weryfikacyjny"
                        )}
                    </Button>
                </form>
            </Form>

            <div className="text-center">
                <Link
                    href="/logowanie"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                    <ArrowLeft className="w-3 h-3" />
                    Wróć do logowania
                </Link>
            </div>
        </div>
    );
}
