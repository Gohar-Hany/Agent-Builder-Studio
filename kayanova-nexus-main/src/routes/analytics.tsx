import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/kayanova/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { egp, relativeTime, useKayanova } from "@/lib/kayanova/store";
import { uid } from "@/lib/kayanova/presets";
import type { CustomerContact, ExtractedLead } from "@/lib/kayanova/types";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Dual CRM Operations & Lead Database — Kayanova" },
      {
        name: "description",
        content:
          "Dual CRM System: Orders & Transactions Pipeline and Comprehensive Customer Leads & Contacts Database.",
      },
      { property: "og:title", content: "Dual CRM Operations — Kayanova" },
      {
        property: "og:description",
        content: "Multi-tenant dual CRM for sales orders and customer contacts directory.",
      },
    ],
  }),
  component: DualCrmPage,
});

type CrmTab = "orders" | "contacts";

function parseItemText(raw: string) {
  let text = (raw || "").trim();
  let qty = 1;

  // Case 1: "إدارة الإعلانات المدفوعة (1)" or "(2) قهوة"
  const parenMatch = text.match(/\((\d+)\)/);
  if (parenMatch) {
    qty = parseInt(parenMatch[1], 10) || 1;
    text = text.replace(/\(\d+\)/, "").trim();
  } else {
    // Case 2: "2 سبانش لاتيه" or "1 Paid Ads"
    const startMatch = text.match(/^(\d+)\s*[-xX]?\s*(.*)$/);
    if (startMatch && startMatch[2]?.trim()) {
      qty = parseInt(startMatch[1], 10) || 1;
      text = startMatch[2].trim();
    }
  }

  // Clean remaining symbols
  text = text.replace(/^[-–—]\s*/, "").replace(/\s*[-–—]$/, "").trim();
  return { title: text || raw, qty };
}

