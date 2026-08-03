# Stellplatz-Planer

Interaktiver Belegungsplan für einen privat gebuchten Camping-Stellplatz (Volksfest).
Zweck: Zelte, Fahrzeuge und Inventar maßstäblich auf der gebuchten Fläche anordnen,
bevor vor Ort improvisiert wird.

**Der Desktop ist das Hauptmedium.** Layout, Bedienung und alle Entscheidungen richten sich
danach. Das Handy ist kein Thema: es muss nicht kaputt sein, wird aber nicht optimiert und ist
kein Grund, am Desktop Abstriche zu machen.

Live: `https://sb-parzellen-planer.vercel.app/`

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Die komplette Anwendung: Markup, CSS und JS in einer Datei. Einzige Quelle, direkt bearbeitbar. |
| `api/layout.js` | Serverfunktion für den gemeinsamen Plan: liest und schreibt das Layout in Upstash Redis. |
| `luftbild.jpg` | Google-Maps-Luftbild des Platzes, 697×795 px. Wird relativ referenziert. |
| `vercel.json` | Noindex-Header, `Referrer-Policy: no-referrer`. |
| `robots.txt` | Sperrt alle Crawler. |

Kein Build-Schritt, kein Framework, **keine npm-Abhängigkeiten** – auch die Serverfunktion
nicht: Upstash spricht REST, `fetch` genügt. Deshalb gibt es bewusst **keine `package.json`**;
die Funktion ist CommonJS (`module.exports`), weil Vercel `api/*.js` ohne `package.json` so
auflöst. Ein `export default` würde hier scheitern. Vercel-Preset: **Other**, Build Command und
Output Directory leer.

## Architektur

**`render()` ist die einzige Quelle des Plans.** Es leert `<g id="dyn">` und zeichnet alles neu:
Gasse, Raster, Parzellen, Maßketten, Objekte, Maßstab. Geometrie, Farben und Beschriftungen
stehen genau einmal im Code – wer etwas ändert, ändert es dort und nirgends sonst.

Im Markup stehen nur die leeren Hüllen: `<g id="world">` mit `#bglayer` (inklusive `#bgimg`)
und dem leeren `#dyn`. **`#bglayer` wird nie neu erzeugt**, `render()` aktualisiert nur
Transform und Deckkraft, und `BG.src` liest die Bildquelle aus `#bgimg`. Beides muss also
im HTML stehen bleiben.

Ohne JavaScript bleibt der Plan leer; darauf weist ein `<noscript>` hin. Früher stand der
Plan zusätzlich statisch im Markup, damit ihn die iOS-Dateivorschau ohne Skripte zeigen
konnte. Seit die Seite über Vercel läuft, öffnet auch das Handy sie im echten Browser mit
Skripten – die Doppelung ist entfallen und soll nicht zurückkommen.

## Layout: Arbeitsansicht am Desktop

Ab **900 px** Fensterbreite ist die Seite eine zweispaltige Arbeitsfläche: Objektleiste
`#side` links (300 px, scrollt eigenständig), Plan und Bedienleisten in `#main` rechts.
Darunter läuft alles gestapelt, Plan zuerst und Objektliste danach (`order` im Flex).

Der Umschalter ist die Klasse **`js` am `<body>`**, die das Skript direkt nach der
SVG-Prüfung setzt. Ohne Skript greift keine der Shell-Regeln, der statische Plan bleibt
gestapelt lesbar. Neue Layout-Regeln für die Arbeitsansicht deshalb immer mit `body.js` davor.

Der Plan füllt die Resthöhe über `flex:1` und das SVG liegt darin `position:absolute;inset:0` –
so muss Safari keine prozentuale Höhe in einem Flex-Element auflösen (`height:auto` am SVG
bleibt trotzdem tabu, siehe Fallstricke). Der `@media print`-Block muss Shell-Regeln mit
gleicher Spezifität zurücksetzen (`body.js …`), sonst schneidet `overflow:hidden` den Druck ab.

## Gemeinsamer Plan (ein Stand für alle)

