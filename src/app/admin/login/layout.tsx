export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page uses its own layout (no sidebar/topbar)
  return <>{children}</>;
}
