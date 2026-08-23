import type { BrandCategory, BrandProfile, IconType, MenuItem } from "./types";

export const uid = (p = "id") =>
  `${p}-${Math.random().toString(36).slice(2, 9)}${Date.now() % 100000}`;

export interface CategoryPreset {
  key: BrandCategory;
  label: string;
  labelAr: string;
  icon: IconType;
  role: string;
  roleAr: string;
  tagline: string;
  taglineAr: string;
  welcome: string;
  welcomeAr: string;
  rules: string;
  rulesAr: string;
  items: Array<Omit<MenuItem, "id">>;
  itemsAr: Array<Omit<MenuItem, "id">>;
  hours: string;
  hoursAr: string;
  address: string;
  addressAr: string;
  phone: string;
}

export const CATEGORY_PRESETS: CategoryPreset[] = [
  {
    key: "Restaurant",
    label: "Restaurant & Cafe",
    labelAr: "مطاعم وكافيهات ومخبوزات",
    icon: "coffee",
    role: "Customer Concierge & Order Specialist",
    roleAr: "مستشار خدمة العملاء وتأكيد الطلبات",
    tagline: "Specialty coffee, artisanal bakery & fast delivery",
    taglineAr: "قهوة مختصة، مخبوزات طازجة وتوصيل سريع",
    welcome: "Hello! Welcome to our restaurant. How may I assist you today?",
    welcomeAr:
      "أهلاً وسهلاً بحضرتك! يسعدني خدمتك ومساعدتك في معرفة المنيو أو تسجيل طلب دليفري سريع.",
    rules:
      "1. Confirm delivery address and contact phone number for every order.\n2. Standard delivery time is 40 minutes.\n3. Payment available via Cash or Visa upon delivery.\n4. Suggest popular sides or desserts with every main meal.",
    rulesAr:
      "1. الترحيب بالعميل والرد الفوري بلباقة.\n2. التأكيد على عنوان التوصيل ورقم الهاتف بدقة قبل اعتماد الطلب.\n3. توضيح وقت التوصيل (40 دقيقة) وتكلفة الشحن (25 ج.م).\n4. عرض المشروبات والمقبلات المقترحة لزيادة قيمة الطلب.",
    hours: "Daily 08:00 AM - 01:00 AM",
    hoursAr: "يومياً من 8:00 صباحاً حتى 1:00 بعد منتصف الليل",
    address: "Cairo - Maadi & Sheikh Zayed Branches",
    addressAr: "القاهرة - فروع المعادي والشيخ زايد والتجمع الخامس",
    phone: "01019827364",
    items: [
      { name: "Iced Spanish Latte", price: 85, category: "Beverages" },
      { name: "Flat White", price: 75, category: "Beverages" },
      { name: "Cold Brew Special", price: 90, category: "Beverages" },
      { name: "Almond Butter Croissant", price: 70, category: "Bakery" },
      { name: "San Sebastian Cheesecake", price: 110, category: "Desserts" },
      { name: "Smoked Turkey & Cheese Bagel", price: 135, category: "Food" },
    ],
    itemsAr: [
      { name: "سبانش لاتيه بارد", price: 85, category: "مشروبات باردة" },
      { name: "فلات وايت أسترالي", price: 75, category: "قهوة ساخنة" },
      { name: "كولد برو كيني كلاسيك", price: 90, category: "قهوة مختصة" },
      { name: "كرواسون زبدة باللوز", price: 70, category: "مخبوزات طازجة" },
      { name: "سان سباستيان تشيز كيك", price: 110, category: "حلويات" },
      { name: "بيجل تركي مدخن وجبنة شيدر", price: 135, category: "سندوتشات ووجبات" },
    ],
  },
  {
    key: "Medical",
    label: "Medical & Dental Clinic",
    labelAr: "عيادات ومراكز طبية وأسنان",
    icon: "stethoscope",
    role: "Patient Care Coordinator & Booking Specialist",
    roleAr: "منسق رعاية المرضى وحجوزات الكشف الطبي",
    tagline: "Advanced dental care, cosmetic clinic & 3D smile design",
    taglineAr: "أحدث تقنيات طب وتجميل الأسنان وتصميم الابتسامة",
    welcome: "Hello! Welcome to our clinic. Which doctor or service would you like to book?",
    welcomeAr:
      "أهلاً بحضرتك في المركز الطبي. كيف أقدر أساعدك في حجز موعد كشف أو الاستفسار عن الخدمات؟",
    rules:
      "1. Ask for patient full name, mobile number, and preferred appointment time.\n2. Consultation fee is valid for 14 days.\n3. Do not diagnose conditions in chat; refer urgent symptoms to the emergency line.",
    rulesAr:
      "1. استقبال استفسارات المرضى بود ومساعدتهم في اختيار التخصص والطبيب المناسب.\n2. تسجيل اسم المريض، رقم الهاتف، واليوم المفضل للحجز.\n3. التوضيح أن الكشف صالح لإعادة المراجعة مجاناً خلال 14 يوماً.\n4. عدم تقديم تشخيصات طبية قاطعة عبر الشات وتوجيه الحالات الطارئة للعيادة فوراً.",
    hours: "Sat - Thu 10:00 AM - 10:00 PM",
    hoursAr: "السبت إلى الخميس: 10:00 صباحاً إلى 10:00 مساءً",
    address: "Zamalek & New Cairo Medical Centers",
    addressAr: "القاهرة - مجمع عيادات التجمع الخامس والزمالك",
    phone: "01122334455",
    items: [
      { name: "Comprehensive Dental Exam & X-Ray", price: 350, category: "Consultations" },
      { name: "Teeth Whitening (Zoom 4 In-Office)", price: 4200, category: "Cosmetics" },
      { name: "Porcelain Veneer (Per Tooth)", price: 3500, category: "Cosmetics" },
      { name: "Ultrasonic Scaling & Polishing", price: 750, category: "Hygiene" },
      { name: "Microscopic Root Canal Treatment", price: 2200, category: "Treatments" },
    ],
    itemsAr: [
      { name: "كشف واستشارة شاملة مع أشعة رقمية", price: 350, category: "كشوفات واستشارات" },
      { name: "جلسة تبييض أسنان ليزر زووم 4", price: 4200, category: "تجميل الأسنان" },
      { name: "فينير فينير ألماني للسن الواحد", price: 3500, category: "تجميل الأسنان" },
      { name: "جلسة تنظيف وتلميع وإزالة جير بالموجات", price: 750, category: "عناية ووقاية" },
      { name: "علاج جذور وعصب بالميكروسكوب الحديث", price: 2200, category: "علاجات تخصصية" },
    ],
  },
  {
    key: "E-commerce",
    label: "Fashion & Retail Boutique",
    labelAr: "متاجر أزياء وتجارة إلكترونية",
    icon: "shirt",
    role: "Personal Style Advisor & Orders Concierge",
    roleAr: "مستشار المبيعات والأزياء وتأكيد الشحن",
    tagline: "Curated premium fashion, seasonal drops & fast shipping",
    taglineAr: "أحدث صيحات الأزياء والموضة العصرية مع شحن سريع",
    welcome: "Hello! Welcome to our boutique. Looking for size guidance or our latest collection?",
    welcomeAr:
      "أهلاً بيكي! نورتي المتجر، تحبي تشوفي أحدث الكوليكشن أو نساعدك في اختيار المقاس المناسب؟",
    rules:
      "1. Free exchange and return within 14 days with original receipt.\n2. Shipping takes 2-3 business days across all governorates.\n3. Free shipping on orders above 2,500 EGP.",
    rulesAr:
      "1. مساعدة العملاء في اختيار المقاسات المناسبة (S, M, L, XL).\n2. التوضيح أن مدة الشحن هي 2 إلى 3 أيام عمل لجميع المحافظات.\n3. الشحن مجاني للطلبات أكثر من 2,500 ج.م.\n4. إتاحة المعاينة والاستبدال المجاني خلال 14 يوماً.",
    hours: "Daily 10:00 AM - 11:30 PM",
    hoursAr: "يومياً من 10:00 صباحاً إلى 11:30 مساءً",
    address: "Mall of Arabia & Cairo Festival City Stores",
    addressAr: "القاهرة - فرع كايرو فستيفال سيتي ومول العرب",
    phone: "01233445566",
    items: [
      { name: "Pure Linen Oversized Shirt", price: 890, category: "Tops" },
      { name: "High-Waist Tailored Trousers", price: 1150, category: "Bottoms" },
      { name: "Silk Satin Midi Dress", price: 1750, category: "Dresses" },
      { name: "Genuine Leather Tote Bag", price: 2400, category: "Bags" },
      { name: "Classic Gold Accent Belt", price: 450, category: "Accessories" },
    ],
    itemsAr: [
      { name: "قميص كتان طبيعي أوفرسايز", price: 890, category: "قمصان وتوبات" },
      { name: "بنطلون كلاسيك قماش واسع هاي ويست", price: 1150, category: "بناطيل" },
      { name: "فستان ستان ميدي أنيق للمناسبات", price: 1750, category: "فساتين" },
      { name: "شنطة جلد طبيعي يدوي فاخرة", price: 2400, category: "حقائب وإكسسوارات" },
      { name: "حزام جلد كلاسيكي بتفاصيل ذهبية", price: 450, category: "حقائب وإكسسوارات" },
    ],
  },
  {
    key: "Real Estate",
    label: "Real Estate & Properties",
    labelAr: "عقارات واستشارات سكنية وتجارية",
    icon: "building",
    role: "Property Consultant & Viewing Coordinator",
    roleAr: "مستشار عقاري وتنسيق جولات المعاينة",
    tagline: "Premium residential, villas & commercial investments",
    taglineAr: "أرقى الوحدات السكنية والفيلات والمشروعات التجارية",
    welcome:
      "Hello! Welcome to our real estate agency. Are you searching for residential or investment property?",
    welcomeAr:
      "أهلاً بحضرتك! يسعدني مساعدتك في العثور على أفضل شقة، فيلا، أو مقر تجاري يناسب ميزانيتك وخطة السداد.",
    rules:
      "1. Qualify client budget, location preference, and payment plan.\n2. Schedule site inspection viewings with 24-hour advance notice.\n3. Share brochures and official floor plans upon request.",
    rulesAr:
      "1. معرفة اهتمام العميل (سكني أم استثماري تجاري) والمنطقة المفضلة (التجمع، زايد، الساحل).\n2. توضيح أنظمة السداد والمقدم والأقساط المتاحة بدقة.\n3. ترتيب موعد معاينة ميدانية للمشروع مع العميل.\n4. إرسال البروشور والمخططات الهندسية عبر الواتساب فوراً.",
    hours: "Daily 09:30 AM - 08:30 PM",
    hoursAr: "يومياً من 9:30 صباحاً إلى 8:30 مساءً",
    address: "New Cairo HQ & Sheikh Zayed Sales Center",
    addressAr: "القاهرة الجديدة - شارع التسعين الشمالي، والشيخ زايد",
    phone: "01099887766",
    items: [
      { name: "2-Bedroom Apartment 135m - New Cairo", price: 5400000, category: "Residential" },
      { name: "Standalone Luxury Villa 380m - Zayed", price: 16500000, category: "Villas" },
      { name: "Townhouse Middle 220m", price: 9200000, category: "Villas" },
      { name: "Prime Commercial Clinic 65m", price: 4800000, category: "Commercial" },
      { name: "VIP Project Viewing Tour", price: 0, category: "Services" },
    ],
    itemsAr: [
      { name: "شقة سكنية 135م فيو مميز - التجمع الخامس", price: 5400000, category: "شقق سكنية" },
      {
        name: "فيلا مستقلة فاخرة 380م بحديقة خاصة - الشيخ زايد",
        price: 16500000,
        category: "فيلات وقصور",
      },
      { name: "تاون هاوس ميدل 220م بأقساط 8 سنوات", price: 9200000, category: "فيلات وقصور" },
      { name: "عيادة طبية تجارية 65م بمول طبي راقي", price: 4800000, category: "تجاري واستثماري" },
      { name: "جولة معاينة ميدانية مجانية للمشروع", price: 0, category: "خدمات واستشارات" },
    ],
  },
  {
    key: "Services",
    label: "Spa, Wellness & Beauty Center",
    labelAr: "خدمات وسبا ومراكز عناية واستشارات",
    icon: "sparkles",
    role: "Wellness Concierge & Booking Specialist",
    roleAr: "مستشار الجلسات وحجوزات السبا والعناية",
    tagline: "Holistic relaxation, therapeutic massage & organic skincare",
    taglineAr: "جلسات استرخاء متكاملة، مساج علاجي وعناية طبيعية",
    welcome:
      "Hello! Welcome to our wellness sanctuary. How can I help you book your relaxation session?",
    welcomeAr:
      "أهلاً بحضرتك! يسعدنا مساعدتك في اختيار وحجز أفضل جلسة مساج، حمام مغربي، أو باقة استرخاء تناسبك.",
    rules:
      "1. Bookings must be made at least 4 hours in advance.\n2. Free cancellation up to 6 hours before session time.\n3. Private sessions and gift vouchers available.",
    rulesAr:
      "1. الاستماع لرغبة العميل واقتراح باقات الاسترخاء المناسبة.\n2. تأكيد موعد الجلسة المفضل واسم العميل ورقم الهاتف.\n3. توضيح أن الحجز يتطلب تأكيداً مسبقاً والإلغاء متاح مجاناً قبل الموعد بـ 4 ساعات.\n4. توفير إمكانية عمل كروت هدايا وجلسات VIP خاصة.",
    hours: "Daily 10:00 AM - 10:30 PM",
    hoursAr: "يومياً من 10:00 صباحاً إلى 10:30 مساءً",
    address: "Zamalek & New Cairo Wellness Centers",
    addressAr: "القاهرة - فروع الزمالك والتجمع الخامس",
    phone: "01555667788",
    items: [
      { name: "Swedish Relaxation Massage 60min", price: 950, category: "Massage" },
      { name: "Deep Tissue Therapeutic Massage 90min", price: 1400, category: "Massage" },
      { name: "Royal Moroccan Bath & Scrub", price: 1600, category: "Rituals" },
      { name: "Organic Hydrating Facial Treatment", price: 1100, category: "Skin Care" },
      { name: "Couple Relaxation Full Spa Package", price: 3200, category: "Packages" },
    ],
    itemsAr: [
      { name: "جلسة مساج سويدي استرخائي 60 دقيقة", price: 950, category: "جلسات المساج" },
      { name: "جلسة مساج علاجي للأنسجة العميقة 90 دقيقة", price: 1400, category: "جلسات المساج" },
      { name: "حمام مغربي ملكي بالأعشاب الطبيعية والسنفرة", price: 1600, category: "طقوس الحمام" },
      { name: "جلسة تنظيف عميق للبشرة ونضارة بالأعشاب", price: 1100, category: "العناية بالبشرة" },
      {
        name: "باقة VIP شاملة (مساج + حمام مغربي + عناية)",
        price: 3200,
        category: "باقات متكاملة",
      },
    ],
  },
];

