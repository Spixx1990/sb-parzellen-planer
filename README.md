# Stellplatz-Planer

Interaktiver Belegungsplan für die gebuchten Parzellen. Statische Seite ohne Build-Schritt:
`index.html` enthält Markup, CSS und JS, `luftbild.jpg` liegt daneben.

Gearbeitet wird am Desktop: Objektleiste links, Plan rechts. Auf schmalen Fenstern klappt
das auf eine Spalte um, Plan oben und Objektliste darunter.

Live: https://sb-parzellen-planer.vercel.app/

## Bedienung

- Objekt aus der Leiste links wählen, im Plan anklicken und ziehen
- Leere Fläche ziehen verschiebt den Plan · Zoom über `+` `−` `FIT` rechts unten (mobil: zwei Finger)
- Tastatur: `R` +15° · `Q` +90° · `D` duplizieren · `Entf` löschen · Pfeiltasten 25 cm
- Fläche und Luftbild-Justage oben unter „Fläche & Luftbild einstellen"
- „Als Text" exportiert das Layout als Zeichenkette zum Weitergeben, „Text einlesen" liest es zurück
- „Drucken / PDF" gibt nur den Plan aus, ohne Bedienleisten

## Gemeinsam nutzen

Wer den Link öffnet, sieht den letzten gespeicherten Stand. „Für alle speichern" schreibt den
Plan für alle – kein Login, kein Konto. Ändern kann nur, wer den Schlüssel im Link hat
(`…vercel.app/?k=DEINSCHLÜSSEL`); ohne Schlüssel ist die Seite Nur-Lesen und sagt das oben an.

Hat zwischenzeitlich jemand anderes gespeichert, wird nachgefragt statt überschrieben. Die
letzten zehn Stände stehen als „Vorversion" zum Zurückholen bereit.

### Einrichtung (einmalig, im Vercel-Dashboard)

1. **Storage → Create Database → Upstash Redis** anlegen (Region Frankfurt, Plan Free, Read
   Regions leer) und mit dem Projekt verbinden. Die Zugangsdaten setzt Vercel selbst – je nach
   Weg als `KV_REST_API_URL`/`KV_REST_API_TOKEN` oder `UPSTASH_REDIS_REST_URL`/`_TOKEN`. Beide
   Schreibweisen versteht die Funktion.
2. **Settings → Environments → Production**: `PLAN_WRITE_KEY` anlegen, Wert frei wählen – das
   ist der Schlüssel für den Link.
3. Einmal neu deployen, damit die Variablen greifen.

Solange das nicht eingerichtet ist, bleibt die Seite voll bedienbar; „Speichern" wirkt dann nur
im eigenen Browser und die Statuszeile weist darauf hin.

## Vorgaben

- Parzelle 10 × 10 m (100 m²), gebucht 2 quer × 3 tief = 20 × 30 m = 600 m²
- Luftbild-Justage: X 0,5 · Y −2 · Zoom 103 % · Drehung 6°

## Deployment

Vercel, Preset **Other**, Build Command und Output Directory leer. Direkt auf `main` pushen –
das deployt nach Produktion und ist nach ein bis zwei Minuten live. Zurück geht es per
`git revert`.

Technische Details, Konventionen und Fallstricke stehen in `CLAUDE.md`.
