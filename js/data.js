/**
 * Inhalte der "Map of Electrical Engineering".
 *
 * Hier werden Texte, Positionen und Verbindungen gepflegt – main.js baut daraus
 * die Karte. Alle Koordinaten beziehen sich auf die Zeichenfläche
 * (width × height); die Karte skaliert automatisch.
 *
 *   level  → Reihenfolge der Aufbau-Animation (0 = Fundament, 5 = Krone)
 *   size   → "base" | "station" | "crown" | "perk"
 *   hint   → Zusatzzeile im Tooltip, hintLabel überschreibt das Label davor
 */
window.EIT_MAP = {
  width: 1400,
  height: 1160,

  branches: {
    fund:    { name: 'Fundament' },
    energie: { name: 'Energietechnik' },
    mikro:   { name: 'Mikroelektronik' },
    ki:      { name: 'Künstliche Intelligenz' },
    robotik: { name: 'Robotik' },
    dual:    { name: 'Duales Studium' },
  },

  /* Geometrie der Dekoration: Sockel, Leiterbahn, Grundlinie */
  layout: {
    plinth: { x: 400, y: 830, w: 600, h: 165 },
    bus: { y: 852, from: 'mathematik', to: 'physik' },
    ground: { y: 1080, x1: 110, x2: 1290, pillars: [580, 820] },
  },

  /* Die vier Äste: Startpunkt auf dem Fundament + Stationen von unten nach oben */
  paths: {
    energie: { socket: [610, 852], nodes: ['maschinen', 'leistungselektronik', 'erneuerbare', 'smartgrid', 'energietechnik'] },
    mikro:   { socket: [670, 852], nodes: ['schaltung', 'halbleiter', 'fpga', 'embedded', 'mikroelektronik'] },
    ki:      { socket: [730, 852], nodes: ['programmierung', 'signal', 'ml', 'edgeai', 'ki'] },
    robotik: { socket: [790, 852], nodes: ['sensorik', 'regelung', 'antriebe', 'automatisierung', 'robotik'] },
  },

  /* Querverbindungen zwischen den Ästen (gestrichelt) */
  links: [
    ['leistungselektronik', 'halbleiter'],
    ['embedded', 'edgeai'],
    ['signal', 'sensorik'],
    ['edgeai', 'automatisierung'],
  ],

  nodes: [
    /* ---------- Fundament ---------- */
    {
      id: 'mathematik', branch: 'fund', size: 'base', level: 0, x: 535, y: 915,
      title: 'Mathematik',
      text: 'Analysis, lineare Algebra, komplexe Zahlen und Differentialgleichungen: die Sprache, in der Schaltungen, Signale und Systeme beschrieben werden.',
      hint: 'Die Fourier-Transformation zerlegt jeden Klang in seine Frequenzen.',
    },
    {
      id: 'physik', branch: 'fund', size: 'base', level: 0, x: 865, y: 915,
      title: 'Physik',
      text: 'Elektrische und magnetische Felder, Wellen und Halbleiterphysik: Hier verstehst du, was in Bauteilen wirklich passiert.',
      hint: 'Ohne Maxwell-Gleichungen kein Mobilfunk, kein WLAN, kein Elektromotor.',
    },

    /* ---------- Ast: Energietechnik ---------- */
    {
      id: 'maschinen', branch: 'energie', size: 'station', level: 1, x: 440, y: 700,
      title: 'Elektrische Maschinen',
      text: 'Motoren und Generatoren wandeln elektrische in mechanische Energie – und umgekehrt.',
      hint: 'Vom E-Bike-Antrieb bis zum Generator im Windrad.',
    },
    {
      id: 'leistungselektronik', branch: 'energie', size: 'station', level: 2, x: 320, y: 560,
      title: 'Leistungselektronik',
      text: 'Strom effizient wandeln und steuern: Gleichrichter, Wechselrichter und Schaltnetzteile mit minimalen Verlusten.',
      hint: 'Steckt in jeder Ladesäule und jedem Handy-Netzteil.',
    },
    {
      id: 'erneuerbare', branch: 'energie', size: 'station', level: 3, x: 245, y: 420,
      title: 'Erneuerbare Energien',
      text: 'Photovoltaik, Windkraft und Wasserkraft: Technik, die die Energiewende möglich macht.',
      hint: 'Ein Wechselrichter speist Sonnenstrom vom Dach ins Hausnetz ein.',
    },
    {
      id: 'smartgrid', branch: 'energie', size: 'station', level: 4, x: 200, y: 280,
      title: 'Smart Grid & Speicher',
      text: 'Intelligente Netze und Batteriespeicher gleichen Erzeugung und Verbrauch in Echtzeit aus.',
      hint: 'Das E-Auto als rollender Stromspeicher – bidirektionales Laden.',
    },
    {
      id: 'energietechnik', branch: 'energie', size: 'crown', level: 5, x: 175, y: 125,
      title: 'Energietechnik',
      text: 'Die Energiewende braucht Ingenieurinnen und Ingenieure – vom Windpark bis zur Wallbox.',
      hintLabel: 'Karriere', hint: 'Energieversorger, Netzbetreiber, E-Mobilität, Anlagenbau',
    },

    /* ---------- Ast: Mikroelektronik ---------- */
    {
      id: 'schaltung', branch: 'mikro', size: 'station', level: 1, x: 612, y: 700,
      title: 'Schaltungstechnik',
      text: 'Analoge und digitale Schaltungen entwerfen, simulieren und im Labor zum Leben erwecken.',
      hint: 'Ein Verstärker macht aus Mikrofon-Millivolt ein kräftiges Signal.',
    },
    {
      id: 'halbleiter', branch: 'mikro', size: 'station', level: 2, x: 562, y: 560,
      title: 'Halbleiter',
      text: 'Dioden, Transistoren, Siliziumkarbid und Galliumnitrid: die Bausteine aller Elektronik.',
      hint: 'Ein moderner Prozessor enthält Milliarden Transistoren.',
    },
    {
      id: 'fpga', branch: 'mikro', size: 'station', level: 3, x: 528, y: 420,
      title: 'Digitaltechnik & FPGA',
      text: 'Logikgatter, Zustandsautomaten und programmierbare Hardware: eigene Digitalschaltungen in Silizium gießen.',
      hint: 'FPGAs verarbeiten Radar- und Videodaten in Echtzeit.',
    },
    {
      id: 'embedded', branch: 'mikro', size: 'station', level: 4, x: 520, y: 280,
      title: 'Embedded Systems',
      text: 'Mikrocontroller programmieren – das unsichtbare Gehirn in Auto, Waschmaschine und Wearable.',
      hint: 'Ein modernes Auto enthält Dutzende vernetzte Steuergeräte.',
    },
    {
      id: 'mikroelektronik', branch: 'mikro', size: 'crown', level: 5, x: 520, y: 125,
      title: 'Mikroelektronik',
      text: 'Chips sind die Schlüsseltechnologie des 21. Jahrhunderts – und Europa baut seine Halbleiterindustrie aus.',
      hintLabel: 'Karriere', hint: 'Halbleiterindustrie, Automotive-Elektronik, Medizintechnik, Consumer Electronics',
    },

    /* ---------- Ast: Künstliche Intelligenz ---------- */
    {
      id: 'programmierung', branch: 'ki', size: 'station', level: 1, x: 788, y: 700,
      title: 'Programmierung',
      text: 'C, Python und Co.: Software steckt heute in fast jedem elektrotechnischen System.',
      hint: 'Vom Mikrocontroller-Code bis zur Datenanalyse.',
    },
    {
      id: 'signal', branch: 'ki', size: 'station', level: 2, x: 838, y: 560,
      title: 'Signalverarbeitung',
      text: 'Signale filtern, analysieren und übertragen – die Basis für Mobilfunk, Audio und Radar.',
      hint: 'Noise-Cancelling-Kopfhörer rechnen Störgeräusche in Echtzeit heraus.',
    },
    {
      id: 'ml', branch: 'ki', size: 'station', level: 3, x: 872, y: 420,
      title: 'Machine Learning',
      text: 'Neuronale Netze lernen aus Messdaten, Muster zu erkennen und Vorhersagen zu treffen.',
      hint: 'Predictive Maintenance: Die Maschine meldet sich, bevor sie ausfällt.',
    },
    {
      id: 'edgeai', branch: 'ki', size: 'station', level: 4, x: 880, y: 280,
      title: 'Edge AI & Vision',
      text: 'KI direkt auf dem Chip: Bilderkennung in Echtzeit – schnell, energiesparend und ohne Cloud.',
      hint: 'Kameras im Auto erkennen Fußgänger und Verkehrszeichen.',
    },
    {
      id: 'ki', branch: 'ki', size: 'crown', level: 5, x: 880, y: 125,
      title: 'Künstliche Intelligenz',
      text: 'Wer Hardware und KI zusammendenkt, gestaltet die Technik von morgen.',
      hintLabel: 'Karriere', hint: 'Autonomes Fahren, Industrie 4.0, Smart Devices, Data Science',
    },

    /* ---------- Ast: Robotik ---------- */
    {
      id: 'sensorik', branch: 'robotik', size: 'station', level: 1, x: 960, y: 700,
      title: 'Sensorik & Messtechnik',
      text: 'Temperatur, Abstand, Kraft, Licht: Sensoren sind die Sinnesorgane jeder Maschine.',
      hint: 'Dein Smartphone steckt voller Sensoren – vom Beschleunigungssensor bis zum Barometer.',
    },
    {
      id: 'regelung', branch: 'robotik', size: 'station', level: 2, x: 1080, y: 560,
      title: 'Regelungstechnik',
      text: 'Regelkreise halten Systeme stabil – vom Tempomat bis zur Drohne im Schwebeflug.',
      hint: 'Ein Quadrocopter korrigiert seine Lage hunderte Male pro Sekunde.',
    },
    {
      id: 'antriebe', branch: 'robotik', size: 'station', level: 3, x: 1155, y: 420,
      title: 'Antriebe & Aktorik',
      text: 'Servomotoren, Getriebe und ihre Ansteuerung bringen Bewegung ins System.',
      hint: 'Jedes Gelenk eines Industrieroboters hat seinen eigenen Antrieb.',
    },
    {
      id: 'automatisierung', branch: 'robotik', size: 'station', level: 4, x: 1200, y: 280,
      title: 'Automatisierung',
      text: 'SPS, Industrieroboter und vernetzte Fabriken: Industrie 4.0 zum Anfassen.',
      hint: 'Die Region Stuttgart ist ein Zentrum für Maschinenbau und Automatisierung.',
    },
    {
      id: 'robotik', branch: 'robotik', size: 'crown', level: 5, x: 1225, y: 125,
      title: 'Robotik',
      text: 'Roboter verbinden Mechanik, Elektronik und Software – Elektrotechnik in Bewegung.',
      hintLabel: 'Karriere', hint: 'Automatisierungstechnik, Automobilindustrie, Logistik, Medizinrobotik',
    },

    /* ---------- Linie: Duales Studium ---------- */
    {
      id: 'praxis', branch: 'dual', size: 'perk', level: 0, x: 220, y: 1080,
      title: 'Theorie ↔ Praxis',
      text: 'Etwa alle drei Monate wechselst du zwischen Hochschule und Unternehmen. Was du lernst, wendest du direkt an.',
      hintLabel: 'Plus', hint: 'Echte Projekte statt Theorie im Elfenbeinturm.',
    },
    {
      id: 'kurse', branch: 'dual', size: 'perk', level: 0, x: 460, y: 1080,
      title: 'Kleine Kurse',
      text: 'Du lernst in festen Kursgruppen statt im überfüllten Hörsaal – mit direktem Draht zu den Lehrenden.',
      hintLabel: 'Plus', hint: 'Hier kennt man dich mit Namen.',
    },
    {
      id: 'gehalt', branch: 'dual', size: 'perk', level: 0, x: 700, y: 1080,
      title: 'Gehalt ab Tag 1',
      text: 'Du bist bei deinem Partnerunternehmen angestellt und erhältst während des gesamten Studiums eine monatliche Vergütung – auch in den Theoriephasen.',
      hintLabel: 'Plus', hint: 'Finanziell unabhängig vom ersten Semester an.',
    },
    {
      id: 'bachelor', branch: 'dual', size: 'perk', level: 0, x: 940, y: 1080,
      title: 'Bachelor in 3 Jahren',
      text: 'Nach sechs Semestern hast du den Bachelor of Engineering (210 ECTS) – und dazu drei Jahre Berufserfahrung.',
      hintLabel: 'Plus', hint: 'Danach direkt in den Job oder weiter zum Master.',
    },
    {
      id: 'karriere', branch: 'dual', size: 'perk', level: 0, x: 1180, y: 1080,
      title: 'Top-Berufsaussichten',
      text: 'Viele Absolventinnen und Absolventen werden direkt von ihrem Partnerunternehmen übernommen.',
      hintLabel: 'Plus', hint: 'Fachkräfte der Elektrotechnik sind gefragt wie nie.',
    },
  ],
};
