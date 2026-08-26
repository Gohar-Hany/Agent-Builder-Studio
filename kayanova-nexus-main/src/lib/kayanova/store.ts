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

function deduplicateContacts(list: CustomerContact[]): CustomerContact[] {
  const deduped: CustomerContact[] = [];
  for (const c of list) {
    const p = (c.customerPhone || "").trim();
    const existingIdx = deduped.findIndex(
      (d) =>
        d.id === c.id ||
        (p &&
          d.customerPhone &&
          d.customerPhone.trim() === p &&
          (d.brandId === c.brandId || !d.brandId || !c.brandId)),
    );
    if (existingIdx !== -1) {
      const ex = deduped[existingIdx]!;
      deduped[existingIdx] = {
        ...ex,
        customerName: ex.customerName || c.customerName,
        totalOrdersCount: Math.max(ex.totalOrdersCount ?? 1, c.totalOrdersCount ?? 1),
        totalSpent: Math.max(ex.totalSpent ?? 0, c.totalSpent ?? 0),
        lastContactAt: c.lastContactAt || ex.lastContactAt,
        stage:
          ex.stage === "Converted" || c.stage === "Converted"
            ? "Converted"
            : ex.stage || c.stage || "New Lead",
      };
    } else {
      deduped.push(c);
    }
  }
  return deduped;
}

