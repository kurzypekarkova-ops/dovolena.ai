import { useState, useEffect } from "react";
import Header from "./components/Header";
import ItineraryView from "./components/ItineraryView";
import ChecklistView from "./components/ChecklistView";
import GuideView from "./components/GuideView";
import RoastView from "./components/RoastView";
import { Coffee, Compass, ExternalLink, Luggage, Sparkles, ShieldAlert } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"itinerary" | "checklist" | "guide" | "roast">("itinerary");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [assistant, setAssistant] = useState<"eliska" | "krystof" | "marek">(
    () => (localStorage.getItem("active_assistant") as any) || "eliska"
  );
  
  // Try to retrieve actual destination dynamically from localStorage or default
  const [currentDestination, setCurrentDestination] = useState<string>("Lisabon s partou");
  const [currentDuration, setCurrentDuration] = useState<string>("4 dny");

  useEffect(() => {
    localStorage.setItem("active_assistant", assistant);
  }, [assistant]);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setHasApiKey(data.hasApiKey))
      .catch(() => setHasApiKey(false));

    // Listen to local changes or state updates for customized destinations
    const interval = setInterval(() => {
      const stored = localStorage.getItem("dovolena_current_destination") || localStorage.getItem("sbaleno_current_destination");
      const storedDays = localStorage.getItem("dovolena_current_days") || localStorage.getItem("sbaleno_current_days");
      if (stored) {
        setCurrentDestination(stored);
      }
      if (storedDays) {
        setCurrentDuration(`${storedDays} ${getIntuitiveDayCzech(Number(storedDays))}`);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const getIntuitiveDayCzech = (val: number) => {
    if (val === 1) return "den";
    if (val >= 2 && val <= 4) return "dny";
    return "dní";
  };

  // Fun tips corresponding to the tabs and dynamically matching the active destination
  const getTabTip = () => {
    switch (activeTab) {
      case "itinerary": {
        const dest = currentDestination.toLowerCase().trim();
        if (dest.includes("chorvat") || dest.includes("croat") || dest.includes("jadran") || dest.includes("dalmáci") || dest.includes("split") || dest.includes("dubrovnik") || dest.includes("zadar") || dest.includes("pula")) {
          return {
            title: "Lokální tip pro Chorvatsko:",
            desc: "Nezapomeň na boty do vody – v zátokách s oblázky tě spolehlivě zachrání před ježky. A pokud chceš ušetřit, hledej místní pekárny zvané 'Pekara' s čerstvým slaným burekem!",
            emoji: "🌊"
          };
        }
        if (dest.includes("lisabon") || dest.includes("lisbon") || dest.includes("porto") || dest.includes("portugal")) {
          return {
            title: "Lokální tip pro Lisabon:",
            desc: "Nezapomeň si stáhnout offline mapu Lisabonu, signál v uličkách staré Alfamy občas vypadává! Také se vyhni předražené tramvaji 28 a naskoč do linky 12.",
            emoji: "🚃"
          };
        }
        if (dest.includes("řím") || dest.includes("roma") || dest.includes("itál") || dest.includes("ital") || dest.includes("benátk") || dest.includes("florenc") || dest.includes("toskán")) {
          return {
            title: "Lokální tip pro Itálii:",
            desc: "Neplať zbytečně za balenou vodu! Hledej staré kamenné kašničky s pitnou vodou zvané 'nasoni' – voda je ledová a skvělá. Stačí jen ucpat prstem dolní otvor a voda vystříkne vrchem.",
            emoji: "⛲"
          };
        }
        if (dest.includes("island") || dest.includes("iceland")) {
          return {
            title: "Lokální tip pro Island:",
            desc: "Nikdy nekupuj balenou vodu – z kohoutku tam teče jedna z nejčistších ledovcových vod na světě. A před vstupem do termálů nanes na vlasy kondicionér, jinak ztvrdnou kvůli síře.",
            emoji: "🌋"
          };
        }
        if (dest.includes("praha") || dest.includes("prague")) {
          return {
            title: "Lokální tip pro Prahu:",
            desc: "Uteč od davů na Karlově mostě! Nejkrásnější západ slunce s úchvatným výhledem na celou Prahu a bez houfů turistů zažiješ z hradeb historického Vyšehradu.",
            emoji: "🏰"
          };
        }
        if (dest.includes("brno")) {
          return {
            title: "Lokální tip pro Brno:",
            desc: "Na prvotřídní kávu vyraz do uliček kolem Veveří. A nezapomeň se u Staré radnice podívat na gotický portál – prostřední věžička je křivá, protože mistru kameníkovi nezaplatili dost!",
            emoji: "🐲"
          };
        }
        if (dest.includes("paříž") || dest.includes("paris") || dest.includes("franc")) {
          return {
            title: "Lokální tip pro Francii:",
            desc: "Vyhni se restauracím přímo pod památkami. Raději si kup křupavou bagetu v zapadlé 'Boulangerie', sýr v 'Fromagerie' a udělej si nezapomenutelný piknik v parku.",
            emoji: "🥐"
          };
        }
        if (dest.includes("barcelon") || dest.includes("španěl") || dest.includes("spain") || dest.includes("madrid") || dest.includes("mallor")) {
          return {
            title: "Lokální tip pro Španělsko:",
            desc: "V Barceloně si dej pozor na kapsáře na bulváru La Rambla. Za skvělou atmosférou a originálními místními tapas bary vyraz do útulných uliček klidnější čtvrti Gràcia.",
            emoji: "🏖️"
          };
        }
        if (dest.includes("řeck") || dest.includes("gree") || dest.includes("kret") || dest.includes("rhod")) {
          return {
            title: "Lokální tip pro Řecko:",
            desc: "V Řecku nikdy nevhazuj toaletní papír do mísy kvůli starým odpadním trubkám. A v tavernách se klidně zeptej majitele, co má dnes dobrého v hrnci v kuchyni – je to obrovská pocta hostiteli!",
            emoji: "🇬🇷"
          };
        }
        if (dest.includes("slovens") || dest.includes("slovak") || dest.includes("tatr")) {
          return {
            title: "Lokální tip pro Slovensko:",
            desc: "V Tatrách se počasí na hřebenech mění nesmírně rychle – měj vždy pláštěnku. Pro skvělé halušky jdi mimo hlavní rezorty do tradiční salaše nebo koliby.",
            emoji: "⛰️"
          };
        }
        if (dest.includes("egypt")) {
          return {
            title: "Lokální tip pro Egypt:",
            desc: "Zuby si čisti zásadně balenou vodou, vyhýbej se ledu a měj s sebou vždy spoustu jednodolarových bankovek. Ušetří ti to nervy při smlouvání a placení všudypřítomného bakšiše.",
            emoji: "🐫"
          };
        }
        if (dest.includes("thaj") || dest.includes("thai") || dest.includes("bali") || dest.includes("vietnam") || dest.includes("asii") || dest.includes("asia")) {
          return {
            title: "Lokální tip pro Asii:",
            desc: "Stáhni si aplikaci Grab nebo Gojek pro levné jízdy taxíkem/motorkou. A nezapomínej na uliční stánky s plastovými židličkami – tam dělají to nejčerstvější a nejchutnější jídlo!",
            emoji: "🛵"
          };
        }

        // Beautiful customized generic fallback
        const cleanDest = currentDestination.replace(/\s+(s\s+partou|v\s+páru|s\s+dětmi|sám|sama)\s*$/i, "").trim();
        const capitalizedDest = cleanDest ? cleanDest.charAt(0).toUpperCase() + cleanDest.slice(1) : "cestu";
        return {
          title: `Tip na cestu do: ${capitalizedDest}`,
          desc: `Při objevování v lokalitě ${capitalizedDest} se vždy vyhni restauracím s tištěnými fotkami jídel na menu. Popojdi o 2 uličky stranou a hledej místo plné smějících se místních obyvatel!`,
          emoji: "📍"
        };
      }
      case "checklist":
        return {
          title: "Vychytávka k balení:",
          desc: "Sroluj oblečení do ruliček (military roll) místo skládání. Ušetříš 40 % kapacity kufru!",
          emoji: "🎒"
        };
      case "guide":
        return {
          title: "Kulturní pravidlo:",
          desc: "V Itálii nepij cappuccino po 11. hodině dopoledne. Pro místní je to těžké jídlo na trávení!",
          emoji: "☕"
        };
      case "roast":
        return {
          title: "Zlaté pravidlo roštění:",
          desc: "Míň je víc. Cokoliv si balíš 'pro strýčka příhodu', s pravděpodobností 90 % vůbec nevytáhneš.",
          emoji: "🔥"
        };
    }
  };

  const activeTip = getTabTip();

  return (
    <div className="min-h-screen bg-[#FFF9F5] flex flex-col md:flex-row font-sans select-none antialiased">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex w-72 bg-white border-r border-[#FFE0D1] flex-col shadow-xs h-screen sticky top-0 shrink-0 no-print">
        <div className="p-6 flex flex-col h-full justify-between">
          <div>
            {/* Header Brand */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-[#FF6B6B] rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-black text-xl italic">d.</span>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#FF6B6B]">dovolena.ai</h1>
                <p className="text-[10px] text-[#636E72] tracking-wider uppercase font-extrabold -mt-1 font-mono">Dovolená sbalená a naplánovaná bez stresu</p>
                <div className="text-[9px] text-[#858E92] font-semibold mt-0.5">webka od Kateřina Pekárková</div>
              </div>
            </div>

            {/* Navigation Options */}
            <nav className="space-y-2">
              {[
                { id: "itinerary", label: "Itinerář", emoji: "🗺️", desc: "Plánovač na míru" },
                { id: "checklist", label: "Checklist balení", emoji: "🎒", desc: "Co rozhodně s sebou" },
                { id: "guide", label: "Průvodce & Překlad", emoji: "🌍", desc: "Zvyky & výslovnost" },
                { id: "roast", label: "Packing Roast", emoji: "🔥", desc: "Zkritizuj mé sbalení" },
              ].map((item) => {
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-4.5 p-3.5 rounded-2xl font-bold transition-all text-left cursor-pointer group ${
                      isSelected
                        ? "bg-[#FFF0F0] text-[#FF6B6B] shadow-xs"
                        : "text-[#636E72] hover:bg-[#F0F2F5]/80 hover:text-[#2D3436]"
                    }`}
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">{item.emoji}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold leading-none">{item.label}</span>
                      <span className="text-[9px] font-normal text-stone-400 mt-0.5">{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Kateřina Pekárková AI Developer Pitch Card */}
            <div className="mt-6 p-4 bg-gradient-to-tr from-[#FF6B6B]/10 to-[#FFF9F5]/80 border border-[#FFE0D1] rounded-2xl shadow-xs relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 translate-y-3 translate-x-1 font-sans font-black text-5xl text-[#FF6B6B]/5 select-none group-hover:scale-110 transition-transform">
                🚀
              </div>
              <div className="relative z-10 space-y-2">
                <span className="text-[8px] uppercase font-black bg-[#FF6B6B] text-white px-2 py-0.5 rounded-full inline-block">AI vývoj na klíč</span>
                <h4 className="text-xs font-extrabold text-[#2D3436]">
                  Líbí se ti tato aplikace?
                </h4>
                <p className="text-[10px] text-[#636E72] font-semibold leading-relaxed">
                  Kateřina Pekárková pomáhá značkám a firmám získávat klienty a šetřit čas pomocí originálních webů a AI nástrojů na klíč.
                </p>
                <div className="pt-1 flex flex-col gap-1.5">
                  <a
                    href="mailto:katerina.pekarek@centrum.cz"
                    className="bg-[#2D3436] hover:bg-stone-900 text-white rounded-xl py-2 px-3 text-center text-[10px] font-black transition-all active:scale-95 block shadow-xs"
                  >
                    Chci taky AI web 💼
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Interactive tip card */}
          <div className="space-y-4">
            <div className="bg-[#FFE66D] p-4.5 rounded-3xl relative overflow-hidden shadow-xs border border-amber-300">
              <div className="relative z-10">
                <p className="text-xs font-black text-[#856404] mb-1 flex items-center gap-1">
                  <span>{activeTip.emoji}</span>
                  <span>{activeTip.title}</span>
                </p>
                <p className="text-[11px] text-[#856404] font-medium leading-relaxed">
                  {activeTip.desc}
                </p>
              </div>
              <div className="absolute -right-3 -bottom-3 opacity-15 text-5xl rotate-12 select-none pointer-events-none">
                {activeTip.emoji}
              </div>
            </div>

            {/* API Key info */}
            <div className="p-3 bg-stone-50 border border-stone-200/60 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hasApiKey ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <span className="text-[10px] font-bold text-stone-500">
                  {hasApiKey ? "AI Model Aktivní" : "Lokální Demo"}
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold text-stone-400">V2.5</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER (md:hidden) */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* MAIN MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP STATUS AND TRIP HEADER FOR DESKTOP */}
        <header className="hidden md:flex h-20 px-8 items-center justify-between bg-white border-b border-[#FFE0D1] no-print shrink-0">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-wider text-[#B2BEC3] leading-none mb-1">
              Aktuální sledovaná cesta
            </h2>
            <p className="text-base font-extrabold text-[#2D3436]">
              {currentDestination} <span className="text-[#FF6B6B] font-black">•</span> <span className="text-stone-500 text-sm font-medium">{currentDuration}</span>
            </p>
          </div>
        </header>

        {/* Dynamic Display Area */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 lg:py-10">
          {/* Universal AI Character Picker */}
          <div className="bg-white border border-[#FFE0D1] p-5 rounded-3xl shadow-sm mb-8 flex flex-col lg:flex-row items-center justify-between gap-5 no-print animate-fade-in">
            <div className="flex items-center gap-3.5 text-center lg:text-left">
              <span className="text-3xl animate-bounce shrink-0 select-none">💬</span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B6B] leading-none mb-1.5">
                  Zvol si vtipnou AI osobnost pro plánování:
                </h3>
                <p className="text-[11px] text-[#636E72] font-semibold leading-relaxed">
                  Každý z tvých parťáků dává jiné, specifické rady a má vlastní, originální styl řeči!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 w-full lg:w-auto shrink-0">
              {[
                { id: "eliska", name: "Eliška 🌸", desc: "milá, chápavá", color: "bg-[#FFF0F0] text-[#FF6B6B] border-[#FF6B6B]", inactiveColor: "hover:bg-red-50/20 border-stone-100" },
                { id: "krystof", name: "Kryštof 🌶️", desc: "sarkastický prudič", color: "bg-red-50 text-red-600 border-red-500", inactiveColor: "hover:bg-red-50/20 border-stone-100" },
                { id: "marek", name: "Marek 🕶️", desc: "vojenský minimalist", color: "bg-teal-50 text-teal-800 border-teal-600", inactiveColor: "hover:bg-teal-50/20 border-stone-100" }
              ].map((p) => {
                const active = assistant === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setAssistant(p.id as any)}
                    className={`py-2.5 px-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-w-[105px] ${
                      active ? `${p.color} border-2 font-bold shadow-xs scale-102` : `bg-stone-50/80 ${p.inactiveColor} text-stone-600 hover:text-stone-900`
                    }`}
                  >
                    <span className="text-xs font-extrabold">{p.name}</span>
                    <span className="text-[9px] font-semibold opacity-80 mt-0.5 whitespace-nowrap">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === "itinerary" && <ItineraryView assistant={assistant} />}
          {activeTab === "checklist" && <ChecklistView assistant={assistant} />}
          {activeTab === "guide" && <GuideView assistant={assistant} />}
          {activeTab === "roast" && <RoastView assistant={assistant} />}
        </main>

        {/* ELEGANT FOOTER */}
        <footer className="w-full bg-white border-t border-[#FFE0D1] py-8 mt-12 no-print">
          <div className="max-w-5xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-1.5 font-bold text-stone-950 text-sm">
                <span className="font-black text-base text-[#FF6B6B]">dovolena<span className="text-[#FF6B6B]">.ai</span></span>
                <span className="text-[10px] bg-stone-100 text-[#636E72] px-1.5 py-0.5 rounded-md font-mono">V2.5</span>
              </div>
              <p className="text-xs text-[#636E72] mt-1 max-w-sm">
                Sbal se bez stresu, objevuj nová místa a užívej si zážitky na maximum. S láskou vytvořeno pro české cestovatele.
              </p>
              <div className="text-[11px] text-[#FF6B6B] font-bold mt-2 flex items-center justify-center md:justify-start gap-1">
                <span>webka od Kateřina Pekárková</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs font-semibold text-[#FF6B6B]">
              <a
                href="https://www.mzv.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-stone-900 transition-colors"
              >
                <span>Nouzový portál MZV ČR</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="hidden sm:inline text-stone-300">•</span>
              <a
                href="https://drozd.mzv.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-stone-900 transition-colors"
              >
                <span>Registrace DROZD</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="max-w-3xl md:max-w-5xl mx-auto px-4 md:px-8 border-t border-stone-100 mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#B2BEC3] font-medium">
            <span>&copy; {new Date().getFullYear()} dovolena.ai | vytvořeno Kateřina Pekárková</span>
            <span className="flex items-center gap-1 text-[#636E72]">
              Šťastnou cestu bez zbytečností přeje Kamarádka AI ☕
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
