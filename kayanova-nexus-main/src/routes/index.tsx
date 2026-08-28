import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Copy,
  Phone,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
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
      { title: "Kayanova Agent Studio" },
      {
        name: "description",
        content:
          "Monitor every AI agent brand, captured orders, and conversion health across your multi-tenant Kayanova workspace.",
      },
      { property: "og:title", content: "Kayanova Agent Studio" },
      {
        property: "og:description",
        content:
          "Monitor every AI agent brand, captured orders, and conversion health across your multi-tenant Kayanova workspace.",
      },
    ],
  }),
  component: Dashboard,
});

function Kpi({
  icon: Icon,
  label,
  value,
  badge,
  subtitle,
  accentColor = "primary",
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
  badge?: string;
  subtitle?: string;
  accentColor?: "primary" | "blue" | "amber" | "violet";
}) {
  const colorMap = {
    primary:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    amber:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    violet:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  };
  const iconColors = colorMap[accentColor];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* subtle top gradient accent line */}
      <div
        className={`absolute inset-x-0 top-0 h-[3px] rounded-t-2xl ${
          accentColor === "primary"
            ? "brand-gradient"
            : accentColor === "blue"
              ? "bg-gradient-to-r from-blue-500 to-cyan-500"
              : accentColor === "amber"
                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : "bg-gradient-to-r from-violet-500 to-purple-500"
        }`}
      />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${iconColors}`}
        >
          <Icon className="size-4.5" />
        </div>
        {badge ? (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground whitespace-nowrap">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[28px] font-extrabold tracking-tight text-foreground leading-none">
        {value}
      </p>
      <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {subtitle ? <p className="mt-1 text-[11px] text-muted-foreground/80">{subtitle}</p> : null}
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
        <Button asChild>
          <Link to="/builder" search={{ step: "identity" }}>
            {t.dashboard.newAgentBtn}
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Building2}
          label={t.dashboard.kpiBrands}
          value={totalBrands}
          badge={totalBrands > 0 ? `${totalBrands} ${t.active}` : t.noData}
          subtitle={t.dashboard.kpiBrandsSub}
          accentColor="primary"
        />
        <Kpi
          icon={ShoppingBag}
          label={t.dashboard.kpiOrders}
          value={totalOrders}
          badge={totalRevenue > 0 ? egp(totalRevenue, lang) : egp(0, lang)}
          subtitle={t.dashboard.kpiOrdersSub}
          accentColor="blue"
        />
        <Kpi
          icon={Users}
          label={t.dashboard.kpiContacts}
          value={totalContacts}
          badge={totalContacts > 0 ? `${totalContacts}` : t.noData}
          subtitle={t.dashboard.kpiContactsSub}
          accentColor="amber"
        />
        <Kpi
          icon={CheckCircle2}
          label={t.dashboard.kpiFulfillment}
          value={fulfillmentRatio}
          badge={totalOrders > 0 ? `${completedOrders}/${totalOrders}` : t.noData}
          subtitle={t.dashboard.kpiFulfillmentSub}
          accentColor="violet"
        />
      </div>

      {hydrated && activeBrand ? (
        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="brand-gradient h-1 w-full" />
          <div className="flex flex-wrap items-center gap-5 p-6">
            <BrandGlyph icon={activeBrand.iconType} className="size-16 text-3xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{activeBrand.name}</h2>
                <Badge variant="secondary">
                  {t.categories[activeBrand.category as keyof typeof t.categories] ??
                    activeBrand.category}
                </Badge>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />{" "}
                  {t.dashboard.aiActive}
                </span>
                <Badge variant="outline" className="border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300">
                  {t.dashboard.trainingComplete}
                </Badge>
                {activeBrand.guardrails?.bookingMode ? (
                  <Badge variant="outline">{t.dashboard.bookingsEnabled}</Badge>
                ) : null}
              </div>
              <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                {activeBrand.tagline}
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Button size="default" className="h-10 sm:h-11 px-4 text-xs sm:text-sm font-bold rounded-xl shadow-xs" asChild>
                  <Link to="/simulator">{t.dashboard.liveSimulator}</Link>
                </Button>
                <Button size="default" variant="secondary" className="h-10 sm:h-11 px-4 text-xs sm:text-sm font-bold rounded-xl" asChild>
                  <Link to="/analytics">{t.dashboard.crmOrders}</Link>
                </Button>
                <Button size="default" variant="secondary" className="h-10 sm:h-11 px-4 text-xs sm:text-sm font-bold rounded-xl" asChild>
                  <Link to="/builder" search={{ step: "identity" }}>
                    {lang === "ar" ? "تعديل في الاستوديو" : "Edit in Builder"}
                  </Link>
                </Button>
                <Button size="default" variant="outline" className="h-10 sm:h-11 px-4 text-xs sm:text-sm font-bold rounded-xl border-border" asChild>
                  <Link to="/analytics">{t.dashboard.analytics}</Link>
                </Button>
                <Button
                  size="default"
                  variant="ghost"
                  className="h-10 sm:h-11 px-3 text-xs sm:text-sm font-bold rounded-xl text-destructive hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-destructive"
                  onClick={() => setBrandToDelete({ id: activeBrand.id, name: activeBrand.name })}
                >
                  <Trash2 className="size-4 me-1.5" />
                  <span>{lang === "ar" ? "حذف الوكيل" : "Delete Agent"}</span>
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : hydrated && brands.length === 0 ? (
        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl brand-gradient text-white shadow-md">
            <Sparkles className="size-8" />
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight">{t.dashboard.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {t.dashboard.emptyDesc}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/builder" search={{ step: "identity" }}>
                <Plus className="size-4" /> {t.dashboard.createAgent}
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{t.dashboard.directoryTitle}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "ar"
                ? `${brands.length} وكيل مسجل في المنصة`
                : `${brands.length} registered agent${brands.length !== 1 ? "s" : ""} on platform`}
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48 bg-card shadow-xs">
              <SelectValue placeholder={t.filterByIndustry} />
            </SelectTrigger>
            <SelectContent>
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
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
            <p className="text-sm font-medium">{t.dashboard.emptyFilter}</p>
            <Button size="sm" variant="outline" className="mt-3" asChild>
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
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                    isActive ? "border-emerald-400 ring-1 ring-emerald-300" : "border-border"
                  }`}
                >
                  {isActive && <div className="absolute inset-x-0 top-0 h-[2px] brand-gradient" />}
                  <div className="flex items-start gap-3">
                    <BrandGlyph icon={brand.iconType} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-foreground">{brand.name}</p>
                      <Badge variant="secondary" className="mt-1 text-[11px]">
                        {t.categories[brand.category as keyof typeof t.categories] ??
                          brand.category}
                      </Badge>
                    </div>
                    {isActive ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                        {t.active}
                      </span>
                    ) : null}
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-secondary/50 px-3 py-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.dashboard.capturedOrders}
                      </dt>
                      <dd className="mt-0.5 font-bold text-foreground">{orders}</dd>
                    </div>
                    <div className="rounded-xl bg-secondary/50 px-3 py-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.dashboard.dialect}
                      </dt>
                      <dd className="mt-0.5 font-bold text-foreground truncate">
                        {t.dialects[brand.dialect as keyof typeof t.dialects] ?? brand.dialect}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => copyPhone(brand.contactInfo?.phone)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5 text-sm transition-all hover:bg-accent hover:border-emerald-300 active:scale-[0.98] min-h-[42px]"
                    >
                      <Phone className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-semibold">
                        {brand.contactInfo?.phone ?? "—"}
                      </span>
                      <Copy className="ms-auto size-4 shrink-0 text-muted-foreground" />
                    </button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-10.5 rounded-xl shrink-0 active:scale-95"
                      title={`${t.dashboard.switchContext} ${brand.name}`}
                      aria-label={`${t.dashboard.switchContext} ${brand.name}`}
                      onClick={() => {
                        setActiveBrandId(brand.id);
                        toast.success(`${t.dashboard.switchedContext} ${brand.name}`);
                      }}
                    >
                      <ArrowLeftRight className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-10.5 rounded-xl text-destructive hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-destructive shrink-0 active:scale-95"
                      title={lang === "ar" ? `حذف الوكيل ${brand.name}` : `Delete ${brand.name}`}
                      aria-label={`Delete ${brand.name}`}
                      onClick={() => setBrandToDelete({ id: brand.id, name: brand.name })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {brandToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {lang === "ar" ? "تأكيد حذف الوكيل" : "Confirm Agent Deletion"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "ar"
                    ? `هل أنت متأكد من رغبتك في حذف الوكيل "${brandToDelete.name}"؟ سيتم حذف كافة الأصناف والبيانات المرتبطة به نهائياً.`
                    : `Are you sure you want to permanently delete "${brandToDelete.name}" and all its catalog items?`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBrandToDelete(null)}
                className="h-9 text-xs sm:text-sm"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDelete}
                className="h-9 text-xs sm:text-sm font-semibold"
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
