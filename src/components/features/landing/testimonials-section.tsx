import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote, MessageSquare } from "lucide-react";

const testimonials = [
    {
        name: "Anna Kowalska",
        role: "Kierownik sklepu",
        company: "Sieć sklepów spożywczych",
        content:
            "Wcześniej spędzałam 4 godziny tygodniowo na układaniu grafików w Excelu. Teraz z AI robię to w 5 minut.",
        initials: "AK",
        color: "bg-blue-500",
    },
    {
        name: "Tomasz Nowak",
        role: "Właściciel restauracji",
        company: "Restauracja Pod Lipą",
        content:
            "System uwzględnia preferencje każdego pracownika i automatycznie pilnuje norm czasu pracy. Koniec z kłótniami o grafik.",
        initials: "TN",
        color: "bg-emerald-500",
    },
    {
        name: "Magdalena Wiśniewska",
        role: "HR Manager",
        company: "Firma produkcyjna",
        content:
            "Wdrożyliśmy Calenda w firmie z ponad 200 pracownikami na 3 zmiany. System radzi sobie świetnie z taką skalą.",
        initials: "MW",
        color: "bg-violet-500",
    },
    {
        name: "Piotr Zieliński",
        role: "Manager hotelu",
        company: "Hotel **** w Krakowie",
        content:
            "W hotelu mamy bardzo zmienne obłożenie. Calenda pozwala nam elastycznie zarządzać grafikami.",
        initials: "PZ",
        color: "bg-amber-500",
    },
    {
        name: "Katarzyna Dąbrowska",
        role: "Kierownik zmiany",
        company: "Centrum logistyczne",
        content:
            "Pracownicy sami mogą zgłaszać preferencje w aplikacji. Oszczędzam mnóstwo czasu na komunikacji.",
        initials: "KD",
        color: "bg-rose-500",
    },
    {
        name: "Marcin Lewandowski",
        role: "Właściciel sieci kawiarni",
        company: "Coffee & More",
        content:
            "Mam 5 lokalizacji i jeden grafik dla wszystkich. Zarządzanie nigdy nie było prostsze.",
        initials: "ML",
        color: "bg-cyan-500",
    },
];

export function TestimonialsSection() {
    return (
        <section className="py-16 sm:py-24 bg-slate-50 overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10 sm:mb-16 animate-fade-in-up">
                    <Badge className="mb-4 bg-amber-500/10 text-amber-700 border-amber-200/50">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Opinie
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Zaufali nam
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Dołącz do firm, które już oszczędzają czas dzięki
                        Calenda
                    </p>

                    <div className="flex items-center justify-center gap-3 mt-6">
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className="w-5 h-5 text-yellow-400 fill-yellow-400"
                                />
                            ))}
                        </div>
                        <span className="font-semibold text-gray-900">
                            4.9/5
                        </span>
                        <span className="text-gray-500">z 50+ opinii</span>
                    </div>
                </div>

                {/* Grid for mobile, scrolling for desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto stagger-children">
                    {testimonials.map((testimonial) => (
                        <div key={testimonial.name}>
                            <TestimonialCard testimonial={testimonial} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function TestimonialCard({
    testimonial,
}: {
    testimonial: (typeof testimonials)[0];
}) {
    return (
        <div className="h-full bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-shadow">
            <Quote className="w-8 h-8 text-gray-100 mb-4" />

            <div className="flex gap-0.5 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className="w-4 h-4 text-yellow-400 fill-yellow-400"
                    />
                ))}
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                &ldquo;{testimonial.content}&rdquo;
            </p>

            <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border border-white shadow">
                    <AvatarFallback
                        className={`${testimonial.color} text-white text-sm font-medium`}
                    >
                        {testimonial.initials}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <div className="font-medium text-gray-900 text-sm">
                        {testimonial.name}
                    </div>
                </div>
            </div>
        </div>
    );
}
