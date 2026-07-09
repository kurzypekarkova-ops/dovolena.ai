import { useState, useEffect } from "react";
import { MessageSquare, Heart, Sparkles, Send, Globe, ShieldAlert, BookOpen, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Phrase {
  czech: string;
  foreign: string;
  pronunciation: string;
}

// Recursively extract all plain-text from any react render tree node
const getRawText = (node: any): string => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getRawText).join("");
  if (node.props && node.props.children) return getRawText(node.props.children);
  return "";
};

const customMarkdownComponents = {
  h3: ({ children, ...props }: any) => {
    return (
      <h3 
        className="text-base md:text-lg font-black mt-6 mb-3 pb-2 flex items-center gap-2.5 font-sans tracking-tight border-b text-[#2D3436] border-stone-100" 
        {...props}
      >
        <span className="inline-block w-2.5 h-5 rounded-md shrink-0 bg-[#FF6B6B]"></span>
        {children}
      </h3>
    );
  },
  p: ({ children, ...props }: any) => {
    const text = getRawText(children).trim();
    
    // Safety check for warning/info box
    if (text.includes("Upozornění:") || text.includes("⚠️") || text.includes("kontakty:")) {
      return (
        <div className="bg-amber-50/80 border border-amber-200/50 p-4 rounded-2xl text-amber-900 text-xs font-semibold my-4 leading-relaxed flex gap-2.5 items-start shadow-xs animate-fade-in" {...props}>
          <span className="text-base shrink-0 mt-0.5">⚠️</span>
          <div>{children}</div>
        </div>
      );
    }

    // Bold starting check, like key advice or translations
    if (text.startsWith("- Česky:") || text.startsWith("Česky:")) {
      return (
        <div className="p-3.5 rounded-xl border border-[#FFE0D1]/50 bg-[#FFF9F5]/40 my-2 font-semibold text-xs md:text-sm" {...props}>
          {children}
        </div>
      );
    }

    return (
      <p className="my-2 text-stone-600 text-xs md:text-sm leading-relaxed font-semibold animate-fade-in" {...props}>
        {children}
      </p>
    );
  },
  li: ({ children, ...props }: any) => {
    return (
      <li className="flex items-start gap-2 my-2 text-stone-700 text-xs md:text-sm font-semibold hover:translate-x-0.5 transition-transform duration-200" {...props}>
        <span className="text-[#FF6B6B] shrink-0 mt-1 mr-1 text-xs select-none">•</span>
        <div className="flex-1 leading-relaxed text-stone-700 font-semibold">{children}</div>
      </li>
    );
  },
  ul: ({ children, ...props }: any) => {
    return (
      <ul className="my-3 space-y-2 pl-1 bg-[#FFF9F5]/20 border border-[#FFE0D1]/40 p-4 rounded-2xl shadow-xs" {...props}>
        {children}
      </ul>
    );
  }
};

