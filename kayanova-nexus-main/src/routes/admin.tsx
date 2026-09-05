import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Instagram,
  KeyRound,
  Lock,
  LogOut,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAdminOverviewApi,
  fetchAdminLeadsApi,
  updateAdminLeadStatusApi,
  deleteAdminLeadApi,
  fetchAdminAllBrandsApi,
  fetchAdminAllOrdersApi,
  purgeAdminTestDataApi,
  verifyAdminKeyApi,
} from "@/lib/kayanova/api";
import type { AdminOverviewData, BrandProfile, ExtractedLead, PlatformLead } from "@/lib/kayanova/types";
import { egp } from "@/lib/kayanova/store";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Master Admin Operations Portal — Kayanova" },
      {
        name: "description",
        content: "Central executive administration dashboard for Kayanova Agent Studio.",
      },
    ],
  }),
  component: AdminPage,
});

const STORAGE_ADMIN_KEY = "kayanova_admin_token";

const CHANNEL_ICONS: Record<string, { label: string; icon: any; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300" },
  instagram: { label: "Instagram", icon: Instagram, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200" },
  messenger: { label: "Messenger", icon: MessageSquare, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200" },
  web: { label: "Web Chat", icon: Globe, color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border-violet-200" },
};

function formatCleanPhone(raw: string): string {
  let cleaned = (raw || "").replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  } else if (cleaned.startsWith("01")) {
    cleaned = "+2" + cleaned;
  }
  return cleaned.replace("+", "");
}

function AdminPage() {
  const { lang, dir } = useLanguage();
  const [adminKey, setAdminKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_ADMIN_KEY) || "";
    }
    return "";
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "brands" | "orders">("leads");
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [leads, setLeads] = useState<PlatformLead[]>([]);
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [orders, setOrders] = useState<ExtractedLead[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchLeadQuery, setSearchLeadQuery] = useState("");

  // Auto verify if key is present
  useEffect(() => {
    if (adminKey) {
      void handleVerifyKey(adminKey);
    }
  }, []);

  const handleVerifyKey = async (key: string) => {
    setIsVerifying(true);
    try {
      const res = await verifyAdminKeyApi(key);
      if (res.valid) {
        setIsAuthenticated(true);
        setAdminKey(key);
        localStorage.setItem(STORAGE_ADMIN_KEY, key);
        toast.success(lang === "ar" ? "تم تسجيل الدخول بنجاح" : "Admin authenticated successfully");
        void loadAllData(key);
      } else {
        toast.error(lang === "ar" ? "مفتاح الدخول غير صحيح" : "Invalid admin access key");
      }
    } catch (e: any) {
      toast.error(lang === "ar" ? "تعذر التحقق من المفتاح" : "Failed to verify key");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminKey("");
    localStorage.removeItem(STORAGE_ADMIN_KEY);
    toast.info(lang === "ar" ? "تم تسجيل الخروج" : "Logged out");
  };

  const loadAllData = async (key: string) => {
    setIsLoadingData(true);
    try {
      const [ovData, lData, bData, oData] = await Promise.all([
        fetchAdminOverviewApi(key).catch(() => null),
        fetchAdminLeadsApi(key).catch(() => []),
        fetchAdminAllBrandsApi(key).catch(() => []),
        fetchAdminAllOrdersApi(key).catch(() => []),
      ]);

      if (ovData) setOverview(ovData);
      setLeads(lData);
      setBrands(bData);
      setOrders(oData);
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      await updateAdminLeadStatusApi(leadId, newStatus, adminKey);
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)),
      );
      toast.success(lang === "ar" ? "تم تحديث حالة الطلب" : "Lead status updated");
    } catch (e) {
      toast.error(lang === "ar" ? "فشل التحديث" : "Failed to update status");
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا الطلب؟" : "Are you sure you want to delete this lead?")) {
      return;
    }
    try {
      await deleteAdminLeadApi(leadId, adminKey);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      toast.success(lang === "ar" ? "تم حذف الطلب بنجاح" : "Lead deleted");
    } catch (e) {
      toast.error(lang === "ar" ? "فشل الحذف" : "Failed to delete");
    }
  };

  const handlePurgeTestData = async () => {
    if (!confirm(lang === "ar" ? "تحذير: سيتم مسح جميع بيانات التجارب وحركات الزوار التجريبية، مع الإبقاء على الليدات والبراندات النموذجية. هل تريد المتابعة؟" : "Warning: This will purge test session data while keeping official leads and sample presets. Proceed?")) {
      return;
    }
    try {
      const res = await purgeAdminTestDataApi(adminKey);
      toast.success(lang === "ar" ? "تم تنظيف بيانات التجارب بنجاح" : "Test data purged successfully");
      void loadAllData(adminKey);
    } catch (e) {
      toast.error(lang === "ar" ? "فشل المسح" : "Purge failed");
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (!searchLeadQuery.trim()) return true;
    const q = searchLeadQuery.toLowerCase();
    return (
      (l.ownerName || "").toLowerCase().includes(q) ||
      (l.ownerPhone || "").toLowerCase().includes(q) ||
      (l.businessName || "").toLowerCase().includes(q) ||
      (l.brandName || "").toLowerCase().includes(q) ||
      (l.notes || "").toLowerCase().includes(q)
    );
  });

  // -------------------------------------------------------------
  // SCREEN 1: LOGIN / KEY ENTRY
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4" dir={dir}>
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xl text-center space-y-6">
          <div className="flex size-14 mx-auto items-center justify-center rounded-2xl brand-gradient text-white shadow-md">
            <Lock className="size-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground">
              {lang === "ar" ? "لوحة الإدارة المركزية" : "Kayanova Master Admin"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {lang === "ar"
                ? "أدخل مفتاح الحماية للوصول إلى طلبات تفعيل العملاء والبيانات"
                : "Enter admin secret key to access deployment leads and platform data"}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (keyInput.trim()) void handleVerifyKey(keyInput.trim());
            }}
            className="space-y-4"
          >
            <div className="relative">
              <KeyRound className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={lang === "ar" ? "مفتاح الأمان (Admin Key)" : "Admin Key"}
                className="h-11 ps-10 rounded-xl border-border bg-secondary/50 font-mono text-sm"
                autoFocus
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isVerifying}
              className="w-full h-11 brand-gradient text-white font-bold rounded-xl shadow-md text-sm"
            >
              {isVerifying
                ? lang === "ar"
                  ? "جاري التحقق..."
                  : "Verifying..."
                : lang === "ar"
                  ? "دخول لوحة التحكم"
                  : "Access Portal"}
            </Button>
          </form>

          <div className="pt-2 border-t border-border">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground font-semibold">
              ← {lang === "ar" ? "العودة إلى الاستوديو" : "Back to Studio"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 2: MASTER ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir={dir}>
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Kayanova" className="size-8 rounded-xl object-contain" />
            <div>
              <span className="font-extrabold text-sm sm:text-base text-foreground">
                Kayanova Master Admin
              </span>
              <span className="ms-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                لوحة الإدارة
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAllData(adminKey)}
            disabled={isLoadingData}
            className="h-9 gap-1.5 text-xs font-bold rounded-xl"
            title="تحديث البيانات"
          >
            <RefreshCw className={`size-3.5 ${isLoadingData ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{lang === "ar" ? "تحديث" : "Refresh"}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-9 gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">{lang === "ar" ? "خروج" : "Logout"}</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 sm:px-8 space-y-6">
        {/* KPI Counter Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Leads */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold">{lang === "ar" ? "إجمالي طلبات التفعيل" : "Total Leads"}</span>
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Rocket className="size-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {leads.length}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {lang === "ar" ? "ليدات حقيقية مهتمة بالتعاقد" : "Interested qualified leads"}
            </p>
          </div>

          {/* New Leads */}
          <div className="rounded-2xl border border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
              <span className="text-xs font-bold">{lang === "ar" ? "بحاجة للتواصل (جديد)" : "New (Need Contact)"}</span>
              <div className="size-8 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center">
                <Clock className="size-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-200">
              {leads.filter((l) => l.status === "new").length}
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {lang === "ar" ? "يتطلب الرد والمتابعة السريعة" : "Requires rapid response"}
            </p>
          </div>

          {/* Total Custom Agents */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold">{lang === "ar" ? "وكلاء أنشأهم الزوار" : "Custom Agents"}</span>
              <div className="size-8 rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 flex items-center justify-center">
                <Bot className="size-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {brands.filter((b) => !b.isSample).length}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {lang === "ar" ? "وكلاء مخصصين من البيلدر" : "Created across visitor sessions"}
            </p>
          </div>

          {/* Total Orders Simulated */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold">{lang === "ar" ? "حركات الشات والتجربة" : "Simulator Orders"}</span>
              <div className="size-8 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center">
                <ShoppingBag className="size-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {orders.length}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {lang === "ar" ? "أوردرات استخرجها الذكاء الاصطناعي" : "AI extracted orders"}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary border border-border">
            <button
              onClick={() => setActiveTab("leads")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "leads"
                  ? "brand-gradient text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Rocket className="size-3.5" />
              <span>{lang === "ar" ? "طلبات التفعيل (الليدات)" : "Deployment Leads"}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                {leads.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("brands")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "brands"
                  ? "brand-gradient text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot className="size-3.5" />
              <span>{lang === "ar" ? "جميع الوكلاء" : "All Agents"}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-secondary-foreground/20 font-mono">
                {brands.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "orders"
                  ? "brand-gradient text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="size-3.5" />
              <span>{lang === "ar" ? "أوردرات الشات" : "Chat Orders"}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-secondary-foreground/20 font-mono">
                {orders.length}
              </span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePurgeTestData}
            className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900 rounded-xl"
          >
            <Trash2 className="size-3.5 me-1.5" />
            <span>{lang === "ar" ? "مسح بيانات التجارب القديمة" : "Purge Test Data"}</span>
          </Button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: LEADS (DEPLOYMENT REQUESTS) - THE MAIN GOAL                        */}
        {/* ========================================================================= */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex items-center gap-2 max-w-md">
              <div className="relative w-full">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={searchLeadQuery}
                  onChange={(e) => setSearchLeadQuery(e.target.value)}
                  placeholder={lang === "ar" ? "بحث بالاسم، الهاتف، أو اسم البيزنس..." : "Search leads by name, phone..."}
                  className="h-10 ps-9 rounded-xl border-border bg-card text-xs"
                />
              </div>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-3">
                <div className="size-12 mx-auto rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
                  <Rocket className="size-6" />
                </div>
                <h3 className="font-bold text-foreground">
                  {lang === "ar" ? "لا توجد طلبات تفعيل حتى الآن" : "No deployment requests yet"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {lang === "ar"
                    ? "عندما يقوم أي زائر بالضغط على زر (طلب تفعيل الوكيل لقنوات التواصل) وإدخال بياناته، ستصلك رسالته فوراً هنا مع كل تفاصيل وكيله ورابط محادثة واتساب مباشر معه."
                    : "When visitors click 'Deploy Agent' and fill out their request, it will appear here immediately."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredLeads.map((lead) => {
                  const cleanPhone = formatCleanPhone(lead.ownerPhone);
                  const waText = encodeURIComponent(
                    `مرحباً ${lead.ownerName}، معك فريق كيانوفا بخصوص طلبك لتفعيل وكيل (${lead.brandName || lead.businessName}) على قنوات التواصل.`
                  );
                  const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

                  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
                    new: { label: lang === "ar" ? "جديد (لم يتم التواصل)" : "New", bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-300", text: "text-amber-800 dark:text-amber-300" },
                    contacted: { label: lang === "ar" ? "قيد التواصل" : "Contacted", bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-300", text: "text-blue-800 dark:text-blue-300" },
                    activated: { label: lang === "ar" ? "تم التفعيل" : "Activated", bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300", text: "text-emerald-800 dark:text-emerald-300" },
                    cancelled: { label: lang === "ar" ? "ملغي / غير مهتم" : "Cancelled", bg: "bg-slate-100 dark:bg-slate-800 border-slate-300", text: "text-slate-700 dark:text-slate-300" },
                  };

                  const currentStatus = statusConfig[lead.status] || statusConfig.new;

                  return (
                    <div
                      key={lead.id}
                      className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-2xs hover:border-primary/40 transition-all space-y-4"
                    >
                      {/* Top Header of the Lead Card */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div className="size-11 rounded-2xl brand-gradient text-white flex items-center justify-center shrink-0 shadow-xs">
                            <User className="size-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-extrabold text-foreground">
                                {lead.ownerName}
                              </h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentStatus.bg} ${currentStatus.text}`}>
                                {currentStatus.label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span className="font-semibold text-foreground">{lead.businessName || "مشروع تجاري"}</span>
                              <span>•</span>
                              <span>الوكيل: <strong className="text-primary">{lead.brandName}</strong></span>
                            </p>
                          </div>
                        </div>

                        {/* Direct WhatsApp Call-to-Action Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
                          >
                            <MessageCircle className="size-4" />
                            <span>{lang === "ar" ? "محادثة واتساب فورية" : "Chat on WhatsApp"}</span>
                            <ExternalLink className="size-3 ms-0.5 opacity-80" />
                          </a>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLead(lead.id)}
                            className="size-9 text-muted-foreground hover:text-rose-600 rounded-xl"
                            title="حذف الطلب"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Lead Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border text-xs">
                        {/* Phone */}
                        <div>
                          <span className="text-muted-foreground block text-[11px] font-semibold">
                            {lang === "ar" ? "رقم الهاتف / واتساب:" : "Phone / WhatsApp:"}
                          </span>
                          <span className="font-mono font-bold text-foreground text-sm" dir="ltr">
                            {lead.ownerPhone}
                          </span>
                        </div>

                        {/* Channels */}
                        <div>
                          <span className="text-muted-foreground block text-[11px] font-semibold mb-1">
                            {lang === "ar" ? "القنوات المطلوبة:" : "Requested Channels:"}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {lead.channels && lead.channels.length > 0 ? (
                              lead.channels.map((ch) => {
                                const cConfig = CHANNEL_ICONS[ch] || { label: ch, color: "bg-secondary text-foreground" };
                                return (
                                  <span
                                    key={ch}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cConfig.color}`}
                                  >
                                    <span>{cConfig.label}</span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div>
                          <span className="text-muted-foreground block text-[11px] font-semibold">
                            {lang === "ar" ? "تاريخ الطلب:" : "Submitted Date:"}
                          </span>
                          <span className="text-foreground font-medium flex items-center gap-1 mt-0.5">
                            <Calendar className="size-3 text-muted-foreground" />
                            <span>
                              {lead.createdAt
                                ? new Date(lead.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : "—"}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Notes (if any) */}
                      {lead.notes && (
                        <div className="p-3 rounded-xl border border-border bg-card text-xs text-foreground space-y-1">
                          <span className="font-bold text-muted-foreground block text-[10px] uppercase tracking-wider">
                            {lang === "ar" ? "ملاحظات ومتطلبات العميل:" : "Client Notes:"}
                          </span>
                          <p className="leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
                        </div>
                      )}

                      {/* Status Update Dropdown */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                        <span className="text-muted-foreground font-semibold">
                          {lang === "ar" ? "تغيير حالة المتابعة:" : "Change follow-up status:"}
                        </span>
                        <Select
                          value={lead.status}
                          onValueChange={(val) => handleUpdateStatus(lead.id, val)}
                        >
                          <SelectTrigger className="h-8 w-44 rounded-lg text-xs font-bold border-border bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new" className="text-xs">
                              {lang === "ar" ? "جديد (لم يتم التواصل)" : "New"}
                            </SelectItem>
                            <SelectItem value="contacted" className="text-xs">
                              {lang === "ar" ? "قيد التواصل" : "Contacted"}
                            </SelectItem>
                            <SelectItem value="activated" className="text-xs">
                              {lang === "ar" ? "تم التفعيل بنجاح" : "Activated"}
                            </SelectItem>
                            <SelectItem value="cancelled" className="text-xs">
                              {lang === "ar" ? "ملغي / غير مهتم" : "Cancelled"}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ALL AGENTS (BRANDS)                                                */}
        {/* ========================================================================= */}
        {activeTab === "brands" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((b) => (
              <div
                key={b.id}
                className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                      <span>{b.name}</span>
                      {b.isSample && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          نموذج مسبق
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.category} • {b.dialect}</p>
                  </div>
                  <div className="size-8 rounded-xl brand-gradient text-white flex items-center justify-center shrink-0">
                    <Bot className="size-4" />
                  </div>
                </div>

                <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed bg-secondary/30 p-2.5 rounded-xl">
                  {b.role || b.tagline || "لا يوجد وصف"}
                </p>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                  <span>الأصناف: {b.menuItems?.length ?? 0}</span>
                  <span className="font-mono text-[10px] truncate max-w-[120px]" title={b.sessionId}>
                    {b.sessionId ? `جلسة: ${b.sessionId.slice(-6)}` : "افتراضي"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ALL ORDERS                                                         */}
        {/* ========================================================================= */}
        {activeTab === "orders" && (
          <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="border-b border-border bg-secondary/50 text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3 text-start">العميل</th>
                    <th className="p-3 text-start">الهاتف</th>
                    <th className="p-3 text-start">البراند</th>
                    <th className="p-3 text-start">الأصناف</th>
                    <th className="p-3 text-start">الإجمالي</th>
                    <th className="p-3 text-start">الحالة</th>
                    <th className="p-3 text-start">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3 font-bold text-foreground">{o.customerName || "—"}</td>
                      <td className="p-3 font-mono" dir="ltr">{o.customerPhone || o.phone || "—"}</td>
                      <td className="p-3 font-medium text-muted-foreground">{o.brandId}</td>
                      <td className="p-3 text-muted-foreground truncate max-w-[180px]">
                        {Array.isArray(o.items) ? o.items.join(", ") : "—"}
                      </td>
                      <td className="p-3 font-bold text-emerald-800 dark:text-emerald-300">
                        {o.totalAmount || (o.numericTotal ? `${o.numericTotal} ج.م` : "—")}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary border border-border">
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {o.timestamp ? new Date(o.timestamp).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
