import { useEffect } from "react";
import AdminHeader from "../AdminHeader";

type LayoutProps = {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
};

export function AdminLayout({ children, title, showBack = false }: LayoutProps) {

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* HEADER - showBack est maintenant transmis correctement */}
      <AdminHeader title={title || 'Admin Panel'} showBack={showBack} />
      
      <main className="flex-1 p-4">
        {children}
      </main>
    </div>
  );
}