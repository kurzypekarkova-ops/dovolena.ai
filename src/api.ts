import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Increase limit to support base64 image uploads for suitcase roasts
app.use(express.json({ limit: "15mb" }));

// Helper to initialize GenAI client safely (fails gracefully / uses fallback if API key is not configured)
const getGenAIClient = () => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "" || apiKey === "undefined" || apiKey === "null") {
      return null;
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.error("Error creating GoogleGenAI client:", err);
    return null;
  }
};

// Check if Gemini API key is available
app.get("/api/config", (req, res) => {
  try {
    const ai = getGenAIClient();
    res.json({
      hasApiKey: ai !== null,
    });
  } catch (error: any) {
    console.error("Error in /api/config:", error);
    res.json({ hasApiKey: false });
  }
});

// 1. ITINERARY ENDPOINT
app.post("/api/itinerary", async (req, res) => {
  try {
    const { destination, days, companion, style, assistant } = req.body || {};

    if (!destination) {
      return res.status(400).json({ error: "Chybí cílová destinace." });
    }

    const duration = days || 3;
    const companionTxt = companion || "sám";
    const styleTxt = style || "relaxace";

    let assistantStyle = "Jsi Eliška, přátelská cestovní asistentka a kamarádka z aplikace dovolena.ai. Píšeš česky s nadšením, vtipem a osobitostí někoho, kdo dané místo osobně procestoval. Vyhýbej se klišé jako 'navštivte památky'. Piš konkrétně, vtipně a prakticky.";
    if (assistant === "krystof") {
      assistantStyle = "Jsi Kryštof, mimořádně sarkastický, kousavý, ironický a vtipný batůžkář z aplikace dovolena.ai. Tvůj tón je plný dravého humoru, děláš si legraci ze standardních líných turistů a zbytečností, které dělají v zemi, ale tvé cestovní rady jsou stále naprosto jedinečné, geniální a z první ruky. Píšeš velmi neformálně, hovorovou češtinou s vtipnými slangovými obraty ('kámo', 'fakt nekecám'), bez umělých korporátních klišé.";
    } else if (assistant === "marek") {
      assistantStyle = "Jsi Marek, pragmatický, přísný, chladný a disciplinovaný vojenský instruktor cestování a balení z aplikace dovolena.ai. Nesnášíš zbytečné řeči, přebytečné kufry, rozhazování peněz a pohodlnost. Tvůj tón je velmi stručný, jasný, přímý, pragmatický a rozkazovací. Každou aktivitu popiš co nejefektivněji a na rovinu, žádné kudrlinky.";
    }

    const systemInstruction = `${assistantStyle} No artificial jargon.

Generuješ itinerář přehledně. Pro rozdělení dnů VŽDY použij markdown nadpis třetí úrovně (###). Použij přesně tento formát:

### Den X – [název dne nebo oblasti]
🌅 **Ráno**: [konkrétní aktivita s tipem, např. kde koupit nejlepší loupák]
☀️ **Odpoledne**: [konkrétní aktivita s tipem, např. která ulička má nejhezčí stín]
🌙 **Večer**: [doporučení na specifickou večeři, bar nebo večerní zážitek s názvem bistra/podniku]
💡 **Lokální tip**: [MIMOŘÁDNĚ SPECIFICKÁ, autentická a originální rada, skryté místo, netradiční zážitek nebo tip na konkrétní tajný podnik / vyhlídku, která se týká EXKLUZIVNĚ vyhledávané lokality (např. "${destination}"). Nikdy nedávej obecné rady (typu "pijte vodu", "mějte u sebe hotovost" nebo "předem si rezervujte lístky"). Tip musí být tak konkrétní a jedinečný pro ${destination}, aby ho znali a ocenili jen opravdoví domorodci nebo zkušení místní průvodci a dával dokonalý smysl v kombinaci se zvoleným stylem cesty a společníkem!]

Na úplném konci doplň sekci:
### Praktické info
- 🚌 **Doprava**: [jak se nejlépe a nejlevněji pohybovat po destinaci]
- 💳 **Měna**: [místní měna, orientační kurz k CZK]
- 💬 **Jazyk**: [3 zásadní fráze s českou fonetickou výslovností v závorce]
- 🚨 **Nouzové kontakty**: [tísňová linka, záchranka a kontakt na českou ambasádu s výzvou, ať si uživatel ověří aktuální info na mzv.cz; nikdy nevymýšlej neexistující telefonní čísla]
`;

    const prompt = `Vytvoř detailní itinerář pro destinaci: "${destination}" na ${duration} dní. Cestuji ${companionTxt} a můj nejoblíbenější styl cesty je ${styleTxt}. Uprav podle toho zážitky!`;

    const ai = getGenAIClient();
    if (!ai) {
      // Graceful fallback when API key is missing
      return res.json({
        text: getFallbackItinerary(destination, duration, companionTxt, styleTxt, assistant),
        isFallback: true,
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response?.text || "Nepodařilo se vygenerovat itinerář." });
  } catch (error: any) {
    console.error("Error in /api/itinerary:", error);
    const msg = error?.message || (typeof error === "string" ? error : JSON.stringify(error)) || "Neznámá chyba";
    res.status(500).json({ error: "Chyba při komunikaci s AI: " + msg });
  }
});

// 2. CHECKLIST ENDPOINT
app.post("/api/checklist", async (req, res) => {
  try {
    const { destination, days, season, type, children, assistant } = req.body || {};

    if (!destination) {
      return res.status(400).json({ error: "Chybí cílová destinace." });
    }

    const duration = days || 3;
    const seasonTxt = season || "léto";
    const typeTxt = type || "kombinace";
    const withKids = children === "ano" || children === true;

    let assistantStyle = "Jsi Eliška, přátelská a vřelá cestovní asistentka z aplikace dovolena.ai. Pomáháš uživateli sbalit se bez stresu. Odpovídáš česky, vřele a strukturovaně.";
    if (assistant === "krystof") {
      assistantStyle = "Jsi Kryštof, mimořádně sarkastický, kousavý, ironický a škodolibý batůžkář z aplikace dovolena.ai. Tvůj seznam bude plný uštěpačných a humorných poznámek u věcí, které lidé zbytečně balí. Odpovídáš neformálně, sarkasticky, s českým slangem, ale prakticky.";
    } else if (assistant === "marek") {
      assistantStyle = "Jsi Marek, neústupný vojenský minimalistický instruktor z dovolena.ai. Nesnášíš zbytečné tlusté věci, fóny a kosmetiku. Tvůj přístup je brutálně minimalistický – pokud to nepotřebuješ k přežití nebo nařízení, nepatří to tam. Tvůj tón je stručný a nařizovací.";
    }

    const systemInstruction = `${assistantStyle}

Generuješ checklist v těchto kategoriích (použij přesně tyto ikony a nadpisy):

📄 **Doklady & finance**
[položky s užitečnými poznámkami, např: Cestovní pojištění – ulož si číslo asistenčky do mobilu]

👗 **Oblečení**
[věci přizpůsobené pro: ${seasonTxt} a typ cesty ${typeTxt}]

🧴 **Toalety & lékárnička**
[nezbytné hygienické a zdravotní věci, specifické pro danou oblast]

📱 **Elektronika**
[nabíječky, adaptéry, atd.]

${typeTxt === "hory" ? "🏔️ **Specifické na hory**" : typeTxt === "pláž" ? "🏖️ **Specifické na pláž**" : "🏙️ **Specifické pro město**"}
[položky na míru cestě typu ${typeTxt}]

${withKids ? `👶 **Pro děti**\n[specifické potřeby pro cestování s dětmi]` : ""}

U každé položky uveď krátkou, přátelskou poznámku vysvětlující proč nebo jak ji balit (např. srolovat do ruličky).

Na konci doplň sekci:
**Ještě dokoupit / dobalit**
Vypiš sem 3 až 5 věcí, na které lidé pro toto konkrétní místo nejčastěji zapomínají (např. repelent proti písečným blechám, redukce do zásuvky typu G).
`;

    const prompt = `Vytvoř mi dokonalý seznam věcí na balení do destinace: "${destination}". Pojedu na ${duration} dní, plánované počasí/období je ${seasonTxt}, typ cesty je ${typeTxt} a cestuji ${withKids ? "S DĚTMI" : "bez dětí"}.`;

    const ai = getGenAIClient();
    if (!ai) {
      return res.json({
        text: getFallbackChecklist(destination, duration, seasonTxt, typeTxt, withKids, assistant),
        isFallback: true,
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.5,
      },
    });

    res.json({ text: response?.text || "Nepodařilo se vygenerovat checklist." });
  } catch (error: any) {
    console.error("Error in /api/checklist:", error);
    const msg = error?.message || (typeof error === "string" ? error : JSON.stringify(error)) || "Neznámá chyba";
    res.status(500).json({ error: "Chyba při komunikaci s AI: " + msg });
  }
});

// 3. GUIDE & TRANSLATION ENDPOINT
app.post("/api/guide", async (req, res) => {
  try {
    const { query, destination, assistant } = req.body || {};

    if (!query && !destination) {
      return res.status(400).json({ error: "Zadej destinaci nebo otázku." });
    }

    let assistantStyle = "Jsi Eliška, přátelská cestovní asistentka z aplikace dovolena.ai. Radíš uživateli s jazykem, zvyky, chováním a praktickými tipy. Píšeš česky, stručně, prakticky a upřímně.";
    if (assistant === "krystof") {
      assistantStyle = "Jsi Kryštof, sarkastický, drsný a prostořeký cestovatel a batůžkář z aplikace dovolena.ai. Sděluješ drsnou, upřímnou pravdu bez příkras – podvody, drzí taxikáři, brikule, pasti na turisty. Používáš hovorový jazyk a humorné ironické narážky.";
    } else if (assistant === "marek") {
      assistantStyle = "Jsi Marek, přísný, chladný a naprosto pragmatický instruktor z aplikace dovolena.ai. Žádné zbytečné zdvořilosti ani vyprávění. Odpovědi jsou naprosto stručné, ve formě přímých rozkazů, suchých faktů a klíčových bodů o bezpečnosti a zvycích.";
    }

    const systemInstruction = `${assistantStyle} Nezakrývej nepříjemné pravdy (např. bakšiš, hlučné taxikáře nebo podvodníky).

Pokud uživatel chce překlad nebo základní fráze, uveď vždy:
- Česky: [překlad]
- V místním jazyce: [překlad]
- Výslovnost foneticky v závorce: ([fonetická výslovnost v češtině])

Pokud se ptá na zvyky, chování, tipy — odpovídej konkrétně a upřímně.
U každé země zformátuj nouzové kontakty takto:
- Tísňová linka: [číslo]
- Záchranná služba: [číslo]
- Ambasáda ČR: [stručný popis, nebo odkaz na mzv.cz]
- Doporučená cestovní pojišťovna (obecně): [tip na pojištění]
`;

    const prompt = query 
      ? `Uživatel se ptá: "${query}" ${destination ? `ohledně destinace "${destination}"` : ""}. Odpověz užitečně, stručně a kamarádsky v souladu s tvou osobností.`
      : `Poskytni mi rychlého průvodce, tipy na zvyky, bezpečností a 3-5 nejdůležitějších frází pro destinaci "${destination}".`;

    const ai = getGenAIClient();
    if (!ai) {
      return res.json({
        text: getFallbackGuide(destination || "Zahraničí", query, assistant),
        isFallback: true,
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.6,
      },
    });

    res.json({ text: response?.text || "Nepodařilo se vygenerovat odpověď průvodce." });
  } catch (error: any) {
    console.error("Error in /api/guide:", error);
    const msg = error?.message || (typeof error === "string" ? error : JSON.stringify(error)) || "Neznámá chyba";
    res.status(500).json({ error: "Chyba při komunikaci s AI: " + msg });
  }
});

// 4. PACKING ROAST ENDPOINT (supports image and text!)
app.post("/api/roast", async (req, res) => {
  try {
    const { description, imageData, mimeType, assistant } = req.body || {};

    if (!description && !imageData) {
      return res.status(400).json({ error: "Popiš, co si balíš, nebo nahraj fotku kufru." });
    }

    let assistantStyle = "Jsi Eliška, přátelská a vtipná cestovní asistentka z aplikace dovolena.ai. Provádíš tzv. \"Packing Roast\" – vtipně, kousavě, ale přátelsky a konstruktivně zhodnotíš kufr nebo seznam věcí uživatele. Cílem je pobavit, ale zároveň reálně pomoct sbalit se lépe.";
    if (assistant === "krystof") {
      assistantStyle = "Jsi Kryštof, bezlítostně ironický, sarkastický, drzý a nesmlouvavý cestovatel z aplikace dovolena.ai. Provádíš drsný 'Packing Roast' – tvůj humor pálí jako chilli paprička, bije tě do očí každá turistická hloupost. Směj se všemu absurdnímu, buď nactiutrhačný k těžkým kufrům a zbytečným fénům, piš neformálně s českým cestovatelským slangem.";
    } else if (assistant === "marek") {
      assistantStyle = "Jsi Marek, strohý a neústupný vojenský minimalistický instruktor z dovolena.ai. Provádíš 'Packing Roast' s nekompromisní disciplínou. Píšeš jako velitel – roastuješ zbytečnosti jako zradu přežití, nebereš si servítky, tón je suché konstatování neschopnosti uživatele sbalit se úsporně a rozkaz okamžitě nepotřebné vyhodit.";
    }

    const systemInstruction = `${assistantStyle}

Vygeneruj výstup přesně v této struktuře a s těmito nadpisy:

🔥 **Roast:** [vtipný, sarkastický, ale konstruktivní komentář věrný tvé zvolené asistenční roli k tomu, co vidíš na fotce nebo co uživatel popsal. Rýpni si do zbytečností nebo podivných kombinací]

✅ **Co je super:**
- [bod 1 s komentářem]
- [bod 2 s komentářem]
- (uveď 2–3 věci, které má sbalené naprosto správně)

❌ **Co tam nemá co dělat:**
- [položka 1 s humorným/přísným vysvětlením, proč ji nechat doma]
- [položka 2]

📦 **Co chybí:**
- [konkrétní věc, na kterou uživatel podle popisu/fotky zapomněl, ale pro cestování je klíčová]
- [další chybějící položka]

⭐ **Celkové skóre balení:** [X/10] [jedna vtipná/přísná hodnotící věta otevírající oči]
`;

    let promptParts: any[] = [];
    if (imageData && mimeType) {
      promptParts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageData, // base64 string
        },
      });
    }

    const textPrompt = `Zhodnoť mé balení. ${description ? `Zde je můj popis věcí: "${description}"` : "Zde je fotka mého kufru / věcí na posteli."}`;
    promptParts.push({ text: textPrompt });

    const ai = getGenAIClient();
    if (!ai) {
      return res.json({
        text: getFallbackRoast(description, assistant),
        isFallback: true,
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: promptParts },
      config: {
        systemInstruction,
        temperature: 0.85,
      },
    });

    res.json({ text: response?.text || "Nepodařilo se vygenerovat roast." });
  } catch (error: any) {
    console.error("Error in /api/roast:", error);
    const msg = error?.message || (typeof error === "string" ? error : JSON.stringify(error)) || "Neznámá chyba";
    res.status(500).json({ error: "Chyba při hodnocení balení: " + msg });
  }
});