Wer den Link hat, sieht beim Öffnen den letzten gespeicherten Stand; „Für alle speichern“
schreibt ihn für alle. Kein Login. Der Speicher ist **Upstash Redis über REST**, angesprochen
von `api/layout.js`. Die Zugangsdaten liegen als Umgebungsvariablen auf dem Server und stehen
nie im HTML:

| Variable | Zweck |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Adresse der Upstash-Datenbank |
| `UPSTASH_REDIS_REST_TOKEN` | Token dazu, bleibt serverseitig |
| `PLAN_WRITE_KEY` | frei gewählter Schlüssel; **Lesen ist offen, Schreiben nur damit** |

Der Client liest den Schlüssel aus dem Link (`?k=…` oder `#k=…`). Ohne Schlüssel ist die Seite
Nur-Lesen und sagt das auch. Redis-Schlüssel: `plan:current` (aktueller Datensatz),
`plan:rev` (Zähler), `plan:history` (Liste, neuester zuerst, auf 10 gekürzt).

**Kollisionsschutz statt stillem Überschreiben:** jeder Stand hat eine Nummer (`rev`). Der
Client schickt beim Speichern die Nummer, die er geladen hat. Ist inzwischen eine neuere da,
antwortet die Funktion mit **409** und der Nutzer wird gefragt – überschreiben (`force:true`)
oder den fremden Stand holen. Wer das ändert, muss diesen Pfad mitdenken, sonst geht wieder
Arbeit verloren.

**Immer bedienbar bleiben:** fehlen die Umgebungsvariablen, antwortet die Funktion mit 503 und
`configured:false`; ist der Server weg, schlägt `fetch` fehl. In beiden Fällen fällt die Seite
auf `localStorage` zurück und schreibt das in die Statuszeile. Diese Rückfallebene nicht
wegoptimieren – sie hält die Seite auch beim lokalen Entwickeln über `python3 -m http.server`
benutzbar, wo es gar kein `/api` gibt.

Da getippte Bezeichnungen jetzt auf einem fremden Server landen, gilt der Hinweis „keine
Klarnamen, keine personenbezogenen Daten“ strenger als vorher. Das Feld „Kürzel“ ist dafür
gedacht, ein Kürzel aufzunehmen, keinen Namen; es liegt lokal im Browser.

## Geometrie-Konventionen

- **Eine SVG-Einheit = ein Meter.** Deshalb sind Strichstärken Werte wie `.06` und
  Schriftgrößen wie `.58`. Der Rand um die Fläche ist `MG = 6` (Meter).
- Objekte speichern **Mittelpunkt** (`x`, `y`), Maße (`w`, `h`) und `rot` in Grad;
  gezeichnet als `translate(x,y) rotate(rot)`. Beschriftungen sitzen in einer
  Untergruppe mit `rotate(-rot)`, damit Text lesbar bleibt.
- Überlappungen über **Separating Axis Theorem** (`overlap()`), nicht über Bounding Boxes –
  gedrehte Rechtecke müssen korrekt prüfen. `conflict()` liefert zusätzlich „außerhalb".
- Ansichtsfenster ist ein eigener Zustand (`vb`), Zoom und Pan verändern nur die
  `viewBox`. `toWorld()` rechnet Bildschirm- in Meterkoordinaten und
  berücksichtigt die Letterbox von `preserveAspectRatio="xMidYMid meet"`.

## Kalibrierung (nicht raten, das ist vermessen)

- Parzelle **10 × 10 m = 100 m²**, abgeleitet aus 41,03 m Umfang der Messung in Google Maps.
- Gebucht: **2 Parzellen quer × 3 tief = 20 × 30 m = 600 m²**.
- Die blau markierte Fläche im Luftbild liegt bei **x 410, y 254, 91 × 147 px**
  (`BG.bx/by/bw/bh`). Daraus skaliert sich das Foto automatisch so, dass die Markierung
  exakt auf dem Planrechteck liegt – ändert man Parzellenzahl oder -größe, passt es sich mit an.
