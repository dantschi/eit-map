# Map of Electrical Engineering

Interaktiver One-Pager zur Bewerbung des Studiengangs **Elektrotechnik und Informationstechnik an der DHBW Stuttgart** – im Corporate Design der DHBW Stuttgart, die Idee inspiriert von der [Map of Mathematics](https://dosmaps.com/momathematics).

Die Karte zeigt, **wohin das Studium führt**: oben 34 aktuelle Berufsbilder in sieben Berufsfeldern, in der Mitte die Studienrichtungen **Automation und Elektronik** samt Wahlbaukasten, unten das gemeinsame **Fundament**. Fährt man über ein Berufsbild, leuchten die Module auf, die darauf vorbereiten – und umgekehrt.

Grundlage sind die Modulhandbücher Elektrotechnik und Informationstechnik der DHBW Stuttgart (Stand 27.10.2026).

![Vorschau](assets/og-image.png)

## Starten

Kein Build, keine Abhängigkeiten: `index.html` per Doppelklick im Browser öffnen.

Alternativ mit lokalem Server:

```bash
python3 -m http.server 8000   # → http://localhost:8000
```

## Veröffentlichen

Die Seite wird per **GitHub Action** (`.github/workflows/pages.yml`) automatisch auf **GitHub Pages** veröffentlicht: unter `https://<benutzer>.github.io/eit-map/`.

**Einmalig einrichten:** *Settings → Pages → Build and deployment → Source:* **GitHub Actions** wählen.

Danach gilt:

- Jeder Push auf den Standard-Branch veröffentlicht die Seite neu (Pushes auf andere Branches werden ignoriert).
- Manuell: *Actions → „Webseite veröffentlichen“ → Run workflow*.
- Vor dem Veröffentlichen prüft `tools/check-data.cjs` die Inhalte in `js/data.js`. Bei einem Fehler (z. B. fehlendes Icon, Tippfehler in einer ID) bricht der Lauf ab und die bisherige Version bleibt online – die Fehlermeldung steht im Log des Schritts „Inhalte prüfen“.
- Veröffentlicht werden nur `index.html`, `css/`, `js/` und `assets/`; die `og:image`-Adresse für die Social-Media-Vorschau wird dabei automatisch auf die absolute URL gesetzt.

Ohne GitHub: Die Seite ist rein statisch und kann auf jedem Webserver liegen – einfach die genannten Dateien hochladen.

## Browser-Unterstützung

Aktuelle Versionen von Chrome, Edge, Firefox und Safari (etwa seit 2023). Genutzt werden u. a. Container-Query-Einheiten (`cqw`), `color-mix()` und automatische Silbentrennung.

## Funktionen

- **Corporate Design der DHBW Stuttgart**: DHBW-Rot, Grautöne und Weiß, klare Kanten, Serifen-Headlines, dunkelgraue Navigationsleiste und roter Infokasten wie auf der Studiengangsseite. Zusätzlich ein dunkles Farbschema – folgt der Systemeinstellung, umschaltbar in der Navigationsleiste.
- **Verbindungen Modul ↔ Beruf**: Hover (Maus), Fokus (Tastatur) oder Tippen (Touch) zeigt ein Infofenster und zeichnet animierte Linien zu allen zugehörigen Modulen bzw. Berufsbildern.
- **Flussband**: Animierte Bänder zeigen, wie viele Module einer Studienrichtung in welches Berufsfeld führen.
- **Filter**: „Meine Studienrichtung“ hebt angebotene Module und passende Berufsbilder hervor; ein Klick auf einen Regionstitel hebt das ganze Berufsfeld bzw. die Studienrichtung hervor.
- **Berufsbilder als Liste** unter der Karte – übersichtlich auf dem Smartphone, mit „Auf der Map zeigen“.
- **Barrierearm**: Einträge sind echte Buttons mit Beschreibung für Screenreader, `Esc` schließt Infofenster, `prefers-reduced-motion` schaltet Animationen ab.
- **Datenschutzfreundlich**: keine externen Requests – die Schriften (Fira Sans, Source Serif 4; OFL) sind lokal eingebettet.

## Aufbau

```
index.html                 Seite: Hero, Map, Berufsbilder, Duales Studium, Studienstart, Kontakt
css/style.css              Design-Tokens (hell/dunkel), Karte, Animationen
css/fonts.css              Schriften als Data-URI (laden auch per file://)
js/data.js                 Inhalte: Berufsfelder, Berufsbilder, Module, Anordnung
js/icons.js                Icons als Inline-Sprite (generiert)
js/main.js                 Baut die Karte und steuert die Interaktion
assets/favicon.svg         Favicon (generiert)
assets/og-image.png        Vorschaubild für Social Media (generiert)
tools/generate-icons.mjs   erzeugt Icons und Favicon
tools/render-og-image.cjs  erzeugt og-image.png aus der echten Karte
tools/check-data.cjs       prüft js/data.js (läuft auch vor jeder Veröffentlichung)
.github/workflows/pages.yml  veröffentlicht die Seite auf GitHub Pages
```

## Corporate Design

- **Farben** stehen als Tokens am Anfang von `css/style.css` (`--red` = DHBW-Rot `#E2001A`, Grautöne, Varianten für das dunkle Schema).
- **Schriften:** Die Hausschrift der DHBW ist lizenzpflichtig. Eingebettet sind deshalb freie, sehr ähnliche Schriften: Fira Sans (aus der Meta-Familie entwickelt) und Source Serif 4 für Headlines. Liegt eine Lizenz für die Hausschrift vor, genügt es, `--font` und `--serif` umzustellen.
- **Logo:** Das offizielle Logo ist nicht nachgebaut. In `index.html` ist im Kopfbereich die Stelle markiert, an der die Original-Datei aus dem CD-Paket eingesetzt wird.

## Inhalte anpassen

Alle Inhalte stehen in **`js/data.js`** – dafür sind keine JavaScript-Kenntnisse nötig.

| Was | Wo |
| --- | --- |
| Berufsbild (Titel, Beschreibung, „Warum jetzt“) | `jobs[].title`, `text`, `hint` |
| Welche Module auf ein Berufsbild vorbereiten | `jobs[].modules` (IDs aus `modules`) |
| Modul (Titel, Inhalt, Modulnummern) | `modules[].title`, `text`, `codes` |
| Pflicht/Wahl je Studienrichtung | `modules[].sr`, z. B. `{ aut: 'P', ele: 'W' }` |
| Wahlunit aus „Ausgewählte Themen“ | `modules[].unit: true` |
| Berufsfelder, Studienrichtungen, Reihenfolge | `regions` und `layout.rows` |

Die Positionen berechnet `main.js` automatisch aus der Reihenfolge – es gibt keine Koordinaten zu pflegen. Die Reihenfolge innerhalb einer Region entspricht der Reihenfolge in `data.js`.

**Neues Berufsbild:** Eintrag in `jobs` mit `region` (Berufsfeld), `icon` und `modules` ergänzen. Passt kein vorhandenes Icon, eines in `tools/generate-icons.mjs` ergänzen und das Skript ausführen. Ein Berufsfeld fasst gut fünf Berufsbilder.

**Farben:** Die Farben der Regionen stehen als CSS-Variablen `--c-*` in `css/style.css` (je ein Satz für hell und dunkel). Icons übernehmen die Farbe automatisch.

## Werkzeuge (optional)

Nur nötig, wenn Inhalte lokal geprüft oder Icons bzw. Vorschaubild neu erzeugt werden sollen. Voraussetzung: [Node.js](https://nodejs.org/) ab Version 18.

```bash
node tools/check-data.cjs            # js/data.js auf Fehler prüfen
node tools/generate-icons.mjs        # Icons → js/icons.js, Favicon → assets/
npm install --no-save playwright     # einmalig, für das Vorschaubild
npx playwright install chromium
node tools/render-og-image.cjs       # Vorschaubild → assets/og-image.png
```

`node_modules/` und andere lokale Dateien sind per `.gitignore` von der Versionierung ausgenommen.

## Vor der Veröffentlichung

- [ ] Zuordnung Module ↔ Berufsbilder und die Texte fachlich gegenlesen
- [ ] Offizielles Logo der DHBW Stuttgart einsetzen (Stelle im Kopfbereich von `index.html` markiert)

## Lizenzen

Schriften: Fira Sans und Source Serif 4, SIL Open Font License 1.1 (`assets/fonts/`). Icons und Grafiken sind eigens für dieses Projekt erstellt.
