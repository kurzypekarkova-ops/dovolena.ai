import { useState, useEffect } from "react";
import { Sparkles, ClipboardCheck, Plus, Trash2, RefreshCw, Printer, AlertTriangle } from "lucide-react";

interface ChecklistItem {
  id: string;
  category: string;
  name: string;
  note: string;
  checked: boolean;
}

export default function ChecklistView({ assistant = "eliska" }: { assistant?: string }) {
  const [destinationInput, setDestinationInput] = useState("");
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(4);
  const [durationValue, setDurationValue] = useState(4);
  const [durationUnit, setDurationUnit] = useState<"dny" | "tydny" | "mesice">("dny");
  const [season, setSeason] = useState("léto");
  const [tripType, setTripType] = useState("kombinace");
  const [withKids, setWithKids] = useState("ne");

  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState("");
  const [isFallback, setIsFallback] = useState(false);

  // Sync days state with durationValue and durationUnit
  useEffect(() => {
    let computedDays = durationValue;
    if (durationUnit === "tydny") computedDays = durationValue * 7;
    else if (durationUnit === "mesice") computedDays = durationValue * 30;
    setDays(computedDays);
  }, [durationValue, durationUnit]);

  // Interactive items parsed from markdown text
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [buyItems, setBuyItems] = useState<string[]>([]);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemCategory, setCustomItemCategory] = useState("👗 Oblečení");

  // Load state from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dovolena_current_checklist") || localStorage.getItem("sbaleno_current_checklist");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setItems(parsed.items || []);
        setBuyItems(parsed.buyItems || []);
        
        const activeDest = parsed.destination || "";
        setDestination(activeDest);
        setDestinationInput(activeDest);
        
        const loadedDays = parsed.days || 4;
        setDays(loadedDays);
        setDurationValue(loadedDays);
        setDurationUnit("dny");
        setSeason(parsed.season || "léto");
        setTripType(parsed.tripType || "kombinace");
        setWithKids(parsed.withKids || "ne");
        setRawText(parsed.rawText || "");
        setIsFallback(!!parsed.isFallback);
      } catch (e) {
        console.error("Failed to parse saved checklist state", e);
      }
    }
  }, []);

  // Save changes to local storage safely with optional direct override values to avoid state update race conditions
  const saveToLocalStorage = (
    updatedItems: ChecklistItem[],
    updatedBuy?: string[],
    overrideDestination?: string,
    overrideDays?: number,
    overrideSeason?: string,
    overrideTripType?: string,
    overrideWithKids?: string
  ) => {
    const finalDestination = overrideDestination !== undefined ? overrideDestination : destination;
    const finalDays = overrideDays !== undefined ? overrideDays : days;
    const finalSeason = overrideSeason !== undefined ? overrideSeason : season;
    const finalTripType = overrideTripType !== undefined ? overrideTripType : tripType;
    const finalWithKids = overrideWithKids !== undefined ? overrideWithKids : withKids;
    const finalBuyItems = updatedBuy !== undefined ? updatedBuy : buyItems;

    const backupState = {
      items: updatedItems,
      buyItems: finalBuyItems,
      destination: finalDestination,
      days: finalDays,
      season: finalSeason,
      tripType: finalTripType,
      withKids: finalWithKids,
      rawText,
      isFallback
    };
    localStorage.setItem("dovolena_current_checklist", JSON.stringify(backupState));

    // Keep global attributes in sync for other custom tabs, e.g. sidebar and header
    if (finalDestination) {
      localStorage.setItem("dovolena_current_destination", finalDestination.trim());
      localStorage.setItem("sbaleno_current_destination", finalDestination.trim());
    }
    if (finalDays) {
      localStorage.setItem("dovolena_current_days", finalDays.toString());
      localStorage.setItem("sbaleno_current_days", finalDays.toString());
    }
  };

  // Helper parser: reads AI markdown response and converts list bullets to ChecklistItems
  const parseChecklistMarkdown = (markdown: string, activeDest: string) => {
    const lines = markdown.split("\n");
    const parsedItems: ChecklistItem[] = [];
    const parsedBuyLines: string[] = [];
    
    let currentCategory = "👗 Oblečení";
    let isBuySection = false;

    // Standard categories map
    const categoryKeywords: { [key: string]: string } = {
      "doklady": "📄 Doklady & finance",
      "finance": "📄 Doklady & finance",
      "oblečen": "👗 Oblečení",
      "toalet": "🧴 Toalety & lékárnička",
      "lékár": "🧴 Toalety & lékárnička",
      "speci": "🛍️ Specifické pro tuto cestu",
      "pláž": "🛍️ Specifické pro tuto cestu",
      "hor": "🛍️ Specifické pro tuto cestu",
      "měst": "🛍️ Specifické pro tuto cestu",
      "elektr": "📱 Elektronika",
      "děti": "👶 Pro děti",
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Identify header categories
      if (trimmed.startsWith("**Ještě dokoupit") || trimmed.includes("dokoupit / dobalit") || trimmed.includes("dokoupit/dobalit")) {
        isBuySection = true;
        return;
      }

      // Check of header changes (denoted by header tags e.g. #, ##, or emojis)
      if (trimmed.startsWith("#") || trimmed.startsWith("**") || (trimmed.match(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g) && trimmed.length < 50)) {
        isBuySection = false;
        
        // Find matching category
        const lowerLine = trimmed.toLowerCase();
        let matched = false;
        
        for (const [key, catName] of Object.entries(categoryKeywords)) {
          if (lowerLine.includes(key)) {
            currentCategory = catName;
            matched = true;
            break;
          }
        }
        
        if (!matched && trimmed.length < 40) {
          // Fallback category clean name
          currentCategory = trimmed.replace(/[\*#_]/g, "").trim();
        }
        return;
      }

      // Parse list items
      if (isBuySection) {
        if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.match(/^\d+\./)) {
          const buyItem = trimmed.replace(/^[-*\s\d\.]+/, "").trim();
          if (buyItem) {
            parsedBuyLines.push(buyItem);
          }
        }
      } else {
        if (trimPrefixCheck(trimmed)) {
          // Clean the prefix
          const itemText = trimmed.replace(/^[-*\s\[\]\s]+/, "").trim();
          if (!itemText) return;

          // Split name and note by dash/colon
          let name = itemText;
          let note = "";

          // Match delimiters: –, —, -, :
          const matchDelimiter = itemText.match(/\s*(?:–|—|:|-)\s*(.*)/);
          if (matchDelimiter) {
            const separatorIndex = itemText.indexOf(matchDelimiter[0]);
            name = itemText.substring(0, separatorIndex).trim();
            note = matchDelimiter[1].trim();
          }

          parsedItems.push({
            id: Math.random().toString(36).substring(2, 9),
            category: currentCategory,
            name,
            note: note || "Důležitá věc",
            checked: false
          });
        }
      }
    });

    // Fallbacks if no items successfully parsed
    if (parsedItems.length === 0) {
      parsedItems.push({
        id: "1",
        category: "📄 Doklady & finance",
        name: "Cestovní doklady",
        note: "Zkontroluj si platnost občanského průkazu nebo pasu",
        checked: false
      });
      parsedItems.push({
        id: "2",
        category: "👗 Oblečení",
        name: "Oblečení na první dny",
        note: "Zabal si vrstvené oblečení",
        checked: false
      });
    }

    const finalBuy = parsedBuyLines.length > 0 ? parsedBuyLines : ["Powerbanku plně nabít", "Lékárničku sbalit", "Cestovní mini sprchový gel"];

    setItems(parsedItems);
    setBuyItems(finalBuy);
    saveToLocalStorage(parsedItems, finalBuy, activeDest, days, season, tripType, withKids);
  };

  const trimPrefixCheck = (line: string): boolean => {
    return line.startsWith("-") || line.startsWith("*") || line.startsWith("[ ]");
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationInput.trim()) return;

    setLoading(true);
    setItems([]);
    setBuyItems([]);

    const activeDest = destinationInput.trim();
    setDestination(activeDest);

    // Save trip details dynamically to sync other parts of UI
    localStorage.setItem("dovolena_current_destination", activeDest);
    localStorage.setItem("dovolena_current_days", days.toString());
    localStorage.setItem("sbaleno_current_destination", activeDest);
    localStorage.setItem("sbaleno_current_days", days.toString());

    try {
      const response = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: activeDest,
          days,
          season,
          type: tripType,
          children: withKids === "ano",
          assistant,
        }),
      });

      let data: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        if (response.ok) {
          setRawText(data.text);
          setIsFallback(!!data.isFallback);
          parseChecklistMarkdown(data.text, activeDest);
        } else {
          alert(`❌ Nepodařilo se vytvořit checklist: ${data.error}`);
        }
      } else {
        const errorText = await response.text();
        const cleanText = errorText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
        alert(`❌ Chyba serveru při vytváření checklistu (Status ${response.status}): ${cleanText || "Nečitelná odpověď"}`);
      }
    } catch (error: any) {
      alert(`❌ Problém na serveru při balení: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEmpty = () => {
    const defaultDest = destinationInput.trim() || "Moje dovolená";
    setDestination(defaultDest);
    setDestinationInput(defaultDest);

    const bootstrapItems: ChecklistItem[] = [
      {
        id: "m1",
        category: "📄 Doklady & finance",
        name: "Cestovní pas / Občanka",
        note: "Zkontroluj si datum platnosti",
        checked: false
      },
      {
        id: "m2",
        category: "👗 Oblečení",
        name: "Pohodlné boty na cestu",
        note: "Sbaleno na sebe",
        checked: false
      }
    ];

    setItems(bootstrapItems);
    setBuyItems(["Lékárnička a léky", "Voda a svačina na cestu"]);
    saveToLocalStorage(bootstrapItems, ["Lékárnička a léky", "Voda a svačina na cestu"], defaultDest, days, season, tripType, withKids);
  };

  const toggleCheck = (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updated);
    saveToLocalStorage(updated);
  };

  const deleteItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    saveToLocalStorage(updated);
  };

  const addCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) return;

    let name = customItemName.trim();
    let note = "Vlastní položka";

    // Dynamic separator check: let them add details right inside the text field!
    const matchDelimiter = name.match(/\s*(?:–|—|:|-)\s*(.*)/);
    if (matchDelimiter) {
      const separatorIndex = name.indexOf(matchDelimiter[0]);
      name = customItemName.substring(0, separatorIndex).trim();
      note = matchDelimiter[1].trim();
    }

    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substring(2, 9),
      category: customItemCategory,
      name,
      note,
      checked: false,
    };

    const updated = [...items, newItem];
    setItems(updated);
    saveToLocalStorage(updated);
    setCustomItemName("");
  };

  const clearChecklist = () => {
    if (confirm("Opravdu chceš resetovat celý checklist a smazat pokrok?")) {
      setItems([]);
      setBuyItems([]);
      setDestination("");
      setDestinationInput("");
      setRawText("");
      localStorage.removeItem("dovolena_current_checklist");
      localStorage.removeItem("sbaleno_current_checklist");
    }
  };

  // Group items by category (keeping pre-defined or custom-added ones)
  const defaultCategoriesOrder = [
    "📄 Doklady & finance",
    "👗 Oblečení",
    "🧴 Toalety & lékárnička",
    "📱 Elektronika",
    "🛍️ Specifické pro tuto cestu",
    "👶 Pro děti"
  ];

  // Get active categories representing existing items plus defaults
  const activeCategories = Array.from(new Set([
    ...items.map((i) => i.category),
    ...defaultCategoriesOrder
  ])).filter((cat) => {
    // Show either category with elements, or default categories if items list is active
    if (cat === "👶 Pro děti" && withKids !== "ano" && items.filter(i => i.category === cat).length === 0) {
      return false;
    }
    return true;
  });

  // Calculate completion percentage
  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Parameter Selection card */}
      <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#FFE0D1] shadow-sm no-print">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 bg-[#FFF0F0] rounded-xl text-[#FF6B6B]">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-[#2D3436]">Checklist na balení</h2>
            <p className="text-xs text-[#636E72]">Dovolena.ai ti sestaví dokonalý seznam věcí na cestu</p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Destination */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#636E72] mb-1.5">
              🌍 Cílová země nebo město
            </label>
            <input
              type="text"
              required
              placeholder="Např. Barcelona, Tatry, Thajsko..."
              value={destinationInput}
              onChange={(e) => setDestinationInput(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 focus:border-[#FF6B6B] focus:ring-1 focus:ring-[#FF6B6B] rounded-xl py-2.5 px-4 outline-none text-[#2D3436] text-sm font-sans font-medium"
            />
          </div>

          {/* Duration slider & Unit selector */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#636E72]">
                📅 Na jak dlouho?
              </label>
              <div className="flex bg-[#FFF0F0] rounded-xl p-0.5 border border-[#FFE0D1]">
                <button
                  type="button"
                  onClick={() => { setDurationUnit("dny"); if (durationValue > 30) setDurationValue(4); }}
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

          {/* Season / Weather */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#636E72] mb-1.5">
              ☀️ Roční období / počasí
            </label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 focus:border-[#FF6B6B] focus:ring-1 focus:ring-[#FF6B6B] rounded-xl py-2.5 px-4 outline-none text-[#2D3436] text-sm font-sans font-medium cursor-pointer"
            >
              <option value="horké léto">☀️ Horké léto / slunce</option>
              <option value="deštivý podzim">🍂 Podzim / chladno & déšť</option>
              <option value="mrazivá zima">❄️ Zima / sníh & mráz</option>
              <option value="jarní proměnlivé">🌱 Jaro / vlahé proměnlivé</option>
            </select>
          </div>

          {/* Trip Type */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#636E72] mb-2">
              🏔️ Typ cesty a terén
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: "pláž", label: "🏖️ Pláž & Moře" },
                { id: "hory", label: "🏔️ Hory & Příroda" },
                { id: "město", label: "🏙️ Městský Eurovíkend" },
                { id: "kombinace", label: "🎒 Mix / Dobrodruh" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTripType(opt.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    tripType === opt.id
                      ? "border-[#FF6B6B] bg-[#FFF0F0] text-[#FF6B6B] font-bold"
                      : "border-stone-200 bg-white hover:border-stone-300 text-stone-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Children Option */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#636E72] mb-2">
              👶 Balíš i pro děti?
            </label>
            <div className="flex gap-2">
              {[
                { id: "ne", label: "❌ Ne, jen pro sebe" },
                { id: "ano", label: "🍼 Ano, s dětmi" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWithKids(opt.id)}
                  className={`flex-1 py-2 px-3 border rounded-xl text-xs transition-all cursor-pointer ${
                    withKids === opt.id
                      ? "border-[#FF6B6B] bg-[#FFF0F0] text-[#FF6B6B] font-bold"
                      : "border-stone-200 bg-white hover:border-stone-300 text-stone-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-black text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              loading ? "bg-stone-300 cursor-not-allowed" : "bg-[#FF6B6B] hover:bg-[#FF8E71] active:scale-95"
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI skládá tvůj kufr...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Sestavit checklist</span>
              </>
            )}
          </button>
        </form>

        {/* Custom manual item injector */}
        {items.length > 0 && (
          <div className="mt-8 border-t border-stone-100 pt-6">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#2D3436] mb-3">
              ➕ Přidat detailní věc do seznamu
            </h3>
            <form onSubmit={addCustomItem} className="space-y-2">
              <input
                type="text"
                required
                placeholder="Např. Čtečka Kindle, Žabky..."
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-[#FF6B6B] font-medium"
              />
              <div className="flex gap-2">
                <select
                  value={customItemCategory}
                  onChange={(e) => setCustomItemCategory(e.target.value)}
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-xl py-1.5 px-2 text-[11px] cursor-pointer text-[#2D3436] font-bold"
                >
                  <option value="📄 Doklady & finance">📄 Doklady & finance</option>
                  <option value="👗 Oblečení">👗 Oblečení</option>
                  <option value="🧴 Toalety & lékárnička">🧴 Toalety & lékárnička</option>
                  <option value="📱 Elektronika">📱 Elektronika</option>
                  <option value="🛍️ Specifické pro tuto cestu">🛍️ Specifické pro tuto cestu</option>
                  {withKids === "ano" && <option value="👶 Pro děti">👶 Pro děti</option>}
                </select>
                <button
                  type="submit"
                  className="bg-[#2D3436] hover:bg-[#1E2528] text-white rounded-xl px-4 py-1.5 text-xs font-black transition-all cursor-pointer"
                >
                  Přidat
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Checklist display panel */}
      <div className="lg:col-span-7">
        {loading ? (
          <div className="bg-white p-12 rounded-3xl border border-stone-200 shadow-md text-center flex flex-col items-center justify-center min-h-[500px]">
            <div className="bg-[#FFF0F0] p-6 rounded-full border border-[#FFE0D1] mb-4 animate-bounce">
              🎒
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-1">
              Chystáme tvůj balící lístek do destinace {destinationInput || "světa"}...
            </h3>
            <p className="text-xs text-stone-400 max-w-sm italic">
              Zvažujeme limit váhy zavazadla, počasí a to, zda jedeš s dětmi, abychom ti nenavrhli nic zbytečného!
            </p>
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-6">
            {/* Visual Header progress bar */}
            <div className="bg-white p-6 rounded-3xl border border-[#FFE0D1] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1.5 bg-neutral-100 w-full">
                <div
                  className="h-full bg-[#FF6B6B] transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between gap-4 mt-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xl text-[#2D3436] tracking-tight">
                      Kufr do: {destination}
                    </span>
                    {isFallback && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                        Demo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#636E72] font-semibold mt-0.5">
                    Sbaleno {checkedCount} z {totalCount} věcí ({percentage}%)
                  </p>
                </div>

                <div className="flex gap-1.5 no-print">
                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-xl border border-stone-200 hover:border-[#FF6B6B] hover:bg-[#FFF0F0] text-stone-600 cursor-pointer transition-all"
                    title="Vytisknout seznam"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearChecklist}
                    className="p-2 rounded-xl border border-stone-200 hover:border-red-500 hover:bg-rose-50 text-red-500 cursor-pointer transition-all"
                    title="Zahodit checklist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {percentage === 100 && (
                <div className="mt-4 p-3 bg-[#F7FFF7] border border-[#d4eed4] text-[#2e7d32] rounded-2xl flex items-center gap-2 text-xs font-bold">
                  <span>🎉 Skvělá práce! Máš sbaleno úplně všechno a tvá cesta může začít bez obav!</span>
                </div>
              )}
            </div>

            {/* Checklist Category Groups */}
            <div className="space-y-4">
              {activeCategories.map((category) => {
                const groupItems = items.filter((item) => item.category === category);
                return (
                  <div
                    key={category}
                    className="bg-white rounded-3xl border border-[#FFE0D1] shadow-xs overflow-hidden"
                  >
                    {/* Header bar of category */}
                    <div className="bg-[#FFF0F0] px-5 py-3 border-b border-[#FFE0D1] font-black text-xs text-[#FF6B6B] tracking-wider uppercase flex items-center justify-between">
                      <span>{category}</span>
                      <span className="font-mono text-[10px] bg-white text-[#FF6B6B] border border-[#FFE0D1] px-2.5 py-0.5 rounded-full font-bold">
                        {groupItems.filter((i) => i.checked).length} / {groupItems.length}
                      </span>
                    </div>

                    {/* Items list container */}
                    {groupItems.length > 0 ? (
                      <div className="divide-y divide-stone-150/65 px-2">
                        {groupItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => toggleCheck(item.id)}
                            className={`flex items-start justify-between gap-3 p-3.5 hover:bg-[#FFF0F0]/10 cursor-pointer transition-all ${
                              item.checked ? "opacity-65 bg-stone-50/40" : ""
                            }`}
                          >
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              {/* Checkbox badge circle indicator */}
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                  item.checked
                                    ? "border-[#4ECDC4] bg-[#4ECDC4] text-white"
                                    : "border-stone-300 bg-white hover:border-[#FF6B6B]"
                                  }`}
                              >
                                {item.checked && (
                                  <svg className="w-3 h-3 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="4">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <span
                                  className={`text-sm font-bold text-[#2D3436] block leading-tight ${
                                    item.checked ? "line-through text-stone-400 font-medium" : ""
                                  }`}
                                >
                                  {item.name}
                                </span>
                                {item.note && (
                                  <p className="text-[11px] text-[#636E72] font-semibold italic mt-0.5 max-w-xl leading-normal">
                                    {item.note}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteItem(item.id);
                              }}
                              className="p-1 text-stone-300 hover:text-red-500 hover:bg-stone-100 rounded focus:outline-none transition-all cursor-pointer"
                              title="Smazat uživatelskou věc"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-stone-400 text-xs italic">
                        Zatím zde nic není. Přidej první položku níže!
                      </div>
                    )}

                    {/* Highly accessible and attractive inline input for custom-type entry inside this category */}
                    <div className="p-2.5 bg-stone-50/70 border-t border-stone-100/80 flex gap-2">
                      <input
                        type="text"
                        placeholder={`+ Přidat věc do: ${category.replace(/[\uD800-\uDFFF].\s*/g, "").substring(0, 15)}...`}
                        className="flex-1 bg-white border border-stone-200 focus:border-[#FF6B6B] focus:ring-1 focus:ring-[#FF6B6B] rounded-xl px-3 py-1.5 text-xs outline-none font-medium text-[#2D3436]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = (e.currentTarget as HTMLInputElement).value.trim();
                            if (val) {
                              let name = val;
                              let note = "Vlastní položka";
                              const matchDelimiter = val.match(/\s*(?:–|—|:|-)\s*(.*)/);
                              if (matchDelimiter) {
                                const separatorIndex = val.indexOf(matchDelimiter[0]);
                                name = val.substring(0, separatorIndex).trim();
                                note = matchDelimiter[1].trim();
                              }
                              const newItem: ChecklistItem = {
                                id: Math.random().toString(36).substring(2, 9),
                                category,
                                name,
                                note,
                                checked: false,
                              };
                              const updated = [...items, newItem];
                              setItems(updated);
                              saveToLocalStorage(updated);
                              (e.currentTarget as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ještě dokoupit Section */}
            {buyItems.length > 0 && (
              <div className="bg-[#FFFDF5] border border-[#FFE0D1] p-5 rounded-3xl relative">
                <div className="absolute -top-3.5 left-5 bg-[#FFE66D] text-[#2D3436] border border-[#FFE0D1] font-black text-[10px] tracking-wider uppercase px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#2D3436]" />
                  <span>Ještě dokoupit / dobalit před odjezdem</span>
                </div>
                <div className="space-y-2 mt-2">
                  <p className="text-[11px] text-[#636E72] font-semibold font-sans">
                    Věci, na které cestovatelé do této konkrétní oblasti zapomínají nejčastěji:
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2.5">
                    {buyItems.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-[#2D3436] font-bold bg-white border border-[#FFE0D1] p-3 rounded-xl flex items-center gap-2 shadow-xs"
                      >
                        <span className="text-[#2D3436] font-mono text-[10px] bg-[#FFE66D]/70 w-5 h-5 rounded-full flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#FFE0D1] p-12 text-center min-h-[500px] flex flex-col items-center justify-center shadow-sm">
            <div className="bg-[#FFF0F0] p-4 rounded-2xl text-[#FF6B6B] mb-4">
              <ClipboardCheck className="w-10 h-10 stroke-1" />
            </div>
            <h3 className="font-extrabold text-[#2D3436] text-lg mb-1 font-sans">
              Zde se objeví tvůj interaktivní kufr
            </h3>
            <p className="text-[#636E72] text-sm max-w-sm leading-relaxed mb-6 font-semibold">
              Vyber kam, kdy a jak jedeš a my ti sestavíme přehledný seznam. Položky budeš moct přímo odškrtávat, takže nic nezapomeneš.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                type="button"
                onClick={handleStartEmpty}
                className="px-5 py-2.5 bg-[#2D3436] hover:bg-[#1E2528] text-white rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              >
                📝 Začit s prázdným checklistem
              </button>
              
              <div
                className="px-5 py-2.5 bg-white border border-stone-200 shadow-xs hover:border-[#FF6B6B] hover:text-[#FF6B6B] rounded-full text-xs font-bold text-stone-500 cursor-pointer transition-all whitespace-nowrap"
                onClick={() => {
                  setDestinationInput("Island");
                  setDestination("Island");
                  setSeason("deštivý podzim");
                  setTripType("hory");
                  const bootstrapItems = [
                    {
                      id: "m_isl_1",
                      category: "📄 Doklady & finance",
                      name: "Pas a řidičský průkaz",
                      note: "Pro zapůjčení auta na Islandu",
                      checked: false
                    },
                    {
                      id: "m_isl_2",
                      category: "👗 Oblečení",
                      name: "Nepromokavá bunda s membranou",
                      note: "Počasí se rychle mění",
                      checked: false
                    },
                    {
                      id: "m_isl_3",
                      category: "🧴 Toalety & lékárnička",
                      name: "Balzám na rty a krém s UV",
                      note: "Ochrana před ostrým větrem",
                      checked: false
                    }
                  ];
                  setItems(bootstrapItems);
                  setBuyItems(["Pláštěnku do deště", "Termosku na horký čaj"]);
                  saveToLocalStorage(bootstrapItems, ["Pláštěnku do deště", "Termosku na horký čaj"], "Island");
                }}
              >
                Rychlý setup: Podzimní Island 🏔️
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
