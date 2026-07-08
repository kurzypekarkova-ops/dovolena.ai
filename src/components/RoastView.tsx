import { useState, useRef, DragEvent } from "react";
import { Flame, Image as ImageIcon, Sparkles, Trash2, ShieldAlert, Star, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
    if (text.includes("Upozornění:") || text.includes("⚠️")) {
      return (
        <div className="bg-amber-50/80 border border-amber-200/50 p-4 rounded-2xl text-amber-900 text-xs font-semibold my-4 leading-relaxed flex gap-2.5 items-start shadow-xs animate-fade-in" {...props}>
          <span className="text-base shrink-0 mt-0.5">⚠️</span>
          <div>{children}</div>
        </div>
      );
    }

    if (text.startsWith("🔥") || text.includes("Roast:")) {
      return (
        <div className="p-4 rounded-2xl border-2 border-red-500 bg-stone-900 text-stone-100 my-4 flex gap-3.5 items-start shadow-md hover:-translate-y-0.5 transition-all duration-300" {...props}>
          <span className="text-2xl shrink-0 mt-0.5 animate-pulse">🔥</span>
          <div className="flex-1">
            <span className="font-mono text-stone-400 block text-[10px] uppercase tracking-widest font-black mb-1">Drsný soud</span>
            <div className="text-xs md:text-sm leading-relaxed text-stone-100 font-bold">{children}</div>
          </div>
        </div>
      );
    }

    if (text.startsWith("✅") || text.includes("Co je super")) {
      return (
        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 my-4 flex gap-3.5 items-start shadow-xs hover:shadow-sm transition-all duration-300" {...props}>
          <span className="text-xl shrink-0 mt-0.5">✅</span>
          <div className="flex-1">
            <span className="font-mono text-emerald-700 block text-[10px] uppercase tracking-widest font-black mb-1">Skvělá práce</span>
            <div className="text-xs md:text-sm leading-relaxed text-emerald-950 font-bold">{children}</div>
          </div>
        </div>
      );
    }

    if (text.startsWith("❌") || text.includes("Co tam nemá")) {
      return (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50/60 my-4 flex gap-3.5 items-start shadow-xs hover:shadow-sm transition-all duration-300" {...props}>
          <span className="text-xl shrink-0 mt-0.5">❌</span>
          <div className="flex-1">
            <span className="font-mono text-red-700 block text-[10px] uppercase tracking-widest font-black mb-1">Zbytečnosti ven!</span>
            <div className="text-xs md:text-sm leading-relaxed text-red-950 font-bold">{children}</div>
          </div>
        </div>
      );
    }

    if (text.startsWith("📦") || text.includes("Co chybí")) {
      return (
        <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/60 my-4 flex gap-3.5 items-start shadow-xs hover:shadow-sm transition-all duration-300" {...props}>
          <span className="text-xl shrink-0 mt-0.5">📦</span>
          <div className="flex-1">
            <span className="font-mono text-sky-700 block text-[10px] uppercase tracking-widest font-black mb-1">Bude ti chybět</span>
            <div className="text-xs md:text-sm leading-relaxed text-sky-950 font-bold">{children}</div>
          </div>
        </div>
      );
    }

    if (text.startsWith("⭐") || text.includes("skóre")) {
      return (
        <div className="p-5 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 text-amber-900 my-5 flex gap-4 items-center justify-center text-center shadow-md hover:-translate-y-0.5 transition-all duration-300 mx-auto max-w-md w-full" {...props}>
          <span className="text-3xl shrink-0 animate-bounce">⭐</span>
          <div>
            <span className="font-mono text-amber-800 block text-[11px] uppercase tracking-widest font-black mb-1">Celkové hodnocení</span>
            <div className="text-base md:text-lg leading-tight text-amber-950 font-black">{children}</div>
          </div>
        </div>
      );
    }

    return (
      <p className="my-2.5 text-stone-600 text-xs md:text-sm leading-relaxed font-semibold animate-fade-in" {...props}>
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

export default function RoastView({ assistant = "eliska" }: { assistant?: string }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [roastResult, setRoastResult] = useState("");
  const [isFallback, setIsFallback] = useState(false);
  
  // Image states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingPhrase, setLoadingPhrase] = useState("Skenuji obsah kufru...");
  const scanPhrases = [
    "Skenuji rentgenem... 🔍",
    "Analyzuji přebytek bavlny... 👚",
    "Hledám zapomenuté nabíječky... 📱",
    "Srovnávám váhu s letištním limitem... ⚖️",
    "Směji se tvým sedmi párům ponožek na víkend... 🧦",
    "Formuluji vtipné urážky... 🔥",
  ];

  // Funny tags they can click to auto-add to their checklist text quickly
  const funTags = [
    "Dvoje těžké džíny", "Fén na vlasy", "Celé balení šamponu", "Sedm párů spodního prádla na 3 dny",
    "Obyčejná knížka (700 stran)", "Tři náhradní mikiny", "Pláštěnka", "Notebook",
    "Čtyři páry bot", "Plyšový maskot"
  ];

  const handleTagToggle = (tag: string) => {
    if (description.includes(tag)) {
      setDescription(prev => prev.replace(tag + ", ", "").replace(tag, "").trim());
    } else {
      setDescription(prev => prev ? `${prev}, ${tag}` : tag);
    }
  };

  // Convert uploaded file to base64
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Nalezli jsme podezřelý objekt, ale na Packing Roast lze nahrát pouze obrázky (PNG, JPG, atd.) 🖼️");
      return;
    }
    setMimeType(file.type);
    
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageSrc(result);
      
      // Extract base64 part
      const base64 = result.split(",")[1];
      setBase64Data(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const removeImage = () => {
    setImageSrc(null);
    setBase64Data(null);
    setMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !base64Data) {
      alert("Prosím zadej popis tvého kufru nebo nahraj fotku ze své postele/skříně! 🧳");
      return;
    }

    setLoading(true);
    setRoastResult("");
    setIsFallback(false);

    // Loop loading scan phrases
    let index = 0;
    const interval = setInterval(() => {
      setLoadingPhrase(scanPhrases[index % scanPhrases.length]);
      index++;
    }, 2000);

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          imageData: base64Data,
          mimeType: mimeType,
          assistant,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setRoastResult(data.text);
        setIsFallback(!!data.isFallback);
      } else {
        setRoastResult(`❌ Zásah bleskem při roštění: ${data.error}`);
      }
    } catch (err: any) {
      setRoastResult(`❌ Nepodařilo se připojit k roastovacímu peklu dovolena.ai: ${err.message}`);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Search selection block */}
      <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#FFE0D1] shadow-sm no-print">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 bg-[#FFF0F0] rounded-xl text-[#FF6B6B] animate-pulse">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-[#2D3436]">Packing Roast 🔥</h2>
            <p className="text-xs text-[#636E72] font-sans">Ukaž, co balíš, a my ti vtipně povíme pravdu</p>
          </div>
        </div>

        <form onSubmit={triggerSearch} className="space-y-4">
          {/* Uploader section */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#636E72] mb-2">
              📸 Nahraj fotku otevřeného kufru nebo hromady na posteli
            </label>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-36 ${
                dragActive
                  ? "border-[#FF6B6B] bg-[#FFF0F0]"
                  : imageSrc
                  ? "border-stone-300 bg-stone-50/40"
                  : "border-stone-200 hover:border-[#FF6B6B] bg-stone-50/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {imageSrc ? (
                <div className="relative w-full max-w-48 aspect-video rounded-xl overflow-hidden shadow-xs">
                  <img
                    src={imageSrc}
                    alt="Suitcase draft"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage();
                    }}
                    className="absolute top-1.5 right-1.5 p-1.5 bg-[#2D3436]/85 hover:bg-[#2D3436] text-white rounded-full transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="mx-auto w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                    <ImageIcon className="w-5 h-5 text-[#FF6B6B]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2D3436] block">
                      Přetáhni fotku sem nebo klikni pro výběr
                    </span>
                    <span className="text-[10px] text-[#636E72] block font-sans font-semibold">
                      PNG, JPG či WEBP (max. 10MB)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Text input area */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#636E72] mb-2">
              📝 Co tam máš sbalené? Popiš nebo naklikej:
            </label>
            <textarea
              placeholder="Např.: Beru si 3 svetry, dvoje džíny, fén, spoustu kosmetiky a jedny sandály na týdenní trek v dešti..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 focus:border-[#FF6B6B] focus:ring-1 focus:ring-[#FF6B6B] rounded-xl py-2.5 px-3.5 text-xs outline-none text-[#2D3436] resize-none font-sans leading-normal"
            />
          </div>

          {/* Ready tag clicks */}
          <div>
            <p className="text-[10px] font-black text-[#636E72] uppercase mb-2">
              🏷️ Klikni na zbytečnosti pro rychlé sbalení:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {funTags.map((tag) => {
                const isSelected = description.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-black border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#FFF0F0] border-[#FF6B6B] text-[#FF6B6B] font-bold"
                        : "bg-white hover:bg-stone-50 border-stone-200 text-stone-600"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              loading
                ? "bg-stone-400 cursor-not-allowed"
                : "bg-[#FF6B6B] hover:bg-[#FF8E71] active:scale-95 text-stone-50"
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#FFE66D]" />
                <span>Uhlíky se rozpalují...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 fill-current text-[#FFE66D] animate-bounce" />
                <span>Zkritizovat mé sbalení (Roast)</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Result Display area */}
      <div className="lg:col-span-7">
        {loading ? (
          <div className="bg-[#2D3436] p-12 rounded-3xl border border-stone-800 shadow-xl text-center flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
            <div className="absolute inset-0 bg-[#FF6B6B]/5 animate-pulse" />
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#FF6B6B]/20 rounded-full animate-ping scale-150" />
              <div className="bg-[#FF6B6B] text-white p-5 rounded-full relative z-10 animate-bounce">
                <Flame className="w-12 h-12 fill-current text-[#FFE66D]" />
              </div>
            </div>
            
            <h3 className="text-xl font-black text-stone-100 mb-2 font-sans tracking-wide">
              PROBÍHÁ PACKING ROAST...
            </h3>
            <p className="text-stone-300 text-sm max-w-sm font-sans italic font-semibold">
              &ldquo;{loadingPhrase}&rdquo;
            </p>
          </div>
        ) : roastResult ? (
          <div className="bg-white rounded-3xl border border-[#FFE0D1] shadow-md overflow-hidden animate-fade-in">
            {/* Header band */}
            <div className="bg-[#2D3436] text-white p-6 relative">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-[#FF6B6B] animate-pulse fill-current" />
                <span className="text-xs text-[#FFE0D1] font-mono tracking-wider uppercase font-black">
                  Sbaleno.ai ROAST KUFROVNÍKU
                </span>
                {isFallback && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/20">
                    DEMO režim
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight font-sans">
                Rozsudek tvého balení! ⚖️
              </h3>
              <p className="text-xs text-stone-300 mt-1 font-semibold">
                Zhodnoceno přátelskou asistentkou. Vezmi si to k srdci, ale nebuď smutný!
              </p>
            </div>

            {/* Markdown result area */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="markdown-body text-[#2D3436] leading-relaxed font-sans prose prose-rose max-w-none prose-sm">
                <ReactMarkdown components={customMarkdownComponents}>{roastResult}</ReactMarkdown>
              </div>

              {/* Reset action in box */}
              <div className="mt-8 pt-5 border-t border-stone-150 flex justify-end no-print">
                <button
                  onClick={() => {
                    setRoastResult("");
                    setDescription("");
                    setImageSrc(null);
                    setBase64Data(null);
                  }}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-[#FFF0F0] hover:text-[#FF6B6B] text-[#2D3436] font-black text-xs rounded-xl transition-all cursor-pointer"
                >
                  Zkusit sbalit znovu & zkontrolovat
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#2D3436] text-stone-50 rounded-3xl p-12 text-center min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden shadow-md">
            <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none scale-150">
              🔥
            </div>
            <div className="bg-stone-800 p-4 rounded-2xl text-[#FF6B6B] mb-4 animate-bounce">
              <Flame className="w-10 h-10 fill-current" />
            </div>
            <h3 className="font-extrabold text-stone-100 text-lg mb-1 font-sans">
              Rozpalme tvůj kufr! 🔥
            </h3>
            <p className="text-stone-300 text-sm max-w-sm leading-relaxed mb-6 font-semibold">
              Popiš, co si balíš (nebo rovnou nahraj fotku tvých kup srovnaných na posteli). Naše zlobivá asistentka ti s humorem prozradí, jaké zbytečnosti táhneš s sebou!
            </p>
            <div
              className="px-4 py-2 bg-stone-800 border border-stone-700 hover:border-[#FF6B6B] rounded-full text-xs font-bold text-stone-300 cursor-pointer transition-all"
              onClick={() => {
                setDescription("Dvoje teplé džíny, fén, 5 náhradních triček, velký těžký ručník, herní konzole, troje boty na víkend v Chorvatsku.");
                const destInput = document.getElementById("destination-input");
                if (destInput) destInput.focus();
              }}
            >
              Vyzkoušet vzorové balení tety Hany
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
