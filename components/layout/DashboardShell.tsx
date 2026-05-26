"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

interface Props {
  children: React.ReactNode;
  userEmail?: string | null;
}

export function DashboardShell({ children, userEmail }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-fondo">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userEmail={userEmail} onMenuClick={() => setSidebarOpen(true)} />
        <OfflineBanner />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto pb-20 md:pb-8">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
