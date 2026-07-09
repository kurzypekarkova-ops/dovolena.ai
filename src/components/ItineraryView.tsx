import { useState, useEffect } from "react";
import { Compass, Calendar, Users, Heart, Clipboard, Printer, Sparkles, MapPin, Trash2, ArrowRight } from "lucide-react";
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
    const text = getRawText(children);
    const isSpecialHeading = text.toLowerCase().includes("den ") || text.toLowerCase().includes("praktické");
    return (
      <h3 
        className={`text-base md:text-lg font-black mt-8 mb-4 pb-2.5 flex items-center gap-2.5 font-sans tracking-tight border-b ${
          isSpecialHeading 
            ? "text-[#FF6B6B] border-[#FF6B6B]/20" 
            : "text-[#2D3436] border-stone-100"
        }`} 
        {...props}
      >
        <span className={`inline-block w-2.5 h-5 rounded-md shrink-0 ${isSpecialHeading ? "bg-[#FF6B6B]" : "bg-stone-300"}`}></span>
        {children}
      </h3>
    );
  },
  p: ({ children, ...props }: any) => {
    const text = getRawText(children).trim();
    
    // Safety check for warning box
    if (text.includes("Upozornění:") || text.includes("⚠️")) {
      return (
        <div className="bg-amber-50/80 border border-amber-200/50 p-4 rounded-2xl text-amber-900 text-xs font-semibold my-4 leading-relaxed flex gap-2.5 items-start shadow-xs" {...props}>
          <span className="text-base shrink-0 mt-0.5">⚠️</span>
          <div>{children}</div>
        </div>
      );
    }

    // Interactive day-segment wrapper
    const hasEmojiPrefix = /^[🌅☀️🌙💡]/.test(text);
    if (hasEmojiPrefix) {
      let titleText = "";
      let colorClass = "text-[#FF6B6B]";
      let bgClass = "bg-[#FFF9F5] border-[#FFE0D1]/60 hover:border-[#FF6B6B]/20";

      if (text.includes("🌅")) {
        titleText = "🌅 Ráno";
        colorClass = "text-[#FF6B6B]";
        bgClass = "bg-[#FFF9F5] border-[#FFE0D1]/60 hover:bg-[#FFF9F5] hover:border-[#FF6B6B]/20";
      } else if (text.includes("☀️")) {
        titleText = "☀️ Odpoledne";
        colorClass = "text-amber-500";
        bgClass = "bg-[#FFFDF5] border-amber-100 hover:bg-[#FFFDF5] hover:border-amber-200";
      } else if (text.includes("🌙")) {
        titleText = "🌙 Večer";
        colorClass = "text-indigo-500";
        bgClass = "bg-[#F7F9FF] border-slate-100 hover:bg-[#F7F9FF] hover:border-indigo-100";
      } else if (text.includes("💡")) {
        titleText = "💡 Lokální tip";
        colorClass = "text-amber-700";
        bgClass = "bg-[#FFFDF0] border-amber-200/80 hover:bg-[#FFFDF0] hover:border-amber-300";
      }

      return (
        <div className={`p-4 rounded-2xl border ${bgClass} my-3.5 flex gap-3.5 items-start shadow-xs hover:shadow-sm transition-all duration-300`} {...props}>
          <div className="flex-1 font-semibold">
            <span className={`font-black tracking-wider block text-[10px] font-mono mb-1 ${colorClass}`}>
              {titleText}
            </span>
            <div className="text-xs md:text-sm leading-relaxed text-stone-700 font-semibold">
              {children}
            </div>
          </div>
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
      <ul className="my-4 space-y-2.5 pl-1 bg-[#FFF9F5]/20 border border-[#FFE0D1]/40 p-4 rounded-2xl shadow-xs" {...props}>
        {children}
      </ul>
    );
  }
};

