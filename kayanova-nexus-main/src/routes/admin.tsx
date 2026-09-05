import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  Globe,
  Instagram,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
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
  createPlatformLeadApi,
} from "@/lib/kayanova/api";
import type {
  AdminOverviewData,
  BrandProfile,
  ExtractedLead,
  PlatformLead,
} from "@/lib/kayanova/types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Master Operations Console — Kayanova Admin" },
      {
        name: "description",
        content: "Executive administration and deployment lead tracking console for Kayanova Agent Studio.",
      },
    ],
  }),
  component: AdminOperationsPortal,
});

const STORAGE_ADMIN_KEY = "kayanova_admin_token";
const STORAGE_SIDEBAR_COLLAPSED = "kayanova_admin_sidebar_collapsed";

const CHANNEL_BADGES: Record<
  string,
  { label: string; icon: any; bg: string; text: string; border: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-300/60 dark:border-emerald-800",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-300/60 dark:border-rose-800",
  },
  messenger: {
    label: "Messenger",
    icon: MessageSquare,
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-300/60 dark:border-blue-800",
  },
  web: {
    label: "Web Chat",
    icon: Globe,
    bg: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-300/60 dark:border-violet-800",
  },
};

function cleanPhoneNumber(raw: string): string {
  let cleaned = (raw || "").replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  } else if (cleaned.startsWith("01")) {
    cleaned = "+2" + cleaned;
  }
  return cleaned.replace("+", "");
}

type AdminTab = "leads" | "overview" | "brands" | "orders" | "system";

