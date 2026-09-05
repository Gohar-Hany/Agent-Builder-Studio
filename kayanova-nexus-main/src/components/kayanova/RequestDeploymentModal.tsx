import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot,
  CheckCircle2,
  Globe,
  Instagram,
  MessageCircle,
  MessageSquare,
  Phone,
  Rocket,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { createPlatformLeadApi } from "@/lib/kayanova/api";
import type { BrandProfile } from "@/lib/kayanova/types";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface RequestDeploymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: BrandProfile | null;
}

const AVAILABLE_CHANNELS = [
  {
    id: "whatsapp",
    nameAr: "واتساب (WhatsApp API)",
    nameEn: "WhatsApp Cloud API",
    icon: MessageCircle,
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 border-emerald-300 dark:bg-emerald-950 dark:border-emerald-800",
  },
  {
    id: "instagram",
    nameAr: "إنستغرام (Instagram Direct)",
    nameEn: "Instagram Direct DM",
    icon: Instagram,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 border-rose-200 dark:bg-rose-950 dark:border-rose-800",
  },
  {
    id: "messenger",
    nameAr: "ماسنجر (Facebook Messenger)",
    nameEn: "Facebook Messenger",
    icon: MessageSquare,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  },
  {
    id: "web",
    nameAr: "شات الويب والموقع (Website Widget)",
    nameEn: "Website Live Widget",
    icon: Globe,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 border-violet-200 dark:bg-violet-950 dark:border-violet-800",
  },
];

