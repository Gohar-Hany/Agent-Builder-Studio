import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Lock,
  MessageSquare,
  Package,
  Plus,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  Table2,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandGlyph } from "@/components/kayanova/AppShell";
import { RequestDeploymentModal } from "@/components/kayanova/RequestDeploymentModal";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kayanova AI Studio — لوحة القيادة التنفيذية لوكلاء الأعمال" },
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
  const { brands, leads, activeBrand, setActiveBrandId, deleteBrand, hydrated } =
    useKayanova();
  const { t, lang, isRtl } = useLanguage();
  const navigate = useNavigate();

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<{ id: string; name: string } | null>(null);

  // Filter leads for active agent (Strict Isolation)
  const agentLeads = activeBrand
    ? leads.filter((l) => l.brandId === activeBrand.id || l.brandId === activeBrand.name)
    : [];
  const agentOrdersCount = agentLeads.length;
  const agentRevenue = agentLeads.reduce((sum, l) => sum + (l.numericTotal ?? 0), 0);
  const catalogCount = activeBrand?.menuItems?.length ?? 0;

  const confirmDelete = async () => {
    if (!brandToDelete) return;
    const name = brandToDelete.name;
    await deleteBrand(brandToDelete.id);
    setBrandToDelete(null);
    toast.success(
      lang === "ar" ? `تم حذف الوكيل "${name}" بنجاح!` : `Agent "${name}" deleted successfully!`,
    );
  };

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <AppShell
      title={
        activeBrand
          ? lang === "ar"
            ? `لوحة التحكم: ${activeBrand.name}`
            : `${activeBrand.name} Control Center`
          : lang === "ar"
            ? "لوحة القيادة التنفيذية للوكلاء الأذكياء"
            : "Executive AI Operations Dashboard"
      }
      subtitle={
        activeBrand
          ? lang === "ar"
            ? "تحكم في إعدادات وكيلك، اختبر محادثاته المباشرة، واستعرض طلبات عملائك بسلاسة."
            : "Manage your AI agent, test live conversations, and view extracted customer orders."
          : lang === "ar"
            ? "منصة متكاملة لتصميم وتدريب وإطلاق وكلاء المحادثات الذكية لخدمة العملاء والبيع الآلي على مدار الساعة."
            : "Enterprise platform to design, test, and deploy AI customer service & sales agents 24/7."
      }
      actions={
        <div className="flex items-center gap-2 shrink-0">
          {brands.length > 1 && activeBrand && (
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
              <span>{lang === "ar" ? "إنشاء وكيل جديد" : "New Agent"}</span>
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-8 max-w-7xl mx-auto pb-10">
        {/* ===================================================================== */}
        {/* TOP HERO: ACTIVE AGENT STATUS BAR OR EXECUTIVE WELCOME BANNER          */}
        {/* ===================================================================== */}
        {activeBrand ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <BrandGlyph
                    brand={activeBrand}
                    className="size-14 sm:size-16 rounded-2xl ring-2 ring-emerald-500/30 shadow-xs"
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
                    <Badge variant="outline" className="text-xs font-medium">
                      {t.dialects[activeBrand.dialect as keyof typeof t.dialects] ?? activeBrand.dialect}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    {activeBrand.tagline ||
                      activeBrand.role ||
                      (lang === "ar" ? "الوكيل الذكي المخصص لخدمة عملائك وتأكيد الطلبات" : "Dedicated AI Business Agent")}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
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

            {/* Quick Metrics for Active Agent */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
              <div className="rounded-xl bg-secondary/50 p-3.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {lang === "ar" ? "أصناف الكتالوج / الخدمات" : "Catalog Items"}
                </p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {catalogCount}
                </p>
              </div>

              <div className="rounded-xl bg-secondary/50 p-3.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {lang === "ar" ? "الطلبات المستخرجة" : "Captured Orders"}
                </p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {agentOrdersCount}
                </p>
              </div>

              <div className="rounded-xl bg-secondary/50 p-3.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {lang === "ar" ? "إجمالي مبيعات الوكيل" : "Total Captured Sales"}
                </p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {egp(agentRevenue, lang)}
                </p>
              </div>

              <div className="rounded-xl bg-secondary/50 p-3.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {lang === "ar" ? "محرك الذكاء الاصطناعي" : "AI Core Engine"}
                </p>
                <p className="text-sm font-bold font-mono text-foreground mt-1 truncate">
                  Gemini 3.7 Flash
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{lang === "ar" ? "استوديو وكلاء الذكاء الاصطناعي للأعمال" : "Kayanova Enterprise AI Studio"}</span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                  {lang === "ar"
                    ? "مركز القيادة والتحكم لوكلاء المحادثات الذكية"
                    : "Autonomous AI Agent Operations & Command Center"}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "صمم، درب، واختبر وكيل ذكاء اصطناعي مخصص لنشاطك التجاري للرد الفوري على عملائك، تقديم الأسعار بدقة، وتأكيد طلبات البيع 24/7 عبر واتساب وموقعك."
                    : "Build, customize, and deploy dedicated AI business agents to assist customers, answer product questions with locked prices, and capture orders 24/7."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                <Button
                  size="lg"
                  className="h-11 px-6 gap-2 brand-gradient text-white text-sm font-bold rounded-xl shadow-xs"
                  asChild
                >
                  <Link to="/builder" search={{ step: "identity" }}>
                    <Plus className="size-4" />
                    <span>{lang === "ar" ? "بدء إنشاء وكيل جديد الآن ⚡" : "Create New AI Agent ⚡"}</span>
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 px-5 gap-2 text-sm font-bold rounded-xl border-border bg-background"
                  asChild
                >
                  <Link to="/simulator">
                    <MessageSquare className="size-4 text-emerald-600" />
                    <span>{lang === "ar" ? "تجربة المحاكي المباشر" : "Open Live Simulator"}</span>
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{lang === "ar" ? "استجابة فورية < 1 ثانية" : "Sub-second response"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{lang === "ar" ? "حماية صارمة للأسعار" : "Strict pricing guardrails"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{lang === "ar" ? "استخراج فوري للأوردرات" : "Auto-extracted CRM leads"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{lang === "ar" ? "دعم اللهجات العربية بطلاقة" : "Multi-dialect Arabic & English"}</span>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* SECTION: 4 CORE OPERATIONAL HUB CARDS                                */}
        {/* ===================================================================== */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                {lang === "ar" ? "بوابات التحكم ومساحات العمل" : "Core Operational Hubs"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "ar"
                  ? "الوصول السريع لجميع أدوات تصميم وتدريب واختبار الوكيل ومتابعة مبيعاته"
                  : "Quick access to builder, real-time testing, CRM leads, and live deployments"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Builder Studio */}
            <Link
              to="/builder"
              search={{ step: "identity" }}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 group-hover:scale-110 transition-transform">
                    <Sliders className="size-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {lang === "ar" ? "التخصيص والتدريب" : "Studio"}
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {lang === "ar" ? "استوديو بناء الوكيل" : "Agent Builder Studio"}
                </h4>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "حدد هوية الوكيل، نبرة التحدث، أضف قائمة المنتجات والأسعار، ودرب الوكيل بقواعد دقيقة لمنع الهلوسة."
                    : "Configure persona, dialect, pricing catalog items, and strict guardrails to eliminate hallucinations."}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-bold text-primary">
                <span>{lang === "ar" ? "دخول الاستوديو" : "Open Studio"}</span>
                <ArrowIcon className="size-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 2. Live Simulator */}
            <Link
              to="/simulator"
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-emerald-500 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 group-hover:scale-110 transition-transform">
                    <MessageSquare className="size-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    {lang === "ar" ? "المحاكاة الحية" : "Live Chat"}
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {lang === "ar" ? "المحاكي المباشر للشات" : "Live Chat Simulator"}
                </h4>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "تحدث مع وكيلك في بيئة محاكاة واقعية للتأكد من طريقة رده واستخراجه للطلبات والبيانات بدقة."
                    : "Simulate live customer chats in real time to test reasoning, dialect fluency, and auto-order extraction."}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-bold text-primary">
                <span>{lang === "ar" ? "بدء المحاكاة" : "Launch Simulator"}</span>
                <ArrowIcon className="size-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 3. CRM & Orders Hub */}
            <Link
              to="/analytics"
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-purple-500 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 group-hover:scale-110 transition-transform">
                    <Table2 className="size-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                    {lang === "ar" ? "سجل المبيعات" : "CRM Hub"}
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {lang === "ar" ? "سجل الطلبات والعملاء" : "Agent Orders & CRM"}
                </h4>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? `لوحة متابعة مركزية لجميع الطلبات المسجلة آلياً مع تفاصيل العميل، الهاتف، العنوان، وإجمالي الفاتورة.`
                    : `Inspect all auto-extracted customer orders, phone numbers, delivery addresses, and order totals.`}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-bold text-primary">
                <span>{lang === "ar" ? "استعراض السجل" : "Open CRM"}</span>
                <ArrowIcon className="size-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 4. WhatsApp Channel Deployment */}
            <div
              onClick={() => setIsDeployModalOpen(true)}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 group-hover:scale-110 transition-transform">
                    <Rocket className="size-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    {lang === "ar" ? "ربط واتساب" : "Deployment"}
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {lang === "ar" ? "تفعيل ونشر الوكيل" : "WhatsApp Deployment"}
                </h4>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "اربط وكيلك برقم واتساب بيزنس أو ادمجه في موقعك لبدء استقبال المحادثات والمبيعات آلياً 24/7."
                    : "Connect your production agent to WhatsApp Business API or embed into your website for 24/7 automation."}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-bold text-primary">
                <span>{lang === "ar" ? "طلب التفعيل والربط" : "Deploy Channel"}</span>
                <ArrowIcon className="size-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* SECTION: 4-STEP AGENT CREATION & LAUNCH GUIDE                         */}
        {/* ===================================================================== */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                <Zap className="size-3.5" />
                <span>{lang === "ar" ? "دليل الإعداد السريع" : "Quick-Start Guided Workflow"}</span>
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {lang === "ar" ? "كيف تبني وتطلق وكيلك الذكي في 4 خطوات سهلة؟" : "How to Build & Deploy Your AI Agent in 4 Easy Steps"}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground max-w-sm">
              {lang === "ar"
                ? "مسار عمل متكامل ومباشر ينقلك من الفكرة إلى وكيل شغال على واتساب بكل احترافية."
                : "A step-by-step roadmap from initial persona setup to live customer activation."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-extrabold">
                    01
                  </span>
                  <Bot className="size-4 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  {lang === "ar" ? "الهوية والنبرة" : "1. Persona & Dialect"}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "اختر اسم الوكيل، مجال نشاطك التجاري، واللهجة المفضلة (عامية مصرية، خليجية، أو فصحى)."
                    : "Name your agent, choose your industry, and select the ideal dialect (Egyptian, Gulf, or English)."}
                </p>
              </div>
              <Button size="sm" variant="secondary" className="w-full text-xs font-bold h-8" asChild>
                <Link to="/builder" search={{ step: "identity" }}>
                  <span>{lang === "ar" ? "ضبط الهوية" : "Set Identity"}</span>
                  <ArrowIcon className="size-3.5 ms-1" />
                </Link>
              </Button>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-extrabold">
                    02
                  </span>
                  <Package className="size-4 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  {lang === "ar" ? "قائمة الأسعار والخدمات" : "2. Catalog & Pricing"}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "أدخل منتجاتك أو خدماتك بالأسعار الرسمية ليعتمدها الوكيل بدقة دون أي تخمين أو خطأ."
                    : "Add menu or service items with fixed prices so the agent quotes accurately with zero guesswork."}
                </p>
              </div>
              <Button size="sm" variant="secondary" className="w-full text-xs font-bold h-8" asChild>
                <Link to="/builder" search={{ step: "menu" }}>
                  <span>{lang === "ar" ? "إضافة القائمة" : "Add Catalog"}</span>
                  <ArrowIcon className="size-3.5 ms-1" />
                </Link>
              </Button>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-extrabold">
                    03
                  </span>
                  <ShieldCheck className="size-4 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  {lang === "ar" ? "سياسات العمل والردود" : "3. Rules & Guardrails"}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "ضع مواعيد العمل، شروط التوصيل، سياسات الدفع، وقواعد تحويل المحادثة إلى موظف بشري."
                    : "Define operating hours, delivery terms, payment methods, and human handoff conditions."}
                </p>
              </div>
              <Button size="sm" variant="secondary" className="w-full text-xs font-bold h-8" asChild>
                <Link to="/builder" search={{ step: "rules" }}>
                  <span>{lang === "ar" ? "تحديد السياسات" : "Set Guardrails"}</span>
                  <ArrowIcon className="size-3.5 ms-1" />
                </Link>
              </Button>
            </div>

            {/* Step 4 */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-extrabold">
                    04
                  </span>
                  <Rocket className="size-4 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  {lang === "ar" ? "المحاكاة والنشر المباشر" : "4. Test & Launch"}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "جرب المحادثة الحية في المحاكي وتأكد من استخراج الأوردر، ثم اطلب ربط الوكيل برقم واتساب."
                    : "Test real-time chat in the simulator to verify order capture, then deploy to WhatsApp."}
                </p>
              </div>
              <Button size="sm" variant="secondary" className="w-full text-xs font-bold h-8" asChild>
                <Link to="/simulator">
                  <span>{lang === "ar" ? "تجربة الشات" : "Open Simulator"}</span>
                  <ArrowIcon className="size-3.5 ms-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* SECTION: ENTERPRISE TRUST & CAPABILITIES GRID                        */}
        {/* ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="size-4" />
            </div>
            <h4 className="text-xs font-bold text-foreground">
              {lang === "ar" ? "حماية صارمة للأسعار" : "Strict Pricing Guardrail"}
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {lang === "ar"
                ? "لا يمكن للوكيل تغيير الأسعار أو قبول مساومات غير مصرح بها خارج كتالوجك المعتمد."
                : "The AI strictly adheres to your configured pricing with zero room for unauthorized discounts."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <ShoppingBag className="size-4" />
            </div>
            <h4 className="text-xs font-bold text-foreground">
              {lang === "ar" ? "استخراج فوري للطلبات" : "Zero-Latency Lead Capture"}
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {lang === "ar"
                ? "تحويل المحادثات تلقائياً إلى طلبيات منظمة في جدول الـ CRM مع الاسم والهاتف والعنوان."
                : "Conversations automatically parse into structured CRM leads with customer contact and totals."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              <Bot className="size-4" />
            </div>
            <h4 className="text-xs font-bold text-foreground">
              {lang === "ar" ? "ذكاء لغوي متقدم باللهجات" : "Dialect-Native Intelligence"}
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {lang === "ar"
                ? "فهم دقيق للمصطلحات المصرية والعامية الخليجية دون الخروج عن الاحترافية المحددة."
                : "Native comprehension of Egyptian and Gulf slang while maintaining business etiquette."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Lock className="size-4" />
            </div>
            <h4 className="text-xs font-bold text-foreground">
              {lang === "ar" ? "بيئة تجريبية معزولة ومحمية" : "Client Sandbox Security"}
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {lang === "ar"
                ? "بياناتك ونماذجك التجريبية خاصة بمتصفحك فقط ولا تختلط ببيانات أي مستخدم آخر."
                : "Draft agents and test orders are isolated and visible only within your secure session."}
            </p>
          </div>
        </div>
      </div>

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
