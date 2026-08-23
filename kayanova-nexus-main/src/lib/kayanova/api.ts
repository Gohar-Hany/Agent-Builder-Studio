import type { BrandProfile, CustomerContact, ExtractedLead } from "./types";

const getApiBase = () => {
  if (typeof window !== "undefined" && import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return "/api";
  }
  return "http://localhost:8000/api";
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiBase()}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`API Error [${response.status}] ${endpoint}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// ─── Brands Endpoints ───

export async function fetchBrandsApi(): Promise<BrandProfile[]> {
  const data = await request<{ brands: BrandProfile[] }>("/brands");
  return data.brands;
}

export async function createBrandApi(brand: BrandProfile): Promise<{ brandId: string }> {
  return request<{ message: string; brandId: string }>("/brands", {
    method: "POST",
    body: JSON.stringify(brand),
  });
}

export async function updateBrandApi(brand: BrandProfile): Promise<{ brandId: string }> {
  return request<{ message: string; brandId: string }>(`/brands/${brand.id}`, {
    method: "PUT",
    body: JSON.stringify(brand),
  });
}

export async function deleteBrandApi(brandId: string): Promise<void> {
  await request<{ message: string }>(`/brands/${brandId}`, {
    method: "DELETE",
  });
}

// ─── Orders CRM Endpoints ───

export async function fetchOrdersApi(brandId?: string): Promise<ExtractedLead[]> {
  const q = brandId && brandId !== "all" ? `?brand_id=${encodeURIComponent(brandId)}` : "";
  const data = await request<{ orders: ExtractedLead[] }>(`/orders${q}`);
  return data.orders;
}

export async function createOrderApi(order: Partial<ExtractedLead>): Promise<{ orderId: string }> {
  return request<{ message: string; orderId: string }>("/orders", {
    method: "POST",
    body: JSON.stringify(order),
  });
}

export async function updateOrderStatusApi(
  orderId: string,
  status: ExtractedLead["status"],
): Promise<void> {
  await request<{ message: string }>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteOrderApi(orderId: string): Promise<void> {
  await request<{ message: string }>(`/orders/${orderId}`, {
    method: "DELETE",
  });
}

// ─── Contacts CRM Endpoints ───

export async function fetchContactsApi(brandId?: string): Promise<CustomerContact[]> {
  const q = brandId && brandId !== "all" ? `?brand_id=${encodeURIComponent(brandId)}` : "";
  const data = await request<{ contacts: CustomerContact[] }>(`/contacts${q}`);
  return data.contacts;
}

export async function createContactApi(contact: CustomerContact): Promise<{ contactId: string }> {
  return request<{ message: string; contactId: string }>("/contacts", {
    method: "POST",
    body: JSON.stringify(contact),
  });
}

export async function updateContactApi(
  contactId: string,
  payload: { stage?: CustomerContact["stage"]; notes?: string },
): Promise<void> {
  await request<{ message: string }>(`/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteContactApi(contactId: string): Promise<void> {
  await request<{ message: string }>(`/contacts/${contactId}`, {
    method: "DELETE",
  });
}

// ─── AI Chat & Auto-Fill Endpoints ───

export interface ChatResponse {
  reply: string;
  extracted_order?: {
    has_order: boolean;
    customer_name?: string;
    customer_phone?: string;
    items?: string[];
    numeric_total?: number;
    total_amount?: string;
    order_type?: string;
    delivery_address?: string;
    payment_method?: string;
  } | null;
  extracted_lead?: {
    customer_name?: string;
    customer_phone?: string;
    email?: string;
    intent?: string;
    stage?: string;
  } | null;
  saved_order_id?: string;
}

export async function sendAgentChatApi(payload: {
  message: string;
  history?: Array<{ role: string; content: string }>;
  config?: Partial<BrandProfile>;
  brandId?: string;
  sessionId?: string;
}): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function generateProfileApi(payload: {
  name: string;
  category: string;
  language?: string;
  dialect?: string;
  tone?: string;
  currentTagline?: string;
  currentRole?: string;
  currentWelcome?: string;
  currentInstructions?: string;
}): Promise<{
  tagline: string;
  role: string;
  welcomeMessage: string;
  productsServices?: string;
  instructions: string;
  menuItems?: Array<{ name: string; price: number; category: string }>;
}> {
  return request<{
    tagline: string;
    role: string;
    welcomeMessage: string;
    productsServices?: string;
    instructions: string;
    menuItems?: Array<{ name: string; price: number; category: string }>;
  }>("/generate-profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
