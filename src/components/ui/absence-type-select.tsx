"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AbsenceType, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from "@/types";

interface AbsenceTypeSelectProps {
    value: AbsenceType;
    onValueChange: (value: AbsenceType) => void;
    disabled?: boolean;
    placeholder?: string;
}

/**
 * Reusable select component for absence types
 * Shows color indicator and Polish label for each type
 */
export function AbsenceTypeSelect({
    value,
    onValueChange,
    disabled,
    placeholder = "Wybierz typ nieobecności",
}: AbsenceTypeSelectProps) {
    return (
        <Select
            value={value}
            onValueChange={(val) => onValueChange(val as AbsenceType)}
            disabled={disabled}
        >
            <SelectTrigger>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {(Object.keys(ABSENCE_TYPE_LABELS) as AbsenceType[]).map(
                    (type) => (
                        <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{
                                        backgroundColor:
                                            ABSENCE_TYPE_COLORS[type],
                                    }}
                                />
                                <span>{ABSENCE_TYPE_LABELS[type]}</span>
                            </div>
                        </SelectItem>
                    )
                )}
            </SelectContent>
        </Select>
    );
}

/**
 * Get whether an absence type is unpaid by default
 */
export function isUnpaidAbsenceType(type: AbsenceType): boolean {
    return ["unpaid_leave", "training_unpaid"].includes(type);
}
