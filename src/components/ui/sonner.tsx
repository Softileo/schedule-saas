"use client";

import {
    CircleCheckIcon,
    InfoIcon,
    OctagonXIcon,
    TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { GoogleSpinnerSVG, GoogleSpinnerStyles } from "./page-loader";

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = "light" } = useTheme();

    return (
        <>
            <Sonner
                theme={theme as ToasterProps["theme"]}
                className="toaster group"
                icons={{
                    success: <CircleCheckIcon className="size-4" />,
                    info: <InfoIcon className="size-4" />,
                    warning: <TriangleAlertIcon className="size-4" />,
                    error: <OctagonXIcon className="size-4" />,
                    loading: <GoogleSpinnerSVG size={16} stroke={2} />,
                }}
                style={
                    {
                        "--normal-bg": "var(--popover)",
                        "--normal-text": "var(--popover-foreground)",
                        "--normal-border": "var(--border)",
                        "--border-radius": "var(--radius)",
                    } as React.CSSProperties
                }
                {...props}
            />
            <style>{GoogleSpinnerStyles}</style>
        </>
    );
};

export { Toaster };
