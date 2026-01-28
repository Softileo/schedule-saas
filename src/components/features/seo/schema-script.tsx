/**
 * Komponent do wstrzykiwania JSON-LD Schema
 */

interface SchemaScriptProps {
    schema: object | object[];
}

export function SchemaScript({ schema }: SchemaScriptProps) {
    const jsonLd = Array.isArray(schema)
        ? schema.map((s) => JSON.stringify(s)).join("")
        : JSON.stringify(schema);

    if (Array.isArray(schema)) {
        return (
            <>
                {schema.map((s, index) => (
                    <script
                        key={index}
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
                    />
                ))}
            </>
        );
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
    );
}
