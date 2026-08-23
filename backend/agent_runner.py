import os
import re
import json
import uuid
import urllib.request
from datetime import datetime
from dotenv import load_dotenv

# Ensure environment variables are loaded
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

def get_dialect_prompt_instruction(dialect: str, brand_name: str = "") -> str:
    d_lower = (dialect or "").lower()
    
    if "gulf" in d_lower or "saudi" in d_lower or "خليج" in d_lower or "سعود" in d_lower:
        return f"""### DIALECT DIRECTIVE: GULF ARABIC (اللهجة الخليجية البيضاء الراقية)
- MUST speak in authentic, polite, and respectful Gulf / Saudi Arabic (اللهجة الخليجية البيضاء).
- Phrases and terms to ALWAYS use:
  * "يا هلا والله ومسهلا" / "حياك الله طال عمرك" / "سم وتدلل" / "أبشر بعزك" / "حاضرين ومن عيونا" / "شلون نقدر نخدمك اليوم؟" / "يوصلك لين باب بيتك" / "تفضل يالغالي" / "عسى يومك سعيد ومبارك".
- Strictly avoid Egyptian or Levantine slang when Gulf dialect is selected. Maintain a warm, highly hospitable Gulf service attitude."""

    elif "standard" in d_lower or "fusha" in d_lower or "فصح" in d_lower:
        return f"""### DIALECT DIRECTIVE: MODERN STANDARD ARABIC (اللغة العربية الفصحى المعاصرة)
- MUST speak in clear, elegant, and eloquent Modern Standard Arabic (العربية الفصحى السليمة).
- Use professional, articulate vocabulary suitable for corporate, medical, and executive business communication.
- Example phrases: "أهلاً ومرحباً بك في {brand_name}" / "يسعدنا خدمتكم والإجابة عن كافة استفساراتكم" / "كيف نستطيع مساندتكم اليوم؟" / "تتوفر لدينا الخيارات والخدمات التالية...".
- Avoid regional colloquialisms."""

    elif "bilingual" in d_lower or "مزدوج" in d_lower or "فرانكو" in d_lower or "franco" in d_lower:
        return f"""### DIALECT DIRECTIVE: BILINGUAL ARABIC & ENGLISH (مزدوج عربي وإنجليزي)
- Seamlessly adapt to the customer's preferred communication style.
- If the customer writes in Arabic: Reply in fluent Egyptian Arabic with natural English business/industry terminology where helpful.
- If the customer writes in English: Reply in native, polished professional English.
- If the customer writes in Franco/Arabizi: Respond in friendly Egyptian Arabic or clear English."""

    elif "english" in d_lower or "إنجليز" in d_lower:
        return f"""### DIALECT DIRECTIVE: ENGLISH (GLOBAL PROFESSIONAL)
- MUST speak in fluent, native, engaging professional English.
- Use warm, concise, and customer-first phrasing: "Welcome to {brand_name}! How can I assist you today? We're thrilled to help you."
- Zero Arabic words unless explicitly referencing a specific local brand name."""

    else:
        # Default & Egyptian Arabic
        return f"""### DIALECT DIRECTIVE: EGYPTIAN ARABIC (العامية المصرية الحقيقية اليومية)
- MUST speak in 100% genuine, natural, modern Egyptian Arabic (العامية المصرية الحقيقية المستخدمة في مصر يومياً في بيئة الأعمال والخدمات).
- Vocabulary & Phrasings to ALWAYS use:
  * "أهلاً بيك / نورتنا يا فندم"
  * "تمام جداً / تحت أمرك"
  * "حاضر من عيني / تفضل حضرتك"
  * "تشرفنا بيك / إزاي أقدر أساعدك؟"
  * "متاح عندنا / يوصلك في أسرع وقت"
  * "دليفري أو استلام / متقلقش خالص"
  * "كل الأصناف فريش وطازة / يومك جميل وسعيد".
- Vocabulary & Phrasings to STRICTLY FORBID:
  * NEVER use stiff, robotic Classical Arabic (الفصحى المعقدة مثل: "مرحباً بك! كيف يمكنني مساعدتك اليوم؟ نحن نقدم لكم أرقى المنتجات..." أو "سوف أقوم بتسجيل طلبكم").
  * Instead say naturally: "أهلاً بحضرتك! منورنا في {brand_name}، تحب تطلب إيه أو تستفسر عن إيه النهاردة؟"
- Keep the style respectful, warm, cheerful, and unmistakably Egyptian."""

