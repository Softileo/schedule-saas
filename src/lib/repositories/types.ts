export type RepositoryResult<T> = {
    data: T | null;
    error: Error | null;
};

export function createRepositoryError(error: any): Error | null {
    if (!error) return null;
    if (typeof error === "string") return new Error(error);
    if (error instanceof Error) return error;
    if (typeof error === "object" && error?.message)
        return new Error(error.message);
    return new Error("Unknown repository error");
}