export const COMMON_CATEGORIES = [
  {
    key: "Marketing & Advertising Agency",
    labelEn: "Marketing, Media & Tech Agency",
    labelAr: "وكالة تسويق وإعلام وتكنولوجيا",
  },
  {
    key: "Software & Technology Services",
    labelEn: "Software & Technology Services",
    labelAr: "خدمات البرمجيات وتكنولوجيا المعلومات",
  },
  {
    key: "Restaurant, Cafe & Bakery",
    labelEn: "Restaurant, Cafe & Bakery",
    labelAr: "مطاعم وكافيهات ومخبوزات",
  },
  {
    key: "Medical, Dental & Clinic",
    labelEn: "Medical, Dental & Clinic",
    labelAr: "عيادات ومراكز طبية وتجميل",
  },
  {
    key: "E-commerce & Retail Boutique",
    labelEn: "E-commerce & Retail Boutique",
    labelAr: "متاجر إلكترونية وتجزئة وأزياء",
  },
  {
    key: "Real Estate & Development",
    labelEn: "Real Estate & Development",
    labelAr: "عقارات وتطوير واستثمار عقاري",
  },
  {
    key: "Spa, Wellness & Beauty",
    labelEn: "Spa, Wellness & Beauty",
    labelAr: "مراكز تجميل وسبا وعناية",
  },
  {
    key: "Education & Training Academy",
    labelEn: "Education & Training Academy",
    labelAr: "أكاديميات تدريب وتعليم",
  },
  {
    key: "Legal & Corporate Consulting",
    labelEn: "Legal & Corporate Consulting",
    labelAr: "استشارات قانونية وشركات",
  },
  {
    key: "Automotive & Maintenance",
    labelEn: "Automotive & Maintenance",
    labelAr: "خدمات سيارات وصيانة",
  },
  {
    key: "Logistics, Shipping & Delivery",
    labelEn: "Logistics, Shipping & Delivery",
    labelAr: "شحن ولوجستيات وتوصيل",
  },
] as const;

