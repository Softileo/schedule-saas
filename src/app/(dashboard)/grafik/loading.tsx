import {
    GoogleSpinnerSVG,
    GoogleSpinnerStyles,
} from "@/components/ui/page-loader";

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <GoogleSpinnerSVG size={48} stroke={4} />
            <style>{GoogleSpinnerStyles}</style>
        </div>
    );
}
