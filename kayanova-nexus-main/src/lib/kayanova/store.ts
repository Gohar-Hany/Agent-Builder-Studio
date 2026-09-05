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

const MIGRATION_KEY = "kayanova.sandbox_migrated_v2";
if (typeof window !== "undefined" && !localStorage.getItem(MIGRATION_KEY)) {
  try {
    localStorage.removeItem("kayanova.leads.v1");
    localStorage.removeItem("kayanova.contacts.v1");
    localStorage.removeItem("kayanova.brands.v1");
    localStorage.setItem(MIGRATION_KEY, "true");
  } catch {}
}

const BRANDS_KEY = "kayanova.brands.v2";
const LEADS_KEY = "kayanova.leads.v2";
const CONTACTS_KEY = "kayanova.contacts.v2";
const ACTIVE_KEY = "kayanova.activeBrand.v2";
const DELETED_BRANDS_KEY = "kayanova.deleted_brands.v2";
const DELETED_LEADS_KEY = "kayanova.deleted_leads.v2";
const DELETED_CONTACTS_KEY = "kayanova.deleted_contacts.v2";

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

export function isSampleBrand(b: { id?: string; name?: string; isSample?: boolean }): boolean {
  if (b.isSample) return true;
  const id = b.id || "";
  if (id.startsWith("brand-fishawy") || id.startsWith("brand-kamal") || id.startsWith("brand-misk")) return true;
  const n = (b.name || "").trim();
  if (n === "قهوة الفيشاوي" || n === "عيادات د. أحمد كمال" || n === "بوتيك مسك وعنبر") return true;
  return false;
}