export function useKayanova() {
  const [brands, setBrands] = useState<BrandProfile[]>(() => {
    const raw = readStorage<BrandProfile[]>(BRANDS_KEY, []);
    return raw.filter((b) => !b.name.includes("Custom Agent Brand") && b.name.trim() !== "");
  });

  const [activeBrandId, setActiveBrandIdState] = useState<string>(() => {
    return readStorage<string>(ACTIVE_KEY, "");
  });

  const [leads, setLeads] = useState<ExtractedLead[]>(() => {
    return readStorage<ExtractedLead[]>(LEADS_KEY, []);
  });

  const [contacts, setContacts] = useState<CustomerContact[]>(() => {
    return deduplicateContacts(readStorage<CustomerContact[]>(CONTACTS_KEY, []));
  });

  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  // Sync initial state from real FastAPI Backend on mount with intelligent non-destructive merge
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
          // 1. Merge Brands & purge any ghost brands
          if (bData !== null && Array.isArray(bData)) {
            // Delete ghost brands from backend if found
            for (const b of bData) {
              if (b.name.includes("Custom Agent Brand")) {
                deleteBrandApi(b.id).catch(() => {});
              }
            }

            const localBrands = readStorage<BrandProfile[]>(BRANDS_KEY, []).filter(
              (b) => !b.name.includes("Custom Agent Brand") && b.name.trim() !== "",
            );
            const validBackendBrands = bData.filter(
              (b) => !b.name.includes("Custom Agent Brand") && b.name.trim() !== "",
            );
            const mergedBrands = [...validBackendBrands];

            // Retain any local brands not present on the backend and sync them
            for (const lb of localBrands) {
              if (!mergedBrands.some((mb) => mb.id === lb.id)) {
                mergedBrands.push(lb);
                createBrandApi(lb).catch(() => {});
              }
            }

            setBrands(mergedBrands);
            writeStorage(BRANDS_KEY, mergedBrands);

            if (mergedBrands.length > 0) {
              const currentActive = readStorage<string>(ACTIVE_KEY, "");
              if (!mergedBrands.some((b) => b.id === currentActive)) {
                setActiveBrandIdState(mergedBrands[0]!.id);
                writeStorage(ACTIVE_KEY, mergedBrands[0]!.id);
              }
            } else {
              setActiveBrandIdState("");
              writeStorage(ACTIVE_KEY, "");
            }
          }

          // 2. Merge Orders (Leads)
          if (oData !== null && Array.isArray(oData)) {
            const localLeads = readStorage<ExtractedLead[]>(LEADS_KEY, []);
            const mergedLeads = [...oData];

            // Retain any local leads not present on the backend and sync them
            for (const ll of localLeads) {
              if (!mergedLeads.some((ml) => ml.id === ll.id)) {
                mergedLeads.push(ll);
                createOrderApi(ll).catch(() => {});
              }
            }

            setLeads(mergedLeads);
            writeStorage(LEADS_KEY, mergedLeads);
          }

          // 3. Merge Customer Contacts with strict deduplication
          if (cData !== null && Array.isArray(cData)) {
            const localContacts = readStorage<CustomerContact[]>(CONTACTS_KEY, []);
            const mergedContacts = deduplicateContacts([...cData, ...localContacts]);

            // Sync any local contacts not yet on backend
            for (const mc of mergedContacts) {
              if (
                !cData.some(
                  (bc) =>
                    bc.id === mc.id ||
                    ((mc.customerPhone || "").trim() &&
                      (bc.customerPhone || "").trim() === (mc.customerPhone || "").trim()),
                )
              ) {
                createContactApi(mc).catch(() => {});
              }
            }

            setContacts(mergedContacts);
            writeStorage(CONTACTS_KEY, mergedContacts);
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
      setContacts(deduplicateContacts(readStorage<CustomerContact[]>(CONTACTS_KEY, [])));
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
      let isNew = false;
      setBrands((prev) => {
        const idx = prev.findIndex((b) => b.id === brand.id);
        isNew = idx === -1;
        const next = isNew ? [brand, ...prev] : prev.map((b) => (b.id === brand.id ? brand : b));
        writeStorage(BRANDS_KEY, next);
        return next;
      });
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
    [setActiveBrandId],
  );

  const deleteBrand = useCallback(
    async (id: string) => {
      setBrands((prev) => {
        const next = prev.filter((b) => b.id !== id);
        writeStorage(BRANDS_KEY, next);
        return next;
      });
      if (activeBrandId === id) {
        const remaining = readStorage<BrandProfile[]>(BRANDS_KEY, []);
        setActiveBrandId(remaining[0]?.id ?? "");
      }
      try {
        await deleteBrandApi(id);
      } catch (err) {
        console.warn("Backend brand delete error:", err);
      }
    },
    [activeBrandId, setActiveBrandId],
  );

  const addLead = useCallback(async (lead: ExtractedLead) => {
    // 1. Immediately prepend to leads state & local storage
    setLeads((prev) => {
      const filtered = prev.filter((p) => p.id !== lead.id);
      const next = [lead, ...filtered];
      writeStorage(LEADS_KEY, next);
      return next;
    });

    // 2. Auto-upsert into customer contacts directory
    if (lead.customerName || lead.customerPhone) {
      setContacts((prev) => {
        const existingIdx = prev.findIndex(
          (c) =>
            (lead.customerPhone && c.customerPhone && c.customerPhone === lead.customerPhone) ||
            (lead.customerName && c.customerName && c.customerName === lead.customerName),
        );

        let updated: CustomerContact[];
        if (existingIdx !== -1) {
          const existing = prev[existingIdx]!;
          const nextContact: CustomerContact = {
            ...existing,
            brandId: lead.brandId || existing.brandId,
            totalOrdersCount: (existing.totalOrdersCount ?? 0) + 1,
            totalSpent: (existing.totalSpent ?? 0) + (lead.numericTotal ?? 0),
            lastContactAt: lead.timestamp || new Date().toISOString(),
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
            lastContactAt: lead.timestamp || new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };
          updated = [newContact, ...prev];
          createContactApi(newContact).catch(console.warn);
        }
        const dedupedUpdated = deduplicateContacts(updated);
        writeStorage(CONTACTS_KEY, dedupedUpdated);
        return dedupedUpdated;
      });
    }

    // 3. Persist order to FastAPI
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
      const next = deduplicateContacts([contact, ...prev]);
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