export default function GuideView({ assistant = "eliska" }: { assistant?: string }) {
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [guideResult, setGuideResult] = useState("");
  const [isFallback, setIsFallback] = useState(false);

  // Preloaded languages for immediate value without waiting for inputs
  const [selectedLangCard, setSelectedLangCard] = useState<string>("it");

  const fastPhrases: { [key: string]: { title: string; desc: string; url: string; phrases: Phrase[] } } = {
    it: {
      title: "🇮🇹 Italský rychlík",
      desc: "Itálie (Řím, Toskánsko, Amalfi)",
      url: "Itálie",
      phrases: [
        { czech: "Dobrý den / Ahoj", foreign: "Buongiorno / Ciao", pronunciation: "Bondžorno / Čao" },
        { czech: "Děkuji mockrát", foreign: "Grazie mille", pronunciation: "Gracie mile" },
        { czech: "Kde je toaleta?", foreign: "Dov'è il bagno?", pronunciation: "Dové il banjo" },
        { czech: "Účet, prosím", foreign: "Il conto, per favore", pronunciation: "Il konto, per favóre" },
        { czech: "Mluvíte anglicky?", foreign: "Parla inglese?", pronunciation: "Parla ingléze" },
      ]
    },
    es: {
      title: "🇪🇸 Španělská spojka",
      desc: "Španělsko (Katalánsko, Andalusie, Kanáry)",
      url: "Španělsko",
      phrases: [
        { czech: "Ahoj / Dobrý den", foreign: "Hola / Buenos días", pronunciation: "Ola / Buenos dyas" },
        { czech: "Děkuji", foreign: "Gracias", pronunciation: "Grasijas" },
        { czech: "Prosím", foreign: "Por favor", pronunciation: "Por favór" },
        { czech: "Kolik to stojí?", foreign: "¿Cuánto cuesta?", pronunciation: "Kunto kuesta" },
        { czech: "Kde je pláž?", foreign: "¿Dónde está la playa?", pronunciation: "Donde está la plaja" },
      ]
    },
    fr: {
      title: "🇫🇷 Francouzská noblesa",
      desc: "Francie (Paříž, Provence, Rivijéra)",
      url: "Francie",
      phrases: [
        { czech: "Dobrý den / Ahoj", foreign: "Bonjour / Salut", pronunciation: "Bonžůr / Salů" },
        { czech: "Děkuji / Prosím", foreign: "Merci / S'il vous plaît", pronunciation: "Mersí / Sil vu ple" },
        { czech: "Kde je metro?", foreign: "Où est le métro?", pronunciation: "U e le metró" },
        { czech: "Nerozumím", foreign: "Je ne comprends pas", pronunciation: "Že ne konpran pa" },
        { czech: "Vodu, prosím", foreign: "De l'eau, s'il vous plaît", pronunciation: "De ló, sil vu ple" },
      ]
    },
    de: {
      title: "🇩🇪 Německá preciznost",
      desc: "Německo & Rakousko (Alpy, Berlín, Vídeň)",
      url: "Německo",
      phrases: [
        { czech: "Dobrý den / Ahoj", foreign: "Guten Tag / Hallo", pronunciation: "Gúten tág / Haló" },
        { czech: "Děkuji mnohokrát", foreign: "Vielen Dank", pronunciation: "Fílen dank" },
        { czech: "Kde je toaleta?", foreign: "Wo ist die Toilette?", pronunciation: "Vó ist dý toalete" },
        { czech: "Účet, prosím", foreign: "Die Rechnung, bitte", pronunciation: "Dý rechnunk, bite" },
        { czech: "Mluvíte anglicky?", foreign: "Sprechen Sie Englisch?", pronunciation: "Šprechen zý engliš" },
      ]
    },
    pl: {
      title: "🇵🇱 Polské sousedství",
      desc: "Polsko (Krakov, Balt, Mazury)",
      url: "Polsko",
      phrases: [
        { czech: "Dobrý den / Ahoj", foreign: "Dzień dobry / Cześć", pronunciation: "Džeň dobry / Češč" },
        { czech: "Děkuji moc", foreign: "Dziękuję bardzo", pronunciation: "Dženkuje bardžo" },
        { czech: "Kde je toaleta?", foreign: "Gdzie jest toaleta?", pronunciation: "Gdže jest toaleta" },
        { czech: "Účet, prosím", foreign: "Poproszę rachunek", pronunciation: "Poproše rachuňek" },
        { czech: "Mluvíte anglicky?", foreign: "Czy mówi pan/pani po angielsku?", pronunciation: "Čy muvi pan/pani po angielsku" },
      ]
    }
  };

  const handleSearch = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const activeQuery = customPrompt || query;
    if (!activeQuery.trim() && !destination.trim()) return;

    setLoading(true);
    setGuideResult("");
    setIsFallback(false);

    if (destination.trim()) {
      localStorage.setItem("dovolena_current_destination", destination.trim());
      localStorage.setItem("sbaleno_current_destination", destination.trim());
    }

    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: activeQuery.trim(),
          destination: destination.trim(),
          assistant,
        }),
      });

      let data: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        if (response.ok) {
          setGuideResult(data.text);
          setIsFallback(!!data.isFallback);
        } else {
          setGuideResult(`❌ Chyba serveru: ${data.error}`);
        }
      } else {
        const errorText = await response.text();
        const cleanText = errorText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
        setGuideResult(`❌ Chyba serveru (Status ${response.status}): ${cleanText || "Nečitelná odpověď"}`);
      }
    } catch (e: any) {
      setGuideResult(`❌ Nepodařilo se připojit k průvodci dovolena.ai: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Search Input Box */}
      <div className="lg:col-span-5 space-y-6 no-print">
        <div className="bg-white p-6 rounded-3xl border border-[#FFE0D1] shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 bg-[#FFF0F0] rounded-xl text-[#FF6B6B]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-[#2D3436]">Zvyky & Překlady</h2>
              <p className="text-xs text-[#636E72]">Zeptej se na cokoliv ohledně jazyků nebo chování</p>
            </div>
          </div>

          <form onSubmit={(e) => handleSearch(e)} className="space-y-4">
            {/* Optional State */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#636E72] mb-1">
                📍 Destinace (volitelné)
              </label>
              <input
                type="text"
                placeholder="Např. Egypt, Thajsko, USA..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 focus:border-[#FF6B6B] focus:ring-1 focus:ring-[#FF6B6B] rounded-xl py-2.5 px-4 outline-none text-[#2D3436] text-sm"
              />
            </div>

            {/* Custom Input */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#636E72] mb-1">
                💬 Co chceš přeložit nebo zjistit?
              </label>
              <textarea
                placeholder="Např.: Jak si v thajštině objednám jídlo bez piva? / Jaké jsou zvyky ohledně spropitného v Egyptě?"
                rows={3}
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 focus:border-[#FF6B6B] focus:ring-1 focus:ring-[#FF6B6B] rounded-xl py-2.5 px-3.5 text-xs outline-none text-[#2D3436] resize-none font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-black text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                loading ? "bg-stone-300" : "bg-[#FF6B6B] hover:bg-[#FF8E71] active:scale-95"
              }`}
            >
              {loading ? "Pokládám dotaz..." : "Zeptat se asistentky"}
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Quick select cards */}
        <div className="bg-white p-6 rounded-3xl border border-[#FFE0D1] shadow-sm">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#FF6B6B] mb-3 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#FF6B6B]" />
            <span>Rychlé nouzové fráze</span>
          </h3>
          <p className="text-[11px] text-[#636E72] mb-4 leading-relaxed font-semibold">
            Vyber si nejnavštěvovanější destinace pro okamžitý tahák bez čekání:
          </p>

          <div className="flex flex-col gap-2">
            {Object.entries(fastPhrases).map(([id, item]) => (
              <button
                key={id}
                onClick={() => setSelectedLangCard(id)}
                className={`w-full text-left p-3 rounded-2xl border text-xs flex justify-between items-center transition-all cursor-pointer ${
                  selectedLangCard === id
                    ? "border-[#FF6B6B] bg-[#FFF0F0] font-bold text-[#FF6B6B]"
                    : "border-stone-200 hover:border-stone-300 bg-white"
                }`}
              >
                <div>
                  <div className="font-extrabold text-[#2D3436]">{item.title}</div>
                  <div className="text-[10px] text-[#636E72] font-semibold">{item.desc}</div>
                </div>
                <Globe className={`w-4 h-4 shrink-0 transition-transform ${selectedLangCard === id ? "rotate-12 text-[#FF6B6B]" : "text-stone-400"}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Guide details area */}
      <div className="lg:col-span-7">
        {loading ? (
          <div className="bg-white p-12 rounded-3xl border border-[#FFE0D1] shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="h-4 w-4 rounded-full bg-[#FF6B6B] animate-ping scale-200 mb-5" />
            <h3 className="text-lg font-black text-[#2D3436]">Ověřuji zvyky a slovník...</h3>
            <p className="text-xs text-[#636E72] font-semibold">Připravuji fonetickou výslovnost.</p>
          </div>
        ) : guideResult ? (
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#FFE0D1] shadow-sm relative animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-[#FF6B6B]" />
              <h3 className="font-extrabold text-[#2D3436] text-lg">Průvodce dovolena.ai</h3>
              {isFallback && (
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-bold ml-auto">
                  Demo
                </span>
              )}
            </div>

            <div className="markdown-body text-[#2D3436] prose prose-stone text-sm max-w-none font-sans leading-relaxed">
              <ReactMarkdown components={customMarkdownComponents}>{guideResult}</ReactMarkdown>
            </div>

            <button
              onClick={() => setGuideResult("")}
              className="mt-6 text-xs text-[#FF6B6B] font-bold underline cursor-pointer no-print focus:outline-none"
            >
              Zpět na předpřipravené fráze
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Display select card phrases */}
            <div className="bg-white rounded-3xl p-6 border border-[#FFE0D1] shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-light-pink pb-3">
                <Globe className="w-5 h-5 text-[#FF6B6B]" />
                <div>
                  <h3 className="font-extrabold text-[#2D3436] text-base">
                    {fastPhrases[selectedLangCard].title}
                  </h3>
                  <p className="text-[10px] text-[#636E72] font-semibold">Kompletní rychlocvičení výslovnosti</p>
                </div>
              </div>

              <div className="divide-y divide-stone-150">
                {fastPhrases[selectedLangCard].phrases.map((phrase, idx) => (
                  <div key={idx} className="py-3 flex flex-col sm:flex-row justify-between gap-1 hover:bg-[#FFF0F0]/5 px-1.5 rounded-xl transition-all">
                    <span className="text-xs font-bold text-[#636E72]">🇨🇿 {phrase.czech}</span>
                    <div className="flex flex-col sm:items-end">
                      <span className="text-sm font-black text-[#2D3436]">{phrase.foreign}</span>
                      <span className="text-[11px] text-[#FF6B6B] font-mono font-bold mt-0.5">
                        [{phrase.pronunciation}]
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 p-3.5 bg-[#FFF0F0]/30 border border-[#FFE0D1]/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2">
                <span className="text-[11px] text-[#636E72] font-bold">Chceš víc frází na míru nebo celého průvodce?</span>
                <button
                  onClick={() => {
                    setDestination(fastPhrases[selectedLangCard].url);
                    setQuery(`Základní chování a 5 užitečných frází pro zemi: ${fastPhrases[selectedLangCard].url}`);
                    handleSearch(undefined, `Základní chování a 5 užitečných frází pro zemi: ${fastPhrases[selectedLangCard].url}`);
                  }}
                  className="bg-[#2D3436] text-white rounded-xl py-2 px-4 text-[10px] font-black hover:bg-[#1E2528] cursor-pointer transition-all active:scale-95 shadow-sm"
                >
                  Dotázat AI asistentku 🚀
                </button>
              </div>
            </div>

            {/* Travel safety cards */}
            <div className="bg-[#2D3436] text-stone-100 p-6 rounded-3xl relative overflow-hidden shadow-md">
              <div className="absolute right-3 bottom-0 translate-y-4 opacity-5">
                <ShieldAlert className="w-40 h-40" />
              </div>

              <h4 className="font-extrabold text-sm mb-3 flex items-center gap-1.5 text-[#FFE66D]">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#FFE66D]" />
                <span>Nouzová bezpečnostní doporučení mzv.cz</span>
              </h4>

              <p className="text-xs text-stone-300 leading-normal mb-4 font-sans font-medium">
                Krizové a nouzové kontakty se liší podle destinace. Než vyrazíš do rizikovějších zemí, zaregistruj se do českého vládního systému <strong>DROZD</strong> na webu Ministerstva zahraničních věcí ČR. Umožní to ambasádám kontaktovat tě v případě živelných katastrof nebo nepokojů.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs font-medium">
                <div className="bg-[#1E2528]/80 p-3 rounded-2xl border border-stone-850">
                  <div className="font-bold text-stone-100">🇪🇺 Tísňové rádio (EU)</div>
                  <div className="text-xl font-extrabold text-[#FFE66D] font-mono mt-0.5">112</div>
                  <div className="text-[10px] text-stone-400 leading-snug">Volej zdarma z jakéhokoliv mobilu, i bez SIM karty.</div>
                </div>
                <div className="bg-[#1E2528]/80 p-3 rounded-2xl border border-stone-850">
                  <div className="font-bold text-stone-100">🇨🇿 Česká MZV linka</div>
                  <div className="text-sm font-semibold text-[#FFE66D] mt-1 hover:underline">mzv.cz/cestujeme</div>
                  <div className="text-[10px] text-stone-400 leading-snug">Zde najdeš krizové kontakty na české velvyslanectví v dané zemi.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