export const COMMON_ROLES = [
  {
    key: "Customer Support & Service Specialist",
    labelEn: "Customer Support & Service Specialist",
    labelAr: "خدمة عملاء ودعم فني",
  },
  {
    key: "Sales & Deal Closing Specialist",
    labelEn: "Sales & Deal Closing Specialist",
    labelAr: "مسؤول مبيعات وإغلاق صفقات",
  },
  {
    key: "Clinic Booking & Patient Coordinator",
    labelEn: "Clinic Booking & Patient Coordinator",
    labelAr: "منسق حجوزات واستقبال عيادات",
  },
  {
    key: "Real Estate & Investment Advisor",
    labelEn: "Real Estate & Investment Advisor",
    labelAr: "مستشار عقاري واستثماري",
  },
  {
    key: "Digital Marketing & Agency Consultant",
    labelEn: "Digital Marketing & Agency Consultant",
    labelAr: "مستشار تسويق وإعلانات رقمية",
  },
  {
    key: "E-commerce Sales & Shopping Assistant",
    labelEn: "E-commerce Sales & Shopping Assistant",
    labelAr: "مساعد مبيعات وتسوق إلكتروني",
  },
  {
    key: "VIP Concierge & Front Desk Specialist",
    labelEn: "VIP Concierge & Front Desk Specialist",
    labelAr: "مسؤول استقبال وضيافة كبار العملاء",
  },
] as const;

