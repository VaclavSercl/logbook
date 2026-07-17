import { useState, useEffect } from 'react';

export type Language = 'cs' | 'en';

export const translations: Record<Language, Record<string, Record<string, string>>> = {
  cs: {
    common: {
      home: '🏠 Domů',
      help: '⚓ Nápověda',
      dashboard: 'Nástěnka',
      logbook: '📖 Deník',
      map: '🗺️ Mapa',
      weather: '🌤️ Počasí',
      vessels: '🚢 Plavidla',
      crew: '👥 Posádka',
      settings: '⚙️ Nastavení',
      loading: 'Načítám...',
      vessel: 'Plavidlo',
      logbook_label: 'Deník',
      logout: '🚪 Odhlásit se',
      delete_account: '🗑️ Trvale smazat účet',
      save: 'Uložit veškeré změny',
      login: 'Přihlásit se',
      register: 'Registrovat',
    },
    landing: {
      tag: 'Server Čáslav — Připraven k plavbě',
      title_1: 'Inteligentní lodní deník',
      title_2: 'pro moderní mořeplavce.',
      desc: 'Profesionální námořní SaaS platforma s integrovaným AI generátorem, kaskádovou správou flotily a interaktivními mapami OpenSeaMap. Splňuje IMO standardy.',
      enter_btn: 'Vstoupit do deníku',
      register_btn: 'Založit účet flotily',
      live_title: 'Sledovat aktivní plavby živě (bez přihlášení)',
      live_route: 'Trasa',
      live_show: 'Zobrazit trasu →',
      tech_title: 'Špičkové technologie pro bezpečnost na moři',
      card_imo_title: 'IMO Compliant Lodní Deník',
      card_imo_desc: 'Plně odpovídá českému námořnímu zákonu 61/2000 Sb. a vyhlášce 278/2000 Sb. Automatický audit trail a neměnné, kryptograficky jištěné záznamy.',
      card_map_title: 'Interaktivní námořní mapy',
      card_map_desc: 'Renderování trasy plavby pomocí MapLibre GL s kompletními mapovými vrstvami: OpenStreetMap, satelitní snímky a námořní podklady OpenSeaMap.',
      card_ai_title: 'Hybridní AI generátor',
      card_ai_desc: 'Inteligentní cloud-first psaní námořních hlášení s využitím Gemini 2.5 API a okamžitým, deterministickým offline fallbackem při plavbě.',
    },
    settings: {
      title: '⚙️ Nastavení',
      lang_title: '🌐 Jazyk platformy',
      theme_title: '🎨 Barevné schéma',
      theme_dark: '🌙 Tmavé (doporučeno)',
      theme_light: '☀️ Světlé',
      notif_title: '🔔 Upozornění',
      notif_desc: 'Povolit automatické push notifikace stavu plavby',
      modules_title: '🧩 Systémové moduly',
      account_title: '🔑 Správa účtu',
      saved_alert: 'Nastavení bylo úspěšně uloženo.',
      delete_confirm: '⚠️ VAROVÁNÍ: Opravdu chcete trvale smazat svůj účet a všechna data (lodě, deníky, trasy, posádku)? Tato akce je NEVRATNÁ.',
      delete_success: 'Váš účet a veškerá související data byla trvale smazána.',
    },
  },
  en: {
    common: {
      home: '🏠 Home',
      help: '⚓ Help',
      dashboard: 'Dashboard',
      logbook: '📖 Logbook',
      map: '🗺️ Map',
      weather: '🌤️ Weather',
      vessels: '🚢 Vessels',
      crew: '👥 Crew',
      settings: '⚙️ Settings',
      loading: 'Loading...',
      vessel: 'Vessel',
      logbook_label: 'Logbook',
      logout: '🚪 Log out',
      delete_account: '🗑️ Delete Account Permanently',
      save: 'Save All Changes',
      login: 'Log In',
      register: 'Register',
    },
    landing: {
      tag: 'Server Čáslav — Ready for voyage',
      title_1: 'Smart Maritime Logbook',
      title_2: 'for modern sailors.',
      desc: 'Professional maritime SaaS platform with integrated AI generator, cascade fleet management and interactive OpenSeaMap maps. Complies with IMO standards.',
      enter_btn: 'Enter Logbook',
      register_btn: 'Register Fleet Account',
      live_title: 'Track Active Voyages Live (No Login Required)',
      live_route: 'Route',
      live_show: 'Show Route →',
      tech_title: 'State-of-the-Art Technologies for Safety at Sea',
      card_imo_title: 'IMO Compliant Logbook',
      card_imo_desc: 'Fully complies with maritime legislation. Automatic audit trail and immutable, cryptographically secured records that cannot be altered.',
      card_map_title: 'Interactive Nautical Charts',
      card_map_desc: 'Rendering of the voyage track using MapLibre GL with map layers: OpenStreetMap, satellite imagery, and OpenSeaMap nautical data.',
      card_ai_title: 'Hybrid AI Generator',
      card_ai_desc: 'Intelligent cloud-first maritime reporting using Gemini 2.5 API with instant deterministic offline fallback when sailing without internet.',
    },
    settings: {
      title: '⚙️ Settings',
      lang_title: '🌐 Platform Language',
      theme_title: '🎨 Color Theme',
      theme_dark: '🌙 Dark (recommended)',
      theme_light: '☀️ Light',
      notif_title: '🔔 Notifications',
      notif_desc: 'Enable automatic push notifications of voyage status',
      modules_title: '🧩 System Modules',
      account_title: '🔑 Account Management',
      saved_alert: 'Settings saved successfully.',
      delete_confirm: '⚠️ WARNING: Do you really want to permanently delete your account and all data (vessels, logbooks, routes, crew)? This action is IRREVERSIBLE.',
      delete_success: 'Your account and all associated data have been permanently deleted.',
    },
  }
};

export function useTranslation() {
  const [lang, setLang] = useState<Language>('cs');

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'cs' || saved === 'en')) {
      setLang(saved);
    }
  }, []);

  const changeLanguage = (newLang: Language) => {
    localStorage.setItem('language', newLang);
    setLang(newLang);
    window.dispatchEvent(new Event('languageChange'));
  };

  useEffect(() => {
    const handleLangChange = () => {
      const saved = localStorage.getItem('language') as Language;
      if (saved && (saved === 'cs' || saved === 'en')) {
        setLang(saved);
      }
    };
    window.addEventListener('languageChange', handleLangChange);
    return () => window.removeEventListener('languageChange', handleLangChange);
  }, []);

  const t = (path: string): string => {
    const keys = path.split('.');
    let result: any = translations[lang];
    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        let fallback: any = translations['cs'];
        for (const fk of keys) {
          if (fallback && fallback[fk] !== undefined) {
            fallback = fallback[fk];
          } else {
            return path;
          }
        }
        return fallback;
      }
    }
    return typeof result === 'string' ? result : path;
  };

  return { t, lang, changeLanguage };
}
