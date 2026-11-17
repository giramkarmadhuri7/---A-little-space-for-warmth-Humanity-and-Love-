import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  Category,
  Language,
  SiteSettingsMap,
  ThemeMode,
} from '../types/index.ts';
import { UI_COPY } from '../i18n/translations.ts';

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  currentPath: string;
  currentSearch: string;
  navigate: (to: string) => void;
  categories: Category[];
  settings: SiteSettingsMap;
  siteDataLoading: boolean;
  refreshSiteData: () => Promise<void>;
  t: (typeof UI_COPY)['mr'] | (typeof UI_COPY)['en'];
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('mj_lang');
      return saved === 'en' ? 'en' : 'mr';
    } catch {
      return 'mr';
    }
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('mj_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [currentSearch, setCurrentSearch] = useState(() => window.location.search);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettingsMap>({});
  const [siteDataLoading, setSiteDataLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('mj_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem('mj_lang', language);
    } catch {
      // ignore storage errors
    }
  }, [language]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
      setCurrentSearch(window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname + window.location.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', to);
    setCurrentPath(window.location.pathname);
    setCurrentSearch(window.location.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'mr' ? 'en' : 'mr'));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const refreshSiteData = useCallback(async () => {
    try {
      const res = await fetch('/api/site-data', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load site data');
      const data = await res.json();
      setCategories(data.categories || []);
      setSettings(data.settings || {});
    } catch (err) {
      console.error('Error loading site data:', err);
    } finally {
      setSiteDataLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSiteData();
  }, [refreshSiteData]);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        theme,
        toggleTheme,
        currentPath,
        currentSearch,
        navigate,
        categories,
        settings,
        siteDataLoading,
        refreshSiteData,
        t: UI_COPY[language],
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute(
      'href',
      window.location.origin + window.location.pathname
    );
  }, [title, description]);
}
