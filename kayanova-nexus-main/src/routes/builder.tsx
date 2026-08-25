import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Coffee,
  Globe,
  Layers,
  MessageSquare,
  PackageCheck,
  Plus,
  Rocket,
  Save,
  Send,
  ShieldCheck,
  Shirt,
  Sparkles,
  Stethoscope,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandGlyph } from "@/components/kayanova/AppShell";
import { FormattedMessage } from "@/components/kayanova/FormattedMessage";
import { useAgentChat } from "@/components/kayanova/useAgentChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AVAILABLE_LLM_MODELS,
  COMMON_CATEGORIES,
  COMMON_ROLES,
  DIALECTS,
  TONES,
  applyPreset,
  blankBrand,
  uid,
} from "@/lib/kayanova/presets";
import { egp, useKayanova } from "@/lib/kayanova/store";
import type { BrandProfile, MenuItem } from "@/lib/kayanova/types";
import { generateProfileApi } from "@/lib/kayanova/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type StepKey = "identity" | "knowledge" | "behavior" | "preview";

export const Route = createFileRoute("/builder")({
  validateSearch: (search: Record<string, unknown>): { step: StepKey } => {
    const valid: StepKey[] = ["identity", "knowledge", "behavior", "preview"];
    const step = String(search["step"] ?? "identity") as StepKey;
    return { step: valid.includes(step) ? step : "identity" };
  },
  head: () => ({
    meta: [
      { title: "Agent Builder Studio — Kayanova" },
      {
        name: "description",
        content:
          "Configure brand identity, pricing catalog, guardrails and live-test your AI agent in a 4-step studio.",
      },
      { property: "og:title", content: "Agent Builder Studio — Kayanova" },
      {
        property: "og:description",
        content: "Four-step wizard to build, price, guard and deploy conversational AI agents.",
      },
    ],
  }),
  component: Builder,
});

