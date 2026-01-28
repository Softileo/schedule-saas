export default function Soon({
    top = 0,
    right = 0,
}: {
    top?: number;
    right?: number;
}) {
    return (
        <div
            className="inline-flex items-center justify-center rounded-full absolute text-[8px] bg-violet-400 py-1 px-2 mx-1 font-bold text-white"
            style={{ top: top, right: right }}
        >
            wkrótce
        </div>
    );
}
