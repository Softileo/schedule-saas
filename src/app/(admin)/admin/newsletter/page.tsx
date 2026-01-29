"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Mail,
    Plus,
    Trash2,
    Send,
    Users,
    FileText,
    Loader2,
} from "lucide-react";

interface Subscriber {
    id: string;
    email: string;
    full_name: string | null;
    subscribed_at: string | null;
    is_active: boolean;
}

interface Campaign {
    id: string;
    title: string;
    subject: string;
    content: string;
    sent_at: string | null;
    status: string;
    recipients_count: number;
    created_at: string | null;
}

export default function NewsletterAdminPage() {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"subscribers" | "campaigns">(
        "subscribers",
    );

    // Stan formularza subskrybenta
    const [newEmail, setNewEmail] = useState("");
    const [newFullName, setNewFullName] = useState("");

    // Stan formularza kampanii
    const [campaignTitle, setCampaignTitle] = useState("");
    const [campaignSubject, setCampaignSubject] = useState("");
    const [campaignContent, setCampaignContent] = useState("");
    const [sending, setSending] = useState(false);

    const supabase = createClient();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Załaduj subskrybentów
            const { data: subsData, error: subsError } = await supabase
                .from("newsletter_subscribers")
                .select("*")
                .order("subscribed_at", { ascending: false });

            if (subsError) throw subsError;
            setSubscribers(subsData || []);

            // Załaduj kampanie
            const { data: campaignsData, error: campaignsError } =
                await supabase
                    .from("newsletter_campaigns")
                    .select("*")
                    .order("created_at", { ascending: false });

            if (campaignsError) throw campaignsError;
            setCampaigns(campaignsData || []);
        } catch (error) {
            logger.error("Error loading newsletter data:", error);
            toast.error("Nie udało się załadować danych");
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const addSubscriber = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail) return;

        try {
            const { error } = await supabase
                .from("newsletter_subscribers")
                .insert({
                    email: newEmail,
                    full_name: newFullName || null,
                    source: "admin",
                });

            if (error) throw error;

            toast.success("Dodano subskrybenta");
            setNewEmail("");
            setNewFullName("");
            loadData();
        } catch (error: unknown) {
            logger.error("Error adding subscriber:", error);
            if (
                error &&
                typeof error === "object" &&
                "code" in error &&
                error.code === "23505"
            ) {
                toast.error("Ten email już istnieje");
            } else {
                toast.error("Nie udało się dodać subskrybenta");
            }
        }
    };

    const deleteSubscriber = async (id: string) => {
        if (!confirm("Czy na pewno chcesz usunąć tego subskrybenta?")) return;

        try {
            const { error } = await supabase
                .from("newsletter_subscribers")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast.success("Usunięto subskrybenta");
            loadData();
        } catch (error) {
            logger.error("Error deleting subscriber:", error);
            toast.error("Nie udało się usunąć subskrybenta");
        }
    };

    const sendNewsletter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!campaignTitle || !campaignSubject || !campaignContent) {
            toast.error("Wypełnij wszystkie pola");
            return;
        }

        setSending(true);
        try {
            const activeSubscribers = subscribers.filter((s) => s.is_active);

            if (activeSubscribers.length === 0) {
                toast.error("Brak aktywnych subskrybentów");
                setSending(false);
                return;
            }

            // Zapisz kampanię
            const { data: campaign, error: campaignError } = await supabase
                .from("newsletter_campaigns")
                .insert({
                    title: campaignTitle,
                    subject: campaignSubject,
                    content: campaignContent,
                    status: "sending",
                    recipients_count: activeSubscribers.length,
                })
                .select()
                .single();

            if (campaignError) throw campaignError;

            // Wyślij emaile (wywołaj API endpoint)
            const response = await fetch("/api/admin/send-newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    campaignId: campaign.id,
                    subject: campaignSubject,
                    content: campaignContent,
                    recipients: activeSubscribers.map((s) => ({
                        email: s.email,
                        name: s.full_name,
                    })),
                }),
            });

            if (!response.ok) throw new Error("Failed to send newsletter");

            // Zaktualizuj status kampanii
            await supabase
                .from("newsletter_campaigns")
                .update({ status: "sent", sent_at: new Date().toISOString() })
                .eq("id", campaign.id);

            toast.success(
                `Newsletter wysłany do ${activeSubscribers.length} odbiorców`,
            );
            setCampaignTitle("");
            setCampaignSubject("");
            setCampaignContent("");
            loadData();
        } catch (error) {
            logger.error("Error sending newsletter:", error);
            toast.error("Nie udało się wysłać newslettera");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    Newsletter
                </h1>
                <p className="text-slate-600">
                    Zarządzaj subskrybentami i wysyłaj kampanie emailowe
                </p>
            </div>

            {/* Statystyki */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">
                                Subskrybenci
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                                {subscribers.filter((s) => s.is_active).length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Kampanie</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {campaigns.length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Mail className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Wysłane</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {
                                    campaigns.filter((c) => c.status === "sent")
                                        .length
                                }
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Zakładki */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("subscribers")}
                    className={`px-4 py-2 font-medium transition-colors ${
                        activeTab === "subscribers"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                    Subskrybenci ({subscribers.length})
                </button>
                <button
                    onClick={() => setActiveTab("campaigns")}
                    className={`px-4 py-2 font-medium transition-colors ${
                        activeTab === "campaigns"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                    Kampanie ({campaigns.length})
                </button>
            </div>

            {/* Subskrybenci */}
            {activeTab === "subscribers" && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">
                            Dodaj subskrybenta
                        </h2>
                        <form onSubmit={addSubscriber} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="email">
                                        Email{" "}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) =>
                                            setNewEmail(e.target.value)
                                        }
                                        placeholder="email@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="fullName">
                                        Imię i nazwisko
                                    </Label>
                                    <Input
                                        id="fullName"
                                        type="text"
                                        value={newFullName}
                                        onChange={(e) =>
                                            setNewFullName(e.target.value)
                                        }
                                        placeholder="Jan Kowalski"
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full md:w-auto">
                                <Plus className="h-4 w-4 mr-2" />
                                Dodaj subskrybenta
                            </Button>
                        </form>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">
                            Lista subskrybentów
                        </h2>
                        <div className="space-y-2">
                            {subscribers.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">
                                    Brak subskrybentów
                                </p>
                            ) : (
                                subscribers.map((subscriber) => (
                                    <div
                                        key={subscriber.id}
                                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {subscriber.full_name ||
                                                    "Brak imienia"}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {subscriber.email}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {subscriber.subscribed_at
                                                    ? new Date(
                                                          subscriber.subscribed_at,
                                                      ).toLocaleDateString(
                                                          "pl-PL",
                                                      )
                                                    : "Brak daty"}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                deleteSubscriber(subscriber.id)
                                            }
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Kampanie */}
            {activeTab === "campaigns" && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">
                            Wyślij nową kampanię
                        </h2>
                        <form onSubmit={sendNewsletter} className="space-y-4">
                            <div>
                                <Label htmlFor="title">
                                    Tytuł kampanii{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    type="text"
                                    value={campaignTitle}
                                    onChange={(e) =>
                                        setCampaignTitle(e.target.value)
                                    }
                                    placeholder="Newsletter styczeń 2026"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="subject">
                                    Temat email{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="subject"
                                    type="text"
                                    value={campaignSubject}
                                    onChange={(e) =>
                                        setCampaignSubject(e.target.value)
                                    }
                                    placeholder="Nowości w Grafiki - Styczeń 2026"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="content">
                                    Treść email{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="content"
                                    value={campaignContent}
                                    onChange={(e) =>
                                        setCampaignContent(e.target.value)
                                    }
                                    placeholder="Treść newslettera..."
                                    rows={10}
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Możesz użyć HTML do formatowania treści
                                </p>
                            </div>
                            <Button
                                type="submit"
                                disabled={sending}
                                className="w-full md:w-auto"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Wysyłanie...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Wyślij newsletter
                                    </>
                                )}
                            </Button>
                        </form>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">
                            Historia kampanii
                        </h2>
                        <div className="space-y-2">
                            {campaigns.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">
                                    Brak kampanii
                                </p>
                            ) : (
                                campaigns.map((campaign) => (
                                    <div
                                        key={campaign.id}
                                        className="p-4 bg-slate-50 rounded-lg"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-900">
                                                    {campaign.title}
                                                </p>
                                                <p className="text-sm text-slate-600">
                                                    {campaign.subject}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded ${
                                                            campaign.status ===
                                                            "sent"
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-yellow-100 text-yellow-700"
                                                        }`}
                                                    >
                                                        {campaign.status}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {
                                                            campaign.recipients_count
                                                        }{" "}
                                                        odbiorców
                                                    </span>
                                                    {campaign.sent_at && (
                                                        <span className="text-xs text-slate-500">
                                                            {new Date(
                                                                campaign.sent_at,
                                                            ).toLocaleDateString(
                                                                "pl-PL",
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
