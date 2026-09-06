import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bot,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Globe,
  LayoutDashboard,
  Lock,
  Menu,
  MessagesSquare,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  Stethoscope,
  Table2,
  Wrench,
  X,
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
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useKayanova } from "@/lib/kayanova/store";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { lang, dir, isRtl, t, setLang, toggleLang } = useLanguage();
  const { activeBrand } = useKayanova();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kayanova_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      } else if (window.innerWidth >= 1024 && window.innerWidth < 1200) {
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
          {/* Mobile Top Bar (Single Clean 54px Row with Hamburger Menu) */}
          <div className="flex items-center justify-between px-3.5 py-2.5 lg:hidden">
            <div className="flex items-center gap-2.5">
              {/* Hamburger Menu Trigger - 0ms Touch Latency */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-card hover:bg-secondary active:scale-90 shrink-0 shadow-2xs touch-manipulation cursor-pointer select-none transition-transform"
                aria-label="Open Navigation Menu"
              >
                <Menu className="size-5 text-foreground" />
              </button>

              <Link to="/" className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Kayanova Logo"
                  className="size-7 rounded-lg object-contain shadow-2xs"
                />
                <span className="text-sm font-black tracking-tight text-foreground">
                  {t.brandName}
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="flex items-center p-0.5 rounded-lg border border-border bg-card shrink-0" dir="ltr">
                <button
                  type="button"
                  onClick={() => setLang("ar")}
                  className={cn(
                    "px-2 py-1 rounded-md text-[11px] font-bold transition-all",
                    lang === "ar"
                      ? "brand-gradient text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  عربي
                </button>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={cn(
                    "px-2 py-1 rounded-md text-[11px] font-bold transition-all",
                    lang === "en"
                      ? "brand-gradient text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Executive Header Title & Actions (Desktop Only) */}
          <div className="hidden lg:flex flex-col gap-2 px-4 py-3.5 xl:flex-row xl:items-center xl:justify-between md:px-8 max-w-full">
            <div className="flex items-center gap-3 min-w-0">
              {/* Desktop Toggle Button in Header if Collapsed */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="flex h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
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

              {/* Language Switcher in Top Bar (Desktop/Tablet) - Clear Segmented Control */}
              <div
                className="flex items-center p-0.5 rounded-xl border border-border bg-card shadow-2xs shrink-0"
                dir="ltr"
              >
                <button
                  type="button"
                  onClick={() => setLang("ar")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    lang === "ar"
                      ? "brand-gradient text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                  title="تفعيل اللغة العربية"
                >
                  <Globe className="size-3.5" />
                  <span>العربية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    lang === "en"
                      ? "brand-gradient text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                  title="Switch to English"
                >
                  <span>English</span>
                </button>
              </div>
              <div className="block h-5 w-px bg-border/70 shrink-0" />
              {actions}
            </div>
          </div>
        </header>

        <main className="flex-1 px-3.5 py-3 sm:px-6 sm:py-5 md:px-8 md:py-6 w-full max-w-full overflow-x-hidden">
          {/* Mobile Compact In-Page Title Header */}
          <div className="mb-4 pb-2.5 border-b border-border/40 lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-base font-bold text-foreground truncate">
                {title}
              </h1>
              {activeBrand && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="truncate max-w-[110px]">{activeBrand.name}</span>
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            )}
            {actions && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {actions}
              </div>
            )}
          </div>

          {children}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE HAMBURGER NAVIGATION DRAWER (SHEET)                                */}
      {/* ========================================================================= */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side={isRtl ? "right" : "left"}
          className="w-[85vw] max-w-[340px] p-0 flex flex-col bg-card border-border shadow-2xl z-50 overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between ps-5 pe-12 py-4 border-b border-border/80 bg-secondary/30">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 transition-opacity hover:opacity-90"
            >
              <img
                src="/logo.png"
                alt="Kayanova Logo"
                className="size-9 rounded-xl object-contain shadow-xs"
              />
              <div>
                <p className="text-sm font-black tracking-tight text-foreground">{t.brandName}</p>
                <p className="text-[11px] font-semibold text-muted-foreground">{t.brandStudio}</p>
              </div>
            </Link>
          </div>

          {/* Drawer Body - Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {/* Active Agent Banner in Drawer */}
            {activeBrand && (
              <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    {lang === "ar" ? "الوكيل النشط" : "Active Agent"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {lang === "ar" ? "متصل وجاهز" : "Live"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs">
                    {activeBrand.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{activeBrand.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{activeBrand.category}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Navigation Links */}
            <div className="space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {lang === "ar" ? "أقسام الاستوديو الرئيسية" : "Studio Hubs"}
              </p>
              {NAV.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold transition-all active:scale-[0.98]",
                      active
                        ? "brand-gradient text-white shadow-sm"
                        : "text-foreground hover:bg-secondary/70 hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("size-4.5", active ? "text-white" : "text-primary")} />
                      <span>{item.label}</span>
                    </div>
                    {isRtl ? (
                      <ChevronLeft className={cn("size-4 opacity-70", active && "text-white")} />
                    ) : (
                      <ChevronRight className={cn("size-4 opacity-70", active && "text-white")} />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Quick Action Button */}
            <div className="pt-2">
              <Button
                asChild
                className="w-full h-11 brand-gradient text-white font-bold rounded-xl shadow-sm text-xs gap-2"
              >
                <Link
                  to="/builder"
                  search={{ step: "identity" }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Plus className="size-4" />
                  <span>{lang === "ar" ? "إنشاء وكيل ذكي جديد" : "Create New Agent"}</span>
                </Link>
              </Button>
            </div>

            {/* Admin Portal Direct Link */}
            <div className="pt-2 border-t border-border/60">
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span>{lang === "ar" ? "لوحة الإدارة التنفيذية" : "Master Operations"}</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">Admin</Badge>
              </Link>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-border/80 bg-secondary/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {lang === "ar" ? "اللغة" : "Language"}
              </span>
              <div className="flex items-center p-0.5 rounded-lg border border-border bg-card shrink-0" dir="ltr">
                <button
                  type="button"
                  onClick={() => setLang("ar")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-bold transition-all",
                    lang === "ar" ? "brand-gradient text-white shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  عربي
                </button>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-bold transition-all",
                    lang === "en" ? "brand-gradient text-white shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-1">
              <span>{lang === "ar" ? "منظومة وكلاء كيانوفا" : "Kayanova Studio v3.2"}</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {lang === "ar" ? "جاهز 100%" : "Operational"}
              </span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
