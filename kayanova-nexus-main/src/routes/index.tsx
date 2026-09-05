import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  Bot,
  Building2,
  CheckCircle2,
  Copy,
  Flame,
  MessageSquare,
  Phone,
  Plus,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandGlyph } from "@/components/kayanova/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { egp, useKayanova } from "@/lib/kayanova/store";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kayanova Next-Gen AI Studio" },
      {
        name: "description",
        content:
          "Executive AI Studio command center: real-time sales metrics, conversational personas, and multi-channel deployment.",
      },
    ],
  }),
  component: Dashboard,
});

function KpiCard({
  icon: Icon,
  label,
  value,
  badge,
  subtitle,
  accentColor = "emerald",
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
  badge?: string;
  subtitle?: string;
  accentColor?: "emerald" | "cyan" | "amber" | "violet";
}) {
  const styles = {
    emerald: {
      borderGlow: "group-hover:border-emerald-500/40",
      topLine: "bg-gradient-to-r from-emerald-500 to-teal-400",
      iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)]",
      badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
      ambientGlow: "from-emerald-500/10 to-transparent",
    },
    cyan: {
      borderGlow: "group-hover:border-cyan-500/40",
      topLine: "bg-gradient-to-r from-cyan-500 to-blue-500",
      iconBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_20px_-3px_rgba(6,182,212,0.3)]",
      badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
      ambientGlow: "from-cyan-500/10 to-transparent",
    },
    amber: {
      borderGlow: "group-hover:border-amber-500/40",
      topLine: "bg-gradient-to-r from-amber-500 to-orange-400",
      iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_20px_-3px_rgba(245,158,11,0.3)]",
      badge: "bg-amber-500/10 text-amber-300 border-amber-500/25",
      ambientGlow: "from-amber-500/10 to-transparent",
    },
    violet: {
      borderGlow: "group-hover:border-violet-500/40",
      topLine: "bg-gradient-to-r from-violet-500 to-purple-400",
      iconBg: "bg-violet-500/10 text-violet-400 border-violet-500/20 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)]",
      badge: "bg-violet-500/10 text-violet-300 border-violet-500/25",
      ambientGlow: "from-violet-500/10 to-transparent",
    },
  }[accentColor];

  return (
    <div
      className={`glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group ${styles.borderGlow}`}
    >
      {/* Ambient background glow on hover */}
      <div
        className={`absolute -top-16 -end-16 size-32 rounded-full bg-gradient-to-br ${styles.ambientGlow} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`}
      />

      {/* Top illuminated gradient strip */}
      <div className={`absolute inset-x-0 top-0 h-[2.5px] ${styles.topLine}`} />

      <div className="flex items-start justify-between gap-3 pt-1 relative z-10">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${styles.iconBg}`}
        >
          <Icon className="size-5" />
        </div>
        {badge ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border whitespace-nowrap ${styles.badge}`}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-4 relative z-10">
        <p className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono leading-none">
          {value}
        </p>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        {subtitle ? (
          <p className="mt-1 text-[11px] text-slate-400/80 font-medium truncate">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function Dashboard() {
  const { brands, leads, contacts, activeBrand, setActiveBrandId, deleteBrand, hydrated } =
    useKayanova();
  const { t, lang } = useLanguage();
  const [filter, setFilter] = useState<string>("all");
  const [brandToDelete, setBrandToDelete] = useState<{ id: string; name: string } | null>(null);

  const totalBrands = brands.length;
  const totalOrders = leads.length;
  const totalRevenue = leads.reduce((s, l) => s + (l.numericTotal ?? 0), 0);
  const totalContacts = contacts.length;
  const completedOrders = leads.filter((l) => l.status === "Completed").length;
  const fulfillmentRatio =
    totalOrders > 0 ? `${Math.round((completedOrders / totalOrders) * 100)}%` : "0%";

  const filtered = filter === "all" ? brands : brands.filter((b) => b.category === filter);

  const copyPhone = (phone?: string) => {
    if (!phone) {
      toast.error(lang === "ar" ? "لم يتم تحديد رقم هاتف" : "No phone number configured");
      return;
    }
    void navigator.clipboard.writeText(phone);
    toast.success(`${t.copied}: ${phone}`);
  };

  const confirmDelete = async () => {
    if (!brandToDelete) return;
    const name = brandToDelete.name;
    await deleteBrand(brandToDelete.id);
    setBrandToDelete(null);
    toast.success(
      lang === "ar" ? `تم حذف الوكيل "${name}" بنجاح!` : `Agent "${name}" deleted successfully!`,
    );
  };

  return (
    <AppShell
      title={t.dashboard.title}
      subtitle={t.dashboard.subtitle}
      actions={
        <Button
          asChild
          className="brand-gradient hover:opacity-95 text-white font-bold h-10 px-4 rounded-xl shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)] ring-1 ring-white/20 transition-transform active:scale-95 text-xs sm:text-sm"
        >
          <Link to="/builder" search={{ step: "identity" }}>
            <Plus className="size-4 me-1.5" />
            <span>{t.dashboard.newAgentBtn}</span>
          </Link>
        </Button>
      }
    >
      {/* ========================================================================= */}
      {/* 4 MODERN KPI METRIC CARDS                                                 */}
      {/* ========================================================================= */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Building2}
          label={t.dashboard.kpiBrands}
          value={totalBrands}
          badge={totalBrands > 0 ? `${totalBrands} ${t.active}` : t.noData}
          subtitle={t.dashboard.kpiBrandsSub}
          accentColor="emerald"
        />
        <KpiCard
          icon={ShoppingBag}
          label={t.dashboard.kpiOrders}
          value={totalOrders}
          badge={totalRevenue > 0 ? egp(totalRevenue, lang) : egp(0, lang)}
          subtitle={t.dashboard.kpiOrdersSub}
          accentColor="cyan"
        />
        <KpiCard
          icon={Users}
          label={t.dashboard.kpiContacts}
          value={totalContacts}
          badge={totalContacts > 0 ? `${totalContacts}` : t.noData}
          subtitle={t.dashboard.kpiContactsSub}
          accentColor="amber"
        />
        <KpiCard
          icon={CheckCircle2}
          label={t.dashboard.kpiFulfillment}
          value={fulfillmentRatio}
          badge={totalOrders > 0 ? `${completedOrders}/${totalOrders}` : t.noData}
          subtitle={t.dashboard.kpiFulfillmentSub}
          accentColor="violet"
        />
      </div>

      {/* ========================================================================= */}
      {/* FEATURED AI AGENT: COMMAND CENTER BANNER                                  */}
      {/* ========================================================================= */}
      {hydrated && activeBrand ? (
        <section className="mt-6 relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group">
          {/* Subtle ambient light gradient mesh */}
          <div className="absolute -top-24 start-1/4 size-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 end-1/4 size-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          {/* Top illuminated border */}
          <div className="absolute inset-x-0 top-0 h-[2px] brand-gradient" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            {/* Left: Persona Identity & Live Waveform */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-5 min-w-0">
              <div className="relative shrink-0">
                <BrandGlyph icon={activeBrand.iconType} className="size-16 sm:size-20 text-3xl sm:text-4xl" />
                <span className="absolute -bottom-1 -end-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-slate-900">
                  <Zap className="size-3 text-slate-950 fill-slate-950" />
                </span>
              </div>

              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {activeBrand.name}
                  </h2>
                  <Badge className="bg-white/10 text-slate-300 hover:bg-white/15 border-white/10 text-xs font-semibold">
                    {t.categories[activeBrand.category as keyof typeof t.categories] ??
                      activeBrand.category}
                  </Badge>

                  {/* AI Live Status Badge */}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{t.dashboard.aiActive}</span>
                  </span>

                  {/* Model Tag */}
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    <Sparkles className="size-2.5" />
                    <span>{activeBrand.llmModel || "Gemini 3.7 Flash"}</span>
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed max-w-2xl">
                  {activeBrand.tagline || activeBrand.role || "وكيل ذكي مدرب للرد على الاستفسارات والمبيعات الفورية."}
                </p>

                {/* Simulated Waveform & Speed Indicator */}
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Activity className="size-3 text-emerald-400" />
                    <span>زمن الاستجابة: <strong className="text-white font-mono">180ms</strong></span>
                  </div>
                  <span>•</span>
                  <span>اللهجة: <strong className="text-white">{t.dialects[activeBrand.dialect as keyof typeof t.dialects] ?? activeBrand.dialect}</strong></span>
                  <span>•</span>
                  <span>الأصناف: <strong className="text-white">{activeBrand.menuItems?.length ?? 0}</strong></span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0 justify-start lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
              <Button
                size="default"
                className="h-10 sm:h-11 px-5 brand-gradient text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)] ring-1 ring-white/20 active:scale-95"
                asChild
              >
                <Link to="/simulator">
                  <Rocket className="size-4 me-2" />
                  <span>{t.dashboard.liveSimulator}</span>
                </Link>
              </Button>

              <Button
                size="default"
                variant="outline"
                className="h-10 sm:h-11 px-4 text-xs sm:text-sm font-bold rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 active:scale-95"
                asChild
              >
                <Link to="/builder" search={{ step: "identity" }}>
                  <Wrench className="size-4 me-1.5 text-primary" />
                  <span>{lang === "ar" ? "تعديل في الاستوديو" : "Edit in Builder"}</span>
                </Link>
              </Button>

              <Button
                size="default"
                variant="outline"
                className="h-10 sm:h-11 px-4 text-xs sm:text-sm font-bold rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 active:scale-95"
                asChild
              >
                <Link to="/analytics">
                  <ShoppingBag className="size-4 me-1.5 text-cyan-400" />
                  <span>{t.dashboard.crmOrders}</span>
                </Link>
              </Button>

              <Button
                size="default"
                variant="ghost"
                className="h-10 sm:h-11 px-3 text-xs sm:text-sm font-bold rounded-xl text-rose-400 hover:bg-rose-500/15 hover:text-rose-300"
                onClick={() => setBrandToDelete({ id: activeBrand.id, name: activeBrand.name })}
                title="حذف الوكيل"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      ) : hydrated && brands.length === 0 ? (
        <section className="mt-6 glass-card rounded-3xl p-10 text-center shadow-lg border border-white/10 relative overflow-hidden">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl brand-gradient text-white shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)]">
            <Sparkles className="size-8" />
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight text-white">{t.dashboard.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
            {t.dashboard.emptyDesc}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg" className="brand-gradient text-white font-bold rounded-xl shadow-md gap-2">
              <Link to="/builder" search={{ step: "identity" }}>
                <Plus className="size-4" /> {t.dashboard.createAgent}
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {/* ========================================================================= */}
      {/* BRANDS DIRECTORY: PERSONA CARDS GRID                                      */}
      {/* ========================================================================= */}
      <section className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>{t.dashboard.directoryTitle}</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-primary border border-white/10">
                {brands.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === "ar"
                ? "قائمة الوكلاء والنماذج المسجلة في جلستك الحالية"
                : "Registered AI personas and active agent profiles in your sandbox"}
            </p>
          </div>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48 bg-card/70 border-white/10 text-xs font-bold text-white rounded-xl shadow-xs">
              <SelectValue placeholder={t.filterByIndustry} />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/15 text-white">
              <SelectItem value="all">{t.allIndustries}</SelectItem>
              <SelectItem value="Restaurant">{t.categories["Restaurant"]}</SelectItem>
              <SelectItem value="Medical">{t.categories["Medical"]}</SelectItem>
              <SelectItem value="E-commerce">{t.categories["E-commerce"]}</SelectItem>
              <SelectItem value="Real Estate">{t.categories["Real Estate"]}</SelectItem>
              <SelectItem value="Services">{t.categories["Services"]}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-card/30 p-12 text-center text-slate-400 space-y-3">
            <p className="text-sm font-medium">{t.dashboard.emptyFilter}</p>
            <Button size="sm" variant="outline" className="border-white/15 rounded-xl text-white" asChild>
              <Link to="/builder" search={{ step: "identity" }}>
                <Plus className="me-1.5 size-3.5" /> {t.dashboard.createAgent}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((brand) => {
              const orders = leads.filter((l) => l.brandId === brand.id).length;
              const isActive = brand.id === activeBrand?.id;
              return (
                <article
                  key={brand.id}
                  className={`glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group border ${
                    isActive
                      ? "border-emerald-500/50 shadow-[0_0_30px_-6px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/30"
                      : "border-white/10 hover:border-primary/40"
                  }`}
                >
                  {/* Top glowing bar if active */}
                  {isActive && <div className="absolute inset-x-0 top-0 h-[2.5px] brand-gradient" />}

                  <div className="flex items-start gap-3.5">
                    <BrandGlyph icon={brand.iconType} className="size-11 text-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-white text-base leading-snug">
                        {brand.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge className="bg-white/10 text-slate-300 text-[10px] font-semibold border-none py-0">
                          {t.categories[brand.category as keyof typeof t.categories] ??
                            brand.category}
                        </Badge>
                        {brand.isSample && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            Sample
                          </span>
                        )}
                      </div>
                    </div>
                    {isActive ? (
                      <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                        {t.active}
                      </span>
                    ) : null}
                  </div>

                  {/* Metrics Row */}
                  <dl className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {t.dashboard.capturedOrders}
                      </dt>
                      <dd className="mt-0.5 font-bold text-white font-mono text-sm">{orders}</dd>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {t.dashboard.dialect}
                      </dt>
                      <dd className="mt-0.5 font-bold text-white truncate text-xs">
                        {t.dialects[brand.dialect as keyof typeof t.dialects] ?? brand.dialect}
                      </dd>
                    </div>
                  </dl>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => copyPhone(brand.contactInfo?.phone)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs transition-all hover:bg-white/[0.08] hover:border-primary/40 active:scale-[0.98]"
                      title="نسخ رقم الهاتف"
                    >
                      <Phone className="size-3.5 shrink-0 text-slate-400" />
                      <span className="truncate font-semibold text-slate-300 font-mono" dir="ltr">
                        {brand.contactInfo?.phone ?? "—"}
                      </span>
                      <Copy className="ms-auto size-3 shrink-0 text-slate-400" />
                    </button>

                    <Button
                      size="icon"
                      variant="outline"
                      className="size-9 rounded-xl shrink-0 border-white/10 bg-white/5 hover:bg-primary/20 hover:text-primary hover:border-primary/40 active:scale-95 text-slate-300"
                      title={`${t.dashboard.switchContext} ${brand.name}`}
                      aria-label={`${t.dashboard.switchContext} ${brand.name}`}
                      onClick={() => {
                        setActiveBrandId(brand.id);
                        toast.success(`${t.dashboard.switchedContext} ${brand.name}`);
                      }}
                    >
                      <ArrowLeftRight className="size-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 rounded-xl text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 shrink-0 active:scale-95"
                      title={lang === "ar" ? `حذف الوكيل ${brand.name}` : `Delete ${brand.name}`}
                      aria-label={`Delete ${brand.name}`}
                      onClick={() => setBrandToDelete({ id: brand.id, name: brand.name })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {brandToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {lang === "ar" ? "تأكيد حذف الوكيل" : "Confirm Agent Deletion"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {lang === "ar"
                    ? `هل أنت متأكد من رغبتك في حذف الوكيل "${brandToDelete.name}"؟ سيتم حذف كافة الأصناف والبيانات المرتبطة به نهائياً.`
                    : `Are you sure you want to permanently delete "${brandToDelete.name}" and all its catalog items?`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBrandToDelete(null)}
                className="h-9 text-xs border-white/15 bg-white/5 text-white hover:bg-white/10 rounded-xl"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDelete}
                className="h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md"
              >
                <Trash2 className="size-3.5 me-1" />
                {lang === "ar" ? "حذف نهائي" : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