export const DIALECTS = [
  { key: "Egyptian Arabic", label: "Egyptian Arabic (العامية المصرية)", labelAr: "اللهجة المصرية (عامية طبيعية)" },
  { key: "Gulf Arabic", label: "Gulf / Saudi Arabic (الخليجية)", labelAr: "اللهجة الخليجية (السعودية والإمارات)" },
  { key: "Modern Standard Arabic", label: "Modern Standard Arabic (الفصحى)", labelAr: "اللغة العربية الفصحى (رسمية)" },
  { key: "Bilingual", label: "Bilingual (عربي + English)", labelAr: "مزدوج (عربي وإنجليزي / فرانكو)" },
  { key: "English", label: "English (Global Professional)", labelAr: "اللغة الإنجليزية (English)" },
] as const;

export const TONES = [
  { key: "Friendly", label: "Friendly & Warm", labelAr: "ودود وترحيبي (حماسي)" },
  { key: "Professional", label: "Professional & Corporate", labelAr: "احترافي ورسمي (منظم)" },
  { key: "Luxury", label: "Luxury & High-End", labelAr: "فاخر وراقي (VIP)" },
  { key: "Casual", label: "Casual & Fast", labelAr: "عفوي وسريع (مباشر)" },
] as const;

export const AVAILABLE_LLM_MODELS = [
  {
    id: "google/gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    nameAr: "جوجل جيميناي 3.7 فلاش (Gemini 3.7 Flash)",
    badge: "الأحدث والأذكى (Hybrid Reasoning)",
    badgeEn: "Latest & Fast (Hybrid Reasoning)",
    provider: "Google",
    contextLength: "1M",
    pricePer1mPrompt: "$0.375",
    pricePer1mCompletion: "$1.875",
    descriptionAr: "أحدث إصدار فلاش ذكي من Google، يتميز بالسرعة الفائقة والتفكير التحليلي وسياق مليون توكن.",
    descriptionEn: "Google's latest intelligent Flash model with hybrid reasoning, high speed, and 1M context.",
  },
  {
    id: "qwen/qwen3.7-plus",
    name: "Qwen 3.7 Plus",
    nameAr: "كوين 3.7 بلس (Qwen 3.7 Plus)",
    badge: "الأقوى في العامية واللهجات",
    badgeEn: "Best Arabic Dialects",
    provider: "Alibaba",
    contextLength: "1M",
    pricePer1mPrompt: "$0.320",
    pricePer1mCompletion: "$1.280",
    descriptionAr: "الموديل الأقوى عالمياً في العامية المصرية والخليجية والتواصل البشري الطبيعي.",
    descriptionEn: "World-class performance in Egyptian & Gulf Arabic dialects and authentic conversational phrasing.",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    nameAr: "أوبن إيه آي جي بي تي 4o ميني (GPT-4o Mini)",
    badge: "الأدق في الـ CRM والأوردرات",
    badgeEn: "Precise CRM & Orders",
    provider: "OpenAI",
    contextLength: "128K",
    pricePer1mPrompt: "$0.150",
    pricePer1mCompletion: "$0.600",
    descriptionAr: "المعيار العالمي من OpenAI فائق الدقة في استخراج الطلبات وتنظيم بيانات العملاء.",
    descriptionEn: "Industry benchmark from OpenAI with exceptional JSON extraction and order processing.",
  },
] as const;

