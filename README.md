# Map of Electrical Engineering

Interaktiver One-Pager zur Bewerbung des Studiengangs **Elektro- und Informationstechnik an der DHBW Stuttgart** – inspiriert von [Map of Mathematics](https://dosmaps.com/momathematics).

Vom **Fundament** (Mathematik, Physik) wachsen vier **Äste** nach oben: Energietechnik, Mikroelektronik, Künstliche Intelligenz und Robotik. Darunter verläuft die Linie **Duales Studium** mit den Vorteilen des Studienmodells („Gehalt ab Tag 1“ …).

![Vorschau](assets/og-image.png)

## Starten

Kein Build, keine Abhängigkeiten: `index.html` per Doppelklick im Browser öffnen.

Alternativ mit lokalem Server:

```bash
python3 -m http.server 8000   # → http://localhost:8000
```

## Veröffentlichen

Die Seite ist rein statisch und kann auf jedem Webserver liegen – einfach den gesamten Ordner hochladen.

Direkt aus diesem Repository mit **GitHub Pages**: *Settings → Pages → Build and deployment → Source: Deploy from a branch*, dann den Branch und den Ordner `/ (root)` wählen. Nach kurzer Zeit ist die Seite unter `https://<benutzer>.github.io/eit-map/` erreichbar.

## Browser-Unterstützung

Aktuelle Versionen von Chrome, Edge, Firefox und Safari (etwa seit 2023). Genutzt werden u. a. Container-Query-Einheiten (`cqw`), `color-mix()` und `svh`.

## Funktionen

- **Neon-Look** mit Hell-/Dunkel-Modus: folgt der Systemeinstellung, umschaltbar oben rechts (Wahl wird gespeichert).
- **Aufbau-Animation**: Sobald die Karte sichtbar wird, wachsen die Leitungen vom Fundament nach oben; danach fließt „Strom“ (wandernde Punkte und Elektronen) die Äste hinauf.
- **Tooltips**: Hover (Maus), Fokus (Tastatur) oder Tippen (Touch) öffnet ein Infofenster; der Pfad vom Fundament zur Station leuchtet auf, alles andere wird gedimmt.
- **Legende**: Hover zeigt einen Ast als Vorschau, Klick hält ihn hervorgehoben.
- **Barrierearm**: Stationen sind echte Buttons mit Beschreibung für Screenreader, `Esc` schließt Tooltips, `prefers-reduced-motion` schaltet Animationen ab.
- **Mobil**: Die Karte ist auf schmalen Bildschirmen horizontal wischbar und startet mittig.
- **Datenschutzfreundlich**: keine externen Requests – die Schrift (Space Grotesk, OFL) ist lokal eingebettet.

## Aufbau

```
index.html                 Seite: Hero, Map, Studienstart, Call to Action
css/style.css              Design-Tokens (hell/dunkel), Neon-Effekte, Animationen
css/fonts.css              Space Grotesk als Data-URI (lädt auch per file://)
js/data.js                 Inhalte: Stationen, Texte, Positionen, Verbindungen
js/main.js                 Baut die Karte und steuert die Interaktion
assets/icons/*.svg         27 Neon-Icons (generiert)
assets/favicon.svg         Favicon (generiert)
assets/og-image.png        Vorschaubild für Social Media (generiert)
tools/generate-icons.mjs   erzeugt Icons und Favicon
tools/render-og-image.cjs  erzeugt og-image.png aus der echten Karte
```

## Inhalte anpassen

Alle Inhalte stehen in **`js/data.js`** – dafür sind keine JavaScript-Kenntnisse nötig.

| Was | Wo |
| --- | --- |
| Texte im Tooltip | `nodes[].title`, `text`, `hint` (`hintLabel` ändert das Label vor dem Hinweis) |
| Position einer Station | `nodes[].x` / `y` in Koordinaten der Zeichenfläche (1400 × 1160) |
| Reihenfolge auf einem Ast | `paths.<ast>.nodes` (von unten nach oben) |
| Querverbindungen | `links` |
| Sockel, Grundlinie | `layout` |

**Neue Station:** Eintrag in `nodes` ergänzen, ihre `id` in `paths.<ast>.nodes` einfügen und ein Icon `assets/icons/<id>.svg` anlegen (am einfachsten in `tools/generate-icons.mjs` ergänzen).

**Farben:** Die Astfarben stehen als CSS-Variablen `--c-*` in `css/style.css` (je ein Satz für dunkel und hell). Die Icons haben ihre Farbe eingebrannt – nach einer Änderung von `PALETTE` in `tools/generate-icons.mjs` neu erzeugen (siehe unten).

## Werkzeuge (optional)

Nur nötig, wenn Icons oder Vorschaubild neu erzeugt werden sollen. Voraussetzung: [Node.js](https://nodejs.org/) ab Version 18.

```bash
node tools/generate-icons.mjs        # Icons + Favicon → assets/
npm install --no-save playwright     # einmalig, für das Vorschaubild
npx playwright install chromium
node tools/render-og-image.cjs       # Vorschaubild → assets/og-image.png
```

`node_modules/` und andere lokale Dateien sind per `.gitignore` von der Versionierung ausgenommen.

## Vor der Veröffentlichung

- [ ] Links „Zum Studiengang“ / „Zur Studiengangsseite“ auf die konkrete Studiengangsseite setzen (`TODO` in `index.html`)
- [ ] Impressum und Datenschutzerklärung verlinken
- [ ] `og:image` auf eine absolute URL umstellen
- [ ] Stationen und Texte mit dem aktuellen Curriculum abgleichen

## Lizenzen

Schrift: Space Grotesk, SIL Open Font License 1.1 (`assets/fonts/OFL-SpaceGrotesk.txt`). Icons und Grafiken sind eigens für dieses Projekt erstellt.
