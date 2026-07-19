'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HelpPage() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setToken(localStorage.getItem('token'));
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-[#08090a]" />;
  }

  return (
    <div className="min-h-screen bg-[#08090a] text-[#f7f8f8] font-sans selection:bg-[#5e6ad2]/30 selection:text-white">
      {/* Google Fonts Link */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background-color: #08090a;
        }
        .font-mono-custom {
          font-family: 'JetBrains Mono', monospace;
        }
      `}} />

      {/* Header */}
      <header className="bg-[#0f1011] border-b border-white/[0.05] px-6 py-4 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5 text-decoration-none group">
            <div className="w-6 h-6 bg-gradient-to-br from-[#5e6ad2] to-[#7170ff] rounded-md flex items-center justify-center text-xs font-semibold text-white shadow-md shadow-[#5e6ad2]/10 group-hover:scale-105 transition">⚓</div>
            <h1 className="text-sm font-semibold tracking-tight text-[#f7f8f8]">LOGBOOK</h1>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-3 py-2 rounded-md hover:bg-white/[0.04] transition">Nástěnka</Link>
            {token && (
              <>
                <Link href="/logbook" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-3 py-2 rounded-md hover:bg-white/[0.04] transition">Deník</Link>
                <Link href="/map" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-3 py-2 rounded-md hover:bg-white/[0.04] transition">Mapa</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-4xl mx-auto pt-10 pb-20">
        <div className="mb-8 border-b border-white/[0.05] pb-6">
          <h2 className="text-3xl font-medium tracking-tight text-[#f7f8f8]">⚓ Uživatelský průvodce a nápověda</h2>
          <p className="text-sm text-[#8a8f98] mt-1.5">Jak nastavit Váš lodní deník, propojit Telegram a sledovat polohu v reálném čase.</p>
        </div>

        <div className="space-y-12">
          {/* Section 1: Multi-user architecture */}
          <section className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>👥</span> Je Logbook připraven pro více uživatelů?
            </h3>
            <p className="text-sm text-[#8a8f98] leading-relaxed mb-3">
              <strong>Ano!</strong> Celé webové rozhraní i databázová architektura jsou od základu navrženy jako multi-tenantní (veřejná služba pro více uživatelů). Každý uživatel má vlastní účet, svá plavidla, posádky a deníky, které jsou chráněny autorizací a ostatní uživatelé k nim nemají přístup.
            </p>
            <p className="text-sm text-[#8a8f98] leading-relaxed">
              Každý kapitán má možnost si vytvořit a nastavit <strong>vlastního privátního Telegram bota</strong> (vytvořeného přes @BotFather), který bude komunikovat výhradně s jeho lodním deníkem. Váš bot bude zcela oddělený a nikdo cizí k němu nebude mít přístup. Možnost vložit vlastní bot token a chat ID bude brzy přidána přímo do sekce Nastavení.
            </p>
          </section>

          {/* Section 2: Step-by-step guide */}
          <section className="space-y-6">
            <h3 className="text-xl font-medium text-white">🚀 Rychlý start: Jak začít</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0f1011] border border-white/[0.05] rounded-lg p-5">
                <span className="text-2xl mb-3 block">1️⃣</span>
                <h4 className="text-sm font-semibold text-white mb-2">Vytvořte plavidlo</h4>
                <p className="text-xs text-[#8a8f98] leading-relaxed">
                  Přejděte do sekce <strong>Plavidla</strong> a přidejte svou loď. Zadejte název, typ a rozměry. Deníky lze tvořit pouze k existujícím lodím.
                </p>
              </div>

              <div className="bg-[#0f1011] border border-white/[0.05] rounded-lg p-5">
                <span className="text-2xl mb-3 block">2️⃣</span>
                <h4 className="text-sm font-semibold text-white mb-2">Založte deník plavby</h4>
                <p className="text-xs text-[#8a8f98] leading-relaxed">
                  V sekci <strong>Deník</strong> založte novou knihu plavby. Zadejte výchozí a cílový přístav. Deník bude označen jako aktivní.
                </p>
              </div>

              <div className="bg-[#0f1011] border border-white/[0.05] rounded-lg p-5">
                <span className="text-2xl mb-3 block">3️⃣</span>
                <h4 className="text-sm font-semibold text-white mb-2">Otevřete mapu</h4>
                <p className="text-xs text-[#8a8f98] leading-relaxed">
                  Na <strong>Mapě</strong> uvidíte aktuální polohu lodi, zaznamenanou trasu a všechny detaily plavby v reálném čase.
                </p>
              </div>
            </div>
          </section>

          {/* Section: GPS Management */}
          <section className="space-y-4">
            <h3 className="text-xl font-medium text-white">📍 Správa GPS bodů a trasy na mapě</h3>
            <div className="bg-[#0f1011] border border-white/[0.05] rounded-lg p-5 space-y-3">
              <p className="text-sm text-[#8a8f98] leading-relaxed">
                Logbook umožňuje plnou interaktivní správu zaznamenaných tras přímo na stránce <strong>Mapa</strong>:
              </p>
              <ul className="list-disc list-inside text-xs text-[#8a8f98] space-y-2">
                <li>
                  <strong>Přidání bodů kliknutím do mapy:</strong> Jednoduše klikněte kamkoliv do mapy. Otevře se formulář s předvyplněnými přesnými souřadnicemi a aktuálním místním časem.
                </li>
                <li>
                  <strong>Neomezená přesnost souřadnic:</strong> Vstupní pole podporují libovolný počet desetinných míst (atribut <code className="font-mono-custom text-xs bg-white/[0.05] px-1 py-0.5 rounded text-[#7170ff]">step="any"</code>), takže můžete zadávat i maximálně přesné body vygenerované mapou nebo GPS přijímačem.
                </li>
                <li>
                  <strong>Mazání bodů z historie:</strong> V pravém panelu v sekci <em>Historie GPS Bodů</em> najdete seznam všech uložených bodů. U každého bodu je ikona popelnice 🗑️, kterou lze bod po potvrzení trvale smazat. Mapa i trasa se okamžitě překreslí.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: Telegram setup */}
          <section className="space-y-6">
            <h3 className="text-xl font-medium text-white">💬 Propojení s Telegramem</h3>
            
            <div className="space-y-4">
              {/* Point 1 */}
              <div className="flex gap-4 p-4 bg-white/[0.01] border border-white/[0.05] rounded-lg">
                <div className="text-lg">🤖</div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">Vytvoření privátního bota na Telegramu</h4>
                  <p className="text-xs text-[#8a8f98] leading-relaxed">
                    Vyhledejte na Telegramu bota <strong>@BotFather</strong>, odešlete příkaz <code className="font-mono-custom text-xs bg-white/[0.05] px-1 py-0.5 rounded text-[#7170ff]">/newbot</code> a podle instrukcí vytvořte svého vlastního bota. Získaný <strong>Bot Token</strong> vložíte do nastavení svého profilu v sekci Nastavení na webu (tato integrace se připravuje). Spusťte chat se svým botem odesláním zprávy <code className="font-mono-custom text-xs bg-white/[0.05] px-1 py-0.5 rounded text-[#7170ff]">/start</code>.
                  </p>
                </div>
              </div>

              {/* Point 2 */}
              <div className="flex gap-4 p-4 bg-white/[0.01] border border-white/[0.05] rounded-lg">
                <div className="text-lg">📍</div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">Permanentní (živé) sdílení GPS polohy</h4>
                  <p className="text-xs text-[#8a8f98] leading-relaxed mb-2">
                    Pro automatický záznam trasy přímo do mapy během plavby použijte funkci <strong>Live Location</strong> v Telegramu:
                  </p>
                  <ol className="list-decimal list-inside text-xs text-[#8a8f98] space-y-1.5">
                    <li>V chatu s botem klikněte na ikonu <strong>Sponky (Příloha)</strong>.</li>
                    <li>Vyberte možnost <strong>Poloha (Location)</strong>.</li>
                    <li>Zvolte **Sdílet moji polohu živě... (Share My Live Location...)**.</li>
                    <li>Vyberte časové období (např. 8 hodin nebo na dobu neurčitou).</li>
                  </ol>
                  <p className="text-xs text-yellow-400/80 mt-2 bg-yellow-950/20 border border-yellow-700/30 p-2.5 rounded">
                    ⚠️ *Poznámka:* Ujistěte se, že má aplikace Telegram v nastavení telefonu povolený přístup k polohám "Vždy na pozadí", aby se trasa přenášela i při zamknutém displeji.
                  </p>
                </div>
              </div>

              {/* Point 3 */}
              <div className="flex gap-4 p-4 bg-white/[0.01] border border-white/[0.05] rounded-lg">
                <div className="text-lg">🎙️</div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">AI Zápisník plavby (Hlasem i Textem)</h4>
                  <p className="text-xs text-[#8a8f98] leading-relaxed mb-2">
                    Cokoliv botovi napíšete, se automaticky zaznamená jako záznam do Vašeho aktivního deníku. Můžete také poslat **hlasovou zprávu**:
                  </p>
                  <p className="text-xs text-[#8a8f98] leading-relaxed">
                    Díky integraci s <strong>Gemini 3.5 Flash API</strong> bot nahrávku analyzuje, přepíše ji do češtiny a automaticky z ní extrahuje parametry jako je <em>kurz lodi, rychlost plavby, síla a směr větru, barometrický tlak</em> a uloží je do patřičných kolonek v deníku.
                  </p>
                  <div className="mt-2.5 p-2.5 bg-white/[0.02] border border-white/[0.05] rounded text-[11px] font-mono-custom text-[#7170ff]">
                    Příklad: "Kurz 180, rychlost 7 uzlů, fouká severní vítr 15 uzlů, tlak 1012 hPa. Vyplouváme z mariny."
                  </div>
                </div>
              </div>

              {/* Point 4 */}
              <div className="flex gap-4 p-4 bg-white/[0.01] border border-white/[0.05] rounded-lg">
                <div className="text-lg">🚨</div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">Příkaz /mob (Muž přes palubu) a Strážce polohy</h4>
                  <p className="text-xs text-[#8a8f98] leading-relaxed mb-2">
                    Bezpečnost na moři je klíčová. Njoror obsahuje dva nouzové/ochranné systémy přes Telegram:
                  </p>
                  <ul className="list-disc list-inside text-xs text-[#8a8f98] space-y-1.5">
                    <li>
                      <strong>Nouzový příkaz /mob:</strong> Okamžitě zapíše a zvýrazní nouzovou událost s přesným časem a aktuálními GPS souřadnicemi do deníku a odešle instrukce pro zahájení záchrany.
                    </li>
                    <li>
                      <strong>Strážce polohy (Watchdog):</strong> Pokud plujete (poslední známá rychlost > 0.8 uzlů), ale po dobu 30 minut nedorazil žádný nový GPS bod ze sdílení polohy, bot vám zašle varování.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Advanced Map & Offline Features */}
          <section className="space-y-4">
            <h3 className="text-xl font-medium text-white">🗺️ Pokročilá mapa, Windy a Offline synchronizace</h3>
            <div className="bg-[#0f1011] border border-white/[0.05] rounded-lg p-5 space-y-3">
              <p className="text-sm text-[#8a8f98] leading-relaxed">
                Naše mapa je plně optimalizována pro reálné použití na jachtě, i bez stabilního signálu:
              </p>
              <ul className="list-disc list-inside text-xs text-[#8a8f98] space-y-2">
                <li>
                  <strong>Windy Radar:</strong> Na stránce s mapou můžete aktivovat tlačítko <em>Windy Radar</em>, které zobrazí aktuální povětrnostní a srážkovou animaci od Windy.com přímo na vaší pozici.
                </li>
                <li>
                  <strong>Větrné vektory:</strong> U jednotlivých logovacích bodů trasy vidíte barevné šipky směru větru. Rychlost větru je barevně kódována (modrá < 10 uzlů, zelená 10-18 kn, žlutá 18-27 kn, červená > 27 kn).
                </li>
                <li>
                  <strong>Offline-First ukládání:</strong> Pokud jste mimo signál a vytvoříte nový zápis, aplikace ho uloží do fronty ve vašem prohlížeči. Jakmile chytíte signál, synchronizátor záznamy automaticky nahraje na server.
                </li>
                <li>
                  <strong>Exporty a Sdílení:</strong> Z detailu lodního deníku můžete přímo exportovat <strong>PDF verzi deníku</strong> pro tisk, <strong>GPX trasu</strong> pro navigaci, nebo <strong>CSV soubor</strong> s daty. Můžete také jedním kliknutím zkopírovat <strong>Live Tracking odkaz</strong> pro veřejné sledování.
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