function Builder() {
  const { step } = Route.useSearch();
  const navigate = useNavigate({ from: "/builder" });
  const { brands, activeBrand, saveBrand, deleteBrand, setActiveBrandId } = useKayanova();
  const { t, lang, isRtl } = useLanguage();
  const [draft, setDraft] = useState<BrandProfile>(() => blankBrand());
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const loaded = useRef(false);

  const isSavedBrand = brands.some((b) => b.id === draft.id);

  const STEPS = [
    {
      key: "identity" as StepKey,
      label: lang === "ar" ? "الهوية" : "Identity",
      fullLabel: t.builder.step1,
      icon: Sparkles,
    },
    {
      key: "knowledge" as StepKey,
      label: lang === "ar" ? "الأسعار" : "Pricing",
      fullLabel: t.builder.step2,
      icon: Layers,
    },
    {
      key: "behavior" as StepKey,
      label: lang === "ar" ? "التوجيهات" : "Directives",
      fullLabel: t.builder.step3,
      icon: ShieldCheck,
    },
    {
      key: "preview" as StepKey,
      label: lang === "ar" ? "الإطلاق" : "Launch",
      fullLabel: t.builder.step4,
      icon: Rocket,
    },
  ] as const;

  // Keep draft initialized as a fresh blank brand by default
  // When the user explicitly picks an agent from the switcher, it loads that agent.

  const patch = (p: Partial<BrandProfile>) => setDraft((d) => ({ ...d, ...p }));
  const goto = (s: StepKey) => void navigate({ search: { step: s } });

  const currentStepIdx = STEPS.findIndex((s) => s.key === step);
  const prevStep = currentStepIdx > 0 ? STEPS[currentStepIdx - 1]?.key : null;
  const nextStep = currentStepIdx < STEPS.length - 1 ? STEPS[currentStepIdx + 1]?.key : null;

  const save = () => {
    if (!draft.name.trim()) {
      toast.error(lang === "ar" ? "اسم العلامة التجارية مطلوب" : "Brand name is required");
      goto("identity");
      return;
    }
    saveBrand(draft);
    setActiveBrandId(draft.id);
    toast.success(
      lang === "ar"
        ? `تم حفظ وتفعيل الوكيل "${draft.name}" بنجاح!`
        : `${draft.name} saved & deployed to live backend`,
    );
  };

  const handleDeleteCurrentAgent = async () => {
    if (!isSavedBrand) return;
    const name = draft.name;
    await deleteBrand(draft.id);
    setIsDeletingDraft(false);
    setDraft(blankBrand());
    goto("identity");
    toast.success(
      lang === "ar" ? `تم حذف الوكيل "${name}" بنجاح!` : `Agent "${name}" deleted successfully!`,
    );
  };

  const autoFill = async () => {
    setIsAutoFilling(true);
    const targetBrandName =
      draft.name.trim() || (lang === "ar" ? "براند جديد" : "My Business Brand");
    toast.info(
      lang === "ar"
        ? `جاري تحسين وتوليد استراتيجية وقائمة أصناف لـ "${targetBrandName}" بالذكاء الاصطناعي...`
        : `AI optimizing brand strategy & catalog for "${targetBrandName}"...`,
    );
    try {
      const generated = await generateProfileApi({
        name: targetBrandName,
        category: draft.category || "Restaurant",
        language: lang === "ar" ? "Arabic" : "English",
        dialect: draft.dialect || "Egyptian Arabic",
        tone: draft.tone || "Friendly",
        currentTagline: draft.tagline,
        currentRole: draft.role,
        currentWelcome: draft.welcomeMessage,
        currentInstructions: draft.promptRules,
      });

      const newItems: MenuItem[] =
        generated.menuItems && generated.menuItems.length > 0
          ? generated.menuItems.map((i) => ({
              id: uid("item"),
              name: i.name,
              price: Number(i.price) || 50,
              category: i.category || (lang === "ar" ? "الأكثر طلباً" : "Featured"),
              available: true,
            }))
          : (draft.menuItems ?? []);

      setDraft((d) => ({
        ...d,
        tagline: generated.tagline ?? d.tagline ?? "",
        role:
          generated.role ??
          d.role ??
          (lang === "ar" ? "مستشار خدمة العملاء وتأكيد الطلبات" : "Senior Representative"),
        welcomeMessage: generated.welcomeMessage ?? d.welcomeMessage ?? "",
        promptRules: generated.instructions ?? d.promptRules ?? "",
        instructions: generated.instructions ?? d.instructions ?? "",
        menuItems: newItems.length > 0 ? newItems : d.menuItems,
      }));
      toast.success(
        lang === "ar"
          ? `تم تحسين وتوليد هوية وقائمة أصناف لـ "${targetBrandName}" بنجاح!`
          : `AI optimized profile & ${newItems.length} catalog items successfully!`,
      );
    } catch {
      const preset = CATEGORY_PRESETS.find((p) => p.key === draft.category) ?? CATEGORY_PRESETS[0]!;
      setDraft((d) =>
        applyPreset(
          { ...d, name: d.name || (lang === "ar" ? preset.labelAr : preset.label) },
          preset,
          lang,
        ),
      );
      toast.success(
        lang === "ar" ? "تم تطبيق النموذج الاستراتيجي بنجاح" : "Blueprint preset applied",
      );
    } finally {
      setIsAutoFilling(false);
    }
  };

  return (
    <AppShell
      title={t.builder.title}
      subtitle={t.builder.subtitle}
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Agent Switcher Dropdown (with embedded + Create New Agent action) */}
          <Select
            value={brands.some((b) => b.id === draft.id) ? draft.id : "new"}
            onValueChange={(val) => {
              if (val === "new") {
                const blank = blankBrand();
                setDraft(blank);
                setActiveBrandId("");
                goto("identity");
                toast.success(
                  lang === "ar" ? "تم فتح مساحة عمل لوكيل جديد" : "Blank workspace ready",
                );
              } else {
                const found = brands.find((b) => b.id === val);
                if (found) {
                  setDraft(found);
                  setActiveBrandId(found.id);
                  toast.success(
                    lang === "ar"
                      ? `تم تحميل الوكيل "${found.name}"`
                      : `Loaded agent "${found.name}"`,
                  );
                }
              }
            }}
          >
            <SelectTrigger className="h-9 bg-card border-2 border-primary/25 hover:border-primary/40 text-xs sm:text-sm w-[135px] sm:w-[170px] font-bold truncate shadow-2xs shrink-0">
              <SelectValue placeholder={lang === "ar" ? "اختر وكيلاً..." : "Select Agent..."} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border shadow-xl z-50 min-w-[200px]">
              <SelectItem value="new" className="text-xs sm:text-sm font-bold text-primary focus:bg-primary/10">
                + {lang === "ar" ? "إنشاء وكيل جديد" : "Create New Agent"}
              </SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs sm:text-sm font-semibold">
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isSavedBrand && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs sm:text-sm text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 px-2 shrink-0"
              onClick={() => setIsDeletingDraft(true)}
              title={lang === "ar" ? "حذف الوكيل الحالي" : "Delete Current Agent"}
            >
              <Trash2 className="size-3.5" />
              <span className="hidden sm:inline">{lang === "ar" ? "حذف" : "Delete"}</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="h-9 text-xs sm:text-sm gap-1.5 px-2.5 sm:px-3 shadow-2xs shrink-0 font-semibold"
            onClick={autoFill}
            disabled={isAutoFilling}
            title={t.builder.autoFillBtn}
          >
            <Sparkles className="size-3.5 text-primary" />
            <span className="hidden md:inline">
              {isAutoFilling
                ? lang === "ar"
                  ? "جاري التوليد..."
                  : "Generating..."
                : t.builder.autoFillBtn}
            </span>
            <span className="md:hidden">
              {isAutoFilling
                ? lang === "ar"
                  ? "..."
                  : "..."
                : lang === "ar"
                  ? "توليد ذكي"
                  : "AI Fill"}
            </span>
          </Button>

          <Button
            size="sm"
            className="h-9 text-xs sm:text-sm gap-1.5 px-3 sm:px-4 brand-gradient text-primary-foreground shadow-xs shrink-0 font-bold"
            onClick={save}
            title={lang === "ar" ? "حفظ الوكيل" : "Save Agent"}
          >
            <Save className="size-3.5" />
            <span>{lang === "ar" ? "حفظ الوكيل" : "Save"}</span>
          </Button>
        </div>
      }
    >
      {/* Delete Agent Modal in Builder */}
      {isDeletingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {lang === "ar" ? "تأكيد حذف الوكيل" : "Confirm Agent Deletion"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "ar"
                    ? `هل أنت متأكد من حذف الوكيل "${draft.name}" وجميع بياناته وقائمته؟ لا يمكن التراجع عن هذا الإجراء.`
                    : `Are you sure you want to delete "${draft.name}" and all its catalog items? This action cannot be undone.`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeletingDraft(false)}
                className="h-9 text-xs sm:text-sm"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteCurrentAgent}
                className="h-9 text-xs sm:text-sm font-semibold"
              >
                <Trash2 className="size-3.5 me-1" />
                {lang === "ar" ? "حذف نهائي" : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Premium Wizard Stepper */}
      <div className="mb-5 sm:mb-7">
        {/* Progress track */}
        <div className="relative flex items-start">
          {/* Connecting line */}
          <div className="absolute top-5 sm:top-6 inset-x-0 h-px bg-border" />
          <div
            className="absolute top-5 sm:top-6 start-0 h-px bg-gradient-to-r from-primary to-primary/30 transition-all duration-500"
            style={{ width: `${(currentStepIdx / (STEPS.length - 1)) * 100}%` }}
          />

          {STEPS.map((s, i) => {
            const isActive = step === s.key;
            const isPassed = i < currentStepIdx;
            const StepIcon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => goto(s.key)}
                className="relative z-10 flex flex-1 flex-col items-center gap-2 group"
              >
                {/* Circle */}
                <span
                  className={cn(
                    "flex size-10 sm:size-12 items-center justify-center rounded-full border-2 transition-all duration-200 shadow-sm",
                    isActive
                      ? "brand-gradient border-transparent text-white shadow-md scale-110"
                      : isPassed
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground group-hover:border-primary/50 group-hover:text-primary",
                  )}
                >
                  {isPassed ? (
                    <Check className="size-4 sm:size-5 stroke-[2.5]" />
                  ) : (
                    <StepIcon className="size-3.5 sm:size-4" />
                  )}
                </span>

                {/* Label */}
                <div className="text-center px-1">
                  <span
                    className={cn(
                      "hidden sm:block text-[10px] uppercase tracking-widest font-semibold leading-none mb-0.5",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {lang === "ar" ? `الخطوة ${i + 1}` : `Step ${i + 1}`}
                  </span>
                  <span
                    className={cn(
                      "block text-[11px] sm:text-xs font-semibold truncate max-w-[70px] sm:max-w-none",
                      isActive ? "text-foreground" : isPassed ? "text-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    <span className="inline sm:hidden">{s.label}</span>
                    <span className="hidden sm:inline">{s.fullLabel}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="space-y-4 sm:space-y-6">
        {step === "identity" ? (
          <IdentityStep draft={draft} patch={patch} setDraft={setDraft} />
        ) : null}
        {step === "knowledge" ? <KnowledgeStep draft={draft} patch={patch} /> : null}
        {step === "behavior" ? <BehaviorStep draft={draft} patch={patch} /> : null}
        {step === "preview" ? <PreviewStep draft={draft} onSave={save} /> : null}

        {/* Step Bottom Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-5 border-t border-border">
          <div>
            {prevStep ? (
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5 text-xs sm:text-sm font-medium px-4"
                onClick={() => goto(prevStep)}
              >
                {isRtl ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
                <span>{t.builder.prevStep}</span>
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5 ms-auto">
            {/* Quick Save on Every Step */}
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-1.5 text-xs sm:text-sm px-4 border-2 border-primary/30 text-primary hover:bg-primary/10 font-bold"
              onClick={save}
              title={lang === "ar" ? "حفظ التغييرات" : "Save Changes"}
            >
              <Save className="size-3.5" />
              <span>{lang === "ar" ? "حفظ التغييرات" : "Save Draft"}</span>
            </Button>

            {nextStep ? (
              <Button
                size="sm"
                className="h-10 gap-2 text-xs sm:text-sm px-5 brand-gradient text-primary-foreground shadow-sm font-bold"
                onClick={() => goto(nextStep)}
              >
                <span>{t.builder.nextStep}</span>
                {isRtl ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-10 gap-2 text-xs sm:text-sm px-6 brand-gradient text-primary-foreground shadow-md font-bold"
                onClick={save}
              >
                <Rocket className="size-4" />
                <span>{lang === "ar" ? "حفظ وإطلاق الوكيل الآن" : "Save & Launch Agent Now"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  subtitle,
  icon: SectionIcon,
  children,
  accentColor = "primary",
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  accentColor?: "primary" | "blue" | "amber" | "violet";
}) {
  const colorMap = {
    primary: "text-primary bg-primary/10 border-primary/20",
    blue: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    amber: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    violet: "text-violet-600 bg-violet-500/10 border-violet-500/20",
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Section header with gradient accent */}
      <div className="flex items-start gap-3.5 border-b border-border bg-secondary/30 px-5 py-4">
        {SectionIcon && (
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${colorMap[accentColor]}`}>
            <SectionIcon className="size-4" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-150 border",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground hover:bg-primary/5",
      )}
    >
      {children}
    </button>
  );
}

function AiActionButton({
  onClick,
  disabled,
  isLoading,
  label,
  loadingLabel,
}: {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  loadingLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all duration-150",
        "border border-primary/30 bg-primary/10 text-primary shadow-2xs",
        "hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-xs active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary/10 disabled:hover:text-primary",
        "whitespace-nowrap shrink-0 cursor-pointer",
      )}
    >
      <Sparkles className={cn("size-3.5 shrink-0", isLoading && "animate-spin")} />
      <span>{isLoading ? (loadingLabel || label) : label}</span>
    </button>
  );
}

function FormField({
  label,
  required,
  hint,
  children,
  action,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-foreground">
          {label}
          {required && <span className="text-primary ms-0.5">*</span>}
        </label>
        {action}
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ========================================================================= */
/* STEP 1: BRAND & IDENTITY                                                  */
/* ========================================================================= */
function IdentityStep({
  draft,
  patch,
  setDraft,
}: {
  draft: BrandProfile;
  patch: (p: Partial<BrandProfile>) => void;
  setDraft: React.Dispatch<React.SetStateAction<BrandProfile>>;
}) {
  const { t, lang } = useLanguage();
  const [isSuggestingBrand, setIsSuggestingBrand] = useState(false);

  const matchedCategory = COMMON_CATEGORIES.find(
    (c) =>
      c.key === draft.category ||
      c.labelAr === draft.category ||
      c.labelEn === draft.category ||
      (draft.category && (
        c.key.toLowerCase().includes(draft.category.toLowerCase()) ||
        draft.category.toLowerCase().includes(c.key.toLowerCase()) ||
        (draft.category === "Restaurant" && c.key.includes("Restaurant")) ||
        (draft.category === "E-Commerce" && c.key.includes("E-commerce")) ||
        (draft.category === "RealEstate" && c.key.includes("Real Estate")) ||
        (draft.category === "Clinic" && c.key.includes("Medical"))
      ))
  );

  const suggestBrandIdentity = async () => {
    setIsSuggestingBrand(true);
    const currentName = draft.name.trim();
    toast.info(
      lang === "ar"
        ? `جاري صياغة الهوية والشعار لـ "${currentName || "البراند"}"...`
        : `AI optimizing brand identity for "${currentName || "Brand"}"...`,
    );
    try {
      const res = await generateProfileApi({
        name: currentName || (lang === "ar" ? "براند جديد" : "New Brand"),
        category: draft.category || "General Business",
        language: lang === "ar" ? "Arabic" : "English",
        dialect: draft.dialect,
        tone: draft.tone,
        currentTagline: draft.tagline,
        currentRole: draft.role,
        currentWelcome: draft.welcomeMessage,
      });
      patch({
        tagline: res.tagline || draft.tagline,
        role: res.role || draft.role,
        welcomeMessage: res.welcomeMessage || draft.welcomeMessage,
      });
      toast.success(
        lang === "ar" ? "تم تحسين وتوليد الهوية والشعار بنجاح" : "Brand identity enhanced!",
      );
    } catch {
      patch({
        tagline:
          lang === "ar"
            ? `الوجهة الرائدة في خدمات ${draft.category || "الأعمال"}`
            : `Leading solutions in ${draft.category || "Business"}`,
      });
      toast.success(lang === "ar" ? "تم تحديث الشعار" : "Tagline updated");
    } finally {
      setIsSuggestingBrand(false);
    }
  };

  return (
    <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
      {/* Left Column: Brand Persona Configuration */}
      <Section
        title={t.builder.step1}
        subtitle={t.builder.subtitle}
        icon={Sparkles}
        accentColor="primary"
      >
        <FormField
          label={t.builder.brandNameLabel}
          required
          action={
            <AiActionButton
              onClick={suggestBrandIdentity}
              isLoading={isSuggestingBrand}
              label={lang === "ar" ? "تحسين بالذكاء الاصطناعي" : "AI Brand Assist"}
              loadingLabel={lang === "ar" ? "جاري التحسين..." : "Optimizing..."}
            />
          }
        >
          <Input
            id="brand-name"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder={t.builder.brandNamePlaceholder}
            className="h-10 text-sm"
          />
        </FormField>

        <FormField
          label={lang === "ar" ? "مجال ونشاط العمل" : "Business Industry & Domain"}
        >
          <Select
            value={matchedCategory ? matchedCategory.key : draft.category ? "other" : "other"}
            onValueChange={(val) => {
              if (val === "other") {
                if (matchedCategory) patch({ category: "" });
              } else {
                const found = COMMON_CATEGORIES.find((c) => c.key === val);
                if (found) patch({ category: lang === "ar" ? found.labelAr : found.labelEn });
              }
            }}
          >
            <SelectTrigger id="business-category" className="h-10">
              <SelectValue
                placeholder={lang === "ar" ? "اختر مجال ونشاط العمل..." : "Select industry & domain..."}
              />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {COMMON_CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {lang === "ar" ? c.labelAr : c.labelEn}
                </SelectItem>
              ))}
              <SelectItem value="other" className="font-semibold text-primary">
                {lang === "ar" ? "مجال آخر (تخصيص يدوي)" : "Other (Custom Industry)..."}
              </SelectItem>
            </SelectContent>
          </Select>
          {/* Custom Industry Input if 'other' */}
          {(!matchedCategory || draft.category === "") && (
            <div className="pt-1.5 duration-200 animate-in fade-in slide-in-from-top-1">
              <Input
                id="custom-category"
                value={draft.category}
                onChange={(e) => patch({ category: e.target.value })}
                placeholder={
                  lang === "ar"
                    ? "اكتب مجال العمل المخصص (مثال: وكالة تسويق رقمي...)"
                    : "Type custom industry (e.g. MarkTech Agency, Logistics...)"
                }
                className="h-10 text-sm"
              />
            </div>
          )}
        </FormField>

        <FormField label={t.builder.roleLabel}>
          <Select
            value={
              COMMON_ROLES.find(
                (r) => r.key === draft.role || r.labelAr === draft.role || r.labelEn === draft.role,
              )?.key ?? (draft.role ? "other" : "")
            }
            onValueChange={(val) => {
              if (val === "other") {
                const isPreset = COMMON_ROLES.some(
                  (r) => r.key === draft.role || r.labelAr === draft.role || r.labelEn === draft.role,
                );
                if (isPreset) patch({ role: "" });
              } else {
                const found = COMMON_ROLES.find((r) => r.key === val);
                if (found) patch({ role: lang === "ar" ? found.labelAr : found.labelEn });
              }
            }}
          >
            <SelectTrigger id="agent-role-select" className="h-10">
              <SelectValue
                placeholder={lang === "ar" ? "اختر المسمى الوظيفي للوكيل..." : "Select agent role..."}
              />
            </SelectTrigger>
            <SelectContent>
              {COMMON_ROLES.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  {lang === "ar" ? r.labelAr : r.labelEn}
                </SelectItem>
              ))}
              <SelectItem value="other" className="font-semibold text-primary">
                {lang === "ar" ? "مسمى وظيفي آخر (تخصيص يدوي)" : "Other (Custom Role)..."}
              </SelectItem>
            </SelectContent>
          </Select>
          {/* If 'other' is active or custom role typed, show custom input */}
          {(!COMMON_ROLES.some(
            (r) => r.key === draft.role || r.labelAr === draft.role || r.labelEn === draft.role,
          ) ||
            draft.role === "") && (
            <div className="pt-1.5 duration-200 animate-in fade-in slide-in-from-top-1">
              <Input
                id="agent-role-custom"
                value={draft.role}
                onChange={(e) => patch({ role: e.target.value })}
                placeholder={
                  lang === "ar"
                    ? "اكتب المسمى الوظيفي المخصص للوكيل..."
                    : "Type custom agent job title..."
                }
                className="h-10 text-sm"
              />
            </div>
          )}
        </FormField>

        <FormField
          label={t.builder.taglineLabel}
          hint={lang === "ar" ? "جملة قصيرة تصف ميزة العلامة ورؤيتها" : "A short sentence describing your brand's unique value"}
        >
          <Input
            id="tagline"
            value={draft.tagline ?? ""}
            onChange={(e) => patch({ tagline: e.target.value })}
            placeholder={t.builder.taglinePlaceholder}
            className="h-10 text-sm"
          />
        </FormField>

        <FormField label={t.builder.dialectLabel}>
          <Select
            value={draft.dialect || "Egyptian Arabic"}
            onValueChange={(val) =>
              patch({
                dialect: val,
                language: val === "English" ? "English" : "Arabic",
              })
            }
          >
            <SelectTrigger id="dialect-select" className="h-10">
              <SelectValue placeholder={t.builder.dialectLabel} />
            </SelectTrigger>
            <SelectContent>
              {DIALECTS.map((d) => (
                <SelectItem key={d.key} value={d.key}>
                  {lang === "ar" ? d.labelAr : d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label={t.builder.toneLabel}>
          <Select value={draft.tone || "Friendly"} onValueChange={(val) => patch({ tone: val })}>
            <SelectTrigger id="tone-select" className="h-10">
              <SelectValue placeholder={t.builder.toneLabel} />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((tn) => (
                <SelectItem key={tn.key} value={tn.key}>
                  {lang === "ar" ? tn.labelAr : tn.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* AI LLM Model Selector */}
        <FormField
          label={lang === "ar" ? "محرك الذكاء الاصطناعي (AI Model Engine)" : "AI Intelligence Engine (LLM)"}
          hint={lang === "ar" ? "اختر الموديل الذي يدير عقل ومحادثات الوكيل" : "Select the AI model powering your agent's brain"}
        >
          <Select
            value={draft.llmModel || "google/gemini-3.7-flash"}
            onValueChange={(val) => patch({ llmModel: val })}
          >
            <SelectTrigger id="model-select" className="h-11">
              <SelectValue placeholder={lang === "ar" ? "اختر موديل الذكاء الاصطناعي..." : "Select AI Model..."} />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_LLM_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="py-2">
                  <div className="flex items-center justify-between gap-3 w-full">
                    <span className="font-semibold text-foreground">
                      {lang === "ar" ? m.nameAr : m.name}
                    </span>
                    <span className="text-[10px] font-bold rounded-full bg-primary/10 px-2 py-0.5 text-primary border border-primary/20">
                      {lang === "ar" ? m.badge : m.badgeEn}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quick Model Badge & Context Info */}
          {(() => {
            const currentModel =
              AVAILABLE_LLM_MODELS.find((m) => m.id === draft.llmModel) || AVAILABLE_LLM_MODELS[0];
            return (
              <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="size-3.5" />
                    {lang === "ar" ? currentModel?.badge : currentModel?.badgeEn}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {lang === "ar" ? `سياق ${currentModel?.contextLength}` : `Context ${currentModel?.contextLength}`}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  {lang === "ar" ? currentModel?.descriptionAr : currentModel?.descriptionEn}
                </p>
              </div>
            );
          })()}
        </FormField>
      </Section>

      {/* Right Column: Live Agent Persona Preview */}
      <Section
        title={lang === "ar" ? "معاينة هوية الوكيل المباشرة" : "Live Agent Persona Preview"}
        subtitle={lang === "ar" ? "تحديث فوري لبطاقة وهوية الوكيل أثناء الإدخال" : "Real-time persona card updating as you configure"}
        icon={Bot}
        accentColor="violet"
      >
        {/* Agent Card — Premium Version */}
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          {/* Card top bar */}
          <div className="brand-gradient h-1 w-full" />

          {/* Header Section */}
          <div className="flex items-start gap-4 p-5">
            <BrandGlyph icon={draft.iconType} className="size-14 text-2xl shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-foreground truncate leading-tight">
                {draft.name || (lang === "ar" ? "اسم العلامة التجارية" : "Brand Name")}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <Badge variant="secondary" className="text-[11px] font-medium">
                  {draft.category || (lang === "ar" ? "مجال العمل" : "Industry")}
                </Badge>
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  {lang === "ar" ? "وكيل نشط" : "Active Agent"}
                </span>
              </div>
              <p className="mt-1.5 text-xs font-semibold text-primary">
                {draft.role || (lang === "ar" ? "مستشار خدمة العملاء وتأكيد الطلبات" : "Customer Concierge & Order Specialist")}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground italic leading-relaxed">
                “{draft.tagline || (lang === "ar" ? "شعار البراند ورؤيته..." : "Brand tagline and vision...")}”
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 px-5 pb-4">
            <div className="rounded-xl bg-secondary/60 border border-border px-3 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                {t.builder.dialectLabel}
              </span>
              <span className="font-bold text-foreground text-xs mt-0.5 block truncate">
                {(t.dialects[draft.dialect as keyof typeof t.dialects] ?? draft.dialect) || "—"}
              </span>
            </div>
            <div className="rounded-xl bg-secondary/60 border border-border px-3 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                {t.builder.toneLabel}
              </span>
              <span className="font-bold text-foreground text-xs mt-0.5 block truncate">
                {(t.tones[draft.tone as keyof typeof t.tones] ?? draft.tone) || "—"}
              </span>
            </div>
            <div className="rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary block">
                {lang === "ar" ? "الموديل" : "Model"}
              </span>
              <span className="font-bold text-primary text-xs mt-0.5 block truncate">
                {AVAILABLE_LLM_MODELS.find((m) => m.id === draft.llmModel)?.name || "Gemini 3.7 Flash"}
              </span>
            </div>
          </div>

          {/* Readiness Meter */}
          <div className="mx-5 mb-5 rounded-xl border border-border bg-card p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">{lang === "ar" ? "جاهزية الوكيل للإطلاق" : "Agent Launch Readiness"}</span>
              <span className="text-primary font-bold">
                {draft.name && draft.category && draft.role ? "100%" : draft.name ? "67%" : "33%"}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full brand-gradient transition-all duration-500 rounded-full"
                style={{
                  width: draft.name && draft.category && draft.role ? "100%" : draft.name ? "67%" : "33%",
                }}
              />
            </div>
            <div className="mt-2 flex gap-3 text-[11px]">
              <span className={cn("flex items-center gap-1", draft.name ? "text-primary font-semibold" : "text-muted-foreground")}>
                <Check className={cn("size-3", draft.name ? "text-primary" : "text-muted-foreground/40")} />
                {lang === "ar" ? "الاسم" : "Name"}
              </span>
              <span className={cn("flex items-center gap-1", draft.category ? "text-primary font-semibold" : "text-muted-foreground")}>
                <Check className={cn("size-3", draft.category ? "text-primary" : "text-muted-foreground/40")} />
                {lang === "ar" ? "المجال" : "Industry"}
              </span>
              <span className={cn("flex items-center gap-1", draft.role ? "text-primary font-semibold" : "text-muted-foreground")}>
                <Check className={cn("size-3", draft.role ? "text-primary" : "text-muted-foreground/40")} />
                {lang === "ar" ? "الدور" : "Role"}
              </span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

const SCHEDULE_PRESETS = [
  {
    key: "24_7",
    labelAr: "24/7 (يومياً على مدار الساعة)",
    labelEn: "24/7 (Around the Clock)",
    valueAr: "يومياً على مدار 24 ساعة طوال أيام الأسبوع",
    valueEn: "24/7 Open Daily Around the Clock",
  },
  {
    key: "daily_cafe",
    labelAr: "يومياً: 08:00 ص – 12:00 منتصف الليل",
    labelEn: "Daily: 08:00 AM – 12:00 AM",
    valueAr: "يومياً من 08:00 صباحاً حتى 12:00 منتصف الليل",
    valueEn: "Daily: 08:00 AM – 12:00 Midnight",
  },
  {
    key: "daily_mall",
    labelAr: "يومياً: 10:00 ص – 11:30 م",
    labelEn: "Daily: 10:00 AM – 11:30 PM",
    valueAr: "يومياً من 10:00 صباحاً حتى 11:30 مساءً",
    valueEn: "Daily: 10:00 AM – 11:30 PM",
  },
  {
    key: "clinic_schedule",
    labelAr: "السبت – الخميس: 10:00 ص – 10:00 م (الجمعة عطلة)",
    labelEn: "Sat – Thu: 10:00 AM – 10:00 PM (Fri Off)",
    valueAr: "السبت إلى الخميس: 10:00 ص – 10:00 م (الجمعة عطلة)",
    valueEn: "Saturday to Thursday: 10:00 AM – 10:00 PM (Friday Off)",
  },
  {
    key: "corporate_schedule",
    labelAr: "الأحد – الخميس: 09:00 ص – 05:00 م (أوقات العمل الرسمية)",
    labelEn: "Sun – Thu: 09:00 AM – 05:00 PM (Business Hours)",
    valueAr: "الأحد إلى الخميس من 09:00 ص إلى 05:00 م",
    valueEn: "Sunday to Thursday: 09:00 AM – 05:00 PM",
  },
];

/* ========================================================================= */
/* STEP 2: MENU & PRICING                                                    */
/* ========================================================================= */
function KnowledgeStep({
  draft,
  patch,
}: {
  draft: BrandProfile;
  patch: (p: Partial<BrandProfile>) => void;
}) {
  const { t, lang } = useLanguage();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [isAiGeneratingItems, setIsAiGeneratingItems] = useState(false);
  const items = draft.menuItems ?? [];

  const addItem = () => {
    if (!name.trim() || !price) {
      toast.error(
        lang === "ar" ? "يرجى إدخال اسم الصنف والسعر" : "Item name and price are required",
      );
      return;
    }
    const item: MenuItem = {
      id: uid("item"),
      name: name.trim(),
      price: Number(price),
      category: category.trim() || (lang === "ar" ? "عام" : "General"),
      available: true,
    };
    patch({ menuItems: [...items, item] });
    setName("");
    setPrice("");
    setCategory("");
    toast.success(
      lang === "ar" ? `تمت إضافة "${item.name}" للقائمة` : `"${item.name}" added to catalog`,
    );
  };

  const generateSmartItems = async () => {
    setIsAiGeneratingItems(true);
    const bName = draft.name.trim() || (lang === "ar" ? "براند جديد" : "My Business Brand");
    toast.info(
      lang === "ar"
        ? `جاري توليد أصناف وأسعار ذكية لـ "${bName}" بالذكاء الاصطناعي...`
        : `AI generating smart catalog items for "${bName}"...`,
    );
    try {
      const res = await generateProfileApi({
        name: bName,
        category: draft.category || "Restaurant",
        language: lang === "ar" ? "Arabic" : "English",
        dialect: draft.dialect,
        tone: draft.tone,
        currentTagline: draft.tagline,
        currentRole: draft.role,
      });

      if (res.menuItems && res.menuItems.length > 0) {
        const generatedItems: MenuItem[] = res.menuItems.map((i) => ({
          id: uid("item"),
          name: i.name,
          price: Number(i.price) || 50,
          category: i.category || (lang === "ar" ? "الأكثر طلباً" : "Featured"),
          available: true,
        }));
        patch({ menuItems: [...items, ...generatedItems] });
        toast.success(
          lang === "ar"
            ? `تمت إضافة ${generatedItems.length} أصناف ذكية مخصصة لـ "${bName}"!`
            : `Added ${generatedItems.length} smart custom items!`,
        );
      } else {
        throw new Error("No items");
      }
    } catch {
      const preset = CATEGORY_PRESETS.find((p) => p.key === draft.category) ?? CATEGORY_PRESETS[0]!;
      const presetItems: MenuItem[] = (lang === "ar" ? preset.itemsAr : preset.items).map((i) => ({
        ...i,
        id: uid("item"),
        available: true,
      }));
      patch({ menuItems: [...items, ...presetItems] });
      toast.success(
        lang === "ar"
          ? `تم استيراد ${presetItems.length} أصناف من النموذج الاستراتيجي`
          : `Imported ${presetItems.length} blueprint items`,
      );
    } finally {
      setIsAiGeneratingItems(false);
    }
  };

  return (
    <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Section
        title={t.builder.catalogTitle}
        subtitle={t.builder.catalogDesc}
        icon={Layers}
        accentColor="blue"
      >
        {/* Add Item Form */}
        <div className="overflow-hidden rounded-xl border border-border bg-secondary/30">
          <div className="border-b border-border bg-secondary/50 px-4 py-2.5 flex items-center gap-2">
            <Plus className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">
              {t.builder.addItemBtn}
            </span>
          </div>
          <div className="p-3 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_0.8fr_1fr] gap-2">
              <Input
                placeholder={t.builder.itemName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-sm"
              />
              <Input
                placeholder={t.builder.itemPrice}
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-10 text-sm"
              />
              <Input
                placeholder={t.builder.itemCategory}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <Button
              onClick={addItem}
              className="h-9 w-full text-sm gap-2 brand-gradient text-primary-foreground"
            >
              <Plus className="size-3.5" />
              {lang === "ar" ? "إضافة صنف للقائمة" : "Add Item to Catalog"}
            </Button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t.builder.itemName}</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t.builder.itemCategory}</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t.builder.itemPrice}</th>
                <th className="px-4 py-3 text-end text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                        <Layers className="size-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">{t.builder.emptyCatalog}</p>
                      <p className="text-[11px] text-muted-foreground/60">{lang === "ar" ? "أضف الأصناف بدوياً أو استخدم التوليد الذكي" : "Add items manually or use AI generation below"}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="group transition-colors hover:bg-primary/3">
                    <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0.5">
                        {item.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">
                        {egp(item.price, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                        aria-label={`${t.delete} ${item.name}`}
                        onClick={() => patch({ menuItems: items.filter((i) => i.id !== item.id) })}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Items Cards List */}
        <div className="block sm:hidden space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                <Layers className="size-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">{t.builder.emptyCatalog}</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-xs"
              >
                <div className="min-w-0 flex-1 pe-2">
                  <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {item.category}
                    </Badge>
                    <span className="text-xs font-bold text-primary">{egp(item.price, lang)}</span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => patch({ menuItems: items.filter((i) => i.id !== item.id) })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Smart AI Catalog Button */}
        <button
          type="button"
          disabled={isAiGeneratingItems}
          className={cn(
            "group w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/4 px-4 py-3.5 text-center transition-all hover:border-primary/60 hover:bg-primary/8 disabled:opacity-60",
          )}
          onClick={generateSmartItems}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {isAiGeneratingItems
                ? lang === "ar" ? "جاري التوليد بالذكاء الاصطناعي..." : "Generating AI items..."
                : lang === "ar"
                  ? `توليد أصناف وخدمات ذكية لـ “${draft.name || "البراند"}”`
                  : `Generate Smart Catalog for "${draft.name || "Brand"}"`}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-primary/60">
            {lang === "ar" ? "سيتم توليد أسعار وأصناف مخصصة باستخدام الذكاء الاصطناعي" : "AI will generate custom items & real prices for your brand"}
          </p>
        </button>
      </Section>

      <Section
        title={lang === "ar" ? "بيانات الفروع والتواصل" : "Branches & Contact Info"}
        subtitle={lang === "ar" ? "ساعات العمل والتوصيل والمواقع الجغرافية" : "Operating hours and physical locations"}
        icon={Building2}
        accentColor="amber"
      >
        <FormField label={t.crm.customerPhone}>
          <Input
            id="phone"
            value={draft.contactInfo?.phone ?? ""}
            onChange={(e) =>
              patch({ contactInfo: { ...draft.contactInfo, phone: e.target.value } })
            }
            placeholder={t.builder.phonePlaceholder}
            className="h-10 text-sm"
          />
        </FormField>

        <FormField
          label={lang === "ar" ? "مواعيد العمل والتوصيل" : "Working & Delivery Hours"}
        >
          <Select
            value={
              SCHEDULE_PRESETS.find(
                (p) =>
                  p.valueAr === draft.contactInfo?.hours ||
                  p.valueEn === draft.contactInfo?.hours ||
                  p.labelAr === draft.contactInfo?.hours ||
                  p.labelEn === draft.contactInfo?.hours ||
                  p.key === draft.contactInfo?.hours,
              )?.key ?? (draft.contactInfo?.hours ? "custom" : "")
            }
            onValueChange={(val) => {
              if (val === "custom") {
                patch({
                  contactInfo: {
                    ...draft.contactInfo,
                    hours: draft.contactInfo?.hours || "",
                    workingHours: draft.contactInfo?.workingHours || "",
                  },
                });
              } else {
                const preset = SCHEDULE_PRESETS.find((s) => s.key === val);
                if (preset) {
                  const text = lang === "ar" ? preset.valueAr : preset.valueEn;
                  patch({
                    contactInfo: {
                      ...draft.contactInfo,
                      hours: text,
                      workingHours: text,
                    },
                  });
                  toast.success(
                    lang === "ar" ? "تم تعيين جدول مواعيد العمل" : "Operating hours applied",
                  );
                }
              }
            }}
          >
            <SelectTrigger id="hours" className="h-10">
              <SelectValue
                placeholder={lang === "ar" ? "اختر جدول مواعيد العمل..." : "Select working hours..."}
              />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_PRESETS.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {lang === "ar" ? p.labelAr : p.labelEn}
                </SelectItem>
              ))}
              <SelectItem value="custom" className="font-semibold text-primary">
                {lang === "ar" ? "مواعيد مخصصة (تحديد يدوي)..." : "Custom Hours..."}
              </SelectItem>
            </SelectContent>
          </Select>
          {(!SCHEDULE_PRESETS.some(
            (p) =>
              p.valueAr === draft.contactInfo?.hours ||
              p.valueEn === draft.contactInfo?.hours ||
              p.labelAr === draft.contactInfo?.hours ||
              p.labelEn === draft.contactInfo?.hours ||
              p.key === draft.contactInfo?.hours,
          ) ||
            draft.contactInfo?.hours === "") && (
            <div className="pt-1.5 duration-200 animate-in fade-in slide-in-from-top-1">
              <Input
                id="hours-custom"
                value={draft.contactInfo?.hours ?? ""}
                onChange={(e) =>
                  patch({
                    contactInfo: {
                      ...draft.contactInfo,
                      hours: e.target.value,
                      workingHours: e.target.value,
                    },
                  })
                }
                placeholder={lang === "ar" ? "اكتب مواعيد العمل المخصصة..." : "Type custom working hours..."}
                className="h-10 text-sm"
              />
            </div>
          )}
        </FormField>

        <FormField label={t.crm.address}>
          <Textarea
            id="address"
            rows={3}
            value={draft.contactInfo?.address ?? ""}
            onChange={(e) =>
              patch({ contactInfo: { ...draft.contactInfo, address: e.target.value } })
            }
            placeholder={t.builder.addressPlaceholder}
            className="text-sm resize-none"
          />
        </FormField>
      </Section>
    </div>
  );
}

/* ========================================================================= */
/* STEP 3: BEHAVIOR & DIRECTIVES                                             */
/* ========================================================================= */
function BehaviorStep({
  draft,
  patch,
}: {
  draft: BrandProfile;
  patch: (p: Partial<BrandProfile>) => void;
}) {
  const { t, lang } = useLanguage();
  const [isCraftingRules, setIsCraftingRules] = useState(false);
  const g = draft.guardrails ?? {};
  const toggles = [
    {
      key: "strictPrice" as const,
      icon: ShieldCheck,
      titleAr: "فحص الأسعار الصارم",
      titleEn: "Strict Price Verification",
      descAr: "يلتزم الوكيل بالأسعار المسجلة فقط ولا يؤلف أسعار غير موجودة في القائمة",
      descEn: "Agent only uses registered prices, never invents or guesses prices",
    },
    {
      key: "orderCollector" as const,
      icon: PackageCheck,
      titleAr: "جمع بيانات الطلب تلقائياً",
      titleEn: "Automatic Order Data Collection",
      descAr: "يجمع الوكيل الاسم والهاتف والعنوان تلقائياً لتسجيل الطلبات في النظام",
      descEn: "Collects customer name, phone & address automatically to log orders",
    },
    {
      key: "bookingMode" as const,
      icon: CalendarDays,
      titleAr: "نظام الحجز والمواعيد",
      titleEn: "Booking & Reservation Mode",
      descAr: "يحجز الوكيل المواعيد والطاولات ويتحقق من توفر المكان قبل التأكيد",
      descEn: "Handles table/slot reservations and confirms availability before booking",
    },
  ];

  const craftAiRules = async () => {
    setIsCraftingRules(true);
    const bName = draft.name.trim() || (lang === "ar" ? "براند جديد" : "My Brand");
    toast.info(
      lang === "ar"
        ? `جاري صياغة توجيهات وقواعد المحادثة لـ "${bName}" بالذكاء الاصطناعي...`
        : `AI crafting dialogue rules for "${bName}"...`,
    );
    try {
      const res = await generateProfileApi({
        name: bName,
        category: draft.category || "Restaurant",
        dialect: draft.dialect,
        tone: draft.tone,
        currentTagline: draft.tagline,
        currentRole: draft.role,
        currentWelcome: draft.welcomeMessage,
      });

      if (res.instructions) {
        patch({ promptRules: res.instructions, instructions: res.instructions });
        toast.success(
          lang === "ar"
            ? "تمت صياغة توجيهات وقواعد المحادثة بنجاح!"
            : "AI prompt rules generated successfully!",
        );
      }
    } catch {
      const preset = CATEGORY_PRESETS.find((p) => p.key === draft.category) ?? CATEGORY_PRESETS[0]!;
      const fallbackRules = lang === "ar" ? preset.rulesAr : preset.rules;
      patch({ promptRules: fallbackRules, instructions: fallbackRules });
      toast.success(lang === "ar" ? "تم تطبيق القواعد الاستراتيجية" : "Blueprint rules applied");
    } finally {
      setIsCraftingRules(false);
    }
  };

  return (
    <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
      {/* Left: Welcome Message + Prompt Rules */}
      <Section
        title={t.builder.directivesTitle}
        subtitle={lang === "ar" ? "تعليمات وقواعد التشغيل الصارمة" : "Strict operating rules and AI dialogue instructions"}
        icon={MessageSquare}
        accentColor="primary"
      >
        <FormField
          label={t.builder.welcomeMessageLabel}
          hint={lang === "ar" ? "الرسالة التي يرسلها الوكيل فور بدء المحادثة" : "First message sent automatically when conversation starts"}
        >
          <Textarea
            id="welcome"
            rows={3}
            value={draft.welcomeMessage ?? ""}
            onChange={(e) => patch({ welcomeMessage: e.target.value })}
            placeholder={t.builder.welcomePlaceholder}
            className="text-sm resize-none bg-card"
          />
        </FormField>

        <FormField
          label={t.builder.instructionsLabel}
          action={
            <AiActionButton
              onClick={craftAiRules}
              isLoading={isCraftingRules}
              label={lang === "ar" ? "صياغة القواعد بالذكاء الاصطناعي" : "AI Rules Craft"}
              loadingLabel={lang === "ar" ? "جاري الصياغة..." : "Crafting..."}
            />
          }
          hint={lang === "ar" ? "قواعد صارمة تتحكم في سلوك الوكيل وردود فعله" : "Strict rules controlling the agent's behavior and responses"}
        >
          <Textarea
            id="rules"
            rows={7}
            value={draft.promptRules || draft.instructions || ""}
            onChange={(e) => patch({ promptRules: e.target.value, instructions: e.target.value })}
            placeholder={t.builder.instructionsPlaceholder}
            className="text-sm resize-none bg-card font-mono text-xs leading-relaxed"
          />
        </FormField>
      </Section>

      {/* Right: Guardrail Toggles */}
      <Section
        title={lang === "ar" ? "التوجيهات وقواعد الأمان" : "Safety Guardrails & Features"}
        subtitle={lang === "ar" ? "فعّل الميزات التي تحتاجها لبراندك" : "Enable the guardrail features your brand needs"}
        icon={ShieldCheck}
        accentColor="violet"
      >
        <div className="space-y-3">
          {toggles.map((tg, idx) => {
            const isOn = Boolean(g[tg.key]);
            // Static accent classes per index to avoid Tailwind JIT purge issues
            const iconActiveClass = [
              "text-primary bg-primary/10 border-primary/20",
              "text-amber-600 bg-amber-100 border-amber-200",
              "text-violet-600 bg-violet-100 border-violet-200",
            ][idx % 3]!;
            return (
              <label
                key={tg.key}
                htmlFor={`toggle-${tg.key}`}
                className={cn(
                  "flex cursor-pointer items-start justify-between gap-3 rounded-2xl border-2 p-4 transition-all duration-200 select-none",
                  isOn
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:bg-secondary/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl border transition-all",
                      isOn ? iconActiveClass : "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    <tg.icon className="size-4" />
                  </div>
                  <div>
                    <p className={cn("text-sm font-bold", isOn ? "text-foreground" : "text-foreground/80")}>
                      {lang === "ar" ? tg.titleAr : tg.titleEn}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                      {lang === "ar" ? tg.descAr : tg.descEn}
                    </p>
                    {isOn && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <span className="size-1.5 rounded-full bg-primary" />
                        {lang === "ar" ? "مفعّل" : "Active"}
                      </span>
                    )}
                  </div>
                </div>
                <Switch
                  id={`toggle-${tg.key}`}
                  checked={isOn}
                  onCheckedChange={(v) => patch({ guardrails: { ...g, [tg.key]: v } })}
                  className="shrink-0 mt-0.5"
                />
              </label>
            );
          })}
        </div>

        {/* Tips card */}
        <div className="rounded-xl border border-border bg-secondary/40 p-3.5 space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {lang === "ar" ? "تلميح مهني" : "Pro Tip"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {lang === "ar"
              ? "فعّل 'تدقيق الأسعار' لمنع تأليف أسعار غير مسجلة، و 'جمع بيانات الطلب' لتتبع الطلبات أتوماتيكياً."
              : "Enable 'Strict Pricing' to prevent unregistered prices, and 'Order Collector' to automatically track orders in CRM."}
          </p>
        </div>
      </Section>
    </div>
  );
}

/* ========================================================================= */
/* STEP 4: PREVIEW & LIVE TEST                                               */
/* ========================================================================= */
function PreviewStep({ draft, onSave }: { draft: BrandProfile; onSave: () => void }) {
  const { t, lang } = useLanguage();
  const { messages, pending, send, reset } = useAgentChat(draft, "web");
  const [input, setInput] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const summary = useMemo(
    () => [
      [t.builder.brandNameLabel, draft.name || "—"],
      [
        t.builder.categoryLabel,
        t.categories[draft.category as keyof typeof t.categories] ?? draft.category,
      ],
      [
        t.builder.dialectLabel,
        t.dialects[draft.dialect as keyof typeof t.dialects] ?? draft.dialect,
      ],
      [t.builder.toneLabel, t.tones[draft.tone as keyof typeof t.tones] ?? draft.tone],
      [
        t.builder.catalogItemsCount,
        `${draft.menuItems?.length ?? 0} ${lang === "ar" ? "أصناف" : "items"}`,
      ],
      [t.crm.customerPhone, draft.contactInfo?.phone ?? "—"],
    ],
    [draft, t, lang],
  );

  return (
    <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.2fr_1fr]">
      {/* Left: Live Chat Test */}
      <Section
        title={t.builder.testTitle}
        subtitle={t.builder.testSubtitle}
        icon={MessageSquare}
        accentColor="primary"
      >
        {/* Chat Area */}
        <div
          ref={scroller}
          className="h-72 sm:h-80 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-3 sm:p-4 space-y-3"
        >
          {messages.length === 0 && !pending && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full border border-border bg-card">
                <Bot className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {lang === "ar" ? "ابدأ المحادثة مع وكيلك الذكي" : "Start chatting with your AI agent"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {lang === "ar" ? "اكتب رسالتك أدناه لاختبار الوكيل" : "Type a message below to test your agent"}
                </p>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2",
                m.role === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              {m.role === "assistant" && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Bot className="size-3.5" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed",
                  m.role === "user"
                    ? "brand-gradient text-white font-medium shadow-sm"
                    : "bg-card text-foreground shadow-xs border border-border",
                )}
              >
                <FormattedMessage content={m.content} isUser={m.role === "user"} />
              </div>
            </div>
          ))}
          {pending ? (
            <div className="flex gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <Bot className="size-3.5 text-primary" />
              </div>
              <div className="rounded-2xl bg-card border border-border px-4 py-2.5 shadow-xs">
                <div className="flex gap-1 items-center">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Chat Input */}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            void send(input);
            setInput("");
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.simulator.placeholder}
            className="h-10 text-sm flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            className="h-10 w-10 shrink-0 brand-gradient text-white"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </Section>

      {/* Right: Agent Scorecard */}
      <Section
        title={t.builder.agentScorecard}
        subtitle={lang === "ar" ? "الوكيل جاهز لامتحان الإطلاق الفوري" : "Agent readiness check before going live"}
        icon={Rocket}
        accentColor="amber"
      >
        <div className="space-y-1.5">
          {summary.map(([k, v], i) => {
            const hasValue = v && v !== "—" && v !== "0 items" && v !== "0 أصناف";
            const colors = [
              "border-s-primary/60 bg-primary/3",
              "border-s-blue-500/60 bg-blue-500/3",
              "border-s-amber-500/60 bg-amber-500/3",
              "border-s-violet-500/60 bg-violet-500/3",
              "border-s-primary/60 bg-primary/3",
              "border-s-blue-500/60 bg-blue-500/3",
            ];
            return (
              <div
                key={k}
                className={cn(
                  "flex items-center justify-between rounded-xl border border-border border-s-4 px-3.5 py-3 transition-all",
                  hasValue ? colors[i % colors.length] : "bg-secondary/30",
                )}
              >
                <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
                <dd
                  className={cn(
                    "text-sm font-bold",
                    hasValue ? "text-foreground" : "text-muted-foreground/50",
                  )}
                >
                  {v || "—"}
                </dd>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <Button
            onClick={onSave}
            className="h-11 text-sm gap-2 brand-gradient text-primary-foreground shadow-sm font-bold"
          >
            <Rocket className="size-4" />
            <span>{lang === "ar" ? "حفظ وإطلاق الوكيل" : "Save & Deploy Agent"}</span>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-10 text-sm gap-2 border-2"
          >
            <Link to="/simulator">
              <MessageSquare className="size-4" />
              <span>{t.nav.simulator}</span>
            </Link>
          </Button>
        </div>

        {/* Deployment note */}
        <p className="text-center text-[11px] text-muted-foreground">
          {lang === "ar"
            ? "سيتم نشر الوكيل فوراً على الباكند بعد الحفظ"
            : "Agent will be deployed instantly to backend after saving"}
        </p>
      </Section>
    </div>
  );
}
