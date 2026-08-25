import os
import re
import json
import uuid
import urllib.request
from datetime import datetime
from dotenv import load_dotenv

# Ensure environment variables are loaded
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
load_dotenv()

from database import get_db_connection

def format_arabic_reply_text(text: str) -> str:
    """
    Intelligently ensures Arabic agent responses are never a single block of text.
    Converts comma-separated catalogs/menus into clean, bolded Markdown bullet points.
    Supports both Eastern Arabic (Hindi) digits (٠-٩) and Western digits (0-9).
    """
    if not text:
        return text
    
    # Remove unicode emojis
    clean = re.sub(r'[\U00010000-\U0010ffff]', '', text).strip()
    
    # Check if reply contains price tokens with Arabic or Western numerals
    price_pattern = re.compile(r'([\u0660-\u06690-9,.]+\s*(?:جنيه مصري|ج\.م|جنيه|EGP|L\.E))', re.IGNORECASE)
    prices = price_pattern.findall(clean)
    
    # If the LLM returned multiple items separated by commas without newlines
    if (len(prices) >= 2 or "،" in clean) and "\n-" not in clean and "\n*" not in clean:
        if ":" in clean:
            colon_idx = clean.index(":")
            intro = clean[:colon_idx + 1].strip()
            rest = clean[colon_idx + 1:].strip()
            
            # Extract closing question / remarks if present
            closing = ""
            closing_match = re.search(
                r'((?:كل الأصناف|جميع الأصناف|تحب|حابب|هل تحب|هل ترغب|تحبي|يسعدنا|لأي استفسار)[^]*?[؟?.!])$',
                rest
            )
            if closing_match:
                closing = closing_match.group(1).strip()
                rest = rest[:closing_match.start()].strip()
            
            # Split items by Arabic comma (،) or Latin comma (,)
            items = re.split(r'[،,]', rest)
            formatted_bullets = []
            for item in items:
                item_clean = item.strip().rstrip(".").strip()
                item_clean = re.sub(r'^(?:و|أو)\s+', '', item_clean)
                if item_clean:
                    # Match item name and price
                    m = re.search(r'^(.*?)\s*([\u0660-\u06690-9,.]+\s*(?:جنيه مصري|ج\.م|جنيه|EGP|L\.E))\b(.*)$', item_clean, re.IGNORECASE)
                    if m:
                        name_p = m.group(1).strip().lstrip("-*•").strip()
                        price_p = m.group(2).strip()
                        extra_p = m.group(3).strip()
                        if name_p:
                            formatted_bullets.append(f"- **{name_p}**: {price_p} {extra_p}".strip())
                        else:
                            formatted_bullets.append(f"- {item_clean}")
                    else:
                        formatted_bullets.append(f"- {item_clean}")
            
            if len(formatted_bullets) >= 2:
                rebuilt = f"{intro}:\n\n" + "\n".join(formatted_bullets)
                if closing:
                    rebuilt += f"\n\n{closing}"
                return rebuilt

    # Ensure sentence spacing if no newlines exist in long text
    if "\n" not in clean and len(clean) > 80:
        clean = re.sub(r'([!؟\.])\s+(?=[^\d])', r'\1\n\n', clean)

    return clean

def get_human_conversational_directive(has_history: bool, brand_name: str) -> str:
    if has_history:
        greeting_rule = """- ⚠️ ONGOING CONVERSATION RULE (محادثة مستمرة):
  * The customer is already chatting with you. DO NOT say "أهلاً يا فندم" or "نورتنا" or "مرحباً".
  * DO NOT introduce the company name again.
  * Jump DIRECTLY into answering their exact question with human warmth and practical clarity."""
    else:
        greeting_rule = """- 🌟 FIRST MESSAGE GREETING:
  * Give a brief, authentic, friendly opening without robotic corporate filler."""

    return f"""### 🚨 MANDATORY 100% REAL HUMAN PERSONA (محاكاة إنسانية طبيعية 100%):
1. YOU ARE A REAL HUMAN TEAM SPECIALIST:
   - You are a real, experienced human customer specialist and sales expert at "{brand_name}".
   - NEVER admit, mention, or hint at being an AI, bot, language model, or automated system under any circumstances.
   - If asked: "أنت ذكاء اصطناعي؟" or "أنت بوت؟", answer like a real human: "لا يا فندم أنا معاك من فريق خدمة العملاء والمبيعات في {brand_name}، تحت أمرك في أي استفسار!"

2. NO REPETITIVE GREETINGS & ZERO ROBOTIC FORMULAS:
{greeting_rule}
   - NEVER repeat the same greeting in every response.
   - Do NOT overuse "يا فندم" repeatedly in every sentence. Vary your speech naturally ("حضرتك", "معاك", "تمام", "أكيد", "من عيوني", "ولا يهمك").

3. NATURAL CONVERSATIONAL FLOW & WHATSAPP PACING:
   - Write like a smart, helpful human writing on WhatsApp or live chat, not like a formal printed catalog or advertising brochure.
   - Be clear, practical, punchy, and helpful.
   - Always conclude with a natural, conversational question to understand their needs (e.g. asking about their project status, specific requirements, or preferred next step)."""

