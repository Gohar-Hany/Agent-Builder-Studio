import { useCallback, useEffect, useState } from "react";
import type { BrandProfile, CustomerContact, ExtractedLead } from "./types";
import { CATEGORY_PRESETS, applyPreset, blankBrand, uid } from "./presets";
import {
  fetchBrandsApi,
  createBrandApi,
  updateBrandApi,
  deleteBrandApi,
  fetchOrdersApi,
  createOrderApi,
  updateOrderStatusApi,
  deleteOrderApi,
  fetchContactsApi,
  createContactApi,
  updateContactApi,
  deleteContactApi,
} from "./api";

const BRANDS_KEY = "kayanova.brands.v1";
const LEADS_KEY = "kayanova.leads.v1";
const CONTACTS_KEY = "kayanova.contacts.v1";
const ACTIVE_KEY = "kayanova.activeBrand.v1";

function seedBrands(): BrandProfile[] {
  return [];
}

function seedLeads(brands: BrandProfile[]): ExtractedLead[] {
  return [];
}

function seedContacts(brands: BrandProfile[]): CustomerContact[] {
  return [];
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("kayanova:sync", { detail: { key } }));
  } catch {
    // quota exceeded fallback
  }
}

export function useKayanova() {
  const [brands, setBrands] = useState<BrandProfile[]>(() => {
    return readStorage<BrandProfile[]>(BRANDS_KEY, []);
  });

  const [activeBrandId, setActiveBrandIdState] = useState<string>(() => {
    return readStorage<string>(ACTIVE_KEY, "");
  });

  const [leads, setLeads] = useState<ExtractedLead[]>(() => {
    return readStorage<ExtractedLead[]>(LEADS_KEY, []);
  });

  const [contacts, setContacts] = useState<CustomerContact[]>(() => {
    return readStorage<CustomerContact[]>(CONTACTS_KEY, []);
  });

  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  // Sync initial state from real FastAPI Backend on mount
  useEffect(() => {
    let mounted = true;
    async function loadBackendData() {
      setIsLoadingBackend(true);
      try {
        const [bData, oData, cData] = await Promise.all([
          fetchBrandsApi().catch(() => null),
          fetchOrdersApi().catch(() => null),
          fetchContactsApi().catch(() => null),
        ]);

        if (mounted) {
          if (bData !== null && Array.isArray(bData)) {
            setBrands(bData);
            writeStorage(BRANDS_KEY, bData);
            if (bData.length > 0 && bData[0]) {
              const currentActive = readStorage<string>(ACTIVE_KEY, "");
              if (!bData.some((b) => b.id === currentActive)) {
                setActiveBrandIdState(bData[0].id);
                writeStorage(ACTIVE_KEY, bData[0].id);
              }
            } else {
              setActiveBrandIdState("");
              writeStorage(ACTIVE_KEY, "");
            }
          }
          if (oData !== null && Array.isArray(oData)) {
            setLeads(oData);
            writeStorage(LEADS_KEY, oData);
          }
          if (cData !== null && Array.isArray(cData)) {
            setContacts(cData);
            writeStorage(CONTACTS_KEY, cData);
          }
        }
      } catch (err) {
        console.warn("Backend sync notice:", err);
      } finally {
        if (mounted) setIsLoadingBackend(false);
      }
    }
    loadBackendData();
    return () => {
      mounted = false;
    };
  }, []);

  // Listen for cross-tab sync events
  useEffect(() => {
    const onSync = () => {
      setBrands(readStorage<BrandProfile[]>(BRANDS_KEY, []));
      setLeads(readStorage<ExtractedLead[]>(LEADS_KEY, []));
      setContacts(readStorage<CustomerContact[]>(CONTACTS_KEY, []));
      setActiveBrandIdState(readStorage<string>(ACTIVE_KEY, ""));
    };
    window.addEventListener("kayanova:sync", onSync);
    return () => window.removeEventListener("kayanova:sync", onSync);
  }, []);

  const setActiveBrandId = useCallback((id: string) => {
    setActiveBrandIdState(id);
    writeStorage(ACTIVE_KEY, id);
  }, []);

  const activeBrand = brands.find((b) => b.id === activeBrandId) ?? brands[0] ?? null;

  const saveBrand = useCallback(
    async (brand: BrandProfile) => {
      const idx = brands.findIndex((b) => b.id === brand.id);
      const isNew = idx === -1;
      const next = isNew ? [brand, ...brands] : brands.map((b) => (b.id === brand.id ? brand : b));
      setBrands(next);
      writeStorage(BRANDS_KEY, next);
      setActiveBrandId(brand.id);

      // Persist to FastAPI Backend
      try {
        if (isNew) {
          await createBrandApi(brand);
        } else {
          await updateBrandApi(brand);
        }
      } catch (err) {
        console.warn("Backend brand save error:", err);
      }
    },
    [brands, setActiveBrandId],
  );

  const deleteBrand = useCallback(
    async (id: string) => {
      const next = brands.filter((b) => b.id !== id);
      setBrands(next);
      writeStorage(BRANDS_KEY, next);
      if (activeBrandId === id) {
        setActiveBrandId(next[0]?.id ?? "");
      }
      try {
        await deleteBrandApi(id);
      } catch (err) {
        console.warn("Backend brand delete error:", err);
      }
    },
    [brands, activeBrandId, setActiveBrandId],
  );

  const addLead = useCallback(async (lead: ExtractedLead) => {
    setLeads((prev) => {
      const next = [lead, ...prev];
      writeStorage(LEADS_KEY, next);
      return next;
    });

    // Auto-upsert into customer contacts directory
    if (lead.customerName || lead.customerPhone) {
      setContacts((prev) => {
        const existingIdx = prev.findIndex(
          (c) =>
            (lead.customerPhone && c.customerPhone === lead.customerPhone) ||
            (lead.customerName && c.customerName === lead.customerName),
        );

        let updated: CustomerContact[];
        if (existingIdx !== -1) {
          const existing = prev[existingIdx]!;
          const nextContact: CustomerContact = {
            ...existing,
            totalOrdersCount: (existing.totalOrdersCount ?? 0) + 1,
            totalSpent: (existing.totalSpent ?? 0) + (lead.numericTotal ?? 0),
            lastContactAt: lead.timestamp,
            stage: "Converted",
          };
          updated = [...prev];
          updated[existingIdx] = nextContact;
          updateContactApi(existing.id, {
            stage: "Converted",
            ...(existing.notes ? { notes: existing.notes } : {}),
          }).catch(console.warn);
        } else {
          const rawCh = lead.channel;
          const validChannel: CustomerContact["channel"] =
            rawCh === "instagram" || rawCh === "web" || rawCh === "phone" ? rawCh : "whatsapp";

          const newContact: CustomerContact = {
            id: uid("contact"),
            brandId: lead.brandId,
            customerName: lead.customerName || "عميل الوكيل",
            customerPhone: lead.customerPhone || "",
            channel: validChannel,
            intent: lead.items?.length ? `طلب: ${lead.items.join(", ")}` : "Order",
            stage: "Converted",
            totalOrdersCount: 1,
            totalSpent: lead.numericTotal ?? 0,
            lastContactAt: lead.timestamp,
            createdAt: new Date().toISOString(),
          };
          updated = [newContact, ...prev];
          createContactApi(newContact).catch(console.warn);
        }
        writeStorage(CONTACTS_KEY, updated);
        return updated;
      });
    }

    // Persist order to FastAPI
    try {
      await createOrderApi(lead);
    } catch (err) {
      console.warn("Backend order creation error:", err);
    }
  }, []);

  const updateLeadStatus = useCallback(async (id: string, status: ExtractedLead["status"]) => {
    setLeads((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, status } : l));
      writeStorage(LEADS_KEY, next);
      return next;
    });
    try {
      await updateOrderStatusApi(id, status);
    } catch (err) {
      console.warn("Backend order status update error:", err);
    }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    setLeads((prev) => {
      const next = prev.filter((l) => l.id !== id);
      writeStorage(LEADS_KEY, next);
      return next;
    });
    try {
      await deleteOrderApi(id);
    } catch (err) {
      console.warn("Backend order delete error:", err);
    }
  }, []);

  const addContact = useCallback(async (contact: CustomerContact) => {
    setContacts((prev) => {
      const next = [contact, ...prev];
      writeStorage(CONTACTS_KEY, next);
      return next;
    });
    try {
      await createContactApi(contact);
    } catch (err) {
      console.warn("Backend contact creation error:", err);
    }
  }, []);

  const updateContactStage = useCallback(async (id: string, stage: CustomerContact["stage"]) => {
    setContacts((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, stage } : c));
      writeStorage(CONTACTS_KEY, next);
      return next;
    });
    try {
      await updateContactApi(id, { stage });
    } catch (err) {
      console.warn("Backend contact stage update error:", err);
    }
  }, []);

  const updateContactNotes = useCallback(async (id: string, notes: string) => {
    setContacts((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, notes } : c));
      writeStorage(CONTACTS_KEY, next);
      return next;
    });
    try {
      await updateContactApi(id, { notes });
    } catch (err) {
      console.warn("Backend contact notes update error:", err);
    }
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      writeStorage(CONTACTS_KEY, next);
      return next;
    });
    try {
      await deleteContactApi(id);
    } catch (err) {
      console.warn("Backend contact delete error:", err);
    }
  }, []);

  return {
    brands,
    activeBrand,
    activeBrandId,
    setActiveBrandId,
    saveBrand,
    deleteBrand,
    leads,
    addLead,
    updateLeadStatus,
    deleteLead,
    contacts,
    addContact,
    updateContactStage,
    updateContactNotes,
    deleteContact,
    isLoadingBackend,
    hydrated: true,
  };
}

export function egp(amount: number | string, lang: "ar" | "en" | string = "ar"): string {
  const num =
    typeof amount === "number" ? amount : parseFloat(String(amount).replace(/[^0-9.]/g, "")) || 0;
  return lang === "en" || lang === "English"
    ? `${num.toLocaleString("en-US")} EGP`
    : `${num.toLocaleString("en-US")} جنيه مصري`;
}

export function relativeTime(iso: string): string {
  if (!iso || typeof iso !== "string") return "الآن";
  const trimmed = iso.trim();
  if (
    trimmed.includes("منذ") ||
    trimmed.includes("اليوم") ||
    trimmed.includes("أمس") ||
    trimmed.includes("ص") ||
    trimmed.includes("م")
  ) {
    return trimmed;
  }
  try {
    const d = new Date(trimmed);
    const time = d.getTime();
    if (isNaN(time)) return trimmed;
    const diff = Math.max(0, Math.floor((Date.now() - time) / 1000));
    if (diff < 60) return "الآن";
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    const days = Math.floor(diff / 86400);
    return `منذ ${days} ${days === 1 ? "يوم" : days === 2 ? "يومين" : days <= 10 ? "أيام" : "يوم"}`;
  } catch {
    return trimmed;
  }
}
