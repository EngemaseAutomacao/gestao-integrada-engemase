import { NavLink, useLocation } from "react-router-dom";
import { Home, Wrench, Car, Clock, Shield, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const navItems = [
  { label: "Início", icon: Home, path: "/" },
  { label: "Ferramentas", icon: Wrench, path: "/ferramentas" },
  { label: "Veículos", icon: Car, path: "/veiculos" },
  { label: "Ponto", icon: Clock, path: "/ponto" },
];

export function MobileBottomNav() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const isAdmin = profile?.role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const allItems = [
    ...navItems,
    ...(isAdmin ? [{ label: "Admin", icon: Shield, path: "/admin" }] : []),
  ];

  // If more than 4 items, show 3 + "Mais" menu
  const showMore = allItems.length > 4;
  const visibleItems = showMore ? allItems.slice(0, 3) : allItems;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground transition-colors",
              isActive(item.path) && "text-primary"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}

        {showMore && (
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground">
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-medium">Mais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-8">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {allItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors",
                      isActive(item.path)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground"
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4 text-destructive"
                onClick={() => { setMenuOpen(false); signOut(); }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
