import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Layers,
  MapPin,
  Maximize2,
  MessageSquare,
  Mic,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Rocket,
  Send,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Truck,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandGlyph } from "@/components/kayanova/AppShell";
import { FormattedMessage } from "@/components/kayanova/FormattedMessage";
import { RequestDeploymentModal } from "@/components/kayanova/RequestDeploymentModal";
import { useAgentChat } from "@/components/kayanova/useAgentChat";
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
import { cn } from "@/lib/utils";
import { egp, useKayanova } from "@/lib/kayanova/store";
import { AVAILABLE_LLM_MODELS } from "@/lib/kayanova/presets";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Live AI Simulator — Kayanova" },
      {
        name: "description",
        content:
          "High-performance interactive chat simulator to test AI agents and inspect extracted CRM orders in real time.",
      },
      { property: "og:title", content: "Live AI Simulator — Kayanova" },
      {
        property: "og:description",
        content: "Studio chat testing with live real-time lead and order extraction inspector.",
      },
    ],
  }),
  component: Simulator,
});

function Simulator() {
  const { brands, activeBrand, setActiveBrandId, saveBrand, addLead } = useKayanova();
  const { t, lang, isRtl } = useLanguage();
  const [input, setInput] = useState("");
  const [tts, setTts] = useState(false);
  const [listening, setListening] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [mobileTab, setMobileTab] = useState<"chat" | "inspector">("chat");
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const { messages, pending, lead, send, reset } = useAgentChat(activeBrand, "web");
  const scroller = useRef<HTMLDivElement>(null);

  // Dynamic universal suggestions tailored to the active brand's identity and services
  const brandName = activeBrand?.name || (lang === "ar" ? "الشركة" : "the business");
  const firstItem = activeBrand?.menuItems?.[0]?.name;
  const isRestaurant =
    activeBrand?.category === "Restaurant" ||
    /قهوة|مطعم|كافيه|coffee|cafe|restaurant|food/i.test(activeBrand?.name || "");
  const isMedical =
    activeBrand?.category === "Medical" ||
    /عيادة|طبي|أسنان|dental|clinic|medical|doctor/i.test(activeBrand?.name || "");

  const quickSuggestions = [
    {
      icon: FileText,
      label: isRestaurant
        ? lang === "ar"
          ? "المنيو والأسعار"
          : "Menu & Prices"
        : isMedical
          ? lang === "ar"
            ? "الخدمات الطبية"
            : "Services & Prices"
          : lang === "ar"
            ? "الخدمات والأسعار"
            : "Services & Pricing",
      prompt: isRestaurant
        ? lang === "ar"
          ? "ممكن أعرف قائمة المنيو والأسعار المتاحة عندكم؟"
          : "What is on your menu and what are your prices?"
        : isMedical
          ? lang === "ar"
            ? "ما هي الخدمات والأسعار وجلسات العلاج المتوفرة؟"
            : "What medical services and consultations do you offer?"
          : lang === "ar"
            ? `ممكن توضحلي إيه أهم الخدمات والأسعار المتاحة لدى ${brandName}؟`
            : `Could you explain the services, products and pricing offered by ${brandName}?`,
      chipCls: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
    },
    {
      icon: isRestaurant ? Truck : isMedical ? Calendar : Sparkles,
      label: isRestaurant
        ? lang === "ar"
          ? "طلب دليفري"
          : "Quick Order"
        : isMedical
          ? lang === "ar"
            ? "حجز موعد كشف"
            : "Book Appointment"
          : lang === "ar"
            ? "طلب خدمة أو تعاقد"
            : "Order / Inquire",
      prompt: firstItem
        ? lang === "ar"
          ? `عايز أطلب ${firstItem}، اسمي أحمد وتليفوني 01012345678 والعنوان المعادي`
          : `I would like to order ${firstItem}. Name: Ahmed, Phone: 01012345678, Address: Maadi`
        : lang === "ar"
          ? `أنا مهتم بالخدمة وعايز أطلبها، اسمي كريم وتليفوني 01012345678، إيه الخطوات؟`
          : `I am interested in your services and would like to proceed. Name: Karim, Phone: 01012345678`,
      chipCls: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    {
      icon: MapPin,
      label: lang === "ar" ? "المواعيد والتواصل" : "Hours & Contact",
      prompt:
        lang === "ar"
          ? `أين يقع مقر أو فروع ${brandName} وما هي مواعيد العمل الرسمية؟`
          : `Where are you located and what are your operating hours?`,
      chipCls: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    },
    {
      icon: Tag,
      label: lang === "ar" ? "العروض والاستشارة" : "Offers & Consultation",
      prompt:
        lang === "ar"
          ? "هل في أي عروض أو خصومات أو استشارة أولية متوفرة اليوم؟"
          : "Are there any special offers, discounts, or initial consultations available?",
      chipCls: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    },
  ];

  const scenarios = [
    {
      category: isRestaurant
        ? lang === "ar"
          ? "طلب مباشر (CRM Lead)"
          : "Order Direct Lead"
        : isMedical
          ? lang === "ar"
            ? "حجز موعد (CRM Lead)"
            : "Appointment Lead"
          : lang === "ar"
            ? "طلب تعاقد / خدمة (CRM)"
            : "Service Direct Lead",
      prompt: firstItem
        ? lang === "ar"
          ? `عايز أطلب ${firstItem} فوري، اسمي أحمد وتليفوني 01012345678 والعنوان شارع النصر`
          : `I want to order ${firstItem} now, name Ahmed, phone 01012345678, El Nasr St`
        : lang === "ar"
          ? `حابب أطلب الخدمة وأتعاقد فوراً، اسمي كريم ورقمي 01098765432 والعنوان التجمع الخامس`
          : `I would like to order your service immediately. Name: Karim, Phone: 01098765432, New Cairo`,
      cardCls: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20",
      tagCls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
    },
    {
      category: lang === "ar" ? "استفسار عن الأسعار والمواعيد" : "Pricing & Availability",
      prompt:
        lang === "ar"
          ? `ما هي مواعيد العمل لديكم وما هي خطة الأسعار المتاحة؟`
          : `What are your business hours and pricing plans?`,
      cardCls: "border-amber-400/30 bg-amber-50",
      tagCls: "bg-amber-100 text-amber-700",
    },
    {
      category: lang === "ar" ? "استشارة مخصصة وحجز" : "Consultation & Booking",
      prompt:
        lang === "ar"
          ? `عايز استشارة بخصوص احتياجات مشروعي يوم الأحد القادم الساعة 5 مساءً باسم م. طارق`
          : `I want to schedule a consultation for next Sunday at 5 PM, name Tarek`,
      cardCls: "border-violet-400/30 bg-violet-50",
      tagCls: "bg-violet-100 text-violet-700",
    },
    {
      category:
        lang === "ar" ? "اختبار حواجز الأمان (خارج النطاق)" : "Guardrail Test (Out of Scope)",
      prompt:
        lang === "ar"
          ? "هل بتبيعوا قطع غيار سيارات وبتعملوا صيانة محركات؟"
          : "Do you sell car spare parts and do engine maintenance?",
      cardCls: "border-rose-400/30 bg-rose-50",
      tagCls: "bg-rose-100 text-rose-700",
    },
  ];

  useEffect(() => {
    reset();
  }, [reset, activeBrand?.id]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  // Keyboard shortcut to exit focus mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFocusMode]);

  const dispatch = async (text: string) => {
    if (!text.trim()) return;
    setInput("");
    if (mobileTab === "inspector") {
      setMobileTab("chat");
    }
    await send(text, (l) => {
      addLead(l);
      toast.success(
        lang === "ar"
          ? "تم استخراج الطلب وحفظه في الـ CRM بنجاح"
          : "Order extracted and saved to CRM successfully",
      );
    });
    const last = messages[messages.length - 1];
    if (tts && typeof window !== "undefined" && "speechSynthesis" in window && last) {
      setTimeout(() => {
        const utterTarget = document.querySelector<HTMLElement>("[data-last-agent]")?.innerText;
        if (utterTarget) {
          const utterance = new SpeechSynthesisUtterance(utterTarget);
          utterance.lang = activeBrand?.dialect === "English" ? "en-US" : "ar-EG";
          window.speechSynthesis.speak(utterance);
        }
      }, 300);
    }
  };

  const startListening = () => {
    interface SpeechRecognitionInstance {
      lang: string;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
      start: () => void;
    }
    type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

    const w = window as unknown as {
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
      SpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error(
        lang === "ar"
          ? "ميزة التعرف على الصوت غير مدعومة في متصفحك الحالي."
          : "Voice recognition is not supported in your current browser.",
      );
      return;
    }
    const rec = new Ctor();
    rec.lang = activeBrand?.dialect === "English" ? "en-US" : "ar-EG";
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: { results: Array<Array<{ transcript: string }>> }) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      setInput(text);
    };
    rec.start();
  };

  const lastAgentIndex = messages.map((m) => m.role).lastIndexOf("assistant");

  // Chat Studio JSX Render Function
  const renderChatBox = (isFullscreen: boolean) => (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all",
        isFullscreen
          ? "h-full w-full max-w-5xl rounded-none sm:rounded-3xl border-0 sm:border-2 border-emerald-300 shadow-2xl dark:border-emerald-800"
          : "h-[calc(100dvh-220px)] min-h-[480px] lg:h-[calc(100vh-160px)] lg:min-h-[550px]",
      )}
    >
      {/* Chat Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-border bg-secondary px-3.5 py-2.5 sm:px-5 sm:py-3 min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <BrandGlyph
              brand={activeBrand}
              className="size-8 sm:size-10 rounded-xl ring-2 ring-emerald-300 dark:ring-emerald-700 shadow-2xs"
            />
            <span className="absolute -bottom-0.5 -end-0.5 size-2.5 sm:size-3 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-xs sm:text-sm md:text-base font-bold text-foreground truncate">
                {activeBrand?.name ?? (lang === "ar" ? "الوكيل الذكي" : "AI Assistant")}
              </h2>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-600">
                <span className="size-1 rounded-full bg-emerald-500" />
                {lang === "ar" ? "متصل" : "Online"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground truncate">
              <span className="truncate">{activeBrand?.role ?? "Senior Business Agent"}</span>
              <span className="shrink-0">·</span>
              <span className="shrink-0 font-medium">
                {t.dialects[activeBrand?.dialect as keyof typeof t.dialects] ??
                  activeBrand?.dialect ??
                  "Egyptian Arabic"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* TTS Audio Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTts((v) => !v)}
            className={cn(
              "h-8 sm:h-9 px-2 sm:px-3 text-xs font-semibold gap-1.5 border-border shadow-2xs",
              tts
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
            title={tts ? "Voice On" : "Voice Off"}
          >
            {tts ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            <span className="hidden md:inline">
              {tts
                ? lang === "ar"
                  ? "الصوت مفعل"
                  : "Voice On"
                : lang === "ar"
                  ? "الصوت معطل"
                  : "Voice Off"}
            </span>
          </Button>

          {/* Reset Chat */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 border-border bg-card text-muted-foreground hover:text-foreground shadow-2xs"
            onClick={() => {
              reset();
              toast.info(lang === "ar" ? "تمت إعادة ضبط المحادثة." : "Chat session reset.");
            }}
            title={t.simulator.reset}
          >
            <RotateCcw className="size-3.5 sm:size-4" />
          </Button>

          {/* Focus Mode Exit / Enter Button */}
          {isFullscreen ? (
            <Button
              size="sm"
              onClick={() => setIsFocusMode(false)}
              className="h-8 sm:h-9 gap-1.5 px-3 text-xs font-bold brand-gradient text-primary-foreground shadow-sm"
            >
              <Minimize2 className="size-3.5 sm:size-4" />
              <span>{lang === "ar" ? "خروج من التركيز" : "Exit Focus"}</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFocusMode(true)}
              className="h-8 sm:h-9 gap-1.5 px-2.5 sm:px-3 text-xs font-bold border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-primary hover:text-white dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs"
              title={lang === "ar" ? "تكبير وتركيز كامل الشاشة" : "Full Screen Focus Mode"}
            >
              <Maximize2 className="size-3.5" />
              <span className="hidden sm:inline">
                {lang === "ar" ? "وضع التركيز" : "Focus Mode"}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div
        ref={scroller}
        className="flex-1 min-h-0 overflow-y-auto bg-background/60 p-2.5 sm:p-5 space-y-3.5 sm:space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center py-2 sm:py-6 text-center my-auto">
            <div className="relative mb-2 sm:mb-3">
              <div className="flex size-12 sm:size-16 items-center justify-center rounded-2xl brand-gradient shadow-md">
                <Bot className="size-6 sm:size-8 text-white" />
              </div>
              <span className="absolute -top-1 -end-1 flex size-3 sm:size-3.5 items-center justify-center rounded-full bg-emerald-500 shadow">
                <span className="size-1 sm:size-1.5 rounded-full bg-white" />
              </span>
              <span
                className="absolute inset-0 -m-1.5 animate-ping rounded-2xl bg-emerald-400/30"
                style={{ animationDuration: "2s" }}
              />
            </div>
            <h3 className="text-xs sm:text-base font-bold text-foreground">
              {lang === "ar"
                ? `مرحباً! ابدأ محادثة مع ${activeBrand?.name ?? "الوكيل الذكي"}`
                : `Start a conversation with ${activeBrand?.name ?? "AI Assistant"}`}
            </h3>
            <p className="mt-1 max-w-xs text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              {lang === "ar"
                ? "اكتب سؤالاً أو اختر سيناريو لتجربة الوكيل واستخراج الطلبات فورياً."
                : "Type a question or select a scenario to test AI responses and live order extraction."}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              {quickSuggestions.map((q, idx) => {
                const Ic = q.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => void dispatch(q.prompt)}
                    disabled={pending}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-all hover:shadow-sm active:scale-95",
                      q.chipCls,
                    )}
                  >
                    <Ic className="size-3" />
                    {q.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              {...(i === lastAgentIndex ? { "data-last-agent": "true" } : {})}
              className={cn(
                "flex max-w-[92%] sm:max-w-[85%] gap-2 sm:gap-2.5",
                m.role === "user" ? "ms-auto flex-row-reverse" : "me-auto",
              )}
            >
              <div
                className={cn(
                  "flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm",
                  m.role === "user"
                    ? "brand-gradient text-primary-foreground"
                    : "border-2 border-border bg-card",
                )}
              >
                {m.role === "user" ? (
                  <span className="text-[9px] sm:text-[10px]">{lang === "ar" ? "أنت" : "You"}</span>
                ) : (
                  <Bot className="size-3 sm:size-3.5 text-primary" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs",
                  m.role === "user"
                    ? "rounded-tr-sm brand-gradient text-primary-foreground font-medium"
                    : "rounded-tl-sm border border-border bg-card text-foreground",
                )}
              >
                <FormattedMessage content={m.content} isUser={m.role === "user"} />
              </div>
            </div>
          ))
        )}

        {pending && (
          <div className="me-auto flex items-center gap-2 sm:gap-2.5">
            <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card">
              <Bot className="size-3 sm:size-3.5 text-primary" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 sm:px-4 sm:py-2.5 shadow-xs">
              <span className="inline-flex gap-1.5">
                <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {t.simulator.typing}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Chips - Only shown during active conversation */}
      {messages.length > 0 && (
        <div className="shrink-0 flex items-center gap-2 overflow-x-auto border-t border-border bg-secondary/60 px-3.5 py-2.5 touch-scroll no-scrollbar">
          <span className="shrink-0 text-xs font-bold text-muted-foreground">
            {lang === "ar" ? "جرب:" : "Try:"}
          </span>
          {quickSuggestions.map((q, idx) => {
            const Ic = q.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => void dispatch(q.prompt)}
                disabled={pending}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all hover:shadow-sm active:scale-95 disabled:opacity-50 min-h-[36px]",
                  q.chipCls,
                )}
              >
                <Ic className="size-3.5" />
                <span>{q.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Input Form */}
      <form
        className="shrink-0 flex items-center gap-2 border-t-2 border-border bg-card p-3 sm:p-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void dispatch(input);
        }}
      >
        <button
          type="button"
          onClick={startListening}
          title={t.simulator.voiceInput}
          className={cn(
            "flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-xl border-2 transition-all active:scale-95",
            listening
              ? "border-primary bg-primary text-primary-foreground animate-pulse"
              : "border-border bg-card text-muted-foreground hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300",
          )}
        >
          <Mic className="size-5" />
        </button>

        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.simulator.placeholder}
          className="h-11 sm:h-12 flex-1 border-border bg-background text-sm sm:text-base font-medium rounded-xl px-4"
          dir="auto"
        />

        <button
          type="submit"
          disabled={pending || !input.trim()}
          className={cn(
            "flex h-11 sm:h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 sm:px-6 text-xs sm:text-sm font-bold text-primary-foreground transition-all brand-gradient shadow-xs hover:opacity-90 active:scale-95 min-w-[52px]",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
          )}
        >
          <span className="hidden sm:inline">{t.simulator.sendBtn}</span>
          <Send className={cn("size-4", isRtl && "rotate-180")} />
        </button>
      </form>
    </div>
  );

  // Inspector Panel JSX Render Function
  const renderInspectorBox = () => (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-start-4 duration-300">
      {/* Live Extracted Order */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-secondary px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <ShoppingBag className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {t.simulator.extractedOrderCard}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {lang === "ar" ? "استخراج وتأكيد الطلبات فورياً" : "Real-time order extraction"}
              </p>
            </div>
          </div>
          {lead ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              <CheckCircle2 className="size-3" />
              {lang === "ar" ? "تم الاستخراج" : "Captured"}
            </span>
          ) : (
            <span className="size-2 rounded-full bg-muted-foreground/30 animate-pulse block" />
          )}
        </div>

        <div className="p-4">
          {lead ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-2 dark:border-emerald-800 dark:bg-emerald-950/30">
                <Row k={t.crm.customerName} v={lead.customerName} />
                <Row k={t.crm.customerPhone} v={lead.customerPhone || "—"} />
                <Row k={t.crm.orderType} v={lead.orderType ?? "Delivery"} />
                <Row k={t.crm.address} v={lead.deliveryAddress || "—"} />
                <Row k={t.crm.orderTotal} v={egp(lead.numericTotal ?? 0, lang)} isBold />
              </div>
              {(lead.items ?? []).length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t.crm.orderedItems}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(lead.items ?? []).map((item, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <Link
                to="/analytics"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground transition-colors hover:border-emerald-500 hover:bg-secondary"
              >
                <span>{lang === "ar" ? "عرض في سجل المبيعات" : "Open in Sales CRM"}</span>
                <ExternalLink className="size-3.5 text-primary" />
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-secondary/50 px-3 py-6 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground/50">
                <ShoppingBag className="size-5" />
              </div>
              <p className="text-xs font-bold text-foreground">{t.simulator.noOrderExtracted}</p>
              <p className="mx-auto mt-1 max-w-[220px] text-[11px] text-muted-foreground leading-relaxed">
                {lang === "ar"
                  ? 'جرب: "عايز أطلب الخدمة والتعاقد 01099887766"'
                  : 'Try: "Order service delivery 01099887766"'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Test Scenarios */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border bg-secondary px-4 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-600">
            <Zap className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {lang === "ar" ? "سيناريوهات اختبار سريعة" : "Quick Test Scenarios"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {lang === "ar" ? "اختبار جاهز بضغطة واحدة" : "One-click benchmark tests"}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-3">
          {scenarios.map((s, idx) => (
            <button
              key={idx}
              onClick={() => void dispatch(s.prompt)}
              disabled={pending}
              className={cn(
                "group rounded-xl border-2 p-3 text-start text-xs transition-all duration-150 hover:shadow-sm active:scale-[0.99] disabled:opacity-50",
                s.cardCls,
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold", s.tagCls)}>
                  {s.category}
                </span>
                <span className="text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {lang === "ar" ? "تشغيل في الشات" : "Run in Chat"}
                </span>
              </div>
              <p className="leading-relaxed font-medium text-foreground/80 line-clamp-2">
                {s.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Agent Persona */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border bg-secondary px-4 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10 text-violet-600">
            <Layers className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {lang === "ar" ? "مواصفات الوكيل" : "Agent Persona"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {lang === "ar" ? "المواصفات النشطة" : "Active directives & dialect"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          {[
            {
              label: activeBrand?.role ?? "Advisor",
              cls: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
            },
            {
              label: activeBrand?.dialect ?? "Egyptian Arabic",
              cls: "border-violet-200 bg-violet-50 text-violet-700",
            },
            {
              label: activeBrand?.tone ?? "Friendly",
              cls: "border-amber-200 bg-amber-50 text-amber-700",
            },
            {
              label:
                AVAILABLE_LLM_MODELS.find((m) => m.id === activeBrand?.llmModel)?.name ||
                "Gemini 3.7 Flash",
              cls: "border-emerald-300 bg-emerald-100 text-emerald-800 font-mono dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
            },
            {
              label: `${activeBrand?.menuItems?.length ?? 0} ${lang === "ar" ? "عنصر في القائمة" : "Catalog items"}`,
              cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
            },
          ].map((b, i) => (
            <span
              key={i}
              className={cn("rounded-full border px-3 py-1 text-[11px] font-bold", b.cls)}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ======================================================================= */}
      {/* IMMERSIVE FULL FOCUS MODE (WHEN ACTIVE)                                 */}
      {/* ======================================================================= */}
      {isFocusMode ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl p-0 sm:p-4 md:p-6 animate-in fade-in zoom-in-95 duration-150">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col">{renderChatBox(true)}</div>
        </div>
      ) : (
        /* ===================================================================== */
        /* STANDARD VIEW INSIDE APPSHELL                                         */
        /* ===================================================================== */
        <AppShell
          title={t.simulator.title}
          subtitle={
            activeBrand
              ? lang === "ar"
                ? `اختبر التحدث المباشر مع ${activeBrand.name}`
                : `Live AI conversation with ${activeBrand.name}`
              : lang === "ar"
                ? "اختر وكيلاً للتجربة"
                : "Select an agent to test"
          }
          actions={
            <div className="flex items-center gap-2 shrink-0">
              <Select value={activeBrand?.id ?? ""} onValueChange={setActiveBrandId}>
                <SelectTrigger className="h-9 w-36 sm:w-48 border-border bg-card text-xs font-semibold text-foreground">
                  <SelectValue placeholder={t.dashboard.directoryTitle} />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-foreground text-xs">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* LLM Model Switcher Dropdown */}
              <Select
                value={activeBrand?.llmModel || "google/gemini-3.7-flash"}
                onValueChange={(val) => {
                  if (activeBrand) {
                    saveBrand({ ...activeBrand, llmModel: val });
                    const mObj = AVAILABLE_LLM_MODELS.find((m) => m.id === val);
                    toast.success(
                      lang === "ar"
                        ? `تم تفعيل موديل: ${mObj?.nameAr || val}`
                        : `Switched to: ${mObj?.name || val}`,
                    );
                  }
                }}
              >
                <SelectTrigger className="h-9 w-32 sm:w-44 border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <Sparkles className="size-3.5 shrink-0 text-primary" />
                    <SelectValue placeholder="Model" />
                  </div>
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {AVAILABLE_LLM_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="font-semibold text-foreground">{m.name}</span>
                        <span className="text-[10px] text-primary font-bold font-mono">
                          {m.contextLength}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Toggle Inspector Desktop */}
              <Button
                variant="outline"
                size="icon"
                className="hidden lg:flex h-9 w-9 border-border bg-card text-foreground/80 hover:text-foreground shadow-2xs shrink-0"
                onClick={() => setShowInspector((v) => !v)}
                title={showInspector ? "Hide Inspector" : "Show Inspector"}
              >
                {showInspector ? (
                  <PanelLeftClose className="size-4" />
                ) : (
                  <PanelLeftOpen className="size-4" />
                )}
              </Button>

              {/* Request Deployment Button */}
              <Button
                size="sm"
                onClick={() => setIsDeployModalOpen(true)}
                className="h-9 px-3.5 gap-1.5 brand-gradient text-white text-xs font-bold rounded-xl shadow-xs shrink-0"
              >
                <Rocket className="size-3.5" />
                <span className="hidden sm:inline">
                  {lang === "ar" ? "طلب تفعيل الوكيل" : "Deploy Agent"}
                </span>
              </Button>
            </div>
          }
        >
          {/* =================================================================== */}
          {/* MOBILE VIEW: Segmented Switcher (Chat vs Inspector)                 */}
          {/* =================================================================== */}
          <div className="lg:hidden shrink-0 mb-2.5">
            <div className="grid grid-cols-2 rounded-xl border border-border bg-card p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setMobileTab("chat")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all",
                  mobileTab === "chat"
                    ? "brand-gradient text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <MessageSquare className="size-3.5" />
                <span>{lang === "ar" ? "الشات المباشر" : "Live Chat"}</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab("inspector")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all",
                  mobileTab === "inspector"
                    ? "brand-gradient text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <ShoppingBag className="size-3.5" />
                <span>{lang === "ar" ? "تفاصيل الطلب والسيناريوهات" : "Inspector & Tests"}</span>
                {lead && (
                  <span className="size-2 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Display */}
          <div className="flex-1 flex flex-col min-h-0 lg:hidden">
            {mobileTab === "chat" ? (
              renderChatBox(false)
            ) : (
              <div className="overflow-y-auto min-h-0 pb-4">{renderInspectorBox()}</div>
            )}
          </div>

          {/* =================================================================== */}
          {/* DESKTOP VIEW: Sidebar (LEFT) + Chat (RIGHT)                         */}
          {/* =================================================================== */}
          <div
            className={cn(
              "hidden lg:grid items-start gap-5 transition-all duration-300",
              showInspector
                ? "grid-cols-[370px_1fr] xl:grid-cols-[400px_1fr]"
                : "mx-auto w-full max-w-5xl grid-cols-1",
            )}
          >
            {showInspector && <div className="order-1">{renderInspectorBox()}</div>}

            <div className="order-2">{renderChatBox(false)}</div>
          </div>
        </AppShell>
      )}

      <RequestDeploymentModal
        open={isDeployModalOpen}
        onOpenChange={setIsDeployModalOpen}
        brand={activeBrand}
      />
    </>
  );
}

function Row({ k, v, isBold = false }: { k: string; v: string; isBold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <dt className="text-[11px] font-semibold text-muted-foreground shrink-0">{k}</dt>
      <dd
        className={cn(
          "text-end text-xs font-semibold text-foreground truncate",
          isBold && "font-bold text-primary text-sm",
        )}
      >
        {v}
      </dd>
    </div>
  );
}
