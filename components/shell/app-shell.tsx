"use client";

import { cn } from "@/lib/utils";
import { useUI } from "@/components/providers";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandMenu } from "./command-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, mobileNavOpen, setMobileNavOpen } = useUI();

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-dvh overflow-hidden bg-canvas">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden shrink-0 border-r border-line transition-[width] duration-200 lg:block",
            sidebarCollapsed ? "w-[64px]" : "w-[244px]",
          )}
        >
          <Sidebar />
        </aside>

        {/* Mobile nav sheet */}
        <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DialogContent
            hideClose
            className="left-0 top-0 h-dvh w-[260px] max-w-[80vw] translate-x-0 translate-y-0 rounded-none rounded-r-[14px] border-l-0 p-0"
          >
            <DialogTitle className="sr-only">Navigation</DialogTitle>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </DialogContent>
        </Dialog>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>

        <CommandMenu />
      </div>
    </TooltipProvider>
  );
}
