export default function ColorfulGradientBar({ opacity }: { opacity?: number }) {
    return (
        <div
            className={`absolute top-0 left-0 right-0 h-80 -translate-y-1/2 blur-3xl -z-10`}
            style={{
                background:
                    "linear-gradient(to right, rgb(250 204 21 / 0.4), rgb(96 165 250 / 0.4), rgb(167 139 250 / 0.4), rgb(244 114 182 / 0.4), rgb(74 222 128 / 0.4))",
                opacity: opacity,
            }}
        />
    );
}
