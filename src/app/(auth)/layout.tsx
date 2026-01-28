import ColorfulGradientBar from "@/components/ui/colorful-gradient-bar";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <ColorfulGradientBar />

            {/* Content */}
            <div className="w-full max-w-3xl relative z-10 mt-2">
                {children}
            </div>
        </div>
    );
}
