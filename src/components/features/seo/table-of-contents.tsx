"use client";

import { useEffect, useState, startTransition } from "react";
import { List } from "lucide-react";
import Link from "next/link";

interface TocItem {
    id: string;
    text: string;
    level: number;
}

interface TableOfContentsProps {
    className?: string;
}

export function TableOfContents({ className = "" }: TableOfContentsProps) {
    const [toc, setToc] = useState<TocItem[]>([]);
    const [activeId, setActiveId] = useState<string>("");

    useEffect(() => {
        const headings = document.querySelectorAll("article h2");
        if (!headings.length) return;

        const items: TocItem[] = Array.from(headings).map((h) => {
            let id = h.id;
            if (!id) {
                id =
                    h.textContent
                        ?.toLowerCase()
                        .trim()
                        .replace(/[^\w\s-]/g, "")
                        .replace(/\s+/g, "-") || "";
                h.id = id;
            }
            return {
                id,
                text: h.textContent || "",
                level: parseInt(h.tagName[1]),
            };
        });

        startTransition(() => {
            setToc(items);
        });

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.find((entry) => entry.isIntersecting);
                if (visible) {
                    setActiveId(visible.target.id);
                }
            },
            {
                rootMargin: "-30% 0px -60% 0px",
                threshold: 0,
            },
        );

        headings.forEach((h) => h.id && observer.observe(h));

        return () => observer.disconnect();
    }, []);

    if (!toc.length) return null;

    return (
        <nav
            className={`sticky top-24 p-3 bg-gray-50 rounded-xl border border-gray-100 max-h-[90vh] overflow-y-auto shadow-sm ${className}`}
        >
            <div className="flex items-center gap-2 mb-3">
                <List className="w-4 h-4 text-gray-600" />
                <h4 className="font-semibold text-gray-900 text-sm">
                    Spis treści
                </h4>
            </div>

            <ol className="text-sm list-decimal pl-5 space-y-2">
                {toc.map((item) => (
                    <li
                        key={item.id}
                        style={{ paddingLeft: `${(item.level - 2) * 0.75}rem` }}
                    >
                        <Link
                            href={`#${item.id}`}
                            className={`block transition-colors font-semibold duration-200 px-1 py-1 ${
                                activeId === item.id
                                    ? "text-blue-700 "
                                    : "text-gray-700 hover:text-gray-900 "
                            }`}
                            onClick={(e) => {
                                e.preventDefault();
                                const element = document.getElementById(
                                    item.id,
                                );
                                if (!element) return;

                                const offset = 100; // opcjonalne przesunięcie
                                const elementPosition =
                                    element.getBoundingClientRect().top;
                                const offsetPosition =
                                    elementPosition +
                                    window.pageYOffset -
                                    offset;

                                window.scrollTo({
                                    top: offsetPosition,
                                    behavior: "smooth",
                                });
                            }}
                        >
                            {item.text}
                        </Link>
                    </li>
                ))}
            </ol>
        </nav>
    );
}
