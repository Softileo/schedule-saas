import { Badge } from "@/components/ui/badge";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
    {
        question: "Jak długo trwa wdrożenie systemu?",
        answer: "Wdrożenie Calenda jest bardzo proste i trwa zazwyczaj mniej niż godzinę. Po założeniu konta dodajesz pracowników, ustawiasz szablony zmian i od razu możesz generować grafiki.",
    },
    {
        question: "Czy system działa offline?",
        answer: "Calenda to aplikacja webowa dostępna z dowolnego urządzenia z przeglądarką internetową. Wymaga połączenia z internetem do działania, ale grafiki można wyeksportować do PDF i wydrukować.",
    },
    {
        question: "Jakie integracje oferujecie?",
        answer: "Aktualnie oferujemy eksport do popularnych formatów (PDF, Excel). Pracujemy nad integracjami z systemami kadrowo-płacowymi i kalendarzami zewnętrznymi.",
    },
    {
        question: "Czy mogę przetestować za darmo?",
        answer: "Tak, oferujemy 14-dniowy okres próbny bez konieczności podawania karty płatniczej. W tym czasie masz dostęp do wszystkich funkcji systemu.",
    },
    {
        question: "Jak działa generowanie grafiku przez AI?",
        answer: "Nasz algorytm AI analizuje dostępność pracowników, ich preferencje, umiejętności, wymagania prawne i historyczne dane, aby stworzyć optymalny grafik. Algorytm constraint-satisfaction rozwiązuje problem planowania jako zadanie optymalizacyjne — minimalizuje konflikty, równoważy obciążenie pracowników i maksymalizuje pokrycie zmian. Cały proces trwa około 2 sekund.",
    },
    {
        question: "Czy mogę zarządzać wieloma lokalizacjami?",
        answer: "Tak, Calenda pozwala na zarządzanie wieloma oddziałami lub lokalizacjami z jednego konta. Każda lokalizacja może mieć własne ustawienia i zespół.",
    },
    {
        question: "Czy Calenda pilnuje Kodeksu Pracy?",
        answer: "Tak — automatycznie. System sprawdza w czasie rzeczywistym: 11-godzinny odpoczynek dobowy (art. 132 KP), 35-godzinny odpoczynek tygodniowy (art. 133 KP), limit 150 nadgodzin rocznie (art. 151 KP), zakaz pracy w niedziele niehandlowe oraz dobę pracowniczą. Każde naruszenie jest natychmiast sygnalizowane.",
    },
    {
        question: "Czy grafik można wydrukować lub wysłać pracownikom?",
        answer: "Tak. Grafik można wyeksportować do PDF (gotowy do druku) lub do Excela. Dodatkowo system umożliwia wysyłanie powiadomień email do pracowników o opublikowanym grafiku lub jego zmianach.",
    },
    {
        question: "Ile pracowników mogę dodać?",
        answer: "Calenda obsługuje zespoły od kilku do ponad 200 pracowników. Algorytm AI jest zoptymalizowany do pracy z dużymi zespołami i wieloma zmianami, zachowując szybkość generowania grafiku.",
    },
    {
        question: "Czy pracownicy mogą zgłaszać swoje preferencje?",
        answer: "Tak. Pracownicy mogą ustawić preferowane dni i godziny pracy, stałe dni wolne oraz informować o niedostępności. Generator AI uwzględnia te preferencje przy tworzeniu grafiku.",
    },
];

export function FAQSection() {
    return (
        <section className="py-16 sm:py-24 bg-white" id="faq">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10 sm:mb-16 animate-fade-in-up">
                    <Badge className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-200/50">
                        <HelpCircle className="w-4 h-4 mr-2" />
                        FAQ
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Często zadawane pytania
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Odpowiedzi na najpopularniejsze pytania o Calenda
                    </p>
                </div>

                <div className="max-w-3xl mx-auto stagger-children">
                    <Accordion type="single" collapsible className="space-y-3">
                        {faqs.map((faq, index) => (
                            <div key={index}>
                                <AccordionItem
                                    value={`item-${index}`}
                                    className="border border-gray-100 rounded-xl bg-white px-6 data-[state=open]:shadow-sm hover:border-gray-200 transition-colors"
                                >
                                    <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline py-5">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-gray-600 pb-5 leading-relaxed">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            </div>
                        ))}
                    </Accordion>
                </div>
            </div>
        </section>
    );
}
