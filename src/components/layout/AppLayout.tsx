import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { AIAssistant } from "@/components/AIAssistant";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6">{children}</main>
      <footer className="mt-16 hidden border-t md:block">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground">
          TheVault — a unified marketplace for new and pre-loved goods.
        </div>
      </footer>
      <BottomNav />
      <AIAssistant />
    </div>
  );
}
