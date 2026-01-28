import Link from "next/link";
import { Mail, Calendar, Newspaper } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AdminPage() {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">
                Panel Administracyjny
            </h1>

            <div className="grid gap-6 md:grid-cols-2">
                <Link href="/admin/newsletter">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Mail className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                                    Newsletter
                                </h2>
                                <p className="text-slate-600">
                                    Zarządzaj subskrybentami i wysyłaj kampanie
                                    emailowe do użytkowników
                                </p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/admin/trading-sundays">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <Calendar className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                                    Niedziele handlowe
                                </h2>
                                <p className="text-slate-600">
                                    Zarządzaj kalendarzem niedziel handlowych w
                                    Polsce
                                </p>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>

            <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                    <Newspaper className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-blue-900 mb-1">
                            Informacja
                        </h3>
                        <p className="text-sm text-blue-700">
                            Panel administracyjny umożliwia zarządzanie
                            systemowymi zasobami i komunikacją z użytkownikami.
                            Dostęp do tych funkcji wymaga uprawnień
                            administratora.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
