import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </DashboardShell>
  );
}
