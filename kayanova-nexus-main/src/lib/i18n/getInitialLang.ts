import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import type { Language } from "./translations";

export const getInitialLanguage = createServerFn({ method: "GET" }).handler(async (): Promise<Language> => {
  const cookie = getCookie("kayanova_language");
  if (cookie === "en" || cookie === "ar") {
    return cookie;
  }
  return "ar";
});
