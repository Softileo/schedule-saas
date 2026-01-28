const classMenu = ` h-0.5 bg-linear-to-r from-blue-600 to-violet-600 rounded-full my-0.5`;

export default function MenuBurger({ onClick }: { onClick: () => void }) {
    return (
        <button
            className="text-primary flex items-start justify-center flex-col p-2 bg-slate-100 border rounded-md border-slate-200"
            onClick={onClick}
        >
            <div className={`w-4 ${classMenu}`} />
            <div className={`w-3 ${classMenu}`} />
            <div className={`w-4 ${classMenu}`} />
            <span className="sr-only">Otwórz menu</span>
        </button>
    );
}
