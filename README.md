# Sortie

Mobilní hra na třídění barev. React, TypeScript, Vite a Three.js / React Three Fiber.

**[Hrát Sortie](https://mcxcze.github.io/sortie/)** · [Zdrojový kód](https://github.com/McxCZE/sortie)

## GitHub Pages

Push do větve `main` spouští `.github/workflows/pages.yml`: instalaci závislostí, lint, testy, sestavení a zveřejnění na GitHub Pages. Pages používá zdroj **GitHub Actions**. Cesty k souborům i Web Workeru respektují `/sortie/`; lokální vývoj zůstává na `/`.

Postup, mince a nákupy zůstávají v `localStorage` konkrétního prohlížeče a původu URL. Z lokální IP se na GitHub Pages automaticky nepřenášejí; původní uložená data se nemažou. Do repozitáře se uložené hry neposílají.

Sestavení pro tuto adresu: `VITE_BASE_PATH=/sortie/ npm run build`.

## Spuštění

```sh
npm install
npm run dev -- --host 0.0.0.0
```

Pro hraní na telefonu otevři síťovou adresu vypsanou serverem. Telefon musí být ve stejné síti. Úroveň, rozložení lahviček, historie tahů, mince a zvuk se ukládají v tomto prohlížeči na stejné adrese.

## Sestavená verze

```sh
npm run build
npm run preview -- --host 0.0.0.0 --port 5173 --strictPort
```

Adresář `dist/` lze nasadit na statický hosting. `vite preview` slouží k místnímu hraní sestavené verze; pro veřejný provoz použij statický webserver/hosting. Backend ani účet nejsou potřeba.

## Ověření

```sh
npm test
npm run lint
npx playwright install chromium
npm run test:e2e -- --workers=2
```

## Ovládání a vzhled

Rozhraní používá tmavě modrou herní plochu, výrazný štítek úrovně, zlaté mince a fialová plastická tlačítka. Mince vlevo otevírají obchod, ozubené kolo vpravo nastavení zvuku. Spodní panel obsahuje Zpět, Znovu a Obchod; číslo u Zpět odpovídá počtu tahů, které lze vrátit zdarma. Na telefonu otočeném na šířku se panel přesune doprava.

Ikony v `src/ui/GameIcon.tsx` jsou vlastní SVG a herní prvky jsou vykreslované kódem. Nejsou potřeba obrázkové balíčky ani externí 3D modely. Sklo má modrý obrys a jemné odlesky. Pravidla, ceny a formát uložené hry se při změně vzhledu nemění.

## Struktura

- `src/game.ts`: pravidla přelévání, generátor řešitelných úrovní, kontrola uloženého stavu.
- `src/App.tsx`: průběh hry, ovládání, ukládání, historie, zvuk. Tah se zapíše přesně jednou po animaci; omezený pohyb se respektuje.
- `src/graphics/Board3D.tsx`: hlavní 3D plocha, průhledné sklo, objemové dílky, vrstvy a proud. Skutečná HTML tlačítka zajišťují dotykové a klávesnicové ovládání i popisky pro čtečky obrazovky.
- `src/graphics/liquid.ts`: geometrie kapaliny s vodorovnými hranicemi vrstev podle náklonu a odhadovaného objemu. Jde o řízený vizuální model, nikoliv fyzikální simulaci.
- `src/graphics/BottleFallback.tsx`: automatické náhradní zobrazení při nedostupném nebo ztraceném WebGL. Rozehraná hra zůstává funkční.
- `tests/game.spec.ts`: celé průchody úrovní, ukládání, ovládání, rozměry obrazovky a zotavení při ztrátě 3D kontextu.

3D je přímo součástí hlavní hry. Původní `/3d` také otevře běžnou hru; samostatná ukázka už neexistuje. Vykreslování běží podle potřeby s omezeným rozlišením. Skutečný výkon závisí na telefonu a jeho GPU.

Volitelná písma Google mají systémovou náhradu. Offline instalace a synchronizace mezi zařízeními zatím nejsou součástí hry.

## Obtížnost a nekonečné úrovně

Cyklus se opakuje po pěti úrovních: **Oddech → Běžná → Běžná → Těžká → Výzva**. První dva cykly mají 5 / 6 / 6 / 7 / 8 barev, od úrovně 11 pak 6 / 7 / 7 / 8 / 8. Přibyly tyrkysová a měděná. Čísla úrovní pokračují i za 1000 a 10000.

Nové úrovně mají jen **jednu lahvičku volné kapacity** místo dvou. Tato kapacita může být rozdělená mezi částečně naplněné lahvičky. Cílem je více nutného plánování a nevratných slepých cest, nikoliv pouze vyšší počet promíchaných vrstev.

Generátor vybírá až z 384 deterministických kandidátů podle počtu stavů, které při řešení prozkoumá stejný řešič, a minimální délky nalezeného řešení. Cílová práce řešiče v cyklu je 40 / 60 / 75 / 95 / 130 stavů. Přijímá jen ověřené výsledky a má záložní konstruktivně řešitelnou variantu. Kontrola prvních 1 000 úrovní proti revizi `539fd0c` naměřila **2,90× více prozkoumaných stavů** (68,093 místo 23,48 na úroveň), v prvních dvaceti 5,06×. To je reprodukovatelná zástupná metrika náročnosti plánování, nikoliv záruka trojnásobného času pro lidského hráče nebo trojnásobné délky řešení.

Rozehrané kolo, jeho historie, koupené pomůcky i počáteční rozložení zůstávají při aktualizaci zachované. Nová obtížnost se použije automaticky na další úroveň. Rozhraní nedostává žádná další tlačítka.

## Odměny a obchod

První dokončení úrovně přinese **10 / 10 / 10 / 15 / 25 mincí** podle cyklu. Obnovení stránky a opakované vyřešení stejné úrovně odměnu nezdvojnásobí. Použití pomůcek odměnu nesnižuje.

- Nápověda **10**: řešič běží ve Web Workeru. Cena se strhne až po přijetí ověřené rady. Případný návrat nebo restart vyžaduje výslovné přijetí popsaného výsledku. Při limitu hledání se stav neoznačuje za prokazatelně neřešitelný. Zaplacená rada zůstane zvýrazněná i po načtení hry.
- Malá lahvička **25**: kapacita 1 dílek; při dokončení musí být prázdná.
- Prázdná lahvička **60**: kapacita 4 dílky.
- Zpět a restart jsou zdarma. Jednu přídavnou lahvičku každé velikosti lze koupit na úroveň. Zůstávají po restartu i obnovení stránky a zmizí až při přechodu na další úroveň. Nové úrovně mají 6 až 9 základních lahviček, s oběma pomůckami nejvýše 11.

Trvalé vzhledy lze kombinovat a přepínat bez dalšího placení: **ametystové sklo 150**, **zlaté podložky 200**, **polární záře 300**, **jiskřivý proud 500**. Každou kategorii lze vrátit na výchozí vzhled.

Ukládání dál používá `sortie-save-v1`, formát dat je verze 3. Migrace zachovává starý stav, peněženku a historii; starý generátor je zmrazený pro obnovu původního rozložení. Nové hry ukládají počáteční rozložení, kapacity, počet základních lahviček, verzi generátoru, známá řešení, zakoupené vzhledy a vybavení. Migrace rozlišuje starší dvě volné kapacity od nových jedné a neúčtuje znovu již koupené pomocné lahvičky. Již dokončené úrovně se zpětně neodměňují.

`src/rules.ts` obsahuje společná pravidla, `src/solver.ts` řešič a `src/hints.ts` nabídku ověřeného návratu; `src/Shop.tsx` obchod. Testy v `src/economy.test.ts` a `tests/shop.spec.ts` pokrývají migraci, pomocné lahvičky, odměny, nápovědy, vzhledy a přetrvání nákupů.
