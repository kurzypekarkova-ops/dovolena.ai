import { useState, useEffect } from "react";
import { Luggage, Compass, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: "itinerary" | "checklist" | "guide" | "roast") => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setHasApiKey(data.hasApiKey))
      .catch(() => setHasApiKey(false));
  }, []);

  return (
    <header className="w-full bg-white border-b border-[#FFE0D1] shadow-xs sticky top-0 z-50 no-print md:hidden">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-row items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-[#FF6B6B] text-white p-2 rounded-xl shadow-md flex items-center justify-center">
            <Luggage className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tracking-tight text-[#FF6B6B] font-sans">
                dovolena<span className="text-[#FF6B6B]">.ai</span>
              </span>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#FFE66D] border border-amber-300 text-amber-900 font-sans">
                V2.5
              </span>
            </div>
            <div className="text-[9px] text-[#636E72] font-semibold -mt-0.5">webka od Kateřina Pekárková</div>
          </div>
        </div>

        {/* System API Status */}
        <div className="flex items-center gap-2">
          {hasApiKey === null ? (
            <div className="h-2 w-2 rounded-full bg-stone-300" />
          ) : hasApiKey ? (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>AI</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFE66D]/20 border border-[#FFE66D] text-amber-900 text-[10px] font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              <span>Demo</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="max-w-6xl mx-auto px-2 overflow-x-auto border-t border-[#FFE0D1]/60">
        <nav className="flex gap-1.5 py-2 scrollbar-none font-sans font-semibold text-xs">
          {[
            { id: "itinerary", label: "🗺️ Itinerář", desc: "Plán na míru" },
            { id: "checklist", label: "🎒 Checklist", desc: "Co s sebou" },
            { id: "guide", label: "💬 Průvodce", desc: "Zvyky a slova" },
            { id: "roast", label: "🔥 Roast", desc: "Zkritizuj kufr" },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3.5 rounded-xl flex flex-col items-center justify-center text-center whitespace-nowrap transition-all duration-200 cursor-pointer flex-1 ${
                  isSelected
                    ? "bg-[#FFF0F0] text-[#FF6B6B] border border-[#FFE0D1]"
                    : "text-[#636E72] hover:text-[#2D3436] hover:bg-[#F0F2F5]/60"
                }`}
              >
                <span className="font-bold text-xs">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
