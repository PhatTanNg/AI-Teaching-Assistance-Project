import { createContext, useContext, useState, useCallback } from 'react';
import vi from '../i18n/vi.js';
import en from '../i18n/en.js';

const LOCALES = { vi, en };
const STORAGE_KEY = 'aita_language';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'vi' ? 'vi' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = useCallback((newLang) => {
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch { /* ignore */ }
    setLangState(newLang);
  }, []);

  // t('transcribe.title') → looks up nested key in locale file
  const t = useCallback(
    (key) => {
      const parts = key.split('.');
      let val = LOCALES[lang];
      for (const part of parts) {
        val = val?.[part];
        if (val === undefined) break;
      }
      // Fallback to English if key missing in current locale
      if (val === undefined) {
        val = LOCALES.en;
        for (const part of parts) {
          val = val?.[part];
          if (val === undefined) break;
        }
      }
      return val ?? key;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