- Feinjustage des Fotos: **X 0,5 · Y −2 · Zoom 103 % · Drehung 6°**. Die 6° sind die
  Schräglage der Parzellenreihen im Luftbild.

## Fallstricke (alle schon einmal aufgetreten)

- **Foto nicht wieder als Base64 einbetten.** Vorher steckte es als 150.000 Zeichen lange
  Zeile im Skript; das bläht die Datei auf 193 KB und frisst Kontext.
- **Keine Element-IDs, die `window`-Eigenschaften überschreiben** – `id="print"` hat
  `window.print` gekapert, `window.print()` lief in einen TypeError. Deshalb heißen die
  Knöpfe `btnprint`, `btnclear`, `btnsave`, `btnload`.
- **Dem SVG keine `height:auto` geben.** Safari rechnet die Höhe dann falsch, das Feld
  blieb leer. `#planwrap` hat eine feste Höhe, das SVG füllt sie zu 100 %.
- Zeigergesten laufen über Pointer Events mit `touch-action:none`; ein Zeiger auf einem
  Objekt verschiebt es, ein Zeiger auf leerer Fläche schwenkt, zwei Zeiger zoomen.

## Test ohne Browser

```bash
npm install jsdom
node -e "const {JSDOM}=require('jsdom');const fs=require('fs');
const h=fs.readFileSync('index.html','utf8');
const d=new JSDOM(h,{runScripts:'dangerously',pretendToBeVisual:true}).window.document;
console.log('Chips:',d.querySelectorAll('#palette button').length);
console.log('Plan-Elemente:',d.querySelectorAll('#dyn *').length);
console.log('Objekte:',d.querySelectorAll('#dyn g.obj').length);"
```

Erwartet: 23 Chips, über 100 Plan-Elemente, 5 Objekte. Bleibt `#dyn` leer, ist `render()`
nicht durchgelaufen – dann die Konsole auf einen Skriptfehler prüfen.

Das Skript steckt als Text im HTML, ein Tippfehler bleibt darin unsichtbar. Deshalb bei jeder
JS-Änderung zusätzlich die Syntax prüfen – ein unmaskiertes `"` in einer deutschen Anführung
(`„…“`) hat das schon einmal lautlos die ganze Seite gekostet:

```bash
python3 -c "import re;open('/tmp/c.js','w').write(re.search(r'<script>(.*)</script>',open('index.html').read(),re.S).group(1))" \
  && node --check /tmp/c.js && echo "Syntax in Ordnung"
```

## Deployment-Workflow

**Direkt auf `main` arbeiten und pushen.** Der Zweck ist, die Änderung sofort live zu sehen –
kein Branch, keine Preview-URL, kein Pull Request, solange nicht ausdrücklich danach gefragt
wird. Push auf `main` deployt nach `https://sb-parzellen-planer.vercel.app/`, nach ein bis zwei
Minuten steht es dort.

Das trägt, weil das Projekt privat ist und niemand außer dem Betreiber davon abhängt: geht
etwas schief, ist der Rückweg ein `git revert <sha>` plus Push. Deshalb lieber schnell
deployen als lange absichern.

Auf dem Hobby-Tarif ist die Produktions-URL öffentlich erreichbar, geschützt wird nur über
Noindex – deshalb keine Klarnamen oder personenbezogenen Daten in den Plan schreiben.

Das Luftbild ist ein Google-Maps-Ausschnitt inklusive Wasserzeichen: privat nutzen,
nicht veröffentlichen, nicht in Aushänge oder Social Media.

## Offene Ideen

- Raster um 6° drehen statt des Fotos, damit der Plan bildschirmparallel liegt und die
  gedruckte Fassung ohne Kopfrechnen zur Örtlichkeit passt.
- Mehrere benannte Layouts statt eines Speicherplatzes (Varianten vergleichen).
- Objektbibliothek um echte Maße erweitern (vorhandene Zelte, Anhänger).
- Druckfassung mit Stückliste: welche Objekte, welche Maße, welche Gesamtfläche.
