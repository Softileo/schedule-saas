import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

interface LogoProps {
    showText?: boolean;
    className?: string;
}


export function Logo({  showText = true, className }: LogoProps) {
    return (
        <Link
            href={ROUTES.HOME}
            className={cn("flex items-center gap-0.5", className)}
        >
            <Image src={LOGO_IMG} alt="Logo" width={37} height={32} className="p-1.5" />
            {showText && (
                <div className="relative font-bold text-xl group mt-1">
                   
                    <span className="relative bg-linear-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                        Calenda
                    </span>
                </div>
            )}
        </Link>
    );
}

export const LOGO_IMG = "/x.svg";
export const LOGO_NAME = "Calenda";
export const LOGO_TAGLINE = "System harmonogramów pracy";
