# Stellplatz-Planer

Interaktiver Belegungsplan für die gebuchten Parzellen. Statische Seite ohne Build-Schritt:
`index.html` enthält Markup, CSS und JS, `luftbild.jpg` liegt daneben.

Geplant wird am Desktop: Objektleiste links, Plan rechts. Auf dem Handy ist die Seite zum
Anschauen gedacht – der Plan steht oben, die Objektliste darunter.

Live: https://sb-parzellen-planer.vercel.app/

## Bedienung

- Objekt aus der Leiste links wählen, im Plan anklicken und ziehen
- Leere Fläche ziehen verschiebt den Plan · Zoom über `+` `−` `FIT` rechts unten (mobil: zwei Finger)
- Tastatur: `R` +15° · `Q` +90° · `D` duplizieren · `Entf` löschen · Pfeiltasten 25 cm
- Fläche und Luftbild-Justage oben unter „Fläche & Luftbild einstellen"
- „Als Text" exportiert das Layout als Zeichenkette zum Weitergeben, „Text einlesen" liest es zurück
- „Drucken / PDF" gibt nur den Plan aus, ohne Bedienleisten

## Vorgaben

- Parzelle 10 × 10 m (100 m²), gebucht 2 quer × 3 tief = 20 × 30 m = 600 m²
- Luftbild-Justage: X 0,5 · Y −2 · Zoom 103 % · Drehung 6°

## Deployment

Vercel, Preset **Other**, Build Command und Output Directory leer. Push auf `main` deployt
in Produktion, Push auf einen Branch erzeugt eine Preview-URL.

Technische Details, Konventionen und Fallstricke stehen in `CLAUDE.md`.
