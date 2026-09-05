import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Package,
  Plus,
  Rocket,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandGlyph } from "@/components/kayanova/AppShell";
import { RequestDeploymentModal } from "@/components/kayanova/RequestDeploymentModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { egp, useKayanova } from "@/lib/kayanova/store";
import { blankBrand } from "@/lib/kayanova/presets";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kayanova AI Studio — مساحة عمل وكيلك الذكي" },
      {
        name: "description",
        content:
          "صمم، اختبر، وفعل وكيل الذكاء الاصطناعي الخاص بنشاطك التجاري للرد على العملاء وتأكيد الطلبات تلقائياً.",
      },
      { property: "og:title", content: "Kayanova AI Studio" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { brands, leads, contacts, activeBrand, setActiveBrandId, saveBrand, deleteBrand, hydrated } =
    useKayanova();
  const { t, lang, isRtl } = useLanguage();
  const navigate = useNavigate();

  // Quick-start creator state for fresh users
  const [quickName, setQuickName] = useState("");
  const [quickCategory, setQuickCategory] = useState("Restaurant");
  const [quickDialect, setQuickDialect] = useState("Egyptian Arabic");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<{ id: string; name: string } | null>(null);

  // Filter leads and contacts for the active agent only (Strict Isolation)
  const agentLeads = activeBrand
    ? leads.filter((l) => l.brandId === activeBrand.id || l.brandId === activeBrand.name)
    : [];
  const agentOrdersCount = agentLeads.length;
  const agentRevenue = agentLeads.reduce((sum, l) => sum + (l.numericTotal ?? 0), 0);
  const catalogCount = activeBrand?.menuItems?.length ?? 0;

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      toast.error(
        lang === "ar"
          ? "يرجى كتابة اسم النشاط التجاري أو اسم الوكيل"
          : "Please enter your business or agent name",
      );
      return;
    }
    setIsCreating(true);
    try {
      const newBrand = {
        ...blankBrand(),
        name: quickName.trim(),
        category: quickCategory,
        dialect: quickDialect,
        role:
          lang === "ar"
            ? "مستشار خدمة العملاء وتأكيد الطلبات"
            : "Customer Support & Sales Representative",
      };
      await saveBrand(newBrand);
      setActiveBrandId(newBrand.id);
      toast.success(
        lang === "ar"
          ? `تم إنشاء مساحة عمل "${quickName}" بنجاح!`
          : `Workspace created for "${quickName}"!`,
      );
      navigate({ to: "/builder", search: { step: "identity" } });
    } catch {
      toast.error(lang === "ar" ? "حدث خطأ أثناء الإنشاء" : "Failed to create agent");
    } finally {
      setIsCreating(false);
    }
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
      title={
        activeBrand
          ? lang === "ar"
            ? `مساحة عمل: ${activeBrand.name}`
            : `${activeBrand.name} Workspace`
          : lang === "ar"
            ? "استوديو بناء الوكلاء الأذكياء"
            : "Agent Builder Studio"
      }
      subtitle={
        activeBrand
          ? lang === "ar"
            ? "تحكم في إعدادات وكيلك، اختبر محادثاته المباشرة، واستعرض طلبات عملائك بسلاسة."
            : "Manage your AI agent, test live conversations, and view extracted customer orders."
          : lang === "ar"
            ? "أنشئ وخصص وكيل ذكاء اصطناعي لخدمة عملائك وتأكيد طلباتك تلقائياً."
            : "Build and customize your dedicated AI business agent."
      }
      actions={
        activeBrand ? (
          <div className="flex items-center gap-2 shrink-0">
            {brands.length > 1 && (
              <Select value={activeBrand.id} onValueChange={setActiveBrandId}>
                <SelectTrigger className="h-9 w-40 sm:w-48 bg-card border-border text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs font-bold" asChild>
              <Link to="/builder" search={{ step: "identity" }}>
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">
                  {lang === "ar" ? "إنشاء وكيل جديد" : "New Agent"}
                </span>
              </Link>
            </Button>
          </div>
        ) : null
      }
    >
      {/* ===================================================================== */}
      {/* CASE 1: FRESH USER — ZERO CLUTTER 1-MINUTE QUICK-START ONBOARDING     */}
      {/* ===================================================================== */}
      {hydrated && brands.length === 0 ? (
        <div className="max-w-2xl mx-auto py-6 sm:py-10">
          <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl brand-gradient text-white shadow-md mb-4">
              <Sparkles className="size-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {lang === "ar"
                ? "ابدأ بتصميم وكيلك الذكي لنشاطك التجاري"
                : "Build Your Custom AI Business Agent"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {lang === "ar"
                ? "وكيل ذكي مخصص للرد الفوري على استفسارات عملائك وتأكيد طلبات البيع عبر واتساب والموقع على مدار الساعة بدون أي تعقيد."
                : "A dedicated AI agent trained to assist your customers, answer questions, and capture orders 24/7."}
            </p>

            {/* Simple Direct Creation Form */}
            <form onSubmit={handleQuickCreate} className="mt-8 space-y-4 text-start max-w-md mx-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {lang === "ar" ? "اسم النشاط التجاري أو اسم الوكيل" : "Business or Agent Name"}
                  <span className="text-primary ms-1">*</span>
                </label>
                <Input
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder={
                    lang === "ar"
                      ? "مثال: مطعم بيتزا هاوس / عيادة د. سارة / متجر النور"
                      : "e.g., Pizza House / Dr. Sarah Clinic / Boutique"
                  }
                  className="h-11 bg-background text-sm font-medium rounded-xl"
                  required
                  dir="auto"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {lang === "ar" ? "مجال النشاط" : "Industry Category"}
                  </label>
                  <Select value={quickCategory} onValueChange={setQuickCategory}>
                    <SelectTrigger className="h-10 bg-background text-xs font-semibold rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Restaurant">
                        {lang === "ar" ? "مطاعم وكافيهات" : "Restaurant & Cafe"}
                      </SelectItem>
                      <SelectItem value="Medical">
                        {lang === "ar" ? "طبي وعيادات" : "Medical & Clinic"}
                      </SelectItem>
                      <SelectItem value="E-commerce">
                        {lang === "ar" ? "متاجر وتجارة إلكترونية" : "E-commerce & Retail"}
                      </SelectItem>
                      <SelectItem value="Real Estate">
                        {lang === "ar" ? "عقارات وتطوير" : "Real Estate"}
                      </SelectItem>
                      <SelectItem value="Services">
                        {lang === "ar" ? "شركات وخدمات عامة" : "Services & Agency"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {lang === "ar" ? "لهجة المحادثة" : "Conversation Dialect"}
                  </label>
                  <Select value={quickDialect} onValueChange={setQuickDialect}>
                    <SelectTrigger className="h-10 bg-background text-xs font-semibold rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Egyptian Arabic">
                        {lang === "ar" ? "لهجة مصرية عامية" : "Egyptian Arabic"}
                      </SelectItem>
                      <SelectItem value="Gulf Arabic">
                        {lang === "ar" ? "لهجة خليجية" : "Gulf Arabic"}
                      </SelectItem>
                      <SelectItem value="Saudi Arabic">
                        {lang === "ar" ? "لهجة سعودية" : "Saudi Arabic"}
                      </SelectItem>
                      <SelectItem value="Modern Standard Arabic">
                        {lang === "ar" ? "عربية فصحى" : "Standard Arabic"}
                      </SelectItem>
                      <SelectItem value="English">
                        {lang === "ar" ? "الإنجليزية (English)" : "English"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isCreating || !quickName.trim()}
                className="w-full h-11 text-sm font-bold brand-gradient text-white rounded-xl shadow-xs mt-2"
              >
                <Sparkles className="size-4 me-2" />
                <span>
                  {isCreating
                    ? lang === "ar"
                      ? "جاري التجهيز..."
                      : "Setting up..."
                    : lang === "ar"
                      ? "بدء تخصيص وتدريب الوكيل الذكي ⚡"
                      : "Start Customizing Agent ⚡"}
                </span>
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                {lang === "ar" ? "لا يحتاج لأي خبرة برمجية" : "No coding required"}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                {lang === "ar" ? "تجربة محادثة حية وفورية" : "Live instant chat testing"}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                {lang === "ar" ? "جاهز للربط مع واتساب" : "Ready for WhatsApp integration"}
              </span>
            </div>
          </div>
        </div>
      ) : activeBrand ? (
        /* ===================================================================== */
        /* CASE 2: USER HAS AN ACTIVE AGENT — CLEAN FOCUSED COMMAND CENTER       */
        /* ===================================================================== */
        <div className="space-y-6">
          {/* Main Active Agent Identity Banner */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <BrandGlyph
                    brand={activeBrand}
                    className="size-14 sm:size-16 rounded-2xl ring-2 ring-emerald-500/30 shadow-sm"
                  />
                  <span className="absolute -bottom-1 -end-1 size-3.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">
                      {activeBrand.name}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {lang === "ar" ? "متصل وجاهز للعمل" : "Live & Ready"}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {t.dialects[activeBrand.dialect as keyof typeof t.dialects] ?? activeBrand.dialect}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    {activeBrand.tagline ||
                      activeBrand.role ||
                      (lang === "ar" ? "الوكيل الذكي المخصص لخدمة عملائك" : "Dedicated AI Business Agent")}
                  </p>
                </div>
              </div>

              {/* Fast Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={() => setIsDeployModalOpen(true)}
                  className="flex-1 sm:flex-initial h-10 px-4 gap-1.5 brand-gradient text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs"
                >
                  <Rocket className="size-4" />
                  <span>{lang === "ar" ? "طلب تفعيل ونشر الوكيل" : "Deploy Agent"}</span>
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 text-destructive hover:bg-rose-50 hover:text-destructive border-border shrink-0"
                  onClick={() => setBrandToDelete({ id: activeBrand.id, name: activeBrand.name })}
                  title={lang === "ar" ? "حذف الوكيل" : "Delete Agent"}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            {/* Quick Metrics for THIS Agent Only */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
              <div className="rounded-xl bg-secondary/50 p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  {lang === "ar" ? "أصناف الكتالوج / الخدمات" : "Catalog Items"}
                </p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-1">
                  {catalogCount}
                </p>
              </div>

              <div className="rounded-xl bg-secondary/50 p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  {lang === "ar" ? "الطلبات المستخرجة" : "Captured Orders"}
                </p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-1">
                  {agentOrdersCount}
                </p>
              </div>

              <div className="rounded-xl bg-secondary/50 p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  {lang === "ar" ? "إجمالي مبيعات الوكيل" : "Total Captured Sales"}
                </p>
                <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {egp(agentRevenue, lang)}
                </p>
              </div>

              <div className="rounded-xl bg-secondary/50 p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  {lang === "ar" ? "موديل الذكاء الاصطناعي" : "AI Core Engine"}
                </p>
                <p className="text-xs sm:text-sm font-bold font-mono text-foreground mt-1 truncate">
                  Gemini 3.7 Flash
                </p>
              </div>
            </div>
          </div>

          {/* 3 Large, Clean, Focused Action Cards (No Clutter) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Live Simulator */}
            <Link
              to="/simulator"
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mb-4 group-hover:scale-110 transition-transform">
                  <MessageSquare className="size-5" />
                </div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {lang === "ar" ? "تجربة المحادثة المباشرة" : "Live Chat Simulator"}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "تحدث مع وكيلك الآن مباشرة وتأكد من طريقة رده واستخراجه للطلبات والبيانات بدقة."
                    : "Test conversation flow, role responses, and real-time order extraction."}
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1 text-xs font-bold text-primary">
                <span>{lang === "ar" ? "فتح الشات المباشر" : "Open Chat Simulator"}</span>
                {isRtl ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
              </div>
            </Link>

            {/* 2. Studio Builder */}
            <Link
              to="/builder"
              search={{ step: "identity" }}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 mb-4 group-hover:scale-110 transition-transform">
                  <Settings className="size-5" />
                </div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {lang === "ar" ? "استوديو التخصيص والتدريب" : "Agent Studio Builder"}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "عدل التعليمات، أضف قائمة المنتجات والأسعار، واستخدم أدوات التوليد الذكي لتدريب الوكيل."
                    : "Customize directives, menu catalog items, pricing, and guardrail rules."}
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1 text-xs font-bold text-primary">
                <span>{lang === "ar" ? "تعديل إعدادات الوكيل" : "Edit Agent Directives"}</span>
                {isRtl ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
              </div>
            </Link>

            {/* 3. Sales & Leads CRM */}
            <Link
              to="/analytics"
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex size-11 items-center justify-center rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 mb-4 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="size-5" />
                </div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {lang === "ar" ? "طلبات وعملاء وكيلك" : "Captured Orders & CRM"}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? `استعرض ${agentOrdersCount} طلب ومعاملة تم تسجيلها تلقائياً مع تفاصيل التوصيل والأرقام.`
                    : `Inspect ${agentOrdersCount} orders extracted from live customer chats.`}
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1 text-xs font-bold text-primary">
                <span>{lang === "ar" ? "عرض سجل المبيعات والعملاء" : "View Orders & Leads"}</span>
                {isRtl ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
              </div>
            </Link>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {brandToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
                    ? `هل أنت متأكد من حذف الوكيل "${brandToDelete.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                    : `Are you sure you want to delete "${brandToDelete.name}"? This action cannot be undone.`}
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
                {lang === "ar" ? "حذف نهائي" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Modal */}
      <RequestDeploymentModal
        open={isDeployModalOpen}
        onOpenChange={setIsDeployModalOpen}
        brand={activeBrand}
      />
    </AppShell>
  );
}