// ==========================================
// FALLBACK FUNCTIONS FOR GRACEFUL BEHAVIOR
// ==========================================

function getFallbackItinerary(destination: string, days: number, companion: string, style: string, assistant?: string) {
  let intro = "Dobrý den, já jsem vaší průvodkyní Eliškou a s radostí vám ukážu, jak úžasně si můžete užít cestu!";
  let extraMarek = "";
  if (assistant === "krystof") {
    intro = "Kryštof zde! No těbůh, vybrat si zrovna sem, ale ok, zkusím z toho tvýho planování vymáčknout maximum zábavy a aspoň tě zachránit před nudou.";
  } else if (assistant === "marek") {
    intro = "Vojenský briefing pro lokalitu nastartován. Žádné zbytečnosti, jen striktní fakta a efektivita přesunu.";
    extraMarek = "\n\n🚨 **POZOR:** Žádné toulání! Pohybovat se pouze po určených trasách a neztrácet čas nákupem suvenýrů.";
  }

  return `⚠️ *Upozornění: Tato odpověď je ukázková (Demo), protože ve vašem AI Studio prostředí není nastaven nebo povolen GEMINI_API_KEY (Sekce Settings > Secrets).*

---

### Itinerář pro destinaci **${destination}** (${days} dní, styl: ${style}, parťák: ${companion})
- **Vybraná osobnost AI:** ${assistant === "krystof" ? "Kryštof 🌶️ (Sarkastický batůžkář)" : assistant === "marek" ? "Marek 🕶️ (Vojenský minimalistický instruktor)" : "Eliška 🌸 (Pohodová cestovatelka)"}

*Průvodní slovo:* "${intro}"

**Den 1 – První přesuny a průzkum**
🌅 Ráno: Výborná káva a tradiční pečivo v lokálním bistru kousek od hlavního náměstí. Vyhni se turistickým kavárnám a sedni si na obrubník jako místní!
☀️ Odpoledne: Prohlídka tajemných postranních uliček v historickém jádru, objevování skrytých dvorků a malých galerií.
🌙 Večer: První ochutnávka tradiční lokální večeře v rodinné taverně tety Marie s lokálním vínem.
💡 Lokální tip: Nechoď po hlavní třídě, nejlepší jídlo najdeš tam, kde jí místní taxikáři a babičky.${extraMarek}

**Den 2 – Dobrodružství a skrytá zákoutí**
🌅 Ráno: Brzký ranní výšlap na vyhlídku nad městem ještě předtím, než se sem nahrnou davy s selfie tyčemi.
☀️ Odpoledne: Pronájem kola nebo skútru a cesta na skrytá místa mimo hlavní průvodce.
🌙 Večer: Posezení u západu slunce s drobným občerstvením a povídání s místními o jejich životě.
💡 Lokální tip: Většina muzeí má v odpoledních hodinách slevu nebo vstup zdarma, zjisti si to předem!

### Praktické info
- 🚌 **Doprava**: Městská hromadná doprava je levná a spolehlivá, kup si jízdenku přes mobilní aplikaci.
- 💳 **Měna**: Místní měna (orientačně se podívej na aktuální kurz ČNB k CZK).
- 💬 **Jazyk**: "Ahoj" ([Ahoj]), "Děkuji" ([Děkuji]), "Prosím" ([Prosím]).
- 🚨 **Nouzové kontakty**: Tísňová linka 112, záchranná služba. Pro aktuální kontakty na zastupitelský úřad ČR navštivte **mzv.cz**.`;
}