function AdminOperationsPortal() {
  const [adminKey, setAdminKey] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  // Navigation & Sidebar Layout
  const [activeTab, setActiveTab] = useState<AdminTab>("leads");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Data Store
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [leads, setLeads] = useState<PlatformLead[]>([]);
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [orders, setOrders] = useState<ExtractedLead[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("all");

  // Load sidebar preference & auto-verify on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCollapsed = localStorage.getItem(STORAGE_SIDEBAR_COLLAPSED);
      if (savedCollapsed !== null) {
        setSidebarCollapsed(savedCollapsed === "true");
      }

      const savedToken = localStorage.getItem(STORAGE_ADMIN_KEY);
      if (savedToken) {
        setAdminKey(savedToken);
        void handleVerifyKey(savedToken);
      }
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_SIDEBAR_COLLAPSED, String(next));
      }
      return next;
    });
  };

  const handleVerifyKey = async (key: string) => {
    setIsVerifying(true);
    try {
      const res = await verifyAdminKeyApi(key);
      if (res.valid) {
        setIsAuthenticated(true);
        setAdminKey(key);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_ADMIN_KEY, key);
        }
        toast.success("Administrator session authenticated");
        void loadAllData(key);
      } else {
        toast.error("Invalid administrator key. Access denied.");
      }
    } catch {
      toast.error("Network validation error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminKey("");
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_ADMIN_KEY);
    }
    toast.info("Logged out from Operations Console");
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

      let localLeads: PlatformLead[] = [];
      if (typeof window !== "undefined") {
        try {
          localLeads = JSON.parse(
            localStorage.getItem("kayanova_platform_leads_v3") || "[]",
          );
        } catch {}
      }

      const finalLeads =
        lData && lData.length > 0 ? lData : localLeads;
      const finalBrands = bData || [];
      const finalOrders = oData || [];

      setOverview(
        ovData || {
          totalPlatformLeads: finalLeads.length,
          totalCustomBrands: finalBrands.length,
          totalCapturedOrders: finalOrders.length,
          activeSessionsCount: 1,
          recentLeads: finalLeads.slice(0, 10),
        },
      );

      setLeads(finalLeads);
      setBrands(finalBrands);
      setOrders(finalOrders);
    } catch (err) {
      console.error("Admin data synchronization error:", err);
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
      toast.success(`Lead status transitioned to "${newStatus}"`);
    } catch {
      toast.error("Failed to update lead status");
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this deployment lead record?")) {
      return;
    }
    try {
      await deleteAdminLeadApi(leadId, adminKey);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      toast.success("Lead removed successfully");
    } catch {
      toast.error("Failed to delete lead");
    }
  };

  const handleSimulateTestLead = async () => {
    try {
      const sampleNames = [
        "Kareem El-Sayed",
        "Layla Abdel-Rahman",
        "Omar Farouk",
        "Nourhan El-Shazly",
      ];
      const sampleBusinesses = [
        "Luxe Hospitality Group",
        "Cairo Dental Clinics",
        "Horizon Logistics MENA",
        "Artisan Perfumes",
      ];
      const randomIdx = Math.floor(Math.random() * sampleNames.length);

      await createPlatformLeadApi({
        brandId: "custom_enterprise_demo",
        brandName: "Omnichannel Support Agent",
        ownerName: sampleNames[randomIdx],
        ownerPhone: `+2010${Math.floor(10000000 + Math.random() * 90000000)}`,
        businessName: sampleBusinesses[randomIdx],
        channels: ["whatsapp", "instagram"],
        notes: "Requested enterprise pilot with full CRM integration and multi-agent handover.",
        status: "new",
      });

      toast.success("Test deployment request registered in live pipeline!");
      await loadAllData(adminKey);
    } catch {
      toast.error("Failed to simulate test lead");
    }
  };

  const handlePurgeTestData = async () => {
    if (
      !confirm(
        "Warning: This will clear simulator test sessions while preserving active customer leads and sample templates. Continue?",
      )
    ) {
      return;
    }
    try {
      await purgeAdminTestDataApi(adminKey);
      toast.success("Simulator session data cleaned up successfully");
      void loadAllData(adminKey);
    } catch {
      toast.error("Purge operation encountered an error");
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.status === "new").length;
    const contactedLeads = leads.filter((l) => l.status === "contacted").length;
    const activatedLeads = leads.filter(
      (l) => l.status === "activated" || l.status === "deployed",
    ).length;
    const totalAgents = brands.filter((b) => !b.isSample).length;
    const totalOrders = orders.length;

    return {
      totalLeads,
      newLeads,
      contactedLeads,
      activatedLeads,
      totalAgents,
      totalOrders,
    };
  }, [leads, brands, orders]);

  // Lead filtering
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (leadStatusFilter !== "all") {
        if (leadStatusFilter === "new" && lead.status !== "new") return false;
        if (leadStatusFilter === "contacted" && lead.status !== "contacted")
          return false;
        if (
          leadStatusFilter === "activated" &&
          lead.status !== "activated" &&
          lead.status !== "deployed"
        )
          return false;
        if (leadStatusFilter === "cancelled" && lead.status !== "cancelled")
          return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (lead.ownerName || "").toLowerCase().includes(q) ||
        (lead.ownerPhone || "").toLowerCase().includes(q) ||
        (lead.businessName || "").toLowerCase().includes(q) ||
        (lead.brandName || "").toLowerCase().includes(q) ||
        (lead.notes || "").toLowerCase().includes(q)
      );
    });
  }, [leads, leadStatusFilter, searchQuery]);

  // -------------------------------------------------------------
  // VIEW 1: AUTHENTICATION GATE (100% ENGLISH)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4 select-none font-sans"
        dir="ltr"
        lang="en"
      >
        <div className="w-full max-w-md p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="flex size-14 mx-auto items-center justify-center rounded-2xl brand-gradient text-white shadow-lg">
            <Lock className="size-6" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Master Admin Operations
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Enter your enterprise authorization key to access live customer deployment leads and platform metrics.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (keyInput.trim()) void handleVerifyKey(keyInput.trim());
            }}
            className="space-y-4 text-left"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Access Token
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                <Input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="e.g. kayanova-admin-2026"
                  className="h-11 pl-10 rounded-xl border-slate-700 bg-slate-950 text-white font-mono text-sm placeholder:text-slate-600 focus-visible:ring-primary"
                  autoFocus
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isVerifying}
              className="w-full h-11 brand-gradient text-white font-bold rounded-xl shadow-md text-sm transition-all"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="size-4 animate-spin" />
                  Verifying Credentials...
                </span>
              ) : (
                "Authorize & Enter Portal"
              )}
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Default key: <code className="text-primary font-mono font-bold">kayanova-admin-2026</code></span>
            <Link
              to="/"
              className="font-medium text-slate-400 hover:text-white transition-colors"
            >
              Exit to Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: OPERATIONS PORTAL WITH COLLAPSIBLE SIDEBAR
  // -------------------------------------------------------------
  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-primary/20"
      dir="ltr"
      lang="en"
    >
      {/* Mobile Top App Bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="size-9 rounded-xl"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <img
            src="/logo.png"
            alt="Kayanova"
            className="size-7 rounded-lg object-contain"
          />
          <span className="font-extrabold text-sm tracking-tight text-foreground">
            Kayanova Operations
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAllData(adminKey)}
            disabled={isLoadingData}
            className="h-8 px-2.5 text-xs font-bold rounded-lg"
          >
            <RefreshCw
              className={`size-3.5 ${isLoadingData ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 px-2.5 text-xs font-bold text-rose-600 rounded-lg"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* =================================================================== */}
        {/* DESKTOP & RESPONSIVE SIDEBAR (COLLAPSIBLE / EXPANDABLE)             */}
        {/* =================================================================== */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 lg:static flex flex-col border-r border-border bg-card/95 backdrop-blur-xl transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? "w-20" : "w-64"
          } ${
            mobileMenuOpen
              ? "translate-x-0 shadow-2xl"
              : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Sidebar Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <Link
              to="/"
              className={`flex items-center gap-3 overflow-hidden ${
                sidebarCollapsed ? "justify-center w-full" : ""
              }`}
            >
              <img
                src="/logo.png"
                alt="Kayanova"
                className="size-8 rounded-xl object-contain shrink-0"
              />
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-black text-sm text-foreground tracking-tight truncate">
                    Kayanova Admin
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest truncate">
                    Operations Portal
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Collapse / Expand Toggle Button */}
            {!sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="hidden lg:flex size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            )}
          </div>

          {/* Collapsed expand button on rail */}
          {sidebarCollapsed && (
            <div className="hidden lg:flex justify-center py-2 border-b border-border/50">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                title="Expand Sidebar"
              >
                <PanelLeftOpen className="size-4" />
              </Button>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
            {!sidebarCollapsed && (
              <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
                Core Operations
              </div>
            )}

            {/* 1. Deployment Leads Nav Item */}
            <button
              onClick={() => {
                setActiveTab("leads");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === "leads"
                  ? "brand-gradient text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
              title="Deployment Leads"
            >
              <Rocket className="size-4 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">
                    Deployment Leads
                  </span>
                  {metrics.newLeads > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950">
                      {metrics.newLeads} new
                    </span>
                  ) : (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        activeTab === "leads"
                          ? "bg-white/20 text-white"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {metrics.totalLeads}
                    </span>
                  )}
                </>
              )}
            </button>

            {/* 2. Executive Overview Nav Item */}
            <button
              onClick={() => {
                setActiveTab("overview");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "overview"
                  ? "brand-gradient text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
              title="Executive Overview"
            >
              <LayoutDashboard className="size-4 shrink-0" />
              {!sidebarCollapsed && (
                <span className="flex-1 text-left truncate">
                  Overview & KPIs
                </span>
              )}
            </button>

            {/* 3. Business Agents Nav Item */}
            <button
              onClick={() => {
                setActiveTab("brands");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "brands"
                  ? "brand-gradient text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
              title="Business Agents"
            >
              <Bot className="size-4 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">
                    Business Agents
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      activeTab === "brands"
                        ? "bg-white/20 text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {brands.length}
                  </span>
                </>
              )}
            </button>

            {/* 4. CRM & Customer Orders Nav Item */}
            <button
              onClick={() => {
                setActiveTab("orders");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "orders"
                  ? "brand-gradient text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
              title="Platform CRM Orders"
            >
              <ShoppingBag className="size-4 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">
                    Orders & CRM
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      activeTab === "orders"
                        ? "bg-white/20 text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {orders.length}
                  </span>
                </>
              )}
            </button>

            {/* 5. System & Maintenance Nav Item */}
            <button
              onClick={() => {
                setActiveTab("system");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "system"
                  ? "brand-gradient text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
              title="System Tools & Maintenance"
            >
              <ShieldCheck className="size-4 shrink-0" />
              {!sidebarCollapsed && (
                <span className="flex-1 text-left truncate">
                  Maintenance & Tools
                </span>
              )}
            </button>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-border space-y-2">
            {!sidebarCollapsed && (
              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Engine Online (200 OK)</span>
              </div>
            )}

            <Link
              to="/"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors ${
                sidebarCollapsed ? "justify-center px-0" : ""
              }`}
              title="Return to Studio"
            >
              <ExternalLink className="size-4 shrink-0" />
              {!sidebarCollapsed && <span>Return to Studio</span>}
            </Link>

            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ${
                sidebarCollapsed ? "justify-center px-0" : ""
              }`}
              title="Sign Out"
            >
              <LogOut className="size-4 shrink-0" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Backdrop for Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* =================================================================== */}
        {/* MAIN OPERATIONS WORKSPACE                                          */}
        {/* =================================================================== */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Desktop Bar */}
          <header className="sticky top-0 z-30 hidden lg:flex items-center justify-between px-8 py-3.5 border-b border-border bg-card/90 backdrop-blur-md">
            <div>
              <h2 className="text-base font-black text-foreground capitalize tracking-tight">
                {activeTab === "leads" && "Deployment Requests & Leads"}
                {activeTab === "overview" && "Executive Performance Overview"}
                {activeTab === "brands" && "Configured AI Business Agents"}
                {activeTab === "orders" && "Automated CRM Orders & Inquiries"}
                {activeTab === "system" && "System Health & Platform Tools"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Kayanova Agent Studio Live Administration & Onboarding Console
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAllData(adminKey)}
                disabled={isLoadingData}
                className="h-9 px-3.5 text-xs font-bold rounded-xl gap-2 shadow-2xs"
              >
                <RefreshCw
                  className={`size-3.5 ${isLoadingData ? "animate-spin" : ""}`}
                />
                <span>Sync Data</span>
              </Button>

              <Button
                onClick={handleSimulateTestLead}
                size="sm"
                className="h-9 px-3.5 text-xs font-bold rounded-xl gap-1.5 brand-gradient text-white shadow-sm"
              >
                <Plus className="size-3.5" />
                <span>Add Test Lead</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
            {/* ------------------------------------------------------------- */}
            {/* KPI METRIC CARDS (Always visible at top of the dashboard)    */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Total Qualified Leads */}
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold">Total Deployment Leads</span>
                  <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Rocket className="size-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">
                  {metrics.totalLeads}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {metrics.activatedLeads} Onboarded
                  </span>
                  <span>•</span>
                  <span>Live client pipeline</span>
                </div>
              </div>

              {/* Card 2: Urgent Follow-ups */}
              <div className="rounded-2xl border border-amber-300/80 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/20 p-4 sm:p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
                  <span className="text-xs font-bold">New (Need Contact)</span>
                  <div className="size-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-200">
                  {metrics.newLeads}
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  {metrics.newLeads === 1
                    ? "1 request awaiting response"
                    : `${metrics.newLeads} requests awaiting response`}
                </p>
              </div>

              {/* Card 3: Active AI Agents */}
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-2 hover:border-violet-500/40 transition-colors">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold">Custom AI Agents</span>
                  <div className="size-8 rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 flex items-center justify-center">
                    <Bot className="size-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">
                  {brands.length}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Built across client industries
                </p>
              </div>

              {/* Card 4: Orders & Inquiries */}
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-2 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold">Extracted CRM Orders</span>
                  <div className="size-8 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center">
                    <ShoppingBag className="size-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">
                  {metrics.totalOrders}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  AI captured customer transactions
                </p>
              </div>
            </div>

            {/* ============================================================= */}
            {/* TAB 1: DEPLOYMENT LEADS & REQUESTS                            */}
            {/* ============================================================= */}
            {activeTab === "leads" && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-2xs">
                  {/* Search input */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by client name, business, phone, or agent..."
                      className="h-9 pl-9 rounded-xl border-border bg-secondary/40 text-xs focus-visible:ring-primary"
                    />
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    <Button
                      variant={leadStatusFilter === "all" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setLeadStatusFilter("all")}
                      className={`h-8 px-3 rounded-lg text-xs font-bold ${
                        leadStatusFilter === "all"
                          ? "brand-gradient text-white"
                          : "text-muted-foreground"
                      }`}
                    >
                      All ({leads.length})
                    </Button>
                    <Button
                      variant={leadStatusFilter === "new" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setLeadStatusFilter("new")}
                      className={`h-8 px-3 rounded-lg text-xs font-bold ${
                        leadStatusFilter === "new"
                          ? "bg-amber-500 text-slate-950 font-extrabold hover:bg-amber-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      New ({metrics.newLeads})
                    </Button>
                    <Button
                      variant={
                        leadStatusFilter === "contacted" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => setLeadStatusFilter("contacted")}
                      className={`h-8 px-3 rounded-lg text-xs font-bold ${
                        leadStatusFilter === "contacted"
                          ? "brand-gradient text-white"
                          : "text-muted-foreground"
                      }`}
                    >
                      Contacted ({metrics.contactedLeads})
                    </Button>
                    <Button
                      variant={
                        leadStatusFilter === "activated" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => setLeadStatusFilter("activated")}
                      className={`h-8 px-3 rounded-lg text-xs font-bold ${
                        leadStatusFilter === "activated"
                          ? "brand-gradient text-white"
                          : "text-muted-foreground"
                      }`}
                    >
                      Deployed ({metrics.activatedLeads})
                    </Button>
                  </div>
                </div>

                {/* Leads Grid */}
                {filteredLeads.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/60 space-y-3">
                    <div className="size-12 mx-auto rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
                      <Rocket className="size-6" />
                    </div>
                    <h3 className="font-extrabold text-foreground text-sm">
                      No matching deployment requests found
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Whenever a prospective client clicks "Deploy Agent" on the studio or fills out the activation form, their request lands here in real-time with direct WhatsApp and phone links.
                    </p>
                    <Button
                      onClick={handleSimulateTestLead}
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs font-bold gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      Generate Test Request
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3.5">
                    {filteredLeads.map((lead) => {
                      const cleanPhone = cleanPhoneNumber(lead.ownerPhone);
                      const waText = encodeURIComponent(
                        `Hi ${lead.ownerName}, this is the Kayanova AI team regarding your deployment request for ${lead.brandName || lead.businessName}. We are ready to activate your customer communication agent!`,
                      );
                      const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

                      const statusConfigs: Record<
                        string,
                        { label: string; badge: string }
                      > = {
                        new: {
                          label: "New (Pending Contact)",
                          badge:
                            "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-700/60",
                        },
                        contacted: {
                          label: "In Contact",
                          badge:
                            "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-300/80 dark:border-blue-700/60",
                        },
                        activated: {
                          label: "Deployed & Active",
                          badge:
                            "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-700/60",
                        },
                        deployed: {
                          label: "Deployed & Active",
                          badge:
                            "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-700/60",
                        },
                        cancelled: {
                          label: "Closed / Archived",
                          badge:
                            "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
                        },
                      };

                      const currentConfig =
                        statusConfigs[lead.status] || statusConfigs.new;

                      return (
                        <div
                          key={lead.id}
                          className="p-5 rounded-2xl border border-border bg-card shadow-2xs hover:border-primary/40 transition-all space-y-4"
                        >
                          {/* Header row of lead card */}
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3.5">
                              <div className="size-11 rounded-2xl brand-gradient text-white flex items-center justify-center shrink-0 shadow-xs">
                                <User className="size-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h3 className="text-base font-extrabold text-foreground">
                                    {lead.ownerName}
                                  </h3>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentConfig.badge}`}
                                  >
                                    {currentConfig.label}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="font-semibold text-foreground">
                                    {lead.businessName || "Commercial Business"}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Target Agent:{" "}
                                    <strong className="text-primary">
                                      {lead.brandName || "Custom AI Agent"}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Direct Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
                                title="Open direct WhatsApp conversation"
                              >
                                <MessageCircle className="size-4" />
                                <span>WhatsApp Contact</span>
                                <ExternalLink className="size-3 ms-0.5 opacity-80" />
                              </a>

                              <a
                                href={`tel:${lead.ownerPhone}`}
                                className="inline-flex items-center justify-center size-9 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs"
                                title="Call phone number"
                              >
                                <PhoneCall className="size-4" />
                              </a>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  void navigator.clipboard.writeText(
                                    `${lead.ownerName} | ${lead.ownerPhone} | ${lead.businessName}`,
                                  );
                                  toast.success("Lead details copied to clipboard");
                                }}
                                className="size-9 text-muted-foreground hover:text-foreground rounded-xl"
                                title="Copy Details"
                              >
                                <Copy className="size-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteLead(lead.id)}
                                className="size-9 text-muted-foreground hover:text-rose-600 rounded-xl"
                                title="Delete lead record"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Data Details Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border text-xs">
                            <div>
                              <span className="text-muted-foreground block text-[11px] font-semibold">
                                Phone Number / WhatsApp:
                              </span>
                              <span className="font-mono font-bold text-foreground text-sm">
                                {lead.ownerPhone}
                              </span>
                            </div>

                            <div>
                              <span className="text-muted-foreground block text-[11px] font-semibold mb-1">
                                Requested Channels:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {lead.channels && lead.channels.length > 0 ? (
                                  lead.channels.map((ch) => {
                                    const c = CHANNEL_BADGES[ch] || {
                                      label: ch,
                                      bg: "bg-secondary",
                                      text: "text-foreground",
                                      border: "border-border",
                                    };
                                    return (
                                      <span
                                        key={ch}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${c.bg} ${c.text} ${c.border}`}
                                      >
                                        <span>{c.label}</span>
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-muted-foreground block text-[11px] font-semibold">
                                Submitted Date:
                              </span>
                              <span className="text-foreground font-medium flex items-center gap-1.5 mt-0.5">
                                <Calendar className="size-3 text-muted-foreground" />
                                <span>
                                  {lead.createdAt
                                    ? new Date(lead.createdAt).toLocaleDateString(
                                        "en-US",
                                        {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                          hour: "numeric",
                                          minute: "2-digit",
                                        },
                                      )
                                    : "Recent"}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Lead Notes */}
                          {lead.notes && (
                            <div className="p-3 rounded-xl border border-border bg-card text-xs text-foreground space-y-1">
                              <span className="font-bold text-muted-foreground block text-[10px] uppercase tracking-wider">
                                Client Notes & Requirements:
                              </span>
                              <p className="leading-relaxed whitespace-pre-wrap">
                                {lead.notes}
                              </p>
                            </div>
                          )}

                          {/* Inline Status Transition Select */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                            <span className="text-muted-foreground font-semibold">
                              Update Lead Workflow Stage:
                            </span>
                            <Select
                              value={lead.status}
                              onValueChange={(val) =>
                                handleUpdateStatus(lead.id, val)
                              }
                            >
                              <SelectTrigger className="h-8 w-48 rounded-lg text-xs font-bold border-border bg-card">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new" className="text-xs">
                                  New (Pending Contact)
                                </SelectItem>
                                <SelectItem
                                  value="contacted"
                                  className="text-xs"
                                >
                                  In Contact
                                </SelectItem>
                                <SelectItem
                                  value="activated"
                                  className="text-xs"
                                >
                                  Deployed & Active
                                </SelectItem>
                                <SelectItem
                                  value="cancelled"
                                  className="text-xs"
                                >
                                  Closed / Archived
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

            {/* ============================================================= */}
            {/* TAB 2: EXECUTIVE OVERVIEW & CHARTS                            */}
            {/* ============================================================= */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lead Pipeline Funnel */}
                  <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
                    <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" />
                      <span>Onboarding Pipeline Funnel</span>
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between font-bold mb-1">
                          <span className="text-amber-700 dark:text-amber-400">
                            1. Incoming / New Requests
                          </span>
                          <span>{metrics.newLeads} leads</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{
                              width: `${
                                metrics.totalLeads
                                  ? (metrics.newLeads / metrics.totalLeads) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold mb-1">
                          <span className="text-blue-700 dark:text-blue-400">
                            2. Sales Follow-Up & Contacted
                          </span>
                          <span>{metrics.contactedLeads} leads</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{
                              width: `${
                                metrics.totalLeads
                                  ? (metrics.contactedLeads /
                                      metrics.totalLeads) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold mb-1">
                          <span className="text-emerald-700 dark:text-emerald-400">
                            3. Deployed to WhatsApp / Channels
                          </span>
                          <span>{metrics.activatedLeads} leads</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{
                              width: `${
                                metrics.totalLeads
                                  ? (metrics.activatedLeads /
                                      metrics.totalLeads) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Channel Breakdown */}
                  <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
                    <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                      <Globe className="size-4 text-primary" />
                      <span>Customer Channel Demand</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                        <MessageCircle className="size-5 mx-auto text-emerald-600 dark:text-emerald-400" />
                        <span className="block text-xs font-bold text-foreground">
                          WhatsApp Business
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Top Requested (88%)
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center space-y-1">
                        <Instagram className="size-5 mx-auto text-rose-600 dark:text-rose-400" />
                        <span className="block text-xs font-bold text-foreground">
                          Instagram DMs
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          E-Commerce & Retail
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
                        <MessageSquare className="size-5 mx-auto text-blue-600 dark:text-blue-400" />
                        <span className="block text-xs font-bold text-foreground">
                          Facebook Messenger
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Support & Orders
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center space-y-1">
                        <Globe className="size-5 mx-auto text-violet-600 dark:text-violet-400" />
                        <span className="block text-xs font-bold text-foreground">
                          Website Widget
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Live On-Site Chat
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Info Banner */}
                <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-foreground">
                      Ready to onboard new clients?
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-xl">
                      Each deployment request submitted by a visitor in the studio is saved instantly with phone, business type, and target AI persona. Follow up via the WhatsApp button to finalize deployment.
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveTab("leads")}
                    size="sm"
                    className="brand-gradient text-white text-xs font-bold rounded-xl shrink-0"
                  >
                    View Pipeline Leads
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 3: BUSINESS AGENTS                                        */}
            {/* ============================================================= */}
            {activeTab === "brands" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">
                      Active Business Agents ({brands.length})
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Catalog of AI agent personas created by studio visitors
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brands.map((b) => (
                    <div
                      key={b.id}
                      className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-3 hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                            <span>{b.name}</span>
                            {b.isSample && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                Preset Sample
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {b.category} • {b.dialect || "Standard Dialect"}
                          </p>
                        </div>
                        <div className="size-8 rounded-xl brand-gradient text-white flex items-center justify-center shrink-0">
                          <Bot className="size-4" />
                        </div>
                      </div>

                      <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed bg-secondary/30 p-2.5 rounded-xl">
                        {b.role || b.tagline || "Autonomous Customer Service Agent"}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                        <span>Items: {b.menuItems?.length ?? 0}</span>
                        <span
                          className="font-mono text-[10px] truncate max-w-[130px]"
                          title={b.id}
                        >
                          ID: {b.id.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 4: ORDERS & CRM                                           */}
            {/* ============================================================= */}
            {activeTab === "orders" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">
                      Platform CRM Orders ({orders.length})
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Client orders captured automatically through AI chat conversations
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-border bg-secondary/40 text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-3.5">Customer</th>
                          <th className="p-3.5">Phone</th>
                          <th className="p-3.5">Target Agent</th>
                          <th className="p-3.5">Items Ordered</th>
                          <th className="p-3.5">Total (EGP)</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {orders.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-8 text-center text-muted-foreground"
                            >
                              No CRM orders captured yet. Simulator conversations with order intents will appear here.
                            </td>
                          </tr>
                        ) : (
                          orders.map((o) => (
                            <tr
                              key={o.id}
                              className="hover:bg-secondary/30 transition-colors"
                            >
                              <td className="p-3.5 font-bold text-foreground">
                                {o.customerName || "Customer"}
                              </td>
                              <td className="p-3.5 font-mono text-muted-foreground">
                                {o.customerPhone || o.phone || "—"}
                              </td>
                              <td className="p-3.5 font-medium text-foreground">
                                {o.brandId}
                              </td>
                              <td className="p-3.5 text-muted-foreground truncate max-w-[200px]">
                                {Array.isArray(o.items)
                                  ? o.items.map((i: any) => i.name || i).join(", ")
                                  : "—"}
                              </td>
                              <td className="p-3.5 font-bold text-emerald-700 dark:text-emerald-300">
                                {o.totalAmount ||
                                  (o.numericTotal
                                    ? `${o.numericTotal} EGP`
                                    : "—")}
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary border border-border">
                                  {o.status || "confirmed"}
                                </span>
                              </td>
                              <td className="p-3.5 text-muted-foreground">
                                {o.timestamp
                                  ? new Date(o.timestamp).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                      },
                                    )
                                  : "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 5: SYSTEM & MAINTENANCE                                   */}
            {/* ============================================================= */}
            {activeTab === "system" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>System Health & Diagnostics</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-secondary/50 border border-border">
                      <span className="text-muted-foreground block text-[11px]">
                        API Gateway Status:
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 mt-1">
                        <CheckCircle2 className="size-3.5" />
                        Online & Responsive (200 OK)
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-secondary/50 border border-border">
                      <span className="text-muted-foreground block text-[11px]">
                        Pipeline Storage Engine:
                      </span>
                      <span className="font-bold text-foreground mt-1 block">
                        Dual Persistence (Cloud + Client Cache)
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-secondary/50 border border-border">
                      <span className="text-muted-foreground block text-[11px]">
                        Active Token:
                      </span>
                      <span className="font-mono font-bold text-foreground mt-1 block">
                        kayanova-admin-2026
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 shadow-2xs space-y-3">
                  <h3 className="font-extrabold text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <Trash2 className="size-4" />
                    <span>Maintenance & Test Data Cleanup</span>
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-400 max-w-xl">
                    Purge temporary simulation sessions and test customer orders. Official deployment leads and verified client configurations will remain intact.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handlePurgeTestData}
                    className="h-9 text-xs font-bold text-rose-700 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl"
                  >
                    Purge Simulation Data
                  </Button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
