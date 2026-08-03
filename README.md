# Stellplatz-Planer

Interaktiver Belegungsplan für die gebuchten Parzellen. Eine einzige HTML-Datei,
Luftbild als Base64 eingebettet, keine externen Abhängigkeiten, kein Build-Schritt.

## Deployment (Vercel Hobby, privates Repo)

1. Privates Repo auf GitHub anlegen, Dateien hochladen (`index.html`, `vercel.json`, `robots.txt`).
2. Auf vercel.com → **Add New… → Project** → Repo importieren.
3. Framework Preset: **Other**. Build Command und Output Directory leer lassen.
4. Deploy. Die Produktions-URL ist danach öffentlich erreichbar –
   Suchmaschinen werden per `robots.txt` und `X-Robots-Tag` ausgeschlossen.

Änderung am Plan: `index.html` im Repo ersetzen, Vercel deployt automatisch neu.

## Bedienung

- Objekt antippen und ziehen; leere Fläche ziehen verschiebt den Plan; zwei Finger zoomen.
- Tastatur: `R` +15°, `Q` +90°, `D` duplizieren, `Entf` löschen, Pfeiltasten 25 cm.
- Fläche und Luftbild-Justage oben unter „Fläche & Luftbild einstellen".
- „Als Text" exportiert das Layout als Zeichenkette zum Weitergeben, „Text einlesen" liest es zurück.

## Vorgaben

- Parzelle 10 × 10 m (100 m²), gebucht 2 quer × 3 tief = 600 m².
- Luftbild-Justage: X 0,5 · Y −2 · Zoom 103 % · Drehung 6°.
- Das Luftbild ist ein Google-Maps-Ausschnitt inklusive Wasserzeichen – nur intern verwenden,
  nicht veröffentlichen.