function getFallbackChecklist(destination: string, days: number, season: string, type: string, withKids: boolean, assistant?: string) {
  let noteStyle = "Sbaleno s láskou a řádem.";
  if (assistant === "krystof") {
    noteStyle = "Zredukováno o 40 % blbostí, které bys stejně nepoužil/a.";
  } else if (assistant === "marek") {
    noteStyle = "Bojový plán balení na 100% přežití. Žádný luxus.";
  }

  return `⚠️ *Upozornění: Tento checklist je ukázkový (Demo), protože ve vašem AI Studio prostředí není nastaven nebo povolen GEMINI_API_KEY (Sekce Settings > Secrets).*

---

### Seznam věcí na balení do destinace **${destination}** (${days} dní, ${season}, typ: ${type})
- **Sestavil AI parťák:** ${assistant === "krystof" ? "Kryštof 🌶️" : assistant === "marek" ? "Marek 🕶️" : "Eliška 🌸"} (*${noteStyle}*)

📄 **Doklady & finance**
- Cestovní pas / OP – zkontroluj si platnost (minimálně 6 měsíců po návratu).
- Cestovní pojištění – ulož si asistenční číslo do telefonu, ne jen papírově.
- Platební karty a trocha hotovosti v místní měně na drobnosti.

👗 **Oblečení**
- Pohodlné boty na chození – základ úspěchu každé cesty.
- Vrstvené oblečení (cibulový systém) podle počasí (${season}).
- Pláštěnka nebo lehký nepromokavý větrovka.

🧴 **Toalety & lékárnička**
- Cestovní balení šamponu a pasty (do letadla max 100ml).
- Základní léky (horečka, bolest, střevní potíže – černé uhlí).
- Náplasti na puchýře (budeš je potřebovat!).

📱 **Elektronika**
- Nabíječka na mobil a powerbanka (do letadla patří výhradně do příručního zavazadla).
- Univerzální cestovní adaptér, pokud tam mají jiné zásuvky.

${type === "hory" ? "🏔️ **Specifické na hory**" : type === "pláž" ? "🏖️ **Specifické na pláž**" : "🏙️ **Specifické pro město**"}
- Vycházkový batůžek na celodenní výlety.
- Sluneční brýle a opalovací krém spolehlivé značky.

${withKids ? `👶 **Pro děti**
- Oblíbená hračka / plyšák na uklidnění při cestě.
- Cestovní lékárnička s dětskými sirupy a rehydratačním roztokem.
- Dostatek svačinek a vlhčené ubrousky (zachrání každou situaci).` : ""}

**Ještě dokoupit / dobalit**
1. Powerbanku plně nabít den předem.
2. Vlhčené ubrousky – hodí se vždy a všude.
3. Repelent proti hmyzu.
4. Cestovní polštářek pro pohodlí při přepravě.`;
}