def get_dialect_prompt_instruction(dialect: str, brand_name: str = "") -> str:
    d_lower = (dialect or "").lower()
    
    if "gulf" in d_lower or "saudi" in d_lower or "خليج" in d_lower or "سعود" in d_lower:
        return f"""### DIALECT: AUTHENTIC GULF ARABIC (اللهجة الخليجية البيضاء الطبيعية)
- MUST speak like an authentic, hospitable, and refined Gulf team specialist.
- Natural vocabulary: "أبشر بعزك", "سم وتدلل", "حاضرين ومن عيونا", "يا هلا فيك", "تفضل يالغالي", "ولا تشيل هم", "شلون نقدر نخدمك اليوم؟".
- Avoid stiff classical words. Speak with natural warmth and modern Gulf hospitality."""

    elif "standard" in d_lower or "fusha" in d_lower or "فصح" in d_lower:
        return f"""### DIALECT: MODERN STANDARD ARABIC (العربية الفصحى المعاصرة الراقية)
- Speak in clear, modern, and engaging standard Arabic suitable for professional business.
- Avoid ancient archaic words or robotic phrasing."""

    elif "bilingual" in d_lower or "مزدوج" in d_lower or "فرانكو" in d_lower or "franco" in d_lower:
        return f"""### DIALECT: BILINGUAL ARABIC & ENGLISH (مزدوج عربي وإنجليزي طبيعي)
- Seamlessly adapt to the customer's language.
- If the customer writes in Arabic: Respond in natural Egyptian Arabic using popular business/marketing terms naturally.
- If the customer writes in English: Respond in native, highly polished professional English."""

    elif "english" in d_lower or "إنجليز" in d_lower:
        return f"""### DIALECT: FLUENT GLOBAL ENGLISH (HUMAN CONVERSATIONAL)
- Speak in natural, engaging, native professional English.
- Avoid robotic corporate templates; speak directly like an expert team consultant."""

    else:
        # Default & Egyptian Arabic
        return f"""### DIALECT: NATURAL EGYPTIAN ARABIC (العامية المصرية الحقيقية كبني آدم)
- MUST speak in 100% natural, everyday Egyptian Arabic as spoken by top professional sales and customer support specialists in Cairo/Egypt.
- Natural phrasing examples:
  * "بص يا فندم، الموضوع باختصار..."
  * "أكيد طبعاً، بالنسبة لـ..."
  * "تمام جداً، تحت أمرك"
  * "حاضر من عيني، ده بيشمل..."
  * "متقلقش خالص، بنرتبها سوا"
  * "الموقع بتاعكم شغال حالياً ولا لسه في مرحلة التجهيز؟"
- STRICTLY FORBIDDEN:
  * NEVER use robotic textbook phrases like: "نحن نقدم لكم أحدث الحلول الرقمية لتنمية وتطوير أعمالكم..."
  * NEVER repeat "أهلاً يا فندم نورتنا" في كل رسالة."""

def get_tone_prompt_instruction(tone: str) -> str:
    t_lower = (tone or "").lower()
    if "friend" in t_lower or "ودود" in t_lower:
        return "- TONE: Warm, energetic, helpful, and genuinely caring like a trusted colleague."
    elif "profess" in t_lower or "رسمي" in t_lower or "احتر" in t_lower:
        return "- TONE: Highly consultative, articulate, structured, and polite."
    elif "luxur" in t_lower or "فاخر" in t_lower or "راق" in t_lower:
        return "- TONE: Prestigious, refined, elite concierge etiquette."
    elif "casual" in t_lower or "عفو" in t_lower or "سريع" in t_lower:
        return "- TONE: Fast, direct, friendly, and practical without fluff."
    else:
        return "- TONE: Natural, friendly, helpful, and professional."

