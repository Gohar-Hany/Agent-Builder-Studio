import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kayanova.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Brands Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon_type TEXT DEFAULT 'bot',
        tagline TEXT,
        category TEXT DEFAULT 'Restaurant',
        role TEXT DEFAULT 'Customer Support Representative',
        tone TEXT DEFAULT 'Friendly',
        language TEXT DEFAULT 'Arabic',
        dialect TEXT DEFAULT 'Egyptian Arabic',
        description TEXT,
        products_services TEXT,
        welcome_message TEXT,
        instructions TEXT,
        contact_phone TEXT,
        contact_address TEXT,
        contact_hours TEXT,
        creativity INTEGER DEFAULT 50,
        guardrails TEXT DEFAULT '["strict_pricing", "order_confirmation"]',
        created_at TEXT,
        updated_at TEXT
    );
    """)

    # 2. Menu / Catalog Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        brand_id TEXT NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT,
        description TEXT,
        available INTEGER DEFAULT 1,
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
    );
    """)

    # 3. Orders Table (Sales CRM)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        brand_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        items TEXT NOT NULL,
        numeric_total REAL DEFAULT 0,
        total_amount TEXT,
        order_type TEXT DEFAULT 'Delivery',
        delivery_address TEXT,
        payment_method TEXT DEFAULT 'دفع عند الاستلام',
        status TEXT DEFAULT 'New',
        notes TEXT,
        confidence INTEGER DEFAULT 95,
        timestamp TEXT,
        created_at TEXT,
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
    );
    """)

    # 4. Contacts Table (Customer Leads CRM)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        brand_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        email TEXT,
        channel TEXT DEFAULT 'whatsapp',
        intent TEXT DEFAULT 'Inquiry',
        stage TEXT DEFAULT 'New Lead',
        notes TEXT,
        total_orders_count INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0,
        last_contact_at TEXT,
        created_at TEXT,
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
    );
    """)

    # 5. Chat Messages History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        brand_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp TEXT,
        created_at TEXT,
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
    );
    """)

    # 6. Platform Leads & Deployment Requests Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS platform_leads (
        id TEXT PRIMARY KEY,
        session_id TEXT DEFAULT '',
        brand_id TEXT DEFAULT '',
        brand_name TEXT DEFAULT '',
        owner_name TEXT NOT NULL,
        owner_phone TEXT NOT NULL,
        business_name TEXT DEFAULT '',
        channels TEXT DEFAULT '["whatsapp"]',
        notes TEXT DEFAULT '',
        status TEXT DEFAULT 'New',
        created_at TEXT,
        updated_at TEXT
    );
    """)

    # Ensure missing columns in older DB files
    cursor.execute("PRAGMA table_info(brands);")
    b_cols = [r["name"] for r in cursor.fetchall()]
    if "guardrails" not in b_cols:
        cursor.execute("ALTER TABLE brands ADD COLUMN guardrails TEXT DEFAULT '[\"strict_pricing\", \"order_confirmation\"]';")
    if "llm_model" not in b_cols:
        cursor.execute("ALTER TABLE brands ADD COLUMN llm_model TEXT DEFAULT 'google/gemini-3.7-flash';")
    if "session_id" not in b_cols:
        cursor.execute("ALTER TABLE brands ADD COLUMN session_id TEXT DEFAULT '';")
    if "is_sample" not in b_cols:
        cursor.execute("ALTER TABLE brands ADD COLUMN is_sample INTEGER DEFAULT 0;")

    cursor.execute("PRAGMA table_info(orders);")
    o_cols = [r["name"] for r in cursor.fetchall()]
    if "numeric_total" not in o_cols:
        cursor.execute("ALTER TABLE orders ADD COLUMN numeric_total REAL DEFAULT 0;")
    if "session_id" not in o_cols:
        cursor.execute("ALTER TABLE orders ADD COLUMN session_id TEXT DEFAULT '';")

    cursor.execute("PRAGMA table_info(contacts);")
    c_cols = [r["name"] for r in cursor.fetchall()]
    if "session_id" not in c_cols:
        cursor.execute("ALTER TABLE contacts ADD COLUMN session_id TEXT DEFAULT '';")

    conn.commit()
    conn.close()

