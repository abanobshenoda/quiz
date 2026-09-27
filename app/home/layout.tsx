"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, LayoutDashboard, Settings, Trophy, Menu, X, PlayCircle, Library } from "lucide-react";

type LayoutProps = {
  children: React.ReactNode;
};

const HomeLayout = ({ children }: LayoutProps) => {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleOverlayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === "Escape") {
      setIsSidebarOpen(false);
    }
  };

  const navLinks = [
    { name: "Competition Page", href: "/home", icon: <PlayCircle size={20} /> },
    { name: "Categories", href: "/home/categories", icon: <LayoutDashboard size={20} /> },
    { name: "Questions", href: "/home/questions", icon: <Library size={20} /> },
    { name: "Settings", href: "/home/settings", icon: <Settings size={20} /> },
  ];

  let sidebarClasses = "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out ";
  if (isSidebarOpen) {
    sidebarClasses += "translate-x-0";
  }
  if (!isSidebarOpen) {
    sidebarClasses += "-translate-x-full lg:translate-x-0";
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      
      {isSidebarOpen && (
        <div 
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={handleToggleSidebar}
          onKeyDown={handleOverlayKeyDown}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex items-center justify-between h-16 px-6 bg-slate-800/50 border-b border-slate-700">
          <Link href="/home" tabIndex={0} aria-label="Link to Home" className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md">
            <Trophy className="text-blue-500" size={24} />
            <span className="text-lg font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-cyan-300">
              BME Champion
            </span>
          </Link>
          <button 
            onClick={handleToggleSidebar} 
            tabIndex={0}
            aria-label="Close menu"
            className="lg:hidden text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-8 overflow-y-auto w-full">
          <div className="space-y-2">
            <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Menu
            </p>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              
              let linkClasses = "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 ";
              if (isActive) {
                linkClasses += "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]";
              }
              if (!isActive) {
                linkClasses += "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent";
              }

              let iconClasses = "transition-colors ";
              if (isActive) {
                iconClasses += "text-blue-400";
              }
              if (!isActive) {
                iconClasses += "text-slate-500 group-hover:text-blue-400";
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  tabIndex={0}
                  aria-label={`Navigate to ${link.name}`}
                  className={linkClasses}
                >
                  <span className={iconClasses}>
                    {link.icon}
                  </span>
                  <span className="font-medium">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
        
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900">
          <div 
            tabIndex={0} 
            aria-label="Admin Account"
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-sm font-bold shadow-lg">
              Ad
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-200">Admin</span>
              <span className="text-xs text-slate-500">Online</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative w-full h-full min-w-0 overflow-hidden">
        
        <header className="flex lg:hidden items-center justify-between h-16 px-4 bg-slate-900 border-b border-slate-800 z-10 w-full shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleToggleSidebar}
              tabIndex={0}
              aria-label="Open menu"
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <span className="font-bold text-slate-100 px-2">BME</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#0a0f1c] relative items-start justify-start p-4 md:p-8 w-full z-0">
          {children}
        </div>
      </main>

    </div>
  );
};

export default HomeLayout;
