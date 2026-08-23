import os
import re
import json
import uuid
import urllib.request
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from dotenv import load_dotenv

import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Ensure environment variables (.env) are loaded reliably
env_file = os.path.join(backend_dir, ".env")
load_dotenv(env_file)

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from database import init_db, get_db_connection
    from agent_runner import run_agent_chat
except ImportError:
    from backend.database import init_db, get_db_connection
    from backend.agent_runner import run_agent_chat

app = FastAPI(title="Kayanova Enterprise Agent API", version="2.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database on Startup
@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def root():
    return {"status": "ok", "service": "Kayanova Enterprise Agent API", "version": "2.5.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# ─── Pydantic Data Models ───

class MenuItemModel(BaseModel):
    id: Optional[str] = None
    name: str
    price: float
    category: Optional[str] = "General"
    description: Optional[str] = ""
    available: Optional[bool] = True

class BrandModel(BaseModel):
    id: Optional[str] = None
    name: str
    iconType: Optional[str] = "bot"
    tagline: Optional[str] = ""
    category: Optional[str] = "Restaurant"
    role: Optional[str] = "Customer Support Representative"
    tone: Optional[str] = "Friendly"
    language: Optional[str] = "Arabic"
    dialect: Optional[str] = "Egyptian Arabic"
    llmModel: Optional[str] = "google/gemini-3.7-flash"
    description: Optional[str] = ""
    productsServices: Optional[str] = ""
    knowledgeBase: Optional[str] = ""
    welcomeMessage: Optional[str] = ""
    instructions: Optional[str] = ""
    promptRules: Optional[str] = ""
    contactInfo: Optional[Dict[str, Any]] = {}
    creativity: Optional[int] = 50
    guardrails: Optional[Any] = None
    menuItems: Optional[List[MenuItemModel]] = []
    defaultChannel: Optional[str] = "whatsapp"
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class OrderModel(BaseModel):
    id: Optional[str] = None
    brandId: str
    customerName: str
    customerPhone: str
    items: List[str] = []
    numericTotal: Optional[float] = 0
    totalAmount: Optional[str] = "قيد المراجعة"
    orderType: Optional[str] = "Delivery"
    deliveryAddress: Optional[str] = ""
    paymentMethod: Optional[str] = "دفع عند الاستلام"
    status: Optional[str] = "New"
    notes: Optional[str] = ""

class ContactModel(BaseModel):
    id: Optional[str] = None
    brandId: str
    customerName: str
    customerPhone: str
    email: Optional[str] = None
    channel: Optional[str] = "whatsapp"
    intent: Optional[str] = "Inquiry"
    stage: Optional[str] = "New Lead"
    notes: Optional[str] = None
    totalOrdersCount: Optional[int] = 0
    totalSpent: Optional[float] = 0

class StatusUpdateModel(BaseModel):
    status: str

class ContactUpdateModel(BaseModel):
    stage: Optional[str] = None
    notes: Optional[str] = None

class ChatRequest(BaseModel):
    sessionId: Optional[str] = "default-session"
    message: str
    history: Optional[list] = []
    config: Optional[dict] = {}
    brandId: Optional[str] = None

class GenerateProfileRequest(BaseModel):
    name: Optional[str] = "براند جديد"
    category: Optional[str] = "Restaurant"
    language: Optional[str] = "Arabic"
    dialect: Optional[str] = "Egyptian Arabic"
    tone: Optional[str] = "Friendly"
    currentTagline: Optional[str] = None
    currentRole: Optional[str] = None
    currentWelcome: Optional[str] = None
    currentInstructions: Optional[str] = None

# ─── Helper Functions ───

def row_to_brand_dict(row, menu_items=None):
    keys = row.keys()
    guardrails = []
    if "guardrails" in keys and row["guardrails"]:
        try:
            guardrails = json.loads(row["guardrails"])
        except Exception:
            guardrails = ["strict_pricing", "order_confirmation"]
    else:
        guardrails = ["strict_pricing", "order_confirmation"]

    return {
        "id": row["id"],
        "name": row["name"],
        "iconType": row["icon_type"] if "icon_type" in keys and row["icon_type"] else "bot",
        "tagline": row["tagline"] if "tagline" in keys and row["tagline"] else "",
        "category": row["category"] if "category" in keys and row["category"] else "Restaurant",
        "role": row["role"] if "role" in keys and row["role"] else "Senior Representative",
        "tone": row["tone"] if "tone" in keys and row["tone"] else "Friendly",
        "language": row["language"] if "language" in keys and row["language"] else "Arabic",
        "dialect": row["dialect"] if "dialect" in keys and row["dialect"] else "Egyptian Arabic",
        "llmModel": row["llm_model"] if "llm_model" in keys and row["llm_model"] else "google/gemini-3.7-flash",
        "description": row["description"] if "description" in keys and row["description"] else "",
        "productsServices": row["products_services"] if "products_services" in keys and row["products_services"] else "",
        "knowledgeBase": row["products_services"] if "products_services" in keys and row["products_services"] else "",
        "welcomeMessage": row["welcome_message"] if "welcome_message" in keys and row["welcome_message"] else "",
        "instructions": row["instructions"] if "instructions" in keys and row["instructions"] else "",
        "creativity": row["creativity"] if "creativity" in keys and row["creativity"] else 50,
        "guardrails": guardrails,
        "menuItems": menu_items or [],
        "contactInfo": {
            "phone": row["contact_phone"] if "contact_phone" in keys and row["contact_phone"] else "",
            "address": row["contact_address"] if "contact_address" in keys and row["contact_address"] else "",
            "workingHours": row["contact_hours"] if "contact_hours" in keys and row["contact_hours"] else "",
        },
        "createdAt": row["created_at"] if "created_at" in keys else "",
        "updatedAt": row["updated_at"] if "updated_at" in keys else "",
    }

def row_to_order_dict(row):
    items = []
    if row["items"]:
        try:
            items = json.loads(row["items"])
        except Exception:
            items = [row["items"]]

    return {
        "id": row["id"],
        "brandId": row["brand_id"],
        "customerName": row["customer_name"],
        "customerPhone": row["customer_phone"],
        "items": items,
        "numericTotal": float(row["numeric_total"] or 0),
        "totalAmount": row["total_amount"] or f"{int(row['numeric_total'] or 0)} ج.م",
        "orderType": row["order_type"] or "Delivery",
        "deliveryAddress": row["delivery_address"] or "",
        "paymentMethod": row["payment_method"] or "دفع عند الاستلام",
        "status": row["status"] or "New",
        "notes": row["notes"] or "",
        "confidence": row["confidence"] or 95,
        "timestamp": row["timestamp"] or row["created_at"],
        "createdAt": row["created_at"],
    }

def row_to_contact_dict(row):
    return {
        "id": row["id"],
        "brandId": row["brand_id"],
        "customerName": row["customer_name"],
        "customerPhone": row["customer_phone"],
        "email": row["email"],
        "channel": row["channel"] or "whatsapp",
        "intent": row["intent"] or "General Inquiry",
        "stage": row["stage"] or "New Lead",
        "notes": row["notes"] or "",
        "totalOrdersCount": int(row["total_orders_count"] or 0),
        "totalSpent": float(row["total_spent"] or 0),
        "lastContactAt": row["last_contact_at"] or row["created_at"],
        "createdAt": row["created_at"],
    }

# ─── API Routes: Brands ───

@app.get("/api/brands")
def get_brands():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM brands ORDER BY created_at ASC")
    rows = cursor.fetchall()
    
    brands = []
    for row in rows:
        cursor.execute("SELECT * FROM menu_items WHERE brand_id = ?", (row["id"],))
        m_rows = cursor.fetchall()
        menu_items = [
            {
                "id": m["id"],
                "name": m["name"],
                "price": float(m["price"]),
                "category": m["category"],
                "description": m["description"],
                "available": bool(m["available"])
            }
            for m in m_rows
        ]
        brands.append(row_to_brand_dict(row, menu_items))
    conn.close()
    return {"brands": brands}

@app.get("/api/brands/{brand_id}")
def get_brand(brand_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM brands WHERE id = ?", (brand_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Brand not found")
    
    cursor.execute("SELECT * FROM menu_items WHERE brand_id = ?", (brand_id,))
    m_rows = cursor.fetchall()
    menu_items = [
        {"id": m["id"], "name": m["name"], "price": float(m["price"]), "category": m["category"], "description": m["description"], "available": bool(m["available"])}
        for m in m_rows
    ]
    brand = row_to_brand_dict(row, menu_items)
    conn.close()
    return brand

@app.post("/api/brands")
def create_brand(brand: BrandModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    brand_id = brand.id or f"brand-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now().isoformat()
    
    contact = brand.contactInfo or {}
    if isinstance(contact, dict):
        c_phone = str(contact.get("phone", "") or "")
        c_address = str(contact.get("address", "") or "")
        c_hours = str(contact.get("workingHours", "") or "")
    else:
        c_phone = str(getattr(contact, "phone", "") or "")
        c_address = str(getattr(contact, "address", "") or "")
        c_hours = str(getattr(contact, "workingHours", "") or "")

    try:
        guardrails_json = json.dumps(brand.guardrails if brand.guardrails is not None else ["strict_pricing"], ensure_ascii=False)
    except Exception:
        guardrails_json = '["strict_pricing"]'

    try:
        cursor.execute("SELECT id FROM brands WHERE id = ?", (brand_id,))
        exists = cursor.fetchone() is not None

        if exists:
            cursor.execute("""
            UPDATE brands SET
                name = ?, icon_type = ?, tagline = ?, category = ?, role = ?, tone = ?,
                language = ?, dialect = ?, llm_model = ?, description = ?, products_services = ?,
                welcome_message = ?, instructions = ?, contact_phone = ?, contact_address = ?,
                contact_hours = ?, creativity = ?, guardrails = ?, updated_at = ?
            WHERE id = ?
            """, (
                brand.name, brand.iconType, brand.tagline, brand.category, brand.role,
                brand.tone, brand.language, brand.dialect, brand.llmModel or "google/gemini-3.7-flash",
                brand.description, brand.productsServices,
                brand.welcomeMessage, brand.instructions,
                c_phone, c_address, c_hours,
                brand.creativity or 50, guardrails_json, now_iso, brand_id
            ))
            cursor.execute("DELETE FROM menu_items WHERE brand_id = ?", (brand_id,))
        else:
            cursor.execute("""
            INSERT INTO brands (
                id, name, icon_type, tagline, category, role, tone, language, dialect, llm_model,
                description, products_services, welcome_message, instructions,
                contact_phone, contact_address, contact_hours, creativity, guardrails, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                brand_id, brand.name, brand.iconType, brand.tagline, brand.category, brand.role,
                brand.tone, brand.language, brand.dialect, brand.llmModel or "google/gemini-3.7-flash",
                brand.description, brand.productsServices,
                brand.welcomeMessage, brand.instructions,
                c_phone, c_address, c_hours,
                brand.creativity or 50, guardrails_json, now_iso, now_iso
            ))

        # Insert menu items if provided
        if brand.menuItems:
            for item in brand.menuItems:
                m_id = item.id or f"item-{uuid.uuid4().hex[:6]}"
                cursor.execute("""
                INSERT INTO menu_items (id, brand_id, name, price, category, description, available)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (m_id, brand_id, item.name, float(item.price or 0), item.category or "General", item.description or "", 1 if item.available else 0))

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Error in create_brand: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return {"message": "Brand created successfully", "brandId": brand_id}

@app.put("/api/brands/{brand_id}")
def update_brand(brand_id: str, brand: BrandModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now().isoformat()
    
    contact = brand.contactInfo or {}
    if isinstance(contact, dict):
        c_phone = str(contact.get("phone", "") or "")
        c_address = str(contact.get("address", "") or "")
        c_hours = str(contact.get("workingHours", "") or "")
    else:
        c_phone = str(getattr(contact, "phone", "") or "")
        c_address = str(getattr(contact, "address", "") or "")
        c_hours = str(getattr(contact, "workingHours", "") or "")

    try:
        guardrails_json = json.dumps(brand.guardrails if brand.guardrails is not None else ["strict_pricing"], ensure_ascii=False)
    except Exception:
        guardrails_json = '["strict_pricing"]'

    try:
        cursor.execute("""
        UPDATE brands SET
            name = ?, icon_type = ?, tagline = ?, category = ?, role = ?, tone = ?,
            language = ?, dialect = ?, description = ?, products_services = ?,
            welcome_message = ?, instructions = ?, contact_phone = ?, contact_address = ?,
            contact_hours = ?, creativity = ?, guardrails = ?, updated_at = ?
        WHERE id = ?
        """, (
            brand.name, brand.iconType, brand.tagline, brand.category, brand.role, brand.tone,
            brand.language, brand.dialect, brand.description, brand.productsServices,
            brand.welcomeMessage, brand.instructions,
            c_phone, c_address, c_hours,
            brand.creativity or 50, guardrails_json, now_iso, brand_id
        ))

        if brand.menuItems is not None:
            cursor.execute("DELETE FROM menu_items WHERE brand_id = ?", (brand_id,))
            for item in brand.menuItems:
                m_id = item.id or f"item-{uuid.uuid4().hex[:6]}"
                cursor.execute("""
                INSERT INTO menu_items (id, brand_id, name, price, category, description, available)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (m_id, brand_id, item.name, float(item.price or 0), item.category or "General", item.description or "", 1 if item.available else 0))

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Error in update_brand: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return {"message": "Brand updated successfully", "brandId": brand_id}

@app.delete("/api/brands/{brand_id}")
def delete_brand(brand_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM brands WHERE id = ?", (brand_id,))
    conn.commit()
    conn.close()
    return {"message": "Brand deleted successfully"}

# ─── API Routes: Orders CRM ───

@app.get("/api/orders")
def get_orders(brand_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if brand_id and brand_id != "all":
        cursor.execute("SELECT * FROM orders WHERE brand_id = ? ORDER BY created_at DESC", (brand_id,))
    else:
        cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
    rows = cursor.fetchall()
    orders = [row_to_order_dict(r) for r in rows]
    conn.close()
    return {"orders": orders}

@app.post("/api/orders")
def create_order(order: OrderModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    order_id = order.id or f"ord-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO orders (id, brand_id, customer_name, customer_phone, items, numeric_total, total_amount, order_type, delivery_address, payment_method, status, notes, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'الآن', ?)
    """, (
        order_id, order.brandId, order.customerName, order.customerPhone,
        json.dumps(order.items, ensure_ascii=False), order.numericTotal or 0,
        order.totalAmount, order.orderType, order.deliveryAddress,
        order.paymentMethod, order.status or "New", order.notes or "", now_iso
    ))
    conn.commit()
    conn.close()
    return {"message": "Order created successfully", "orderId": order_id}

@app.patch("/api/orders/{order_id}/status")
def update_order_status(order_id: str, payload: StatusUpdateModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (payload.status, order_id))
    conn.commit()
    conn.close()
    return {"message": "Order status updated", "status": payload.status}

@app.delete("/api/orders/{order_id}")
def delete_order(order_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM orders WHERE id = ?", (order_id,))
    conn.commit()
    conn.close()
    return {"message": "Order deleted successfully"}

# ─── API Routes: Customer Leads & Contacts CRM ───

@app.get("/api/contacts")
def get_contacts(brand_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if brand_id and brand_id != "all":
        cursor.execute("SELECT * FROM contacts WHERE brand_id = ? ORDER BY created_at DESC", (brand_id,))
    else:
        cursor.execute("SELECT * FROM contacts ORDER BY created_at DESC")
    rows = cursor.fetchall()
    contacts = [row_to_contact_dict(r) for r in rows]
    conn.close()
    return {"contacts": contacts}

@app.post("/api/contacts")
def create_contact(contact: ContactModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    contact_id = contact.id or f"cont-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO contacts (id, brand_id, customer_name, customer_phone, email, channel, intent, stage, notes, total_orders_count, total_spent, last_contact_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        contact_id, contact.brandId, contact.customerName, contact.customerPhone,
        contact.email, contact.channel or "whatsapp", contact.intent or "Manual Lead",
        contact.stage or "New Lead", contact.notes or "",
        contact.totalOrdersCount or 0, contact.totalSpent or 0, now_iso, now_iso
    ))
    conn.commit()
    conn.close()
    return {"message": "Contact created successfully", "contactId": contact_id}

@app.patch("/api/contacts/{contact_id}")
def update_contact(contact_id: str, payload: ContactUpdateModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    if payload.stage and payload.notes is not None:
        cursor.execute("UPDATE contacts SET stage = ?, notes = ? WHERE id = ?", (payload.stage, payload.notes, contact_id))
    elif payload.stage:
        cursor.execute("UPDATE contacts SET stage = ? WHERE id = ?", (payload.stage, contact_id))
    elif payload.notes is not None:
        cursor.execute("UPDATE contacts SET notes = ? WHERE id = ?", (payload.notes, contact_id))
    conn.commit()
    conn.close()
    return {"message": "Contact updated successfully"}

@app.delete("/api/contacts/{contact_id}")
def delete_contact(contact_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
    conn.commit()
    conn.close()
    return {"message": "Contact deleted successfully"}

# ─── API Routes: Live AI Chat Endpoint ───

@app.post("/api/chat")
def chat_with_agent(req: ChatRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    brand_config = req.config or {}
    if req.brandId and not brand_config.get("name"):
        cursor.execute("SELECT * FROM brands WHERE id = ?", (req.brandId,))
        b_row = cursor.fetchone()
        if b_row:
            brand_config = row_to_brand_dict(b_row)

    conn.close()

    result = run_agent_chat(
        agent_config=brand_config,
        user_message=req.message,
        history=req.history or [],
        session_id=req.sessionId or "default"
    )

    return result

# ─── API Routes: AI Agent Copilot & Profile Optimizer ───

FALLBACK_CATALOGS = {
    "Marketing & Advertising Agency": {
        "ar": [
            {"name": "باقة إدارة الحملات الإعلانية الممولة (Meta & Google)", "price": 6500, "category": "الإعلانات الممولة"},
            {"name": "باقة إدارة وصناعة محتوى السوشيال ميديا الشاملة", "price": 8500, "category": "إدارة الحسابات"},
            {"name": "تصميم الهوية البصرية المتكاملة والعلامة التجارية", "price": 12000, "category": "الهوية والتصميم"},
            {"name": "خطة تحسين محركات البحث وتهيئة المواقع (SEO)", "price": 5500, "category": "التسويق الرقمي"},
            {"name": "إنتاج وتصوير الفيديوهات الإعلانية والريلز الإبداعية", "price": 9500, "category": "الإنتاج الإعلامي"},
        ],
        "en": [
            {"name": "Performance Paid Ads Management (Meta & Google)", "price": 6500, "category": "Paid Media"},
            {"name": "Full Social Media Management & Content Retainer", "price": 8500, "category": "Social Media"},
            {"name": "Complete Brand Identity & Visual Guidelines", "price": 12000, "category": "Branding"},
            {"name": "Technical SEO Optimization & Growth Strategy", "price": 5500, "category": "Digital Marketing"},
            {"name": "Commercial Video & High-Converting Reels Production", "price": 9500, "category": "Media Production"},
        ]
    },
    "Software & Technology Services": {
        "ar": [
            {"name": "تطوير المنصات وتطبيقات الويب السحابية المخصصة", "price": 28000, "category": "تطوير البرمجيات"},
            {"name": "برمجة تطبيقات الهواتف الذكية (iOS & Android)", "price": 35000, "category": "تطبيقات الموبايل"},
            {"name": "تصميم تجربة وواجهة المستخدم للأنظمة (UI/UX Design)", "price": 14000, "category": "التصميم الرقمي"},
            {"name": "جلسة استشارة معمارية برمجية ودراسة جدوى تقنية", "price": 3500, "category": "الاستشارات التقنية"},
            {"name": "باقة الصيانة السحابية والدعم الفني والأمان الشهري", "price": 4500, "category": "الدعم السحابي"},
        ],
        "en": [
            {"name": "Custom Cloud Web Application Development", "price": 28000, "category": "Software Engineering"},
            {"name": "Cross-Platform Mobile App (iOS & Android)", "price": 35000, "category": "Mobile Apps"},
            {"name": "Complete UI/UX System & Prototype Design", "price": 14000, "category": "Digital Design"},
            {"name": "Technical Architecture & System Feasibility Audit", "price": 3500, "category": "Consulting"},
            {"name": "Monthly DevOps Maintenance & Cloud Security Retainer", "price": 4500, "category": "Cloud Support"},
        ]
    },
    "Restaurant": {
        "ar": [
            {"name": "سبانش لاتيه مثلج مميز", "price": 85, "category": "مشروبات مثلجة"},
            {"name": "فلات وايت بحليب اللوز", "price": 75, "category": "قهوة ساخنة"},
            {"name": "قهوة V60 مختصة حبوب إثيوبية", "price": 95, "category": "قهوة مقطرة"},
            {"name": "كرواسون فستق مقرمش طازج", "price": 110, "category": "مخبوزات طازجة"},
            {"name": "تشيز كيك توت سان سيباستيان", "price": 130, "category": "حلويات"},
        ],
        "en": [
            {"name": "Iced Spanish Latte Signature", "price": 85, "category": "Iced Coffee"},
            {"name": "Flat White with Almond Milk", "price": 75, "category": "Hot Coffee"},
            {"name": "Specialty Ethiopian V60 Brew", "price": 95, "category": "Filter Coffee"},
            {"name": "Artisanal Pistachio Croissant", "price": 110, "category": "Fresh Bakery"},
            {"name": "San Sebastian Berry Cheesecake", "price": 130, "category": "Desserts"},
        ]
    },
    "Medical": {
        "ar": [
            {"name": "كشف واستشارة طبية متخصصة", "price": 400, "category": "الكشوفات والاستشارات"},
            {"name": "جلسة تنظيف وتلميع أسنان وإزالة الجير", "price": 650, "category": "العناية بالأسنان"},
            {"name": "جلسة تبييض أسنان ليزر متطورة", "price": 1800, "category": "تجميل الأسنان"},
            {"name": "أشعة بانوراما رقمية ثلاثية الأبعاد", "price": 350, "category": "الفحوصات والأشعة"},
            {"name": "خطة علاج وتركيب عدسات الفينير", "price": 3200, "category": "تجميل الأسنان"},
        ],
        "en": [
            {"name": "Specialist Medical Consultation", "price": 400, "category": "Consultations"},
            {"name": "Ultrasonic Dental Scaling & Polishing", "price": 650, "category": "Dental Care"},
            {"name": "Advanced Laser Teeth Whitening", "price": 1800, "category": "Cosmetic"},
            {"name": "Digital 3D Panoramic X-Ray", "price": 350, "category": "Diagnostics"},
            {"name": "Porcelain Veneer Consultation", "price": 3200, "category": "Cosmetic"},
        ]
    },
    "E-commerce": {
        "ar": [
            {"name": "قميص كتان طبيعي أوفر سايز صيفي", "price": 650, "category": "الملابس العلوية"},
            {"name": "فستان سهرة كريب راقي مطرز", "price": 1850, "category": "فساتين"},
            {"name": "بنطلون شارلستون بقصة واسعة", "price": 750, "category": "بنطلونات"},
            {"name": "بليزر كاجوال عصري بأزرار مزدوجة", "price": 1400, "category": "البليزرات والجاكيتات"},
            {"name": "طقم قطن مريح للطلعات اليومية", "price": 950, "category": "أطقم متناسقة"},
        ],
        "en": [
            {"name": "Oversized Pure Linen Summer Shirt", "price": 650, "category": "Tops"},
            {"name": "Elegant Embroidered Crepe Evening Dress", "price": 1850, "category": "Dresses"},
            {"name": "High-Waist Tailored Wide-Leg Trousers", "price": 750, "category": "Bottoms"},
            {"name": "Modern Double-Breasted Casual Blazer", "price": 1400, "category": "Outerwear"},
            {"name": "Signature Organic Cotton Co-ord Set", "price": 950, "category": "Co-ords"},
        ]
    },
    "Real Estate": {
        "ar": [
            {"name": "شقة سكنية تشطيب فاخر 165م² بالتجمع", "price": 3800000, "category": "شقق سكنية"},
            {"name": "تاون هاوس كورنر 240م² بحديقة خاصة", "price": 7200000, "category": "فيلات وتاون هاوس"},
            {"name": "عيادة طبية مرخصة 60م² بمول تجاري", "price": 2400000, "category": "وحدات تجارية وإدارية"},
            {"name": "شاليه صف أول ع البحر بالساحل الشمالي", "price": 4900000, "category": "شاليهات سياحية"},
            {"name": "مكتب إداري مجهز 110م² بالعاصمة الإدارية", "price": 3100000, "category": "وحدات تجارية وإدارية"},
        ],
        "en": [
            {"name": "Luxury Finished 165m² Apartment in New Cairo", "price": 3800000, "category": "Apartments"},
            {"name": "Corner Townhouse 240m² with Private Garden", "price": 7200000, "category": "Villas"},
            {"name": "Fully Licensed 60m² Medical Clinic", "price": 2400000, "category": "Commercial"},
            {"name": "First-Row Beach Chalet in North Coast", "price": 4900000, "category": "Chalets"},
            {"name": "Prime 110m² Office Space in New Capital", "price": 3100000, "category": "Commercial"},
        ]
    },
    "Services": {
        "ar": [
            {"name": "جلسة مساج استرخائي كامل للجسم 60 دقيقة", "price": 950, "category": "جلسات المساج"},
            {"name": "حمام مغربي ملكي بالأعشاب الطبيعية والسنفرة", "price": 1600, "category": "طقوس الحمام"},
            {"name": "جلسة تنظيف عميق للبشرة ونضارة بالأعشاب", "price": 1100, "category": "العناية بالبشرة"},
            {"name": "مساج علاجي للأنسجة العميقة 90 دقيقة", "price": 1400, "category": "جلسات المساج"},
            {"name": "باقة VIP شاملة (مساج + حمام ملكي + عناية)", "price": 3200, "category": "باقات متكاملة"},
        ],
        "en": [
            {"name": "Swedish Relaxation Massage 60min", "price": 950, "category": "Massage"},
            {"name": "Royal Moroccan Bath & Herbal Scrub", "price": 1600, "category": "Rituals"},
            {"name": "Deep Hydrating Organic Facial", "price": 1100, "category": "Skin Care"},
            {"name": "Deep Tissue Therapeutic Massage 90min", "price": 1400, "category": "Massage"},
            {"name": "Full VIP Relaxation Package", "price": 3200, "category": "Packages"},
        ]
    }
}

@app.post("/api/generate-profile")
def generate_profile(req: GenerateProfileRequest):
    api_key = os.getenv("OPENROUTER_API_KEY")
    brand_name = req.name.strip() if req.name and req.name.strip() else "البراند"
    category = req.category or "Marketing & Advertising Agency"
    is_english = req.dialect == "English" or req.language == "English"
    language_label = "English" if is_english else "Arabic"
    dialect = req.dialect or ("English" if is_english else "Egyptian Arabic")
    tone = req.tone or "Friendly"

    # Default localized fallback
    cat_fallback = FALLBACK_CATALOGS.get(category, FALLBACK_CATALOGS.get("Marketing & Advertising Agency", FALLBACK_CATALOGS["Restaurant"]))
    fallback_items = cat_fallback.get("en" if is_english else "ar", cat_fallback["ar"])

    if not api_key:
        return {
            "tagline": f"The Premier Destination for {category}" if is_english else f"الوجهة الرائدة في عالم {category}",
            "role": f"Customer Concierge & Sales Advisor" if is_english else f"مستشار خدمة العملاء وتأكيد الطلبات",
            "welcomeMessage": f"Welcome to {brand_name}! How can I assist your order today?" if is_english else f"أهلاً بحضرتك في {brand_name}! يسعدني خدمتك اليوم وتأكيد طلبك.",
            "instructions": "1. Greet courteously.\n2. Strictly quote catalog prices.\n3. Collect phone and address.\n4. Confirm delivery details." if is_english else "1. الترحيب بلباقة بالعميل.\n2. الالتزام بأسعار المنيو بدقة.\n3. تسجيل رقم الهاتف وعنوان التوصيل.\n4. تأكيد تفاصيل الطلب بالكامل.",
            "menuItems": fallback_items
        }

    prompt = f"""You are an elite business strategist and AI product catalog architect.
Create a hyper-realistic, highly customized AI conversational agent profile and product/service catalog for this business:

Business Name: {brand_name}
Industry / Domain: {category}
Output Language: {language_label}
Dialect: {dialect}
Tone: {tone}
Existing Tagline: {req.currentTagline or 'None'}
Existing Role: {req.currentRole or 'None'}

CRITICAL INSTRUCTIONS:
1. Deeply analyze the business name "{brand_name}" and industry domain "{category}".
   - If "{brand_name}" or "{category}" relates to Marketing Agency, MarkTech, Advertising, Media, PR, Digital Strategy -> generate tailored digital marketing packages and services (e.g. Paid Ads Management, Social Media Retainer, Brand Identity Design, SEO Optimization, Media Production) with realistic agency pricing in EGP (e.g. 5000 to 25000 EGP).
   - If Software, Tech, IT, SaaS -> generate custom web apps, mobile app development, UI/UX systems, cloud DevOps, tech consultations (e.g. 3500 to 45000 EGP).
   - If Coffee, Roastery, Cafe, Bakery -> generate specialty coffee drinks (Spanish latte, V60, Flat white, Cold brew) and fresh pastries (croissants, brownies) with realistic Egyptian market prices in EGP (e.g. 70 to 145 EGP).
   - If Burger / Pizza / Food -> generate burgers, pizzas, sides, drinks with realistic EGP prices (100 to 280 EGP).
   - If Dental / Clinic / Medical -> generate consultations, cleanings, laser whitening, dental veneers with realistic EGP prices (350 to 3500 EGP).
   - If Fashion / Apparel / Retail -> generate linen shirts, dresses, suits, trousers with realistic EGP prices (400 to 2200 EGP).
   - If Real Estate -> generate apartments, villas, townhouses, commercial clinics with realistic EGP prices in millions.
   - If Spa / Wellness -> generate massage sessions, Moroccan bath, skincare packages (800 to 3500 EGP).
   - For ANY other business type, create 5 authentic, professional products or services specific to that exact niche.
2. Generate exactly 5 distinct, highly realistic products or services with realistic prices in Egyptian Pounds (EGP).
3. If Output Language is Arabic: All texts, item names, and categories MUST be in 100% pure, natural Arabic with ZERO English words in parentheses.
4. If Output Language is English: All texts, item names, and categories MUST be in 100% natural English.
5. Create a magnetic Tagline, specialized Role title, warm natural Welcome Greeting in {dialect}, and 4 concise operational directives.
6. STRICT ZERO-EMOJI RULE: Do NOT include ANY emojis (such as ⚡, ☀️, ✨, 🚀, 💼, 🤖, etc.) anywhere in any field. Output must be pure, clean, professional text only.

Respond ONLY with a valid JSON object matching this schema:
{{
  "tagline": "Magnetic tagline in {language_label}",
  "role": "Professional specialized role in {language_label}",
  "welcomeMessage": "Natural warm welcome greeting in {dialect}",
  "instructions": "1. Rule one\\n2. Rule two\\n3. Rule three\\n4. Rule four",
  "menuItems": [
     {{"name": "Specific item name", "price": 120, "category": "Specific category"}},
     {{"name": "Specific item name", "price": 85, "category": "Specific category"}},
     {{"name": "Specific item name", "price": 150, "category": "Specific category"}},
     {{"name": "Specific item name", "price": 60, "category": "Specific category"}},
     {{"name": "Specific item name", "price": 210, "category": "Specific category"}}
  ]
}}"""

    models = ["openai/gpt-4o-mini", "qwen/qwen-2.5-72b-instruct"]
    for model_name in models:
        try:
            req_data = {
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.5,
                "response_format": {"type": "json_object"}
            }
            req_body = json.dumps(req_data).encode("utf-8")
            h_req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=req_body,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "Kayanova AI Studio"
                },
                method="POST"
            )
            with urllib.request.urlopen(h_req, timeout=16) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                content = res_data["choices"][0]["message"]["content"]
                clean_json = re.sub(r"^```json\s*|\s*```$", "", content, flags=re.MULTILINE).strip()
                parsed = json.loads(clean_json)
                if parsed.get("menuItems") and len(parsed["menuItems"]) > 0:
                    return parsed
                elif parsed.get("tagline") or parsed.get("role"):
                    parsed["menuItems"] = fallback_items
                    return parsed
        except Exception as e:
            print(f"[Generate Profile] Model {model_name} failed: {e}")
            continue

    return {
        "tagline": f"The Premier Destination for {category}" if is_english else f"الوجهة الرائدة في عالم {category}",
        "role": f"Customer Concierge & Sales Specialist" if is_english else f"مستشار خدمة العملاء وتأكيد الطلبات",
        "welcomeMessage": f"Welcome to {brand_name}! How can I assist you today?" if is_english else f"أهلاً بحضرتك في {brand_name}! يسعدني خدمتك ومساعدتك في أي استفسار أو طلب.",
        "instructions": "1. Greet customer politely.\n2. Accurately provide pricing.\n3. Collect phone and address.\n4. Confirm delivery details." if is_english else "1. الترحيب الودود بالعميل.\n2. توضيح تفاصيل الأصناف والأسعار بدقة.\n3. تسجيل بيانات التوصيل ورقم الهاتف.\n4. الالتزام بالأصناف المسجلة فقط.",
        "menuItems": fallback_items
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
