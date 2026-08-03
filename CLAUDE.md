# Stellplatz-Planer

Interaktiver Belegungsplan für einen privat gebuchten Camping-Stellplatz (Volksfest).
Zweck: Zelte, Fahrzeuge und Inventar maßstäblich auf der gebuchten Fläche anordnen,
bevor vor Ort improvisiert wird. Der Link wird in einer Gruppe geteilt, Hauptgerät ist das Handy.

Live: `https://sb-parzellen-planer.vercel.app/`

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Die komplette Anwendung: Markup, CSS und JS in einer Datei. Einzige Quelle, direkt bearbeitbar. |
| `luftbild.jpg` | Google-Maps-Luftbild des Platzes, 697×795 px. Wird relativ referenziert. |
| `vercel.json` | Noindex-Header, `Referrer-Policy: no-referrer`. |
| `robots.txt` | Sperrt alle Crawler. |

Kein Build-Schritt, kein Framework, keine Abhängigkeiten. Vercel-Preset: **Other**,
Build Command und Output Directory leer.

## Architektur: zwei Stufen

Der Plan steht **statisch im HTML** (`<g id="world">` mit `#bglayer` und `#dyn`) und ist
damit auch ohne JavaScript vollständig und maßstäblich sichtbar. Grund: die
Dateivorschau von iOS (Quick Look) führt keine Skripte aus – dort soll man den Plan
trotzdem lesen können. Läuft JS, entfernt es den Hinweis `#viewonly` und zeichnet
`#dyn` identisch neu.

**Wichtig bei Änderungen:** Geometrie, Farben und Beschriftungen existieren doppelt –
im statischen Markup und in `render()`. Wer eines ändert, muss das andere angleichen,
sonst springt die Ansicht beim Laden.

`#bglayer` wird nie neu erzeugt, nur Transform und Deckkraft werden aktualisiert.

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
const a=new JSDOM(h,{runScripts:'outside-only'});
console.log('ohne JS:',a.window.document.querySelectorAll('#plan *').length,'Elemente');
const b=new JSDOM(h,{runScripts:'dangerously',pretendToBeVisual:true});
console.log('mit JS:',b.window.document.querySelectorAll('#palette button').length,'Chips');"
```

Prüft beide Stufen: statischer Plan vorhanden, Skript läuft fehlerfrei durch.

## Deployment-Workflow

Auf einem Branch arbeiten, nicht auf `main` – Vercel liefert pro Push eine eigene
Preview-URL zum Testen am Handy. Erst mergen, wenn es passt; die geteilte Adresse
bleibt bis dahin unverändert. Auf dem Hobby-Tarif ist die Produktions-URL öffentlich
erreichbar, geschützt wird nur über Noindex – deshalb keine Klarnamen oder
personenbezogenen Daten in den Plan schreiben.

Das Luftbild ist ein Google-Maps-Ausschnitt inklusive Wasserzeichen: privat nutzen,
nicht veröffentlichen, nicht in Aushänge oder Social Media.

## Offene Ideen

- Raster um 6° drehen statt des Fotos, damit der Plan bildschirmparallel liegt und die
  gedruckte Fassung ohne Kopfrechnen zur Örtlichkeit passt.
- Mehrere benannte Layouts statt eines Speicherplatzes (Varianten vergleichen).
- Objektbibliothek um echte Maße erweitern (vorhandene Zelte, Anhänger).
- Druckfassung mit Stückliste: welche Objekte, welche Maße, welche Gesamtfläche.