export default function ItineraryView({ assistant = "eliska" }: { assistant?: string }) {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [durationValue, setDurationValue] = useState(3);
  const [durationUnit, setDurationUnit] = useState<"dny" | "tydny" | "mesice">("dny");
  const [companion, setCompanion] = useState("pár");
  const [style, setStyle] = useState("kultura");

  // Sync days state with durationValue and durationUnit
  useEffect(() => {
    let computedDays = durationValue;
    if (durationUnit === "tydny") computedDays = durationValue * 7;
    else if (durationUnit === "mesice") computedDays = durationValue * 30;
    setDays(computedDays);
  }, [durationValue, durationUnit]);
  
  const [loading, setLoading] = useState(false);
  const [itineraryResult, setItineraryResult] = useState<string>("");
  const [isFallback, setIsFallback] = useState(false);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);

  // Loading messages to loop through for high-quality UX
  const [loadingMsg, setLoadingMsg] = useState("Vysíláme zvěda do lokálních ulic...");
  const loadingPhrases = [
    "Hledáme utajené rohy, kam turisté nechodí...",
    "Sestavujeme kávovou mapu pro dokonalé ráno...",
    "Ověřujeme otevírací doby nejlepších bister...",
    "Ptáme se místních na nejlepší vyhlídku...",
    "Ladíme praktické rady a nouzové kontakty...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      let idx = 0;
      interval = setInterval(() => {
        setLoadingMsg(loadingPhrases[idx % loadingPhrases.length]);
        idx++;
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Load saved trips from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dovolena_itineraries") || localStorage.getItem("sbaleno_itineraries");
    if (saved) {
      try {
        setSavedTrips(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveItinerary = (dest: string, resultText: string, fallbackActive: boolean) => {
    const newTrip = {
      id: Date.now().toString(),
      destination: dest,
      days,
      companion,
      style,
      itineraryText: resultText,
      createdAt: new Date().toLocaleDateString("cs-CZ"),
      isFallback: fallbackActive
    };
    const updated = [newTrip, ...savedTrips].slice(0, 10); // Limit to last 10
    setSavedTrips(updated);
    localStorage.setItem("dovolena_itineraries", JSON.stringify(updated));
  };

  const deleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTrips.filter((t) => t.id !== id);
    setSavedTrips(updated);
    localStorage.setItem("dovolena_itineraries", JSON.stringify(updated));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;

    setLoading(true);
    setItineraryResult("");
    setIsFallback(false);

    // Save current trip details to local storage so the top panel is updated instantly!
    localStorage.setItem("dovolena_current_destination", destination.trim());
    localStorage.setItem("dovolena_current_days", days.toString());
    localStorage.setItem("sbaleno_current_destination", destination.trim());
    localStorage.setItem("sbaleno_current_days", days.toString());

    try {
      const response = await fetch("/api/itinerary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: destination.trim(),
          days,
          companion: companion,
          style: style,
          assistant,
        }),
      });

      let data: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        if (response.ok) {
          setItineraryResult(data.text);
          setIsFallback(!!data.isFallback);
          saveItinerary(destination.trim(), data.text, !!data.isFallback);
        } else {
          setItineraryResult(`❌ Chyba: ${data.error || "Něco se pokazilo"}`);
        }
      } else {
        const errorText = await response.text();
        const cleanText = errorText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
        setItineraryResult(`❌ Chyba serveru (Status ${response.status}): ${cleanText || "Nečitelná odpověď serveru"}`);
      }
    } catch (error: any) {
      setItineraryResult(`❌ Nepodařilo se navázat spojení se serverem. ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!itineraryResult) return;
    navigator.clipboard.writeText(itineraryResult);
    alert("Itinerář úspěšně zkopírován do schránky! 📋");
  };

  const printItinerary = () => {
    window.print();
  };

  const companionOptions = [
    { id: "sám", label: "🧍 Sám/Sama", desc: "Čistá svoboda" },
    { id: "pár", label: "👩‍❤️‍👨 V páru", desc: "Romantika & sdílení" },
    { id: "rodina s dětmi", label: "👨‍👩‍👧‍👦 S dětmi", desc: "Pohodlí & radost" },
    { id: "parta přátel", label: "🍻 S partou", desc: "Zábava & ruch" },
  ];

  const styleOptions = [
    { id: "relaxace", label: "🧘 Relaxace", color: "from-teal-400 to-emerald-500", desc: "Wellness, pohodka, klidné tempo" },
    { id: "kultura", label: "🏛️ Kultura", color: "from-sky-400 to-blue-500", desc: "Muzea, architektura, historie" },
    { id: "jídlo a gastronomie", label: "🍕 Gurmánská", color: "from-rose-400 to-pink-500", desc: "Bistra, trhy, kulinářské objevy" },
    { id: "aktivní", label: "🏃 Aktivní", color: "from-amber-400 to-orange-500", desc: "Túry, sport, objevování v pohybu" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Search and planner form */}
      <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#FFE0D1] shadow-sm no-print">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 bg-[#FFF0F0] rounded-xl text-[#FF6B6B]">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-[#2D3436]">Naplánuj si cestu</h2>
            <p className="text-xs text-[#636E72] font-semibold">Sbaleno.ai ti sestaví nezapomenutelný plán na míru</p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Destination */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#636E72] mb-2">
              🌍 Kam vyrážíš? (Destinace, město nebo země)
            </label>
            <div className="relative">
              <input
                id="destination-input"
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Např. Řím, Island, Brno..."
                className="w-full bg-stone-50 border border-stone-200 focus:border-[#FF6B6B] focus:ring-1 focus:ring-[#FF6B6B] rounded-xl py-3 px-4 outline-none text-[#2D3436] transition-all font-sans font-medium"
              />
              <MapPin className="absolute right-3 top-3.5 w-5 h-5 text-stone-400" />
            </div>
          </div>

          {/* Duration slider & Unit selector */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-[#636E72]">
                📅 Na jak dlouho?
              </label>
              <div className="flex bg-[#FFF0F0] rounded-xl p-0.5 border border-[#FFE0D1]">
                <button
                  type="button"
                  onClick={() => { setDurationUnit("dny"); if (durationValue > 30) setDurationValue(3); }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${durationUnit === "dny" ? "bg-[#FF6B6B] text-white" : "text-[#FF6B6B] hover:bg-[#FFF0F0]"}`}
                >
                  Dny
                </button>
                <button
                  type="button"
                  onClick={() => { setDurationUnit("tydny"); if (durationValue > 12) setDurationValue(1); }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${durationUnit === "tydny" ? "bg-[#FF6B6B] text-white" : "text-[#FF6B6B] hover:bg-[#FFF0F0]"}`}
                >
                  Týdny
                </button>
                <button
                  type="button"
                  onClick={() => { setDurationUnit("mesice"); if (durationValue > 12) setDurationValue(1); }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${durationUnit === "mesice" ? "bg-[#FF6B6B] text-white" : "text-[#FF6B6B] hover:bg-[#FFF0F0]"}`}
                >
                  Měsíce
                </button>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <input
                type="range"
                min="1"
                max={durationUnit === "dny" ? 30 : 12}
                value={durationValue}
                onChange={(e) => setDurationValue(parseInt(e.target.value))}
                style={{ accentColor: "#FF6B6B" }}
                className="flex-1 h-2 bg-[#FFE0D1]/50 rounded-lg appearance-none cursor-pointer"
              />
              <span className="bg-[#FFF0F0] text-[#FF6B6B] font-extrabold text-xs px-2.5 py-1.5 rounded-xl border border-[#FFE0D1] whitespace-nowrap min-w-[70px] text-center">
                {durationValue} {
                  durationUnit === "dny"
                    ? (durationValue === 1 ? "den" : durationValue < 5 ? "dny" : "dní")
                    : durationUnit === "tydny"
                    ? (durationValue === 1 ? "týden" : durationValue < 5 ? "týdny" : "týdnů")
                    : (durationValue === 1 ? "měsíc" : durationValue < 5 ? "měsíce" : "měsíců")
                }
              </span>
            </div>
            <div className="flex justify-between text-[8px] text-stone-400 font-bold px-1 mt-1">
              <span>MIN: 1</span>
              <span>MAX: {durationUnit === "dny" ? 30 : 12}</span>
            </div>
          </div>

          {/* With whom */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#636E72] mb-2">
              👥 S kým cestuješ?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {companionOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCompanion(opt.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    companion === opt.id
                      ? "border-[#FF6B6B] bg-[#FFF0F0] text-[#FF6B6B] ring-1 ring-[#FF6B6B]"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <div className="font-extrabold text-xs text-[#2D3436]">{opt.label}</div>
                  <div className="text-[10px] text-[#636E72] leading-tight font-semibold mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Travelers theme style */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#636E72] mb-2">
              🎒 Jaký je tvůj cestovní styl?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {styleOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStyle(opt.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    style === opt.id
                      ? "border-[#FF6B6B] bg-[#FFF0F0] text-[#FF6B6B] ring-1 ring-[#FF6B6B]"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <div className="font-extrabold text-xs text-[#2D3436]">{opt.label}</div>
                  <div className="text-[10px] text-[#636E72] leading-tight font-semibold mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-black tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              loading
                ? "bg-stone-300 cursor-not-allowed"
                : "bg-[#FF6B6B] hover:bg-[#FF8E71] active:scale-95"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Sestavuji plán...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Navrhnout itinerář na míru</span>
              </>
            )}
          </button>
        </form>

        {/* Saved Trips log */}
        {savedTrips.length > 0 && (
          <div className="mt-8 border-t border-stone-100 pt-6">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#FF6B6B] mb-3">
              🗂️ Tvoje minulé plány
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {savedTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => {
                    setDestination(trip.destination);
                    setDays(trip.days);
                    setDurationUnit("dny");
                    setDurationValue(trip.days);
                    setCompanion(trip.companion);
                    setStyle(trip.style);
                    setItineraryResult(trip.itineraryText);
                    setIsFallback(!!trip.isFallback);
                  }}
                  className="p-2.5 rounded-xl border border-stone-150 hover:border-[#FF6B6B] hover:bg-[#FFF0F0]/30 flex items-center justify-between text-xs cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#2D3436]">{trip.destination}</span>
                    <span className="text-[10px] bg-stone-100 text-[#636E72] px-1.5 py-0.5 rounded font-mono font-bold">
                      {trip.days}d
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-400 font-bold">{trip.createdAt}</span>
                    <button
                      onClick={(e) => deleteTrip(trip.id, e)}
                      className="p-1 text-stone-400 hover:text-red-500 rounded hover:bg-stone-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Result presentation area */}
      <div className="lg:col-span-7">
        {loading ? (
          <div className="bg-white p-12 rounded-3xl border border-[#FFE0D1] shadow-sm text-center flex flex-col items-center justify-center min-h-[500px]">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#FF6B6B]/10 rounded-full animate-ping scale-150 opacity-75" />
              <div className="bg-[#FF6B6B] text-white p-5 rounded-full relative z-10">
                <Compass className="w-12 h-12 animate-spin-slow" />
              </div>
            </div>
            <h3 className="text-xl font-black text-[#2D3436] mb-2 font-sans">
              Plánujeme tvou expedici...
            </h3>
            <p className="text-[#636E72] text-sm max-w-sm font-sans italic font-semibold">
              &ldquo;{loadingMsg}&rdquo;
            </p>
          </div>
        ) : itineraryResult ? (
          <div className="bg-white rounded-3xl border border-[#FFE0D1] shadow-md overflow-hidden animate-fade-in">
            {/* Heading Bar */}
            <div className="bg-[#2D3436] text-white p-6 relative">
              <div className="absolute right-6 top-6 flex gap-2 no-print">
                <button
                  onClick={copyToClipboard}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="Kopírovat do schránky"
                >
                  <Clipboard className="w-4 h-4" />
                </button>
                <button
                  onClick={printItinerary}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="Vytisknout itinerář"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2 no-print">
                <Compass className="w-4 h-4 text-[#FF6B6B] animate-spin-slow" />
                <span className="text-xs text-[#FFE0D1] font-mono tracking-wider uppercase font-black">
                  Dovolena.ai Itinerář
                </span>
                {isFallback && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-md border border-amber-500/20 ml-2">
                    DEMO režim
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-extrabold tracking-tight font-sans text-stone-50">
                Itinerář: {destination}
              </h3>
              <p className="text-xs text-stone-300 mt-1 font-sans">
                {days} {days === 1 ? "den" : days < 5 ? "dny" : "dní"} • Styl: {style} • Cestovatel: {companion}
              </p>
            </div>

            {/* Itinerary markdown content wrapper */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="markdown-body text-[#2D3436] leading-relaxed font-sans prose prose-stone max-w-none prose-sm font-semibold">
                <ReactMarkdown components={customMarkdownComponents}>{itineraryResult}</ReactMarkdown>
              </div>

              {/* Action notice */}
              <div className="mt-8 pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4 no-print bg-[#FFF0F0]/10 border border-[#FFE0D1] p-4 rounded-2xl">
                <div className="text-xs text-[#636E72] max-w-md font-semibold">
                  💡 <strong>Tip pro tebe:</strong> Vytiskni si tento itinerář do kapsy nebo si ho zkopíruj přímo do své oblíbené poznámkové aplikace.
                </div>
                <button
                  onClick={printItinerary}
                  className="flex items-center gap-1.5 bg-[#2D3436] hover:bg-[#1E2528] text-stone-100 font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Vytisknout / Uložit PDF</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200 p-12 text-center min-h-[500px] flex flex-col items-center justify-center">
            <div className="bg-stone-150 p-4 rounded-2xl text-stone-400 mb-4">
              <Compass className="w-10 h-10 stroke-1 text-[#FF6B6B]" />
            </div>
            <h3 className="font-extrabold text-[#2D3436] text-lg mb-1 font-sans">
              Tvůj itinerář zde čeká na objevování
            </h3>
            <p className="text-[#636E72] text-sm max-w-sm leading-relaxed mb-6">
              Vyber si destinaci, nastav parametry cesty a my ti za sekundu vygenerujeme kompletní program s tajnými tipy z první ruky.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-500 bg-white shadow-xs border border-stone-200 rounded-full px-4 py-1.5 hover:text-[#FF6B6B] hover:border-[#FF6B6B] cursor-pointer transition-all"
                 onClick={() => {
                   setDestination("Řím");
                   const destInput = document.getElementById("destination-input");
                   if (destInput) destInput.focus();
                 }}>
              <span>Vyzkoušet vzorový Řím</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