def run_agent_chat(agent_config: dict = None, user_message: str = "", history: list = None, session_id: str = "default", brand_id: str = None) -> dict:
    if history is None:
        history = []

    if agent_config is None:
        agent_config = {}

    target_brand_id = brand_id or agent_config.get("id") or agent_config.get("brandId")

    # If config lacks name or menuItems, try loading from DB using target_brand_id
    if target_brand_id and (not agent_config.get("name") or not agent_config.get("menuItems")):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            if not agent_config.get("name"):
                cursor.execute("SELECT * FROM brands WHERE id = ?", (target_brand_id,))
                row = cursor.fetchone()
                if row:
                    row_dict = dict(row)
                    contact_info = {
                        "phone": row_dict.get("contact_phone", ""),
                        "address": row_dict.get("contact_address", ""),
                        "workingHours": row_dict.get("contact_hours", "")
                    }
                    agent_config = {
                        "id": row_dict.get("id"),
                        "name": row_dict.get("name"),
                        "category": row_dict.get("category"),
                        "role": row_dict.get("role"),
                        "tone": row_dict.get("tone"),
                        "dialect": row_dict.get("dialect"),
                        "llmModel": row_dict.get("llm_model"),
                        "description": row_dict.get("description"),
                        "productsServices": row_dict.get("products_services"),
                        "instructions": row_dict.get("instructions"),
                        "contactInfo": contact_info
                    }
            if not agent_config.get("menuItems"):
                cursor.execute("SELECT * FROM menu_items WHERE brand_id = ?", (target_brand_id,))
                m_rows = cursor.fetchall()
                if m_rows:
                    agent_config["menuItems"] = [
                        {"id": m["id"], "name": m["name"], "price": float(m["price"]), "category": m["category"], "description": m["description"], "available": bool(m["available"])}
                        for m in m_rows
                    ]
            conn.close()
        except Exception as e:
            print(f"[Agent Runner] DB load error: {e}")

    brand_id = agent_config.get("id") or agent_config.get("brandId") or "brand-default"
    name = agent_config.get("name") or "الوكيل الذكي"
    category = agent_config.get("category") or "General Business"
    role = agent_config.get("role") or "Senior Business Consultant"
    dialect = agent_config.get("dialect") or "Egyptian Arabic (اللهجة المصرية)"
    tone = agent_config.get("tone") or "Friendly & Professional"
    tagline = agent_config.get("tagline") or ""
    description = agent_config.get("description") or ""
    instructions = agent_config.get("instructions") or agent_config.get("promptRules") or ""
    
    contact_info = agent_config.get("contactInfo") or {}
    phone = contact_info.get("phone") or agent_config.get("phone") or agent_config.get("contact_phone") or ""
    address = contact_info.get("address") or agent_config.get("address") or agent_config.get("contact_address") or ""
    hours = contact_info.get("workingHours") or contact_info.get("hours") or agent_config.get("hours") or agent_config.get("contact_hours") or ""

    is_english = "english" in dialect.lower() or agent_config.get("language") == "English"
    is_saudi_or_gulf = any(k in dialect.lower() for k in ["saudi", "gulf", "سعود", "خليج"])
    if is_english:
        currency_label = "EGP"
    elif is_saudi_or_gulf:
        currency_label = "ريال سعودي"
    else:
        currency_label = "جنيه مصري"

    menu_items = agent_config.get("menuItems") or []
    if menu_items:
        catalog_lines = ["Official Catalog of Services & Products with Exact Pricing:"]
        for item in menu_items:
            i_name = item.get("name") if isinstance(item, dict) else getattr(item, "name", "")
            i_price = item.get("price") if isinstance(item, dict) else getattr(item, "price", 0)
            i_cat = item.get("category") if isinstance(item, dict) else getattr(item, "category", "")
            i_desc = item.get("description") if isinstance(item, dict) else getattr(item, "description", "")
            desc_str = f" - {i_desc}" if i_desc else ""
            catalog_lines.append(f"- **{i_name}**: {i_price} {currency_label} ({i_cat}){desc_str}")
        knowledge_base = "\n".join(catalog_lines)
    else:
        knowledge_base = (
            agent_config.get("knowledgeBase") or
            agent_config.get("productsServices") or
            description or
            ""
        )

    has_history = len([m for m in history if m.get("role") in ["user", "assistant"]]) > 0
    human_directive = get_human_conversational_directive(has_history, name)
    dialect_directive = get_dialect_prompt_instruction(dialect, name)
    tone_directive = get_tone_prompt_instruction(tone)

    api_key = os.getenv("OPENROUTER_API_KEY")

    composed_system = f"""You are an authentic, experienced human customer specialist and sales team member representing "{name}".
Role: {role}
Category / Industry: {category}
Dialect / Accent: {dialect}
Tone: {tone}
Tagline: {tagline}
About / Description: {description}
Branch / Location: {address or ('Riyadh, KSA' if is_saudi_or_gulf else 'Cairo, Egypt')}
Working & Delivery Hours: {hours or ('10:00 AM - 12:00 AM')}
Contact Number: {phone or ('0500000000' if is_saudi_or_gulf else '01000000000')}

{human_directive}

{dialect_directive}
{tone_directive}

Live Brand Knowledge Base, Menu, Services & Exact Pricing:
{knowledge_base}

### 🚨 BRAND OPERATIONAL RULES & CUSTOM POLICIES (قواعد وتشغيل البراند وسياساته المعتمدة):
{instructions.strip() if instructions.strip() else "- تقديم خدمات ومنتجات البراند بالأسعار الرسمية المعتمدة والتأكيد على بيانات الطلب."}

CORE OPERATIONAL BEHAVIOR:
1. Brand Rules Priority: The brand's custom operational rules and policies above are MANDATORY and strictly dictate your behavior. Follow all conditions, policies (returns/exchanges/payment/data collection), and instructions defined therein.
2. Natural Conversational Style: Speak 100% like an authentic, helpful human writing on WhatsApp in {dialect}. NEVER sound robotic or generic.
3. Identity & Role: If asked who you are, explain what "{name}" offers warmly and naturally, and ask how you can help.
4. Ongoing Chat Etiquette: NEVER repeat greetings if you are already in an ongoing conversation.
5. Strict Pricing Adherence: Strictly quote listed products/services and exact prices from the catalog using "{currency_label}". Never invent fake items or discounts unless allowed by brand rules.
6. Zero Emojis: Do NOT output emojis in your reply. Keep the text clean, elegant, and professional.
7. Clean Markdown: Put catalog items on clear bullet points (**اسم الصنف**: السعر {currency_label}) and format paragraphs with clean spacing.
8. Order & Booking Handling:
   - When a customer wants to place an order or book a service, adhere to any prerequisite conditions or required details specified in the brand's operational rules.
   - If required details or conditions are missing, politely ask the customer for what is needed and set `"extracted_order": null`.
   - Once all required details and brand conditions are satisfied, confirm the order summary and total in your reply, and provide the structured order in `"extracted_order"`.

Always respond in a single valid JSON object matching this schema:
{{
  "reply": "Your natural, helpful, beautifully formatted Markdown response in {dialect}",
  "extracted_order": {{
     "has_order": true,
     "customer_name": "Customer name if known or 'عميل الوكيل'",
     "customer_phone": "Customer phone if provided, or ''",
     "items": ["اسم الصنف أو الخدمة والكمية"],
     "numeric_total": 0.0,
     "total_amount": "المبلغ الإجمالي مع {currency_label}",
     "order_type": "Delivery" or "Pickup" or "Booking" or "General",
     "delivery_address": "Customer address if provided, or ''",
     "payment_method": "Payment method if determined, or ''"
  }} or null,
  "extracted_lead": {{
     "customer_name": "Customer name if mentioned",
     "customer_phone": "Customer phone if mentioned",
     "email": "Customer email if mentioned",
     "intent": "Summary of customer request"
  }}
}}"""

    messages = [{"role": "system", "content": composed_system}]

    for msg in history[-8:]:
        r = msg.get("role", "user")
        c = msg.get("content", "")
        if r in ["user", "assistant"] and c:
            messages.append({"role": r, "content": c})

    messages.append({"role": "user", "content": user_message})

    reply_text = ""
    extracted_order = None
    extracted_lead = None

    chosen_model = agent_config.get("llmModel") or agent_config.get("model") or "google/gemini-3.7-flash"
    
    # Build models to try: chosen model first, then the remaining approved high-performance models
    approved_models = ["google/gemini-3.7-flash", "qwen/qwen3.7-plus", "openai/gpt-4o-mini"]
    models_to_try = [chosen_model]
    for m in approved_models:
        if m not in models_to_try:
            models_to_try.append(m)

    if api_key:
        for model_name in models_to_try:
            try:
                req_data = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": 0.5,
                    "max_tokens": 1200,
                }
                # Add response_format json for models that support it natively
                if "gpt-4o" in model_name or "mini" in model_name:
                    req_data["response_format"] = {"type": "json_object"}

                req_body = json.dumps(req_data).encode("utf-8")
                req = urllib.request.Request(
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
                with urllib.request.urlopen(req, timeout=16) as response:
                    res_data = json.loads(response.read().decode("utf-8"))
                    msg_obj = res_data["choices"][0]["message"]
                    raw_content = (msg_obj.get("content") or "").strip()
                    
                    if not raw_content and msg_obj.get("reasoning"):
                        # If model only returned reasoning due to format constraint
                        raw_content = msg_obj.get("reasoning", "").strip()

                    if raw_content:
                        # Strip markdown backticks
                        clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_content, flags=re.MULTILINE).strip()
                        try:
                            # Try parsing as JSON
                            parsed = json.loads(clean_json)
                            reply_text = parsed.get("reply", clean_json)
                            extracted_order = parsed.get("extracted_order")
                            extracted_lead = parsed.get("extracted_lead")
                        except Exception:
                            # If model returned direct conversational text
                            reply_text = clean_json

                        if reply_text:
                            # Format bullets nicely and exit loop
                            reply_text = format_arabic_reply_text(reply_text)
                            break
            except Exception as e:
                print(f"[Agent Runner] OpenRouter {model_name} error: {e}")
                continue

    if not reply_text:
        lower_msg = user_message.lower().strip()
        is_greeting = any(w in lower_msg for w in ["hello", "hi", "hey", "أهلا", "أهلاً", "اهلا", "ازيك", "ازيكم", "سلام", "صباح", "مساء", "هاي"])
        is_who_are_you = any(w in lower_msg for w in ["مين انتوا", "انتوا مين", "بتعملوا ايه", "من انتم", "من انت", "عرفني", "تفاصيل عنكم", "who are you"])

        if is_who_are_you:
            desc_text = description or (f"تقديم أرقى خدمات ومنتجات الـ {category}")
            reply_text = f"أهلاً بحضرتك! إحنا **{name}**\n\n{tagline or desc_text}\n\nمتخصصين في خدمة عملائنا وتقديم أفضل تجربة بأعلى جودة. يسعدنا جداً مساعدتك في معرفة قائمة الأسعار، حجز موعد، أو تسجيل طلب دليفري."
        elif is_greeting:
            reply_text = f"أهلاً وسهلاً بحضرتك في **{name}**!\n\nيسعدني جداً خدمتك اليوم. تحب تستفسر عن المنيو والأسعار المتاحة، العناوين ومواعيد العمل، أو نسجل لحضرتك طلب دليفري سريع؟"
        elif any(w in lower_msg for w in ["منيو", "menu", "اسعار", "أسعار", "قائمة", "اصناف", "منتجات", "خدمات"]):
            if knowledge_base:
                reply_text = f"أهلاً بحضرتك في **{name}**!\n\nإليك تفاصيل القائمة والخدمات المتاحة لدينا:\n\n{knowledge_base}\n\nتحب نسجل لحضرتك أي طلب أو استفسار؟"
            else:
                reply_text = f"أهلاً بحضرتك في **{name}**!\n\nيسعدنا خدمتك، يمكنك إخبارنا بالطلب أو الخدمة التي ترغب بها وسنكون سعداء بمساعدتك."
        elif any(w in lower_msg for w in ["عنوان", "موقع", "فرع", "مكان", "مواعيد", "ساعات", "اتصال", "تواصل"]):
            contact_parts = []
            if address:
                contact_parts.append(f"- **العنوان**: {address}")
            if hours:
                contact_parts.append(f"- **مواعيد العمل**: {hours}")
            if phone:
                contact_parts.append(f"- **رقم التواصل**: {phone}")
            
            if contact_parts:
                reply_text = f"أهلاً بحضرتك في **{name}**!\n\nبيانات التواصل والفروع:\n\n" + "\n".join(contact_parts) + "\n\nتحب نساعدك في أي حجز أو استفسار؟"
            else:
                reply_text = f"أهلاً بحضرتك في **{name}**!\n\nيسعدنا تواصلك معنا، كيف يمكننا مساعدتك اليوم؟"
        else:
            reply_text = f"أهلاً بحضرتك في **{name}**!\n\nيسعدني خدمتك ومساعدتك في كل ما يخص منتجاتنا وخدماتنا. كيف يمكنني خدمتك اليوم؟"

    # Normalize reply formatting and clean emojis
    reply_text = format_arabic_reply_text(reply_text)

    # Persist extracted order into DB if found
    saved_order_id = None
    if extracted_order and extracted_order.get("has_order"):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            now_iso = datetime.now().isoformat()

            # Ensure brand exists in SQLite brands table to satisfy foreign keys
            cursor.execute("SELECT id FROM brands WHERE id = ?", (brand_id,))
            if not cursor.fetchone():
                cursor.execute("""
                INSERT OR IGNORE INTO brands (
                    id, name, category, role, tone, language, dialect, llm_model,
                    description, welcome_message, instructions, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    brand_id, name, category, role, tone,
                    "English" if is_english else "Arabic", dialect, chosen_model,
                    description, tagline, instructions, now_iso, now_iso
                ))
                conn.commit()

            order_id = f"ord-{uuid.uuid4().hex[:6]}"
            cust_name = extracted_order.get("customer_name") or "عميل الوكيل"
            cust_phone = extracted_order.get("customer_phone") or "01000000000"
            items_list = extracted_order.get("items") or [user_message]
            num_total = float(extracted_order.get("numeric_total") or 0)
            tot_amount = extracted_order.get("total_amount") or f"{int(num_total)} ج.م"
            ord_type = extracted_order.get("order_type") or "Delivery"
            del_addr = extracted_order.get("delivery_address") or ""

            cursor.execute("""
            INSERT INTO orders (id, brand_id, customer_name, customer_phone, items, numeric_total, total_amount, order_type, delivery_address, status, timestamp, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', 'الآن', ?)
            """, (order_id, brand_id, cust_name, cust_phone, json.dumps(items_list, ensure_ascii=False), num_total, tot_amount, ord_type, del_addr, now_iso))

            # Upsert contact in SQLite (deduplicate by phone and brand)
            cursor.execute("SELECT id, total_orders_count, total_spent FROM contacts WHERE customer_phone = ? AND customer_phone != '' AND brand_id = ?", (cust_phone, brand_id))
            existing_contact = cursor.fetchone()

            if existing_contact:
                prev_orders = int(existing_contact["total_orders_count"] or 0)
                prev_spent = float(existing_contact["total_spent"] or 0)
                cursor.execute("""
                UPDATE contacts SET
                    customer_name = ?, intent = ?, stage = 'Converted',
                    total_orders_count = ?, total_spent = ?, last_contact_at = ?
                WHERE id = ?
                """, (
                    cust_name,
                    f"طلب أوردر: {', '.join(items_list[:2])}",
                    prev_orders + 1,
                    prev_spent + num_total,
                    now_iso,
                    existing_contact["id"]
                ))
            else:
                contact_id = f"cont-{uuid.uuid4().hex[:6]}"
                cursor.execute("""
                INSERT INTO contacts (id, brand_id, customer_name, customer_phone, channel, intent, stage, total_orders_count, total_spent, last_contact_at, created_at)
                VALUES (?, ?, ?, ?, 'web', ?, 'Converted', 1, ?, ?, ?)
                """, (contact_id, brand_id, cust_name, cust_phone, f"طلب أوردر: {', '.join(items_list[:2])}", num_total, now_iso, now_iso))

            conn.commit()
            conn.close()
            saved_order_id = order_id
        except Exception as e:
            print(f"[Agent Runner] Failed to persist extracted order: {e}")

    return {
        "reply": reply_text,
        "extracted_order": extracted_order,
        "extracted_lead": extracted_lead,
        "saved_order_id": saved_order_id
    }

run_agent_turn = run_agent_chat