function getFallbackGuide(destination: string, query?: string, assistant?: string) {
  let title = "Eliščin pohotovostní lexikon";
  if (assistant === "krystof") {
    title = "Kryštofovy syrové pravdy z cesty";
  } else if (assistant === "marek") {
    title = "Marekův armádní řád ochrany a přesunu";
  }

  return `⚠️ *Upozornění: Tato odpověď je ukázková (Demo), protože ve vašem AI Studio prostředí není nastaven nebo povolen GEMINI_API_KEY (Sekce Settings > Secrets).*

---

### 💬 ${title} pro cestu do **${destination}**

Děkuji za tvůj dotaz! ${query ? `Ptal ses na: "${query}"` : "Zde jsou základní tipy a rady pro cestu do zahraničí."}

**Základní fráze v místním jazyce:**
- Česky: Dobrý den
  - V místním jazyce: Hello / Bonjour / Buenos días
  - Výslovnost: ([Helou] / [Bonžůr] / [Buenos dyas])
- Česky: Děkuji
  - V místním jazyce: Thank you / Merci / Gracias
  - Výslovnost: ([Tenk jů] / [Mersí] / [Grasijas])
- Česky: Kde je toaleta?
  - V místním jazyce: Where is the toilet? / Où jsou les toilettes?
  - Výslovnost: ([Vér iz d tualet] / [U su le tualet])

**Zvyky, chování a upřímné pravdy pod dohledem AI parťáka:**
1. **Spropitné:** V mnoha destinacích je spropitné bráno jako samozřejmost a tvoří hlavní část příjmu personálu. Počítej obvykle s 10 % z ceny útraty. Zapátrej po lokálních zvyklostech, ať se vyhneš faux pas.
2. **Bezpečnost:** Vždy si hlídej batoh a telefon na zalidněných místech, v metru a u hlavních turistických atrakcí. Kapsáři jsou neuvěřitelně rychlí a vynalézaví.
3. **Místní doprava:** Nekupuj předražené jízdenky na letišti od neoficiálních prodejců. Vždy běž k oficiálním okénkům, automatům nebo použij prověřené aplikace (Uber, Bolt, místní MHD appka).

**Nouzové kontakty:**
- Tísňová linka: **112** (jednotné evropské číslo tísňového volání funguje ve všech státech EU a v mnoha dalších)
- Záchranná služba: Místní nouzová služba
- Ambasáda ČR: Pro přesné adresy a krizové telefony českých konzulátů po celém světě navštivte oficiální web **mzv.cz** a zaregistrujte se do systému **DROZD**.
- Doporučená cestovní pojišťovna: Vyber si renomovanou pojišťovnu s dobrým limitem léčebných výloh a nonstop asistenční službou v češtině.`;
}

