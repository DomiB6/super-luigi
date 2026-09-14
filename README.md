# Super Luigi – Kampf um die Champions League

Ein kleines, eigenständiges Retro-Browser-Jump'n'Run im Fussball-Setting.

## Starten

### Variante A – direkt
`index.html` im Browser öffnen.

### Variante B – localhost (empfohlen)
Im Projektordner z. B.:

```bash
python3 -m http.server 8080
```

Dann `http://localhost:8080` öffnen.

Du kannst den gesamten Ordner auch unverändert auf einen normalen Webserver hochladen.

## Steuerung

Desktop:
- Pfeil links/rechts: laufen
- Leertaste: springen
- X: schiessen
- Enter / Leertaste: Menüauswahl

Mobile:
- Links / Rechts als Touch-Buttons
- Sprung
- Schuss

## Audio-Dateien

Lege deine Audio-Dateien in `assets/audio/` ab. In `game.js` ganz oben findest du den Block `AUDIO`.

Vorgesehene Dateien:
- `01-start-theme.mp3` – Startscreen-Musik
- `02-menu-select.mp3` – Menü-Auswahl
- `03-game-theme.mp3` – Spielmusik
- `04-jump.mp3` – Sprung
- `05-collect-ball.mp3` – Fussball sammeln
- `06-stomp-enemy.mp3` – Gegner überspringen/besiegen
- `07-shoot.mp3` – Schuss
- `08-game-over.mp3` – Game Over
- `09-victory.mp3` – optionaler Sieg-Sound für Robi/Holzi

Wenn eine Datei fehlt, läuft das Spiel trotzdem weiter; der Browser ignoriert den fehlenden Sound.

## Charakterregeln

- Luigi: normal, Endgegner zweiköpfiger Drache
- Robi: freie Bahn, kein Endgegner, gewinnt beim Ziel
- Carlos: schiesst Fische, Endgegner zweiköpfiger Adler mit Gitarrenprojektilen
- Marius: gesperrt, Hinweis auf Timo
- Timo: gesperrt, Hinweis auf Marius
- Holzi: Glatze, unbesiegbar, zerstört Gegner/Hindernisse und gewinnt
- Lars: Endgegner Schiedsrichter, der gelbe Karten wirft

Luigi, Carlos und Lars können den Boss nicht besiegen. Die Endgegner sind absichtlich unverwundbar und feuern aggressive Salven.

## Hinweis
Die Grafik besteht vollständig aus selbst gezeichneten, einfachen Pixel-Art-Formen. Es werden keine Nintendo-Grafiken oder -Sprites mitgeliefert.

## Update – Bossphasen & Grafik
- Level ungefähr halbiert.
- Bosskämpfe starten erst, wenn der Boss sichtbar ist.
- Bossphase 1: 5 Sekunden ruhig, Phase 2: 5 Sekunden schwieriger, Phase 3: Eskalation.
- Robi-Gewinntext: „Liebling von Toni“.
- Holzi-Gewinntext: „Mindset ist alles“.
- Figuren, Fische, Bälle, Gegner und Landschaft wurden grafisch detaillierter gezeichnet.


## Version 3
- Grafikaufbau deutlich detailreicher: weichere Retro-Landschaft, Felsen, Baumgruppen, Blumen, plastischeres Spielfeld und Tore.
- Carlos' Fisch-Projektil ist grösser und klar als Fisch erkennbar.
- Bosskampf: Phase 1 (0–5 s) genau 1 Geschoss pro Salve, Phase 2 (5–10 s) 2 Geschosse, Phase 3 ab 10 s 3 Geschosse.
- Schussfrequenz wurde zusätzlich entschärft.

## Version 4 – Musiklogik korrigiert
- `01-start-theme.mp3`: nur Startmaske; stoppt beim Wechsel zur Charakterwahl.
- `02-menu-select.mp3`: ist jetzt durchgehende Menü-Musik und läuft beim Navigieren zwischen Charakteren ohne Neustart weiter.
- Die Menü-Musik läuft auch auf „Tippe um zu starten“ und in Marius/Timo-Modalen weiter.
- Erst beim tatsächlichen Spielstart stoppt die Menü-Musik und `03-game-theme.mp3` beginnt.
- Beim Zurückkehren zur Charakterwahl wird wieder `02-menu-select.mp3` gestartet.
- Browser-Autoplay: Die Startmusik wird beim Laden sofort versucht; blockiert der Browser Autoplay, startet sie technisch bedingt erst bei der ersten Benutzerinteraktion.


## Version 5 – Musiklogik
- Startscreen: `01-start-theme.mp3` wird sofort beim Seitenladen angefordert.
- Charakterwahl: `01-start-theme.mp3` wird hart gestoppt, dann startet `02-menu-select.mp3`.
- Navigation zwischen Charakteren startet `02-menu-select.mp3` nicht neu.
- Levelstart: `02-menu-select.mp3` wird hart gestoppt und auf 0 zurückgesetzt, bevor `03-game-theme.mp3` beginnt.
- Zentraler Music-State-Manager verhindert, dass ein verspätetes `play()` eines alten Tracks wieder in einen neuen Screen hineinspielt.
- Hinweis: Audible Autoplay vor der ersten Benutzerinteraktion kann von Chrome/Safari/Firefox blockiert werden. Das lässt sich durch Website-Code nicht zuverlässig umgehen.
