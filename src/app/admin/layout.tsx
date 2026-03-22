import Sidebar from "@/components/admin/Sidebar";
import TopBar from "@/components/admin/TopBar";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // If no user (login page), render children without layout chrome
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#141414" }}>
      <Sidebar username={user.username} level={user.level} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar username={user.username} level={user.level} />
        <main className="flex-1 p-5 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
