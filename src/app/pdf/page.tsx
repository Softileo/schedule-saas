"use client";

import React from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { PDFTemplateColorful } from "@/components/features/schedule/components/pdf";
import { MOCK_DATA } from "./pdf-mock-data";

export default function PDFTestPage() {
    // Możesz tutaj dodać state, aby zmieniać dane w locie (np. ilość pracowników)
    const [clientReady, setClientReady] = React.useState(false);

    // React-PDF Viewer musi renderować się tylko po stronie klienta
    React.useEffect(() => {
        setClientReady(true);
    }, []);

    if (!clientReady) return <div className="p-10">Ładowanie podglądu...</div>;

    return (
        <div className="flex flex-col h-screen w-full bg-slate-900">
            {/* Pasek narzędziowy */}
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center border-b border-slate-700">
                <div>
                    <h1 className="text-xl font-bold">PDF Live Preview</h1>
                    <p className="text-xs text-slate-400">
                        Template: Colorful (Landscape)
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm transition-colors"
                    >
                        Odśwież dane
                    </button>
                </div>
            </div>

            {/* Kontener Viewera */}
            <div className="flex-1 w-full bg-slate-700 p-8 flex justify-center">
                <PDFViewer className="w-full h-full max-w-6xl shadow-2xl rounded-lg">
                    <PDFTemplateColorful data={MOCK_DATA} />
                </PDFViewer>
            </div>
        </div>
    );
}