export function RequestDeploymentModal({
  open,
  onOpenChange,
  brand,
}: RequestDeploymentModalProps) {
  const { lang, isRtl } = useLanguage();
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState(brand?.contactInfo?.phone || "");
  const [businessName, setBusinessName] = useState(brand?.name || "");
  const [channels, setChannels] = useState<string[]>(["whatsapp"]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const toggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((c) => c !== id) : prev) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      toast.error(lang === "ar" ? "يرجى كتابة اسمك الكريم" : "Please enter your name");
      return;
    }
    if (!ownerPhone.trim() || ownerPhone.trim().length < 8) {
      toast.error(
        lang === "ar"
          ? "يرجى إدخال رقم هاتف أو واتساب صحيح"
          : "Please enter a valid phone or WhatsApp number",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await createPlatformLeadApi({
        brandId: brand?.id || "custom-draft",
        brandName: brand?.name || businessName || "وكيل مخصص",
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        businessName: businessName.trim() || brand?.name || "مشروع جديد",
        channels,
        notes: notes.trim(),
        status: "new",
      });

      setIsSuccess(true);
      toast.success(
        lang === "ar"
          ? "تم إرسال طلب تفعيل الوكيل بنجاح!"
          : "Deployment request submitted successfully!",
      );
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(
        lang === "ar"
          ? "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى."
          : "Failed to submit request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after dialog animation finishes
    setTimeout(() => {
      setIsSuccess(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl sm:rounded-3xl">
        {/* Modal Header with vibrant branding */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl brand-gradient text-white shadow-md">
              <Rocket className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                {lang === "ar" ? "طلب تفعيل الوكيل لقنوات التواصل" : "Deploy Agent on Channels"}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {lang === "ar"
                  ? "اربط وكيلك الذكي بواتساب وقنواتك لتحويل المحادثات إلى مبيعات تلقائية."
                  : "Deploy your AI sales agent across WhatsApp, Instagram, Messenger, and Web."}
              </DialogDescription>
            </div>
          </div>
        </div>

        {isSuccess ? (
          /* ========================================================================= */
          /* SUCCESS CONFIRMATION SCREEN                                               */
          /* ========================================================================= */
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="flex size-16 mx-auto items-center justify-center rounded-3xl bg-emerald-100 text-emerald-800 border-2 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="size-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-foreground">
                {lang === "ar" ? "تم استلام طلبك بنجاح!" : "Request Received Successfully!"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                {lang === "ar"
                  ? `أهلاً ${ownerName}، تم حفظ وتوثيق إعدادات وكيلك الذكي (${brand?.name || businessName}). سيتواصل معك أحد مهندسي كيانوفا عبر واتساب على الرقم (${ownerPhone}) خلال ساعات لإتمام الربط الرسمي.`
                  : `Hello ${ownerName}, your agent configuration has been saved. A Kayanova engineer will reach out to you on WhatsApp at (${ownerPhone}) within hours to finalize channel deployment.`}
              </p>
            </div>

            {/* Channels confirmed pill list */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {channels.map((ch) => {
                const cObj = AVAILABLE_CHANNELS.find((c) => c.id === ch);
                if (!cObj) return null;
                const Icon = cObj.icon;
                return (
                  <span
                    key={ch}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-border bg-secondary text-foreground"
                  >
                    <Icon className="size-3.5 text-primary" />
                    <span>{lang === "ar" ? cObj.nameAr : cObj.nameEn}</span>
                  </span>
                );
              })}
            </div>

            <div className="pt-4">
              <Button
                onClick={handleClose}
                className="w-full sm:w-auto px-8 h-11 brand-gradient text-white font-bold rounded-xl shadow-md"
              >
                {lang === "ar" ? "العودة ومتابعة التجربة" : "Back to Studio"}
              </Button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* DEPLOYMENT APPLICATION FORM                                               */
          /* ========================================================================= */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Transparent Marketing Notice */}
            <div className="p-3.5 rounded-2xl border border-primary/20 bg-primary/5 text-xs text-foreground leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {lang === "ar" ? "ماركتينج بمصداقية وشفافية:" : "Transparent Integration:"}{" "}
                </span>
                {lang === "ar"
                  ? "تفعيل واتساب وقنوات التواصل يتم بربط رسمي مع Meta Cloud API لضمان استقرار الخدمة وتفادي الحظر. سيقوم فريقنا بمراجعة نموذجك وتجهيز قنواتك وتسليمك الوكيل بكامل طاقته."
                  : "Official Meta Cloud API integration ensures reliability and zero ban risk. Our technical team configures your credentials and hands over the ready system."}
              </div>
            </div>

            {/* Field: Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-primary" />
                <span>{lang === "ar" ? "اسمك بالكامل / المسؤول" : "Full Name"} *</span>
              </label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder={lang === "ar" ? "مثال: م. أحمد عبد العزيز" : "e.g. Ahmed Abdelaziz"}
                className="h-10 text-sm rounded-xl border-border bg-card"
                required
              />
            </div>

            {/* Field: Phone / WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Phone className="size-3.5 text-primary" />
                <span>{lang === "ar" ? "رقم الهاتف / واتساب للتواصل" : "Phone / WhatsApp Number"} *</span>
              </label>
              <Input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder={lang === "ar" ? "مثال: +201012345678" : "+201012345678"}
                dir="ltr"
                className="h-10 text-sm text-start font-mono rounded-xl border-border bg-card"
                required
              />
            </div>

            {/* Field: Business Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Bot className="size-3.5 text-primary" />
                <span>{lang === "ar" ? "اسم المشروع / البراند" : "Business / Brand Name"}</span>
              </label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={brand?.name || (lang === "ar" ? "اسم شركتك أو متجرك" : "Your Business Name")}
                className="h-10 text-sm rounded-xl border-border bg-card"
              />
            </div>

            {/* Field: Multi-Channel Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                <span>{lang === "ar" ? "اختر القنوات المطلوب تفعيل الوكيل عليها:" : "Select Deployment Channels:"}</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_CHANNELS.map((ch) => {
                  const active = channels.includes(ch.id);
                  const Icon = ch.icon;
                  return (
                    <button
                      type="button"
                      key={ch.id}
                      onClick={() => toggleChannel(ch.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-start transition-all ${
                        active
                          ? `${ch.bg} border-primary/60 shadow-xs`
                          : "border-border bg-card hover:bg-secondary/60 text-muted-foreground opacity-70"
                      }`}
                    >
                      <div
                        className={`size-4 rounded-md border flex items-center justify-center ${
                          active ? "bg-primary border-primary text-white" : "border-muted-foreground"
                        }`}
                      >
                        {active && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <Icon className={`size-4 shrink-0 ${ch.color}`} />
                      <span className="text-xs font-bold text-foreground">
                        {lang === "ar" ? ch.nameAr : ch.nameEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field: Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {lang === "ar" ? "ملاحظات أو متطلبات خاصة (اختياري):" : "Special Notes / Requirements (Optional):"}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  lang === "ar"
                    ? "مثال: محتاج ربط مع شوبيفاي أو ووكومرس، ومواعيد العمل من 9 صباحاً لـ 11 مساءً..."
                    : "e.g. Need Shopify / WooCommerce integration, business hours 9am - 11pm..."
                }
                className="text-xs rounded-xl border-border bg-card min-h-[65px]"
              />
            </div>

            {/* Submit Buttons */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="h-10 px-4 text-xs font-bold rounded-xl"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-6 brand-gradient text-white font-bold text-xs rounded-xl shadow-md gap-2"
              >
                {isSubmitting ? (
                  <span>{lang === "ar" ? "جاري الإرسال..." : "Submitting..."}</span>
                ) : (
                  <>
                    <Rocket className="size-4" />
                    <span>{lang === "ar" ? "إرسال طلب التفعيل الآن" : "Submit Deployment Request"}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
