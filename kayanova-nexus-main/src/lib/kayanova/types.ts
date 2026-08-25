export type BrandCategory =
  "Restaurant" | "Medical" | "E-commerce" | "Real Estate" | "Services" | "Other";

export type IconType =
  "coffee" | "stethoscope" | "shirt" | "building" | "briefcase" | "bot" | "sparkles";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  available?: boolean;
}

export interface BrandProfile {
  id: string;
  name: string;
  category: BrandCategory;
  iconType: IconType;
  tagline?: string;
  role: string;
  tone: "Professional" | "Friendly" | "Casual" | "Luxury" | string;
  language: string;
  dialect:
    "Egyptian Arabic" | "Gulf Arabic" | "Modern Standard Arabic" | "English" | "Bilingual" | string;
  llmModel?: string;
  description?: string;
  productsServices?: string;
  knowledgeBase?: string;
  welcomeMessage?: string;
  instructions?: string;
  promptRules?: string;
  menuItems?: MenuItem[];
  creativity?: number;
  guardrails?: {
    strictPrice?: boolean;
    orderCollector?: boolean;
    bookingMode?: boolean;
  };
  contactInfo?: {
    phone?: string;
    address?: string;
    hours?: string;
    workingHours?: string;
  };
  policies?: { delivery?: string; returns?: string; booking?: string };
  defaultChannel: "whatsapp" | "instagram" | "web";
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedLead {
  id: string;
  brandId: string;
  customerName: string;
  customerPhone?: string;
  phone?: string;
  items: string[];
  orderLines?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  numericTotal?: number;
  totalAmount?: string;
  totalEstimated?: string;
  orderType?: "Delivery" | "Pickup" | "Medical Booking" | "General";
  deliveryAddress?: string;
  paymentMethod?: string;
  notes?: string;
  status: "New" | "In Progress" | "Completed";
  intent?: string;
  channel?: string;
  confidence?: number;
  timestamp: string;
}

export interface CustomerContact {
  id: string;
  brandId: string;
  customerName: string;
  customerPhone: string;
  email?: string;
  channel: "whatsapp" | "instagram" | "web" | "phone";
  intent: string;
  stage: "New Lead" | "Contacted" | "Qualified" | "Converted" | "Inactive";
  notes?: string;
  totalOrdersCount?: number;
  totalSpent?: number;
  lastContactAt: string;
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
