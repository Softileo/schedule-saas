/**
 * ShareButtons Component
 *
 * Social media sharing buttons for blog posts and articles
 * Usage: <ShareButtons url="/blog/post-slug" title="Post Title" />
 */

"use client";

import { Facebook, Twitter, Linkedin, Link2, Check } from "lucide-react";
import { useState } from "react";
import { logger } from "@/lib/utils/logger";

interface ShareButtonsProps {
    url: string;
    title: string;
    className?: string;
}

export function ShareButtons({
    url,
    title,
    className = "",
}: ShareButtonsProps) {
    const [copied, setCopied] = useState(false);
    const shareUrl = `https://calenda.pl${url}`;

    const platforms = [
        {
            name: "Facebook",
            icon: Facebook,
            color: "hover:bg-blue-50 hover:text-blue-600",
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                shareUrl
            )}`,
        },
        {
            name: "Twitter",
            icon: Twitter,
            color: "hover:bg-sky-50 hover:text-sky-600",
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                shareUrl
            )}&text=${encodeURIComponent(title)}`,
        },
        {
            name: "LinkedIn",
            icon: Linkedin,
            color: "hover:bg-blue-50 hover:text-blue-700",
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                shareUrl
            )}`,
        },
    ];

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            logger.warn("Failed to copy link to clipboard:", err);
        }
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-sm text-gray-600 mr-2">Udostępnij:</span>
            <div className="flex gap-2">
                {platforms.map((platform) => (
                    <a
                        key={platform.name}
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 rounded-lg bg-gray-100 transition-colors ${platform.color}`}
                        aria-label={`Udostępnij na ${platform.name}`}
                        title={`Udostępnij na ${platform.name}`}
                    >
                        <platform.icon className="w-5 h-5" />
                    </a>
                ))}
                <button
                    onClick={handleCopyLink}
                    className={`p-2 rounded-lg transition-colors ${
                        copied
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    }`}
                    aria-label="Kopiuj link"
                    title={copied ? "Skopiowano!" : "Kopiuj link"}
                >
                    {copied ? (
                        <Check className="w-5 h-5" />
                    ) : (
                        <Link2 className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
    );
}
