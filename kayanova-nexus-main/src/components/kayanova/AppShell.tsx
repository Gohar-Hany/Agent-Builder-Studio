import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bot,
  Briefcase,
  Building2,
  Coffee,
  Globe,
  LayoutDashboard,
  Lock,
  MessagesSquare,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  Stethoscope,
  Table2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { lang, dir, isRtl, t, toggleLang } = useLanguage();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kayanova_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      } else if (window.innerWidth < 1200) {
        setCollapsed(true);
      }
    }
  }, []);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const NAV = [
    { to: "/", label: t.nav.dashboard, shortLabel: t.nav.dashboardShort, icon: LayoutDashboard },
    { to: "/builder", label: t.nav.builder, shortLabel: t.nav.builderShort, icon: Wrench },
    { to: "/analytics", label: t.nav.crm, shortLabel: t.nav.crmShort, icon: Table2 },
    {
      to: "/simulator",
      label: t.nav.simulator,
      shortLabel: t.nav.simulatorShort,
      icon: MessagesSquare,
    },
  ] as const;

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("kayanova_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="min-h-screen bg-background text-foreground overflow-x-hidden w-full max-w-full"
      dir={dir}
    >
      {/* ========================================================================= */}
      {/* DESKTOP COLLAPSIBLE SIDEBAR                                               */}
      {/* ========================================================================= */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-30 hidden flex-col border-e border-border bg-sidebar transition-all duration-300 lg:flex",
          "shadow-[1px_0_0_0_var(--color-border),4px_0_24px_rgba(4,11,24,0.06)]",
          collapsed ? "w-18 px-2 py-5 items-center" : "w-64 px-4 py-6",
        )}
      >
        {/* Brand Header / Logo */}
        <div
          className={cn(
            "flex items-center justify-between gap-2 w-full",
            collapsed ? "flex-col justify-center px-0" : "px-2",
          )}
        >
          <Link
            to="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            title={t.appName}
          >
            <img
              src="/logo.png"
              alt="Kayanova Logo"
              className={cn(
                "rounded-xl object-contain shadow-xs transition-all",
                collapsed ? "size-9" : "size-10",
              )}
            />
            {!collapsed && (
              <div>
                <p className="text-sm font-bold tracking-tight text-foreground">{t.brandName}</p>
                <p className="text-xs font-medium text-muted-foreground">{t.brandStudio}</p>
              </div>
            )}
          </Link>

          {/* Sidebar Toggle Button on Desktop - Only shown when sidebar is expanded */}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="size-7 text-muted-foreground hover:text-foreground shrink-0"
              title={t.nav?.collapseSidebar ?? "Collapse"}
            >
              <PanelLeftClose className="size-4" />
            </Button>
          )}
        </div>

        {/* Global Search / Command Menu Trigger */}
        {!collapsed && (
          <button
            onClick={() => setOpen(true)}
            className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-2xs transition-colors hover:border-primary/40 hover:text-foreground hover:bg-accent/40"
          >
            <span className="flex items-center gap-2">
              <Search className="size-3.5" />
              <span>{t.searchPlaceholder}</span>
            </span>
            <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Navigation Links */}
        <nav className="mt-5 flex flex-col gap-1 w-full flex-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150",
                  active
                    ? "brand-gradient text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active
                      ? "text-white"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Platform Info */}
        <div className="mt-auto w-full flex flex-col gap-2">
          {collapsed ? (
            <div
              className="flex size-10 items-center justify-center rounded-xl border border-border bg-secondary/60 text-muted-foreground mx-auto"
              title="Kayanova Studio"
            >
              <Sparkles className="size-4 text-primary" />
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-foreground">
                <Sparkles className="size-3.5 text-primary" />
                <span>Kayanova Studio</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">
                {lang === "ar"
                  ? "منصة بناء وكلاء الذكاء الاصطناعي للأعمال"
                  : "Enterprise AI Agent Platform"}
              </p>
              <div className="pt-1.5 border-t border-border/50 flex items-center justify-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{lang === "ar" ? "الخدمة نشطة وجاهزة" : "System Operational"}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTENT WRAPPER                                                      */}
      {/* ========================================================================= */}
      <div
        className={cn(
          "min-h-screen flex flex-col transition-all duration-300 w-full max-w-full overflow-x-hidden",
          collapsed ? "lg:ps-18" : "lg:ps-64",
        )}
      >
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-md shadow-[0_1px_0_0_var(--color-border),0_2px_8px_rgba(4,11,24,0.06)] w-full max-w-full overflow-x-hidden">
          {/* Top Bar on Mobile */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5 lg:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Kayanova Logo"
                className="size-7 rounded-lg object-contain"
              />
              <span className="text-sm font-bold tracking-tight text-foreground">
                {t.brandName}
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLang}
                className="h-8 gap-1 border-border px-2 text-xs font-semibold"
              >
                <Globe className="size-3.5 text-primary" />
                <span>{lang === "ar" ? "EN" : "عربي"}</span>
              </Button>
            </div>
          </div>

          {/* Main Header Title & Actions */}
          <div className="flex flex-col gap-2 px-3 py-2.5 sm:px-4 sm:py-3.5 xl:flex-row xl:items-center xl:justify-between md:px-8 max-w-full">
            <div className="flex items-center gap-3 min-w-0">
              {/* Desktop Toggle Button in Header if Collapsed */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="hidden lg:flex h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
                title={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
              >
                <PanelLeft className={cn("size-4 text-primary", isRtl && "scale-x-[-1]")} />
              </Button>

              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight sm:text-xl text-foreground truncate leading-tight">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-0.5 text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Structured Executive Toolbar */}
            <div className="flex items-center gap-2 sm:gap-2.5 py-0.5 xl:py-0 w-full xl:w-auto justify-start xl:justify-end shrink-0 max-w-full">
              {/* Private Sandbox Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300">
                <Lock className="size-3 text-emerald-700 dark:text-emerald-300" />
                <span>{lang === "ar" ? "بيئة تجريبية معزولة" : "Isolated Sandbox"}</span>
              </div>

              {/* Language Switcher in Top Bar (Desktop/Tablet) */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLang}
                className="hidden lg:flex h-9 gap-1.5 border-border bg-card px-2.5 sm:px-3 text-xs font-bold text-foreground hover:bg-secondary hover:text-foreground shadow-2xs shrink-0"
                title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
              >
                <Globe className="size-3.5 text-primary" />
                <span>{lang === "ar" ? "English" : "العربية"}</span>
              </Button>
              <div className="hidden lg:block h-5 w-px bg-border/70 shrink-0" />
              {actions}
            </div>
          </div>

          {/* Mobile/Tablet Header Navigation Strip with 44px Touch Targets */}
          <nav className="flex gap-2 overflow-x-auto border-t border-border bg-secondary/30 px-3 py-2 lg:hidden touch-scroll no-scrollbar">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all min-h-[42px] shrink-0 active:scale-95",
                    active
                      ? "brand-gradient text-white shadow-xs"
                      : "border border-border/80 bg-card text-foreground hover:bg-accent",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.shortLabel}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t.searchCommand} />
        <CommandList>
          <CommandEmpty>{lang === "ar" ? "لا توجد نتائج." : "No results found."}</CommandEmpty>
          <CommandGroup heading={lang === "ar" ? "التنقل السريع" : "Navigation"}>
            {NAV.map((item) => (
              <CommandItem key={item.to} value={item.label} asChild>
                <Link to={item.to} onClick={() => setOpen(false)}>
                  <item.icon className="me-2 size-4" />
                  {item.label}
                </Link>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

export function BrandGlyph({
  brand,
  icon,
  className,
}: {
  brand?: { icon?: string; name?: string } | null;
  icon?: string;
  className?: string;
}) {
  const iconMap: Record<string, LucideIcon> = {
    coffee: Coffee,
    stethoscope: Stethoscope,
    shirt: Shirt,
    building: Building2,
    briefcase: Briefcase,
    sparkles: Sparkles,
    bot: Bot,
  };
  const key = (brand?.icon || icon || "bot").toLowerCase();
  const IconComponent = iconMap[key] ?? Bot;

  return (
    <div
      className={cn(
        "flex size-10 sm:size-12 items-center justify-center rounded-2xl brand-gradient text-white shadow-sm",
        className,
      )}
    >
      <IconComponent className="size-5 sm:size-6" />
    </div>
  );
}
