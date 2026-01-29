import type { ShiftTemplate } from "@/types";

interface ShiftTemplateAvatarProps {
    template: Pick<ShiftTemplate, "start_time" | "end_time" | "color">;
    className?: string;
}

/**
 * Avatar component displaying shift template time and color
 * Used in shift templates list and manager
 */
export function ShiftTemplateAvatar({
    template,
    className = "w-11 h-11",
}: ShiftTemplateAvatarProps) {
    return (
        <div
            className={`${className} rounded-lg flex flex-col items-center justify-center border shadow-sm shrink-0`}
            style={{
                backgroundColor: template.color
                    ? `${template.color}15`
                    : undefined,
                borderColor: template.color ? `${template.color}35` : undefined,
                color: template.color ?? undefined,
            }}
        >
            <span className="font-bold text-[11px] leading-none">
                {template.start_time.substring(0, 5)}
            </span>
            <span className="opacity-60 text-[9px] leading-none mt-0.5">
                {template.end_time.substring(0, 5)}
            </span>
        </div>
    );
}