export function useKayanova() {
  const [brands, setBrands] = useState<BrandProfile[]>(() => {
    const deleted = readStorage<string[]>(DELETED_BRANDS_KEY, []);
    const raw = readStorage<BrandProfile[]>(BRANDS_KEY, []);
    return raw.filter(
      (b) =>
        !b.name.includes("Custom Agent Brand") &&
        b.name.trim() !== "" &&
        !deleted.includes(b.id) &&
        !isSampleBrand(b),
    );
  });

  const [activeBrandId, setActiveBrandIdState] = useState<string>(() => {
    return readStorage<string>(ACTIVE_KEY, "");
  });

  const [leads, setLeads] = useState<ExtractedLead[]>(() => {
    const deleted = readStorage<string[]>(DELETED_LEADS_KEY, []);
    return readStorage<ExtractedLead[]>(LEADS_KEY, []).filter((l) => !deleted.includes(l.id));
  });

  const [contacts, setContacts] = useState<CustomerContact[]>(() => {
    const deleted = readStorage<string[]>(DELETED_CONTACTS_KEY, []);
    return deduplicateContacts(
      readStorage<CustomerContact[]>(CONTACTS_KEY, []).filter((c) => !deleted.includes(c.id)),
    );
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
          const deletedBrandIds = readStorage<string[]>(DELETED_BRANDS_KEY, []);
          const deletedLeadIds = readStorage<string[]>(DELETED_LEADS_KEY, []);
          const deletedContactIds = readStorage<string[]>(DELETED_CONTACTS_KEY, []);

          // 1. Merge Brands & purge any ghost or user-deleted brands
          if (bData !== null && Array.isArray(bData)) {
            // Delete ghost or deleted brands from backend if found
            for (const b of bData) {
              if (b.name.includes("Custom Agent Brand") || deletedBrandIds.includes(b.id) || isSampleBrand(b)) {
                deleteBrandApi(b.id).catch(() => {});
              }
            }

            const localBrands = readStorage<BrandProfile[]>(BRANDS_KEY, []).filter(
              (b) =>
                !b.name.includes("Custom Agent Brand") &&
                b.name.trim() !== "" &&
                !deletedBrandIds.includes(b.id) &&
                !isSampleBrand(b),
            );
            const validBackendBrands = bData.filter(
              (b) =>
                !b.name.includes("Custom Agent Brand") &&
                b.name.trim() !== "" &&
                !deletedBrandIds.includes(b.id) &&
                !isSampleBrand(b),
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
            for (const o of oData) {
              if (deletedLeadIds.includes(o.id)) {
                deleteOrderApi(o.id).catch(() => {});
              }
            }

            const localLeads = readStorage<ExtractedLead[]>(LEADS_KEY, []).filter(
              (l) => !deletedLeadIds.includes(l.id),
            );
            const validBackendLeads = oData.filter((o) => !deletedLeadIds.includes(o.id));
            const mergedLeads = [...validBackendLeads];

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
            for (const c of cData) {
              if (deletedContactIds.includes(c.id)) {
                deleteContactApi(c.id).catch(() => {});
              }
            }

            const localContacts = readStorage<CustomerContact[]>(CONTACTS_KEY, []).filter(
              (c) => !deletedContactIds.includes(c.id),
            );
            const validBackendContacts = cData.filter((c) => !deletedContactIds.includes(c.id));
            const mergedContacts = deduplicateContacts([...validBackendContacts, ...localContacts]);

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
      const deletedBrands = readStorage<string[]>(DELETED_BRANDS_KEY, []);
      const deletedLeads = readStorage<string[]>(DELETED_LEADS_KEY, []);
      const deletedContacts = readStorage<string[]>(DELETED_CONTACTS_KEY, []);

      setBrands(
        readStorage<BrandProfile[]>(BRANDS_KEY, []).filter(
          (b) =>
            !b.name.includes("Custom Agent Brand") &&
            b.name.trim() !== "" &&
            !deletedBrands.includes(b.id),
        ),
      );
      setLeads(
        readStorage<ExtractedLead[]>(LEADS_KEY, []).filter((l) => !deletedLeads.includes(l.id)),
      );
      setContacts(
        deduplicateContacts(
          readStorage<CustomerContact[]>(CONTACTS_KEY, []).filter(
            (c) => !deletedContacts.includes(c.id),
          ),
        ),
      );
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
      // Remove from tombstone if re-created/saved
      const deleted = readStorage<string[]>(DELETED_BRANDS_KEY, []);
      if (deleted.includes(brand.id)) {
        writeStorage(
          DELETED_BRANDS_KEY,
          deleted.filter((d) => d !== brand.id),
        );
      }

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
      // 1. Mark as permanently deleted in tombstone storage
      const deleted = readStorage<string[]>(DELETED_BRANDS_KEY, []);
      if (!deleted.includes(id)) {
        writeStorage(DELETED_BRANDS_KEY, [...deleted, id]);
      }

      // 2. Remove from active state & local storage
      setBrands((prev) => {
        const next = prev.filter((b) => b.id !== id);
        writeStorage(BRANDS_KEY, next);
        return next;
      });

      // 3. Update active brand if deleted
      if (activeBrandId === id) {
        const remaining = readStorage<BrandProfile[]>(BRANDS_KEY, []).filter((b) => b.id !== id);
        setActiveBrandId(remaining[0]?.id ?? "");
      }

      // 4. Send delete to backend
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
    // 1. Add to tombstone deleted storage
    const deleted = readStorage<string[]>(DELETED_LEADS_KEY, []);
    if (!deleted.includes(id)) {
      writeStorage(DELETED_LEADS_KEY, [...deleted, id]);
    }

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
    // If contact was deleted previously, revive from tombstone
    const deleted = readStorage<string[]>(DELETED_CONTACTS_KEY, []);
    if (deleted.includes(contact.id)) {
      writeStorage(
        DELETED_CONTACTS_KEY,
        deleted.filter((d) => d !== contact.id),
      );
    }

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
    // 1. Add to tombstone deleted storage
    const deleted = readStorage<string[]>(DELETED_CONTACTS_KEY, []);
    if (!deleted.includes(id)) {
      writeStorage(DELETED_CONTACTS_KEY, [...deleted, id]);
    }

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

export function relativeTime(iso: string, lang: string = "ar"): string {
  if (!iso || typeof iso !== "string") return lang === "en" || lang === "English" ? "Just now" : "الآن";
  const trimmed = iso.trim();
  const isEn = lang === "en" || lang === "English";

  // Translate Arabic fixed phrases if UI is currently English
  if (isEn) {
    if (trimmed === "الآن") return "Just now";
    if (trimmed.includes("اليوم")) return trimmed.replace("اليوم،", "Today,").replace("اليوم", "Today");
    if (trimmed.includes("أمس")) return trimmed.replace("أمس،", "Yesterday,").replace("أمس", "Yesterday");
    if (trimmed.includes("منذ")) {
      const match = trimmed.match(/\d+/);
      if (match) {
        if (trimmed.includes("دقيقة") || trimmed.includes("دقائق")) return `${match[0]}m ago`;
        if (trimmed.includes("ساعة") || trimmed.includes("ساعات")) return `${match[0]}h ago`;
        if (trimmed.includes("يوم") || trimmed.includes("أيام")) return `${match[0]}d ago`;
      }
    }
  }

  // If already formatted in Arabic/English
  if (
    trimmed.includes("منذ") ||
    trimmed.includes("اليوم") ||
    trimmed.includes("أمس") ||
    trimmed.includes("ص") ||
    trimmed.includes("م") ||
    trimmed.includes("ago") ||
    trimmed.includes("Today") ||
    trimmed.includes("Yesterday")
  ) {
    return trimmed;
  }
  try {
    const d = new Date(trimmed);
    const time = d.getTime();
    if (isNaN(time)) return trimmed;
    const diff = Math.max(0, Math.floor((Date.now() - time) / 1000));
    if (diff < 90) return isEn ? "Just now" : "الآن";
    if (diff < 3600) {
      const mins = Math.floor(diff / 60);
      return isEn ? `${mins}m ago` : `منذ ${mins} دقيقة`;
    }
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return isEn ? `${hours}h ago` : `منذ ${hours} ساعة`;
    }
    const days = Math.floor(diff / 86400);
    if (days === 1) return isEn ? "Yesterday" : "أمس";
    if (days < 7) return isEn ? `${days}d ago` : `منذ ${days} أيام`;
    
    return d.toLocaleDateString(isEn ? "en-US" : "ar-EG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return trimmed;
  }
}