function DualCrmPage() {
  const {
    brands,
    leads,
    contacts,
    updateLeadStatus,
    deleteLead,
    addContact,
    updateContactStage,
    updateContactNotes,
    deleteContact,
  } = useKayanova();

  const { t, lang, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<CrmTab>("orders");
  const [brandFilter, setBrandFilter] = useState("all");

  // Orders Filter States
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderQuery, setOrderQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ExtractedLead | null>(null);

  // Contacts Filter States
  const [contactStage, setContactStage] = useState("all");
  const [contactChannel, setContactChannel] = useState("all");
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<CustomerContact | null>(null);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);

  // New Contact Form State
  const [newContact, setNewContact] = useState<{
    name: string;
    phone: string;
    email: string;
    brandId: string;
    channel: CustomerContact["channel"];
    intent: string;
    stage: CustomerContact["stage"];
    notes: string;
  }>({
    name: "",
    phone: "",
    email: "",
    brandId: brands[0]?.id ?? "",
    channel: "whatsapp",
    intent: "",
    stage: "New Lead",
    notes: "",
  });

  const brandName = (id: string) =>
    brands.find((b) => b.id === id || b.name === id)?.name ?? id ?? "Global";

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    const activeBrandObj = brands.find((b) => b.id === brandFilter);
    return leads.filter((l) => {
      if (brandFilter !== "all" && l.brandId !== brandFilter && l.brandId !== activeBrandObj?.name)
        return false;
      if (orderStatus !== "all" && l.status !== orderStatus) return false;
      if (!q) return true;
      return [l.customerName, l.customerPhone, l.deliveryAddress, ...(l.items ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [leads, brandFilter, brands, orderStatus, orderQuery]);

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    const activeBrandObj = brands.find((b) => b.id === brandFilter);
    return contacts.filter((c) => {
      if (brandFilter !== "all" && c.brandId !== brandFilter && c.brandId !== activeBrandObj?.name)
        return false;
      if (contactStage !== "all" && c.stage !== contactStage) return false;
      if (contactChannel !== "all" && c.channel !== contactChannel) return false;
      if (!q) return true;
      return [c.customerName, c.customerPhone, c.email, c.intent, c.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [contacts, brandFilter, brands, contactStage, contactChannel, contactQuery]);

  // Orders Stats
  const revenue = leads.reduce((s, l) => s + (l.numericTotal ?? 0), 0);
  const avgOrderValue = leads.length ? Math.round(revenue / leads.length) : 0;
  const completedOrders = leads.filter((l) => l.status === "Completed").length;
  const fulfillmentRatio = leads.length ? Math.round((completedOrders / leads.length) * 100) : 0;

  // Contacts Stats
  const totalContacts = contacts.length;
  const convertedCount = contacts.filter((c) => c.stage === "Converted").length;
  const conversionRate = totalContacts ? Math.round((convertedCount / totalContacts) * 100) : 0;
  const qualifiedCount = contacts.filter(
    (c) => c.stage === "Qualified" || c.stage === "Contacted",
  ).length;

  // Export Orders CSV
  const exportOrdersCsv = () => {
    const header = [
      "Customer Name",
      "Phone",
      "Brand",
      "Ordered Items",
      "Total (EGP)",
      "Order Type",
      "Delivery Address",
      "Status",
      "Timestamp",
    ];
    const rows = filteredOrders.map((l) => [
      l.customerName,
      l.customerPhone ?? "",
      brandName(l.brandId),
      (l.items ?? []).join(" | "),
      String(l.numericTotal ?? 0),
      l.orderType ?? "",
      l.deliveryAddress ?? "",
      l.status,
      l.timestamp,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kayanova-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Orders CSV exported successfully");
  };

  // Export Contacts CSV
  const exportContactsCsv = () => {
    const header = [
      "Customer Name",
      "Phone",
      "Email",
      "Brand",
      "Channel",
      "Inquired Intent",
      "Stage",
      "Orders Count",
      "Total Spent (EGP)",
      "Notes",
      "Last Contact",
    ];
    const rows = filteredContacts.map((c) => [
      c.customerName,
      c.customerPhone,
      c.email ?? "",
      brandName(c.brandId),
      c.channel,
      c.intent,
      c.stage,
      String(c.totalOrdersCount ?? 0),
      String(c.totalSpent ?? 0),
      c.notes ?? "",
      c.lastContactAt,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kayanova-customer-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Customer Leads CSV exported successfully");
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      toast.error("Please enter customer name and phone number.");
      return;
    }
    const created: CustomerContact = {
      id: uid("contact"),
      brandId: newContact.brandId || (brands[0]?.id ?? "brand-global"),
      customerName: newContact.name.trim(),
      customerPhone: newContact.phone.trim(),
      channel: newContact.channel,
      intent: newContact.intent.trim() || "Manual Lead Entry",
      stage: newContact.stage,
      totalOrdersCount: 0,
      totalSpent: 0,
      lastContactAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...(newContact.email.trim() ? { email: newContact.email.trim() } : {}),
      ...(newContact.notes.trim() ? { notes: newContact.notes.trim() } : {}),
    };
    addContact(created);
    setIsAddContactOpen(false);
    setNewContact({
      name: "",
      phone: "",
      email: "",
      brandId: brands[0]?.id ?? "",
      channel: "whatsapp",
      intent: "",
      stage: "New Lead",
      notes: "",
    });
    toast.success("Customer lead added to database!");
  };

  return (
    <AppShell
      title={t.crm.title}
      subtitle={t.crm.subtitle}
      actions={
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {activeTab === "orders" ? (
            <Button size="sm" onClick={exportOrdersCsv} className="h-9 gap-1.5 text-xs sm:text-sm">
              <FileSpreadsheet className="size-3.5 sm:size-4" />
              <span>{t.crm.exportOrdersCsv}</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={exportContactsCsv}
                className="h-9 flex-1 sm:flex-initial gap-1.5 text-xs sm:text-sm"
              >
                <FileSpreadsheet className="size-3.5 sm:size-4" />
                <span>{t.crm.exportContactsCsv}</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddContactOpen(true)}
                className="h-9 flex-1 sm:flex-initial gap-1.5 text-xs sm:text-sm"
              >
                <UserPlus className="size-3.5 sm:size-4" />
                <span>{t.crm.addContactBtn}</span>
              </Button>
            </div>
          )}
        </div>
      }
    >
      {/* Top Segmented Dual CRM Switcher Tabs & Brand Filters */}
      <div className="mb-5 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between w-full max-w-full">
        {/* Sleek Segmented Switcher */}
        <div className="grid grid-cols-2 w-full sm:w-auto rounded-xl border border-border bg-card p-1 shadow-2xs shrink-0">
          <button
            onClick={() => setActiveTab("orders")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold transition-all",
              activeTab === "orders"
                ? "brand-gradient text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <ShoppingBag className="size-3.5 sm:size-4 shrink-0" />
            <span>{t.crm.tabOrders}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                activeTab === "orders" ? "bg-white/20 text-white" : "bg-secondary text-foreground",
              )}
            >
              {leads.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("contacts")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold transition-all",
              activeTab === "contacts"
                ? "brand-gradient text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Users className="size-3.5 sm:size-4 shrink-0" />
            <span>{t.crm.tabContacts}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                activeTab === "contacts"
                  ? "bg-white/20 text-white"
                  : "bg-secondary text-foreground",
              )}
            >
              {contacts.length}
            </span>
          </button>
        </div>

        {/* Global Brand Filter Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end shrink-0">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap hidden md:inline">
            {t.crm.filterByBrand}:
          </span>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="h-9.5 w-full sm:w-64 border-border bg-card text-xs font-semibold text-foreground shadow-2xs">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="size-3.5 text-primary shrink-0" />
                <SelectValue placeholder={t.all} />
              </div>
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              <SelectItem value="all" className="text-xs font-semibold">
                {lang === "ar" ? "جميع البراندات والوكلاء (الكل)" : "All Brands & Agents (All)"}
              </SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: ORDERS & SALES PIPELINE                                           */}
      {/* ========================================================================= */}
      {activeTab === "orders" && (
        <div className="space-y-4 sm:space-y-5">
          {/* Orders Stat KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {/* Revenue */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b-2 border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    {t.crm.totalRevenue}
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <ShoppingBag className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {egp(revenue, lang)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {lang === "ar" ? "من طلبات الشات المباشر" : "From live catalog orders"}
                </p>
              </div>
            </div>

            {/* Total Orders */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b-2 border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600/70">
                    {t.crm.totalOrders}
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600">
                    <ArrowUpRight className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {leads.length}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {completedOrders} {t.crm.statusCompleted}
                </p>
              </div>
            </div>

            {/* Avg Order Value */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b-2 border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600/70">
                    {t.crm.avgOrderValue}
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {egp(avgOrderValue, lang)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {lang === "ar" ? "لكل معاملة بيع" : "Per transaction"}
                </p>
              </div>
            </div>

            {/* Fulfillment Rate */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b-2 border-violet-500/20 bg-violet-500/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600/70">
                    {t.crm.fulfillmentRate}
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600">
                    <Clock className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {fulfillmentRatio}%
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {lang === "ar" ? "كفاءة التسليم والتنفيذ" : "Completion efficiency"}
                </p>
              </div>
            </div>
          </div>

          {/* Orders Filter Toolbar */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="bg-card ps-9 text-xs sm:text-sm h-9"
                placeholder={t.crm.searchOrders}
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
              />
            </div>
            <Select value={orderStatus} onValueChange={setOrderStatus}>
              <SelectTrigger className="w-full sm:w-48 bg-card text-xs sm:text-sm h-9">
                <SelectValue placeholder={t.crm.filterStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="New">{t.crm.statusNew}</SelectItem>
                <SelectItem value="In Progress">{t.crm.statusInProgress}</SelectItem>
                <SelectItem value="Completed">{t.crm.statusCompleted}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DESKTOP ORDERS TABLE */}
          <div className="hidden md:block surface overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-start text-sm">
                <thead className="bg-secondary/60 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">
                      {t.crm.customerName} & {t.crm.customerPhone}
                    </th>
                    <th className="px-4 py-3">{t.dashboard.directoryTitle}</th>
                    <th className="px-4 py-3">{t.crm.orderedItems}</th>
                    <th className="px-4 py-3">{t.crm.orderTotal}</th>
                    <th className="px-4 py-3">
                      {t.crm.orderType} & {t.crm.address}
                    </th>
                    <th className="px-4 py-3">{t.crm.time}</th>
                    <th className="px-4 py-3">{t.status}</th>
                    <th className="px-4 py-3 text-end">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground/60">
                          <ShoppingBag className="size-6" />
                        </div>
                        <p className="text-sm font-bold text-foreground">{t.crm.emptyOrders}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lang === "ar"
                            ? "لم يتم تسجيل أي طلبات بيع مباشرة حتى الآن."
                            : "No live sales orders recorded under this view yet."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((l) => (
                      <tr key={l.id} className="transition-colors hover:bg-secondary/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{l.customerName}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {l.customerPhone || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="font-medium text-xs">
                            {brandName(l.brandId)}
                          </Badge>
                        </td>
                        <td className="max-w-[280px] px-4 py-3">
                          {!l.items || l.items.length === 0 ? (
                            <span className="text-xs text-muted-foreground/60 italic">—</span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {l.items.map((item, idx) => {
                                const { title, qty } = parseItemText(item);
                                return (
                                  <div
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs hover:border-emerald-400/60 dark:hover:border-emerald-600 transition-colors"
                                    title={item}
                                  >
                                    {qty > 1 && (
                                      <span className="inline-flex items-center justify-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        {qty}x
                                      </span>
                                    )}
                                    <Package className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span className="truncate max-w-[190px]">{title}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {egp(l.numericTotal ?? 0, lang)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5 min-w-[150px]">
                            <div className="flex items-center gap-1.5">
                              {l.orderType?.toLowerCase() === "pickup" || l.orderType?.includes("استلام") ? (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
                                  <Store className="size-3.5" />
                                  <span>{lang === "ar" ? "استلام من الفرع" : "Pickup"}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                                  <Truck className="size-3.5" />
                                  <span>{lang === "ar" ? "توصيل دليفري" : "Delivery"}</span>
                                </span>
                              )}
                            </div>
                            {l.deliveryAddress ? (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={l.deliveryAddress}>
                                <MapPin className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span className="truncate max-w-[180px] font-medium text-foreground">
                                  {l.deliveryAddress}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60 italic">
                                {lang === "ar" ? "بدون عنوان" : "No address specified"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-muted-foreground">
                          {relativeTime(l.timestamp, lang)}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={l.status}
                            onValueChange={(val) =>
                              updateLeadStatus(l.id, val as ExtractedLead["status"])
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8.5 w-36 min-w-[130px] rounded-xl text-xs font-bold px-3 gap-1.5 shadow-2xs transition-all",
                                l.status === "New" &&
                                  "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
                                l.status === "In Progress" &&
                                  "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
                                l.status === "Completed" &&
                                  "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="New">{t.crm.statusNew}</SelectItem>
                              <SelectItem value="In Progress">{t.crm.statusInProgress}</SelectItem>
                              <SelectItem value="Completed">{t.crm.statusCompleted}</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-end">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0"
                              onClick={() => setSelectedOrder(l)}
                              title={t.crm.orderDetails}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                deleteLead(l.id);
                                toast.success(lang === "ar" ? "تم حذف الطلب" : "Order deleted");
                              }}
                              title={t.delete}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE ORDERS CARDS LIST (Visible only on Mobile) */}
          <div className="block md:hidden space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="surface p-8 text-center rounded-xl">
                <ShoppingBag className="mx-auto size-8 opacity-40 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  {t.crm.emptyOrders}
                </p>
              </div>
            ) : (
              filteredOrders.map((l) => (
                <div
                  key={l.id}
                  className="surface rounded-xl p-3.5 space-y-3 border border-border bg-card shadow-2xs"
                >
                  {/* Card Header: Customer + Status */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div>
                      <p className="font-bold text-sm text-foreground">{l.customerName}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {l.customerPhone || "—"}
                      </p>
                    </div>
                    <Select
                      value={l.status}
                      onValueChange={(val) =>
                        updateLeadStatus(l.id, val as ExtractedLead["status"])
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-8 w-32 rounded-xl text-xs font-bold px-2.5 shrink-0 shadow-2xs",
                          l.status === "New" &&
                            "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
                          l.status === "In Progress" &&
                            "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
                          l.status === "Completed" &&
                            "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">{t.crm.statusNew}</SelectItem>
                        <SelectItem value="In Progress">{t.crm.statusInProgress}</SelectItem>
                        <SelectItem value="Completed">{t.crm.statusCompleted}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Brand & Time Badges */}
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {brandName(l.brandId)}
                    </Badge>
                    <span className="text-muted-foreground text-xs font-medium flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {relativeTime(l.timestamp, lang)}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      {t.crm.orderedItems}:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(l.items ?? []).map((item, idx) => {
                        const { title, qty } = parseItemText(item);
                        return (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs"
                          >
                            {qty > 1 && (
                              <span className="inline-flex items-center justify-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                {qty}x
                              </span>
                            )}
                            <Package className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Total & Destination */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                        {t.total}
                      </p>
                      <p className="text-base font-bold text-foreground">
                        {egp(l.numericTotal ?? 0, lang)}
                      </p>
                    </div>
                    <div className="text-end">
                      {l.orderType?.toLowerCase() === "pickup" || l.orderType?.includes("استلام") ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
                          <Store className="size-3" />
                          <span>{lang === "ar" ? "استلام" : "Pickup"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                          <Truck className="size-3" />
                          <span>{lang === "ar" ? "توصيل" : "Delivery"}</span>
                        </span>
                      )}
                      {l.deliveryAddress ? (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1 max-w-[170px] flex items-center gap-1 justify-end">
                          <MapPin className="size-3 text-emerald-600 shrink-0" />
                          <span>{l.deliveryAddress}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1"
                      onClick={() => setSelectedOrder(l)}
                    >
                      <Eye className="size-3.5" /> {t.crm.orderDetails}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-destructive hover:text-destructive"
                      onClick={() => {
                        deleteLead(l.id);
                        toast.success(lang === "ar" ? "تم حذف الطلب" : "Order deleted");
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CUSTOMER LEADS & CONTACTS DATABASE                                */}
      {/* ========================================================================= */}
      {activeTab === "contacts" && (
        <div className="space-y-4 sm:space-y-5">
          {/* Contacts Stat KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {/* Total Leads */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b-2 border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    {t.crm.totalLeads}
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <Users className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {totalContacts}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {lang === "ar" ? "قاعدة بيانات جهات الاتصال" : "Customer directory"}
                </p>
              </div>
            </div>

            {/* Converted to Orders */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b-2 border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">
                    {t.crm.convertedLeads}
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                    <UserCheck className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {convertedCount}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {conversionRate}% {t.crm.conversionRate}
                </p>
              </div>
            </div>

            {/* Qualified Pipeline Leads */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b-2 border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600/70">
                    {t.crm.qualifiedLeads}
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600">
                    <MessageCircle className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {qualifiedCount}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {lang === "ar" ? "مؤهلين وجاهزين للمتابعة" : "Qualified & contacted"}
                </p>
              </div>
            </div>

            {/* Active Channels */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b-2 border-violet-500/20 bg-violet-500/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600/70">
                    {t.crm.filterChannel}
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600">
                    <Globe className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {lang === "ar" ? "3 قنوات تواصل" : "3 Channels"}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">WhatsApp, Instagram, Web</p>
              </div>
            </div>
          </div>

          {/* Contacts Filter Toolbar */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="bg-card ps-9 text-xs sm:text-sm h-9"
                placeholder={t.crm.searchContacts}
                value={contactQuery}
                onChange={(e) => setContactQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <Select value={contactStage} onValueChange={setContactStage}>
                <SelectTrigger className="w-full sm:w-40 bg-card text-xs sm:text-sm h-9">
                  <SelectValue placeholder={t.crm.filterStage} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="New Lead">{t.crm.stageNew}</SelectItem>
                  <SelectItem value="Contacted">{t.crm.stageContacted}</SelectItem>
                  <SelectItem value="Qualified">{t.crm.stageQualified}</SelectItem>
                  <SelectItem value="Converted">{t.crm.stageConverted}</SelectItem>
                  <SelectItem value="Inactive">{t.crm.stageLost}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={contactChannel} onValueChange={setContactChannel}>
                <SelectTrigger className="w-full sm:w-36 bg-card text-xs sm:text-sm h-9">
                  <SelectValue placeholder={t.crm.filterChannel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="web">Web AI Chat</SelectItem>
                  <SelectItem value="phone">Direct Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* DESKTOP CONTACTS TABLE */}
          <div className="hidden md:block surface overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-start text-sm">
                <thead className="bg-secondary/60 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t.crm.customerName}</th>
                    <th className="px-4 py-3">{t.crm.customerPhone}</th>
                    <th className="px-4 py-3">{t.dashboard.directoryTitle}</th>
                    <th className="px-4 py-3">{t.crm.filterChannel}</th>
                    <th className="px-4 py-3">
                      {lang === "ar" ? "موضوع الاستفسار" : "Inquired Topic"}
                    </th>
                    <th className="px-4 py-3">{t.crm.filterStage}</th>
                    <th className="px-4 py-3">
                      {lang === "ar" ? "الطلبات والمشتريات" : "Orders & Spend"}
                    </th>
                    <th className="px-4 py-3">{t.crm.time}</th>
                    <th className="px-4 py-3 text-end">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center">
                        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground/60">
                          <Users className="size-6" />
                        </div>
                        <p className="text-sm font-bold text-foreground">{t.crm.emptyContacts}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lang === "ar"
                            ? "لم يتم تسجيل أي جهات اتصال أو عملاء في هذا التبويب حتى الآن."
                            : "No customer leads or contacts recorded under this view yet."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-secondary/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-2xs">
                              {c.customerName?.charAt(0) || "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{c.customerName}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {c.email || (lang === "ar" ? "عميل معتمد" : "Verified Lead")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {c.customerPhone || "—"}
                            </span>
                            {c.customerPhone ? (
                              <div className="flex items-center gap-1">
                                <a
                                  href={`https://wa.me/${c.customerPhone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 transition-all hover:bg-emerald-200 active:scale-90 dark:bg-emerald-950 dark:text-emerald-300"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="size-3.5" />
                                </a>
                                <a
                                  href={`tel:${c.customerPhone}`}
                                  className="inline-flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800 transition-all hover:bg-blue-200 active:scale-90 dark:bg-blue-950 dark:text-blue-300"
                                  title="Call"
                                >
                                  <Phone className="size-3.5" />
                                </a>
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="font-medium text-xs">
                            {brandName(c.brandId)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {c.channel === "whatsapp" && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <MessageCircle className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>WhatsApp</span>
                            </span>
                          )}
                          {c.channel === "instagram" && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1 text-xs font-bold text-pink-800 dark:border-pink-800 dark:bg-pink-950/40 dark:text-pink-300">
                              <Instagram className="size-3.5 text-pink-600 dark:text-pink-400" />
                              <span>Instagram</span>
                            </span>
                          )}
                          {c.channel === "web" && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                              <Globe className="size-3.5 text-blue-600 dark:text-blue-400" />
                              <span>Web AI Chat</span>
                            </span>
                          )}
                          {c.channel === "phone" && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              <Phone className="size-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Direct Phone</span>
                            </span>
                          )}
                        </td>
                        <td className="max-w-[200px] px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <MessageSquare className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="truncate" title={c.intent || "—"}>
                                {c.intent || (lang === "ar" ? "استفسار عام" : "General Inquiry")}
                              </span>
                            </div>
                            {c.notes ? (
                              <p
                                className="truncate rounded bg-secondary/80 px-1.5 py-0.5 text-[11px] text-muted-foreground border border-border/40"
                                title={c.notes}
                              >
                                {c.notes}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={c.stage}
                            onValueChange={(val) =>
                              updateContactStage(c.id, val as CustomerContact["stage"])
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8.5 w-36 min-w-[130px] rounded-xl text-xs font-bold px-3 gap-1.5 shadow-2xs transition-all",
                                c.stage === "New Lead" &&
                                  "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
                                c.stage === "Contacted" &&
                                  "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
                                c.stage === "Qualified" &&
                                  "border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300",
                                c.stage === "Converted" &&
                                  "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
                                c.stage === "Inactive" &&
                                  "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="New Lead">{t.crm.stageNew}</SelectItem>
                              <SelectItem value="Contacted">{t.crm.stageContacted}</SelectItem>
                              <SelectItem value="Qualified">{t.crm.stageQualified}</SelectItem>
                              <SelectItem value="Converted">{t.crm.stageConverted}</SelectItem>
                              <SelectItem value="Inactive">{t.crm.stageLost}</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 font-bold text-foreground">
                              <ShoppingBag className="size-3 text-emerald-600 shrink-0" />
                              <span>{c.totalOrdersCount ?? 0} {lang === "ar" ? "طلبات" : "orders"}</span>
                            </div>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                              {egp(c.totalSpent ?? 0, lang)}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-muted-foreground">
                          {relativeTime(c.lastContactAt, lang)}
                        </td>
                        <td className="px-4 py-3 text-end">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0"
                              onClick={() => setSelectedContact(c)}
                              title={t.crm.notes}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                deleteContact(c.id);
                                toast.success(
                                  lang === "ar" ? "تم حذف جهة الاتصال" : "Contact deleted",
                                );
                              }}
                              title={t.delete}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CONTACTS CARDS LIST (Visible only on Mobile) */}
          <div className="block md:hidden space-y-3">
            {filteredContacts.length === 0 ? (
              <div className="surface p-8 text-center rounded-xl">
                <Users className="mx-auto size-8 opacity-40 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  {t.crm.emptyContacts}
                </p>
              </div>
            ) : (
              filteredContacts.map((c) => (
                <div
                  key={c.id}
                  className="surface rounded-xl p-3.5 space-y-3 border border-border bg-card shadow-2xs"
                >
                  {/* Card Header: Customer + Stage */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-2xs">
                        {c.customerName?.charAt(0) || "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{c.customerName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {c.email || (lang === "ar" ? "عميل معتمد" : "Verified Lead")}
                        </p>
                      </div>
                    </div>
                    <Select
                      value={c.stage}
                      onValueChange={(val) =>
                        updateContactStage(c.id, val as CustomerContact["stage"])
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-8 w-32 rounded-xl text-xs font-bold px-2.5 shrink-0 shadow-2xs",
                          c.stage === "New Lead" &&
                            "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
                          c.stage === "Contacted" &&
                            "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
                          c.stage === "Qualified" &&
                            "border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300",
                          c.stage === "Converted" &&
                            "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
                          c.stage === "Inactive" &&
                            "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New Lead">{t.crm.stageNew}</SelectItem>
                        <SelectItem value="Contacted">{t.crm.stageContacted}</SelectItem>
                        <SelectItem value="Qualified">{t.crm.stageQualified}</SelectItem>
                        <SelectItem value="Converted">{t.crm.stageConverted}</SelectItem>
                        <SelectItem value="Inactive">{t.crm.stageLost}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Phone & Fast Action Buttons (WhatsApp + Call) */}
                  <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 border border-border/50">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {c.customerPhone || "—"}
                    </span>
                    {c.customerPhone ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://wa.me/${c.customerPhone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-200 active:scale-95 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          <MessageCircle className="size-3.5" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={`tel:${c.customerPhone}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 transition-all hover:bg-blue-200 active:scale-95 dark:bg-blue-950 dark:text-blue-300"
                        >
                          <Phone className="size-3.5" />
                          <span>{lang === "ar" ? "اتصال" : "Call"}</span>
                        </a>
                      </div>
                    ) : null}
                  </div>

                  {/* Brand & Channel & Time */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs font-medium">
                        {brandName(c.brandId)}
                      </Badge>
                      {c.channel === "whatsapp" && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <MessageCircle className="size-3" />
                          <span>WhatsApp</span>
                        </span>
                      )}
                      {c.channel === "instagram" && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-pink-50 px-2 py-0.5 text-[11px] font-bold text-pink-800 border border-pink-200 dark:border-pink-800 dark:bg-pink-950/40 dark:text-pink-300">
                          <Instagram className="size-3" />
                          <span>Instagram</span>
                        </span>
                      )}
                      {c.channel === "web" && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-200 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                          <Globe className="size-3" />
                          <span>Web</span>
                        </span>
                      )}
                      {c.channel === "phone" && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          <Phone className="size-3" />
                          <span>Phone</span>
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">
                      {relativeTime(c.lastContactAt, lang)}
                    </span>
                  </div>

                  {/* Intent / Topic Note */}
                  {c.intent ? (
                    <div className="rounded-xl bg-secondary/40 border border-border/50 p-2.5 text-xs">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <MessageSquare className="size-3 text-emerald-600" />
                        <span>{lang === "ar" ? "موضوع الاستفسار:" : "Topic / Inquiry:"}</span>
                      </p>
                      <p className="text-foreground line-clamp-2 mt-1 font-medium">{c.intent}</p>
                    </div>
                  ) : null}

                  {/* Orders and Spend Stats */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="size-3.5 text-emerald-600" />
                      <span className="text-muted-foreground">{t.crm.tabOrders}: </span>
                      <span className="font-bold text-foreground">{c.totalOrdersCount ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.crm.totalRevenue}: </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        {egp(c.totalSpent ?? 0, lang)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1"
                      onClick={() => setSelectedContact(c)}
                    >
                      <Eye className="size-3.5" /> {t.crm.notes}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-destructive hover:text-destructive"
                      onClick={() => {
                        deleteContact(c.id);
                        toast.success(lang === "ar" ? "تم حذف جهة الاتصال" : "Contact deleted");
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ORDER DETAILS / RECEIPT SHEET                                    */}
      {/* ========================================================================= */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent
          className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6"
          side={isRtl ? "left" : "right"}
        >
          {selectedOrder && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-lg font-bold">{t.crm.orderDetails}</SheetTitle>
              </SheetHeader>

              {/* Receipt Card */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <p className="font-bold text-base text-foreground">
                      {selectedOrder.customerName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {selectedOrder.customerPhone || "—"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-semibold",
                      selectedOrder.status === "New" &&
                        "bg-amber-500/10 text-amber-600 border-amber-500/30",
                      selectedOrder.status === "In Progress" &&
                        "bg-blue-500/10 text-blue-600 border-blue-500/30",
                      selectedOrder.status === "Completed" &&
                        "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                    )}
                  >
                    {selectedOrder.status === "New"
                      ? t.crm.statusNew
                      : selectedOrder.status === "In Progress"
                        ? t.crm.statusInProgress
                        : t.crm.statusCompleted}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.dashboard.directoryTitle}</span>
                    <span className="font-semibold text-foreground">
                      {brandName(selectedOrder.brandId)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.crm.orderType}</span>
                    <span className="font-semibold text-foreground">
                      {selectedOrder.orderType ?? "Delivery"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.crm.time}</span>
                    <span className="font-semibold text-foreground">
                      {relativeTime(selectedOrder.timestamp, lang)}
                    </span>
                  </div>
                  {selectedOrder.deliveryAddress ? (
                    <div className="pt-1">
                      <span className="text-muted-foreground block">{t.crm.address}:</span>
                      <span className="font-medium text-foreground block mt-0.5">
                        {selectedOrder.deliveryAddress}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Items List */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2.5">
                    {t.crm.orderedItems}
                  </p>
                  <div className="space-y-2">
                    {(selectedOrder.items ?? []).map((item, idx) => {
                      const { title, qty } = parseItemText(item);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-2.5 text-xs font-semibold"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <Package className="size-3.5" />
                            </div>
                            <span className="text-foreground">{title}</span>
                          </div>
                          {qty > 1 && (
                            <span className="rounded-md bg-card px-2 py-0.5 font-bold text-primary border border-border">
                              {qty}x
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">{t.crm.orderTotal}</span>
                  <span className="font-bold text-lg text-primary">
                    {egp(selectedOrder.numericTotal ?? 0, lang)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  className="flex-1 gap-2"
                  variant="outline"
                  onClick={() => {
                    window.print();
                  }}
                >
                  <Printer className="size-4" /> {t.crm.printReceipt}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    updateLeadStatus(
                      selectedOrder.id,
                      selectedOrder.status === "Completed" ? "In Progress" : "Completed",
                    );
                    setSelectedOrder((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: prev.status === "Completed" ? "In Progress" : "Completed",
                          }
                        : null,
                    );
                    toast.success(lang === "ar" ? "تم تحديث حالة الطلب" : "Order status updated");
                  }}
                >
                  {selectedOrder.status === "Completed"
                    ? lang === "ar"
                      ? "إعادة للتنفيذ"
                      : "Mark In Progress"
                    : lang === "ar"
                      ? "تحديد كمكتمل"
                      : "Mark as Completed"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ========================================================================= */}
      {/* MODAL 2: CUSTOMER CONTACT NOTES SHEET                                     */}
      {/* ========================================================================= */}
      <Sheet open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
        <SheetContent
          className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6"
          side={isRtl ? "left" : "right"}
        >
          {selectedContact && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-lg font-bold">
                  {lang === "ar" ? "ملف العميل وسجل الملاحظات" : "Customer Profile & Notes"}
                </SheetTitle>
              </SheetHeader>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <p className="font-bold text-base text-foreground">
                      {selectedContact.customerName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {selectedContact.customerPhone}
                    </p>
                  </div>
                  <Badge variant="secondary">{selectedContact.stage}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-muted-foreground">{t.crm.tabOrders}</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {selectedContact.totalOrdersCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-muted-foreground">{t.crm.totalRevenue}</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {egp(selectedContact.totalSpent ?? 0, lang)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t.crm.notes}</Label>
                  <Textarea
                    className="h-28 text-xs bg-background"
                    placeholder={
                      lang === "ar"
                        ? "أضف ملاحظات مخصصة حول هذا العميل..."
                        : "Add custom notes about this customer, preferred orders, VIP status..."
                    }
                    defaultValue={selectedContact.notes ?? ""}
                    onBlur={(e) => {
                      updateContactNotes(selectedContact.id, e.target.value);
                      toast.success(lang === "ar" ? "تم حفظ الملاحظات" : "Notes saved");
                    }}
                  />
                </div>

                {/* Direct Action Links */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <a
                    href={`https://wa.me/${selectedContact.customerPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-2.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/20"
                  >
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                  <a
                    href={`tel:${selectedContact.customerPhone}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 py-2.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/20"
                  >
                    <Phone className="size-4" /> {lang === "ar" ? "اتصال" : "Call"}
                  </a>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ========================================================================= */}
      {/* MODAL 3: ADD CUSTOMER LEAD DIALOG                                         */}
      {/* ========================================================================= */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t.crm.addContactBtn}</DialogTitle>
            <DialogDescription className="text-xs">
              {lang === "ar"
                ? "تسجيل جهة اتصال عميل يدوياً مع موضوع الاستفسار ومرحلة المتابعة."
                : "Manually record a customer contact, inquiry topic, and lead stage."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateContact} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t.crm.customerName} *</Label>
              <Input
                required
                placeholder={lang === "ar" ? "مثال: نورهان الشافعي" : "e.g. Sarah Jenkins"}
                value={newContact.name}
                onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                className="bg-card"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t.crm.customerPhone} *</Label>
                <Input
                  required
                  placeholder="01012345678"
                  value={newContact.phone}
                  onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                  className="bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t.crm.email}</Label>
                <Input
                  type="email"
                  placeholder="client@email.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                  className="bg-card"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t.dashboard.directoryTitle}</Label>
                <Select
                  value={newContact.brandId}
                  onValueChange={(val) => setNewContact((p) => ({ ...p, brandId: val }))}
                >
                  <SelectTrigger className="bg-card text-xs">
                    <SelectValue placeholder={t.dashboard.directoryTitle} />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t.crm.filterStage}</Label>
                <Select
                  value={newContact.stage}
                  onValueChange={(val) =>
                    setNewContact((p) => ({ ...p, stage: val as CustomerContact["stage"] }))
                  }
                >
                  <SelectTrigger className="bg-card text-xs">
                    <SelectValue placeholder={t.crm.filterStage} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New Lead">{t.crm.stageNew}</SelectItem>
                    <SelectItem value="Contacted">{t.crm.stageContacted}</SelectItem>
                    <SelectItem value="Qualified">{t.crm.stageQualified}</SelectItem>
                    <SelectItem value="Converted">{t.crm.stageConverted}</SelectItem>
                    <SelectItem value="Inactive">{t.crm.stageLost}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {lang === "ar" ? "موضوع / غرض الاستفسار" : "Inquiry Intent / Topic"}
              </Label>
              <Input
                placeholder={
                  lang === "ar"
                    ? "مثال: استفسار عن حجز طاولة 4 أفراد"
                    : "e.g. Catering inquiry for 4 guests"
                }
                value={newContact.intent}
                onChange={(e) => setNewContact((p) => ({ ...p, intent: e.target.value }))}
                className="bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t.crm.notes}</Label>
              <Textarea
                placeholder={
                  lang === "ar"
                    ? "أي تفاصيل أو طلبات إضافية خاصة بالعميل..."
                    : "Any special customer requests or background details..."
                }
                value={newContact.notes}
                onChange={(e) => setNewContact((p) => ({ ...p, notes: e.target.value }))}
                className="bg-card h-20 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddContactOpen(false)}>
                {t.cancel}
              </Button>
              <Button type="submit">
                {lang === "ar" ? "حفظ بيانات العميل" : "Save Customer Lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