function getFallbackRoast(description?: string, assistant?: string) {
  let roastText = "No páni! Podle tvého seznamu to vypadá, že neodjíždíš na pohodovou dovolenou, ale spíš plánuješ kolonizovat Mars nebo se přestěhovat na trvalo do deštného pralesa. Zabalit si dvoje džíny na letní plážový relax? Chceš tam snad simulovat saunový rituál za chodu, nebo jen miluješ pocit upocených nohavic omotaných kolem kotníků?";
  let scoreText = "⭐ **Celkové skóre balení:** **4/10**";
  let closing = "*Sice neodjedeš úplně nahý, ale tvá záda ti za ten těžký kufr plný zbytečností rozhodně nepoděkují. Vyndej polovinu oblečení a zkus to znovu!*";

  if (assistant === "krystof") {
    roastText = "Kryštofův komentář: Kámo, tohle balení je fakt tragédie. Fén na vlasy na stanovačku? Tenisky na tři dny takové, že bys s nima mohl otevřít secondhand? Věř mi, polovina tvého kufru jsou stoprocentní zbytečnosti, které vytáhneš z tašky až doma po návratu, úplně čisté a zmačkané. Seriózně, prober se a půlku vyházej na postel!";
    scoreText = "⭐ **Celkové skóre balení:** **2/10**";
    closing = "*Totální amatérismus. Jestli tohle potáhnete s sebou, tak vám na letišti napaří pokutu za nadváhu a davy se vám budou smát.*";
  } else if (assistant === "marek") {
    roastText = "Marek hlásí: Negativní hodnocení. Váš zmatečný seznam vykazuje fatální nedostatek disciplíny. Fén na vlasy? Tři náhradní mikiny? Balíte se na taktický přesun nebo na přehlídkové molo? Každý gram navíc snižuje vaši operační rychlost a mobilitu. Okamžitě vyřadit 60 % vybavení.";
    scoreText = "⭐ **Celkové skóre balení:** **1/10**";
    closing = "*Neschopný sbalení. Zadejte rozkaz pro okamžitou redukci na jeden ultra-lehký příruční batoh o maximální hmotnosti 5.5 kg.*";
  }

  return `⚠️ *Upozornění: Tento Packing Roast je pouze ukázkový (Demo), protože ve vašem AI Studio prostředí není nastaven nebo povolen GEMINI_API_KEY (Sekce Settings > Secrets).*

---

### 🔥 **Packing Roast pro tvůj kufr!**
- **Nekompromisně zhodnotil:** ${assistant === "krystof" ? "Kryštof 🌶️" : assistant === "marek" ? "Marek 🕶️" : "Eliška 🌸"}

Popis věcí: "${description || "Žádný popis ani fotka nebyly odeslány. Sbalil jsi se snad tajně?"}"

🔥 **Roast:** ${roastText}

✅ **Co je super:**
- Nezapomněl jsi na nabíječku na telefon a powerbanku, to tě zachrání, až se ztratíš při hledání hotelu.
- Máš cestovní pojištění! Palec nahoru za zodpovědnost.

❌ **Co tam nemá co dělat:**
- Těžké bavlněné mikiny a troje tenisky na 3 dny. Věř mi, bude ti stačit jeden pohodlný pár na nohou a letní žabky do kufru.
- Celé velké balení šamponu a sprcháče. Kup si v drogerii malé lahvičky nebo tuhá mýdla, ušetříš kilo váhy!

📦 **Co chybí:**
- Pokrývka hlavy! Úžeh nebo úpal ti dokáže zkazit celou dovolenou rychleji než zpožděné letadlo.
- Opravdová lékárnička (alespoň náplasti a něco na žaludek).

${scoreText}
${closing}`;
}

export default app;