def seed_menu_items(conn):
    cursor = conn.cursor()
    cursor.executemany("""
    INSERT INTO menu_items (id, brand_id, name, price, category, description, available)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, [
        ("item-bv-1", "brand-bon-vanilla", "سبانش لاتيه بارد / ساخن", 85.0, "Beverages", "حليب مكثف + دبل إسبريسو كولومبي فاخر", 1),
        ("item-bv-2", "brand-bon-vanilla", "فلات وايت أسترالي", 75.0, "Beverages", "دبل ريستريتو مع حليب حريري ناعم", 1),
        ("item-bv-3", "brand-bon-vanilla", "آيسد كراميل ماكياتو", 90.0, "Beverages", "فانيليا كلاسيك مع صوص كراميل عضوي", 1),
        ("item-bv-4", "brand-bon-vanilla", "كولد برو كيني", 80.0, "Beverages", "منقوع على البارد 18 ساعة", 1),
        ("item-bv-5", "brand-bon-vanilla", "شوكليت كروكي", 95.0, "Bakery", "مزيج الكرواسون وعجينة الكوكيز الفاخرة", 1),
        ("item-bv-6", "brand-bon-vanilla", "سان سباستيان تشيز كيك", 110.0, "Bakery", "تشيز كيك محروق مع صوص شوكولاتة بلجيكي", 1),
        ("item-bv-7", "brand-bon-vanilla", "ساندوتش بريوش تركي مدخن", 115.0, "Food", "ديك رومي مدخن وجبنة إيمنتال سويسرية", 1),
    ])
    conn.commit()

def seed_contacts_data(conn):
    cursor = conn.cursor()
    now_iso = datetime.now().isoformat()
    seed_contacts = [
        ("cont-1", "brand-bon-vanilla", "كريم عبد العزيز", "01019827364", "karim.aziz@gmail.com", "whatsapp", "طلب 2 سبانش لاتيه وكروكي دليفري للمعادي", "Converted", "عميل VIP دائم يفضل القهوة سكر خفيف", 3, 620, now_iso, now_iso),
        ("cont-2", "brand-bon-vanilla", "نورهان الشافعي", "01228471920", "nourhan@outlook.com", "instagram", "استفسار عن حجز طاولة 4 أفراد بفرع زايد", "Qualified", "تواصلت عبر انستجرام لحجز عيد ميلاد", 1, 450, now_iso, now_iso),
        ("cont-3", "brand-bon-vanilla", "طارق الدسوقي", "01150493821", "tarek.desouky@yahoo.com", "web", "استفسار عن أسعار بوكس المخبوزات للشركات", "Contacted", "طلب عرض سعر لـ 20 بوكس لشركة بالتجمع", 0, 0, now_iso, now_iso),
        ("cont-4", "brand-pearl-dental", "د. ياسمين المرشدي", "01005544332", "dr.yasmine@gmail.com", "whatsapp", "حجز جلسة تبييض ليزر وفحص 3D شامل", "Converted", "تم تأكيد موعد الكشف والزيارة", 1, 3100, now_iso, now_iso),
        ("cont-5", "brand-pearl-dental", "م. أحمد شكري", "01198765432", "ahmed.shoukry@tech.co", "phone", "استشارة تقويم شفاف Invisalign بالتقسيط", "Qualified", "مهتم بخطة التقسيط لـ 18 شهر", 1, 25000, now_iso, now_iso),
        ("cont-6", "brand-urban-chic", "مريم الخولي", "01209384756", "mariam.kholy@icloud.com", "instagram", "استفسار عن مقاسات فستان الكتان الصيفي", "New Lead", "سألت عن جدول المقاسات والشحن لمدينة نصر", 0, 0, now_iso, now_iso),
    ]
    cursor.executemany("""
    INSERT INTO contacts (id, brand_id, customer_name, customer_phone, email, channel, intent, stage, notes, total_orders_count, total_spent, last_contact_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, seed_contacts)
    conn.commit()

def seed_initial_data(conn):
    cursor = conn.cursor()
    now_iso = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO brands (
        id, name, icon_type, tagline, category, role, tone, language, dialect,
        description, products_services, welcome_message, instructions,
        contact_phone, contact_address, contact_hours, creativity, guardrails, created_at, updated_at
    ) VALUES (
        'brand-bon-vanilla',
        'Bon & Vanilla Specialty Coffee',
        'coffee',
        'Specialty Coffee Roasters & Artisanal Bakery',
        'Restaurant',
        'Senior Barista & Order Concierge',
        'Friendly',
        'Arabic',
        'Egyptian Arabic',
        'علامة تجارية رائدة للقهوة المختصة ومخبوزات الزبدة الفاخرة بأجود أنواع البن الكولومبي والإثيوبي.',
        'قائمة الأصناف والمشروبات والأسعار:\n- سبانش لاتيه بارد / ساخن: 85 ج.م\n- فلات وايت أسترالي: 75 ج.م\n- آيسد كراميل ماكياتو: 90 ج.م\n- كولد برو كيني: 80 ج.م\n- شوكليت كروكي: 95 ج.م\n- سان سباستيان تشيز كيك: 110 ج.م\n- ساندوتش بريوش تركي وجبنة إيمنتال: 115 ج.م',
        'أهلاً بك في بون آند فانيليا! نورتنا، تحب تطلب قهوة مختصة أو حلى فريش، ولا حابب تستفسر عن المنيو؟',
        '1. الترحيب بالعميل بأسلوب مصري راقٍ وودود.\n2. عند طلب دليفري، اطلب: الأصناف بدقة، العنوان بالتفصيل، رقم الهاتف وطريقة الدفع.\n3. التأكيد على سرعة التوصيل وطازجية المنتجات اليومية.\n4. الالتزام التام بالأسعار المذكورة في القائمة فقط بدون أي تأليف.',
        '01019827364',
        'المعادي - شارع دجلة 233 / الشيخ زايد - كابيتال بروميناد',
        'يومياً من 07:30 ص حتى 12:00 منتصف الليل',
        60,
        '["strict_pricing", "order_confirmation", "operating_hours_check"]',
        ?, ?
    )
    """, (now_iso, now_iso))

    cursor.execute("""
    INSERT INTO brands (
        id, name, icon_type, tagline, category, role, tone, language, dialect,
        description, products_services, welcome_message, instructions,
        contact_phone, contact_address, contact_hours, creativity, guardrails, created_at, updated_at
    ) VALUES (
        'brand-pearl-dental',
        'Pearl Dental Centers',
        'stethoscope',
        'Advanced Digital Dentistry & Hollywood Smile',
        'Medical',
        'Patient Care Coordinator & Dental Advisor',
        'Professional',
        'Arabic',
        'Egyptian Arabic',
        'مركز طبي متخصص في تجميل وزراعة الأسنان والتقويم الرقمي الشفاف بأحدث أجهزة المسح ثلاثي الأبعاد.',
        'الخدمات الطبية وجلسات العلاج والأسعار:\n- جلسة فحص واستشارة شاملة + تصوير 3D بانوراما: 450 ج.م\n- جلسة تبييض أسنان احترافي بالليزر (Zoom 4): 2650 ج.م\n- تنظيف وإزالة الجير وتلميع الأسنان: 600 ج.م\n- زراعة الأسنان الفورية Straumann السويسرية: 11500 ج.م\n- التقويم الشفاف Invisalign: يبدأ من 25000 ج.م\n- فينير إيماكس الألماني للسن الواحد: 4200 ج.م',
        'أهلاً بحضرتك في Pearl Dental Centers. صحتك وابتسامتك أولويتنا. كيف نقدر نساعدك اليوم في حجز موعد أو استشارة طبية؟',
        '1. التحدث بأسلوب استشاري طبي هادئ ومحترف.\n2. لحجز موعد، اطلب من المريض: الاسم، الهاتف، الخدمة المطلوبة، واليوم والوقت المفضل.',
        '01005544332',
        'التجمع الخامس - ميديكال سنتر 2 - عيادة 304',
        'السبت إلى الخميس من 11:00 ص حتى 09:30 م',
        40,
        '["medical_disclaimer", "appointment_mandatory_fields"]',
        ?, ?
    )
    """, (now_iso, now_iso))

    cursor.execute("""
    INSERT INTO brands (
        id, name, icon_type, tagline, category, role, tone, language, dialect,
        description, products_services, welcome_message, instructions,
        contact_phone, contact_address, contact_hours, creativity, guardrails, created_at, updated_at
    ) VALUES (
        'brand-urban-chic',
        'Urban Chic Boutique',
        'shirt',
        'Contemporary Fashion & Wardrobe Essentials',
        'E-commerce',
        'Personal Fashion Stylist & Sales Advisor',
        'Friendly',
        'Arabic',
        'Egyptian Arabic',
        'علامة أزياء عصرية تقدم ملابس بخامات طبيعية وتصاميم مريحة مع ميزة المعاينة والتجربة قبل الدفع.',
        'تشكيلة المنتجات الحالية والأسعار:\n- فستان كتان صيفي مطرز يدوياً: 890 ج.م\n- بليزر كلاسيكي أوفر سايز إيطالي: 1250 ج.م\n- بنطلون قطن مصري واسع Wide-Leg: 550 ج.م\n- كارديجان شيفون فلورال خفيف: 680 ج.م\n- تشكيلة سكارفات حرير تركي: 220 ج.م',
        'أهلاً بك في أوربان شيك! كولكشن الموسم متوفر الآن. هل تبحثين عن مقاس معين أو فساتين وبليزرات؟',
        '1. تقديم مساعدة دافئة وسريعة في المقاسات والتنسيق.\n2. توضيح ميزة المعاينة قبل الدفع عند الاستلام.\n3. لطلب المنتج، اطلب: اسم الصنف واللون، المقاس، اسم المستلم، العنوان بالتفصيل ورقم الهاتف.',
        '01209384756',
        'القاهرة - مدينة نصر / شحن لجميع المحافظات',
        'دعم أونلاين 24/7',
        50,
        '["size_confirmation", "cod_policy"]',
        ?, ?
    )
    """, (now_iso, now_iso))

    seed_menu_items(conn)

    cursor.execute("""
    INSERT INTO orders (
        id, brand_id, customer_name, customer_phone, items, numeric_total, total_amount, order_type,
        delivery_address, payment_method, status, notes, confidence, timestamp, created_at
    ) VALUES 
    (
        'ord-bv-101', 'brand-bon-vanilla', 'كريم عبد العزيز', '01019827364',
        '["2 سبانش لاتيه بارد", "1 شوكليت كروكي"]', 265, '265 ج.م', 'Delivery',
        'المعادي - دجلة شارع 233 عمارة 14 الدور الثالث', 'دفع عند الاستلام', 'Completed',
        'تم التوصيل بنجاح', 98, 'اليوم، 11:20 ص', ?
    ),
    (
        'ord-bv-102', 'brand-bon-vanilla', 'نورهان الشافعي', '01228471920',
        '["حجز طاولة لـ 4 أفراد"]', 0, 'حجز مؤكد', 'Dine-In',
        'فرع الشيخ زايد - كابيتال بروميناد', 'في المكان', 'In Progress',
        'موعد الحجز الساعة 07:30 م', 95, 'اليوم، 01:15 م', ?
    ),
    (
        'ord-bv-103', 'brand-bon-vanilla', 'طارق الدسوقي', '01150493821',
        '["1 فلات وايت", "1 سان سباستيان كيك"]', 185, '185 ج.م', 'Delivery',
        'المعادي الجديدة - شارع النصر', 'InstaPay', 'New',
        'طلب جديد وارد عبر الوكيل الذكي', 96, 'منذ 15 دقيقة', ?
    ),
    (
        'ord-pd-201', 'brand-pearl-dental', 'د. ياسمين المرشدي', '01005544332',
        '["جلسة فحص شاملة 3D + تبييض ليزر Zoom 4"]', 3100, '3,100 ج.م', 'Medical Booking',
        'التجمع الخامس - ميديكال سنتر 2 - عيادة 304', 'فيزا بنك مصر', 'Completed',
        'تمت الزيارة وعمل الفحص بنجاح', 96, 'أمس، 05:00 م', ?
    ),
    (
        'ord-pd-202', 'brand-pearl-dental', 'م. أحمد شكري', '01198765432',
        '["استشارة تقويم شفاف Invisalign + تنظيف جير"]', 25000, '25,000 ج.م', 'Medical Booking',
        'التجمع الخامس - عيادة 304', 'تقسيط CIB بدون فوائد', 'In Progress',
        'تم إرسال خطة العلاج ثلاثية الأبعاد', 92, 'اليوم، 12:40 م', ?
    );
    """, (now_iso, now_iso, now_iso, now_iso, now_iso))

    seed_contacts_data(conn)
    conn.commit()