export function blankBrand(): BrandProfile {
  const now = new Date().toISOString();
  return {
    id: uid("brand"),
    name: "",
    category: "",
    iconType: "bot",
    role: "",
    tagline: "",
    welcomeMessage: "",
    productsServices: "",
    instructions: "",
    promptRules: "",
    tone: "Friendly",
    language: "Arabic",
    dialect: "Egyptian Arabic",
    llmModel: "google/gemini-3.7-flash",
    menuItems: [],
    guardrails: { strictPrice: true, orderCollector: true, bookingMode: false },
    contactInfo: { phone: "", address: "", workingHours: "" },
    defaultChannel: "whatsapp",
    createdAt: now,
    updatedAt: now,
  };
}

export function applyPreset(
  brand: BrandProfile,
  preset: CategoryPreset,
  lang: "ar" | "en" = "ar",
): BrandProfile {
  const isAr = lang === "ar" || brand.language === "Arabic" || brand.dialect !== "English";

  return {
    ...brand,
    category: preset.key,
    iconType: preset.icon,
    role: isAr ? preset.roleAr : preset.role,
    tagline: isAr ? preset.taglineAr : preset.tagline,
    welcomeMessage: isAr ? preset.welcomeAr : preset.welcome,
    promptRules: isAr ? preset.rulesAr : preset.rules,
    guardrails: {
      strictPrice: true,
      orderCollector: preset.key !== "Medical",
      bookingMode: preset.key === "Medical" || preset.key === "Services",
    },
    menuItems: (isAr ? preset.itemsAr : preset.items).map((i) => ({
      ...i,
      id: uid("item"),
      available: true,
    })),
    contactInfo: {
      phone: preset.phone,
      address: isAr ? preset.addressAr : preset.address,
      hours: isAr ? preset.hoursAr : preset.hours,
      workingHours: isAr ? preset.hoursAr : preset.hours,
    },
    updatedAt: new Date().toISOString(),
  };
}
