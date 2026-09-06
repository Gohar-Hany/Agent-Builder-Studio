import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useTransition,
} from "react";
import { translations, type Language, type Translations } from "./translations";

interface LanguageContextType {
  lang: Language;
  dir: "rtl" | "ltr";
  isRtl: boolean;
  t: Translations;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

const LANG_STORAGE_KEY = "kayanova_language";

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  children,
  initialLang = "ar",
}: {
  children: React.ReactNode;
  initialLang?: Language;
}) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const match = document.cookie.match(/(?:^|;\s*)kayanova_language=(ar|en)(?:;|$)/);
      if (match && match[1]) {
        return match[1] as Language;
      }
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as Language;
      if (saved === "en" || saved === "ar") {
        return saved;
      }
    }
    return initialLang;
  });
  const [, startTransition] = useTransition();

  const updateDocumentAttributes = useCallback((currentLang: Language) => {
    if (typeof document !== "undefined") {
      const dir = currentLang === "ar" ? "rtl" : "ltr";
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", currentLang);
      document.documentElement.dir = dir;
      document.documentElement.lang = currentLang;
    }
  }, []);

  // Sync saved language from localStorage safely after hydration
  useEffect(() => {
    if (typeof window !== "undefined") {
      const match = document.cookie.match(/(?:^|;\s*)kayanova_language=(ar|en)(?:;|$)/);
      if (match && match[1] && match[1] !== lang) {
        setLangState(match[1] as Language);
        updateDocumentAttributes(match[1] as Language);
      } else {
        const saved = localStorage.getItem(LANG_STORAGE_KEY) as Language;
        if ((saved === "en" || saved === "ar") && saved !== lang) {
          setLangState(saved);
          updateDocumentAttributes(saved);
          document.cookie = `kayanova_language=${saved}; path=/; max-age=31536000; SameSite=Lax`;
        }
      }
    }
  }, [lang, updateDocumentAttributes]);

  const setLang = useCallback(
    (newLang: Language) => {
      setLangState(newLang);
      if (typeof window !== "undefined") {
        localStorage.setItem(LANG_STORAGE_KEY, newLang);
        document.cookie = `kayanova_language=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
        window.dispatchEvent(new CustomEvent("kayanova:lang_sync", { detail: { lang: newLang } }));
      }
      startTransition(() => {
        updateDocumentAttributes(newLang);
      });
    },
    [updateDocumentAttributes],
  );

  const toggleLang = useCallback(() => {
    setLang(lang === "ar" ? "en" : "ar");
  }, [lang, setLang]);

  useEffect(() => {
    updateDocumentAttributes(lang);
  }, [lang, updateDocumentAttributes]);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ lang: Language }>;
      if (customEvent.detail?.lang) {
        setLangState(customEvent.detail.lang);
        updateDocumentAttributes(customEvent.detail.lang);
      }
    };
    window.addEventListener("kayanova:lang_sync", handleSync);
    return () => window.removeEventListener("kayanova:lang_sync", handleSync);
  }, [updateDocumentAttributes]);

  const dir = lang === "ar" ? "rtl" : "ltr";
  const isRtl = lang === "ar";
  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, dir, isRtl, t, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback if accessed outside provider
    const isRtl = true;
    return {
      lang: "ar",
      dir: "rtl",
      isRtl,
      t: translations.ar,
      setLang: () => {},
      toggleLang: () => {},
    };
  }
  return ctx;
}
