export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // No auth check here - it's handled by child layouts
    // (protected) folder requires auth
    // (auth) folder doesn't require auth
    return <>{children}</>;
}