def get_tone_prompt_instruction(tone: str) -> str:
    t_lower = (tone or "").lower()
    if "friend" in t_lower or "ودود" in t_lower:
        return "- TONE: Extremely warm, welcoming, energetic, and engaging. Make the customer feel like a valued VIP guest with cheerful hospitality."
    elif "profess" in t_lower or "رسمي" in t_lower or "احتر" in t_lower:
        return "- TONE: Highly professional, structured, articulate, polite, and consultative."
    elif "luxur" in t_lower or "فاخر" in t_lower or "راق" in t_lower:
        return "- TONE: Sophisticated, prestigious, high-end VIP concierge etiquette with refined elegance."
    elif "casual" in t_lower or "عفو" in t_lower or "سريع" in t_lower:
        return "- TONE: Casual, direct, fast, punchy, and helpful without unnecessary fluff."
    else:
        return "- TONE: Friendly, helpful, clear, and professional."

def run_agent_chat(agent_config: dict = None, user_message: str = "", history: list = None, session_id: str = "default", brand_id: str = None) -> dict:
    if history is None:
        history = []

    if agent_config is None:
        agent_config = {}

    target_brand_id = brand_id or agent_config.get("id") or agent_config.get("brandId")

    # If config lacks name, try loading from DB using target_brand_id
    if (not agent_config.get("name")) and target_brand_id:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
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
                    "description": row_dict.get("description"),
                    "productsServices": row_dict.get("products_services"),
                    "instructions": row_dict.get("instructions"),
                    "contactInfo": contact_info
                }
            conn.close()
        except Exception as e:
            print(f"[Agent Runner] DB load error: {e}")

    name = agent_config.get("name") or "الوكيل الذكي"
    category = agent_config.get("category") or "General Business"
    role = agent_config.get("role") or "Senior Business Consultant"
    dialect = agent_config.get("dialect") or "Egyptian Arabic (اللهجة المصرية)"
    tone = agent_config.get("tone") or "Friendly & Professional"
    tagline = agent_config.get("tagline") or ""
    description = agent_config.get("description") or ""
    knowledge_base = (
        agent_config.get("knowledgeBase") or
        agent_config.get("productsServices") or
        description or
        ""
    )
    instructions = agent_config.get("instructions") or agent_config.get("promptRules") or ""
    
    contact_info = agent_config.get("contactInfo") or {}
    phone = contact_info.get("phone") or agent_config.get("phone") or agent_config.get("contact_phone") or ""
    address = contact_info.get("address") or agent_config.get("address") or agent_config.get("contact_address") or ""
    hours = contact_info.get("workingHours") or contact_info.get("hours") or agent_config.get("hours") or agent_config.get("contact_hours") or ""

    is_english = "english" in dialect.lower() or agent_config.get("language") == "English"
    currency_label = "EGP" if is_english else "جنيه مصري"

    # Include structured menu items in knowledge base if present
    menu_items = agent_config.get("menuItems") or []
    if menu_items:
        menu_text = "\nStructured Catalog & Official Prices:\n"
        for item in menu_items:
            i_name = item.get("name") if isinstance(item, dict) else getattr(item, "name", "")
            i_price = item.get("price") if isinstance(item, dict) else getattr(item, "price", 0)
            i_cat = item.get("category") if isinstance(item, dict) else getattr(item, "category", "")
            menu_text += f"- {i_name}: {i_price} {currency_label} ({i_cat})\n"
        knowledge_base = f"{knowledge_base}\n{menu_text}".strip()

    dialect_directive = get_dialect_prompt_instruction(dialect, name)
    tone_directive = get_tone_prompt_instruction(tone)

    api_key = os.getenv("OPENROUTER_API_KEY")

    composed_system = f"""You are the official conversational AI representative and business concierge for "{name}".
Role: {role}
Category / Industry: {category}
Dialect / Accent: {dialect}
Tone: {tone}
Tagline: {tagline}
About / Description: {description}
Branch / Location: {address or ('Cairo, Egypt' if not is_english else 'Cairo, Egypt')}
Working & Delivery Hours: {hours or ('10:00 AM - 12:00 AM')}
Contact Number: {phone or '01000000000'}

{dialect_directive}
{tone_directive}

Live Brand Knowledge Base, Menu, Services & Exact Pricing:
{knowledge_base}

Special Directives & Operational Rules:
{instructions}

CORE BEHAVIOR RULES:
1. Speak naturally and authentically adhering strictly to the DIALECT DIRECTIVE above. Do NOT sound like a generic robot.
2. If the user asks who you are ("مين انتوا؟", "انتوا مين؟", "بتعملوا ايه؟"), introduce "{name}" warmly in the required dialect, explain what you specialize in, mention key services/products, and ask how you can help them.
3. If the user greets ("Hello", "Hi", "أهلاً", "ازيك", "صباح الخير", "مساء الخير"), reply with a polite, engaging welcome representing "{name}".
4. Strictly adhere to listed menu items and exact prices. Never invent fake items or incorrect prices.
5. Price & Currency Quoting:
   - If responding in Arabic: Always quote prices with "جنيه مصري" (e.g. 150 جنيه مصري).
   - If responding in English: Always quote prices with "EGP" (e.g. 150 EGP).
6. Zero Emojis: Do NOT output any emojis in your reply. Use pure, elegant professional text.
7. Clean Markdown Formatting:
   - When listing products, items, options, or pricing, ALWAYS put each item on its own bullet point line:
     - **اسم الصنف أو الخدمة**: السعر {currency_label}
   - Separate paragraphs with double newlines (\\n\\n).
8. If a customer provides order items, quantities, delivery address, or phone, confirm the details in the designated dialect, compute the exact total in {currency_label}, and extract the structured order.

Always respond in a single valid JSON object matching this schema:
{{
  "reply": "Your natural, helpful, beautifully formatted Markdown response in {dialect}",
  "extracted_order": {{
     "has_order": true,
     "customer_name": "Customer name if known or 'عميل الوكيل'",
     "customer_phone": "Customer phone if provided, or ''",
     "items": ["2 سبانش لاتيه بارد", "1 كرواسون نوتيلا"],
     "numeric_total": 210,
     "total_amount": "210 {currency_label}",
     "order_type": "Delivery" or "Pickup" or "Dine-In" or "Medical Booking",
     "delivery_address": "Customer address if provided, or ''",
     "payment_method": "دفع عند الاستلام"
  }} or null,
  "extracted_lead": {{
     "customer_name": "Customer name if mentioned",
     "customer_phone": "Customer phone if mentioned",
     "email": "Customer email if mentioned",
     "intent": "Summary of customer topic / request",
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
            order_id = f"ord-{uuid.uuid4().hex[:6]}"
            cust_name = extracted_order.get("customer_name") or "عميل الوكيل"
            cust_phone = extracted_order.get("customer_phone") or "01000000000"
            items_list = extracted_order.get("items") or [user_message]
            num_total = float(extracted_order.get("numeric_total") or 0)
            tot_amount = extracted_order.get("total_amount") or f"{int(num_total)} ج.م"
            ord_type = extracted_order.get("order_type") or "Delivery"
            del_addr = extracted_order.get("delivery_address") or ""
            now_iso = datetime.now().isoformat()

            cursor.execute("""
            INSERT INTO orders (id, brand_id, customer_name, customer_phone, items, numeric_total, total_amount, order_type, delivery_address, status, timestamp, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', 'الآن', ?)
            """, (order_id, brand_id, cust_name, cust_phone, json.dumps(items_list, ensure_ascii=False), num_total, tot_amount, ord_type, del_addr, now_iso))

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

