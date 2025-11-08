# Szablon Gulp 5 (HTML / PHP / Node + EJS)

Kompletny pipeline deweloperski i produkcyjny: SCSS (dart-sass + autoprefixer + clean-css), JS (terser), obrazy (imagemin + opcjonalnie TinyPNG), kompilacja plików `.kit` → `.ejs/.html/.php`, serwery (BrowserSync proxy / PHP / Node Express), backup ZIP, cache busting (rev), WebP/AVIF (opcjonalnie), minifikacja HTML/PHP (opcjonalnie), płynna typografia i elastyczne mixiny RWD.

---
## 1. Wymagania
- Node.js 18+
- npm

---
## 2. Instalacja
```fish
npm install
```

---
## 3. Struktura katalogów (po pierwszym uruchomieniu)
```
dist/              # build (generowany)
html/              # źródła .kit (partials: _*.kit)
src/
	sass/
		abstracts/_variables.scss
		abstracts/_mixins.scss
		base/_base.scss
		base/_utilities.scss
		components/...
		layout/...
		style.scss
	js/script.js
	img/ (źródła obrazów)
views/             # (Node) EJS generowane z .kit
routes/            # (Node) trasy Express
data/              # (Node) DB / moduły
instrukcja/        # dodatkowa dokumentacja
gulpfile.mjs       # pipeline
createFiles.mjs    # generator startowych plików
server.js          # (Node) serwer Express
```

---
## 4. Plik `.env` – przykładowy (`.env.example`)
```
PORT=3005
NODE_ENV=development
TINYPNG_API_KEY=PASTE_KEY_OR_LEAVE_EMPTY
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=secret
PG_DATABASE=app_db
BS_NOTIFY=true
FORCE_RELOAD_AFTER_CSS=true
BROWSER_SYNC_OPEN=false
ALWAYS_OPEN_PROXY=true
ALWAYS_OPEN_DELAY=1800
BS_REMINDER=true
BACKUP_PATH=./backups
```
Opis kluczowych:
- PORT – port serwera Express (proxy BS = PORT+1).
- BS_NOTIFY – bąbelki powiadomień BrowserSync.
- FORCE_RELOAD_AFTER_CSS – pełny reload po kompilacji CSS (fallback gdy injekcja nie działa).
- BROWSER_SYNC_OPEN – kontrola auto-open; przy `false` używamy naszego fallbacku.
- ALWAYS_OPEN_PROXY – otwiera proxy jeśli brak klientów.
- BS_REMINDER – wypisuje przypomnienia, by wejść na właściwy port.
- TINYPNG_API_KEY – jeśli brak, obrazy tylko kopiowane.
- BACKUP_PATH – docelowy folder kopii ZIP.

---
## 5. Skrypty npm
```fish
npm run dev            # Gulp: wykrycie typu projektu + watch + serwer/proxy
npm run dev:fast       # Szybszy dev (bez cięższej optymalizacji obrazów)
npm run dev:browser    # Lekki tryb HTML (BrowserSync na 3100) bez Node/PHP
npm run build          # Pełny build produkcyjny (clean + kompilacje + optymalizacje)
npm run clean          # Usuwa katalog dist/
npm run backup         # Tworzy ZIP projektu w BACKUP_PATH
npm run check:updates  # Sprawdza dostępne aktualizacje (aktualizacja.txt)
npm run audit:fix      # Próba naprawy podatności (npm audit fix)
npm run db:init:pg     # Inicjalizacja bazy Postgres (tworzy jeśli brak)
```

---
## 6. Tryby projektu
- `node` – Express + EJS + BrowserSync proxy (`http://localhost:PORT+1`).
- `php` – Serwer PHP (8000) + BrowserSync proxy (3000).
- `html` – Statyczny serwer BrowserSync (3000).
- `browserOnly` – Wymusza HTML + serwer na 3100 (skrót do prototypowania).

Typ jest wykrywany (server.js => node). Jeśli brak – pojawia się prompt wyboru.

---
## 7. SCSS i RWD
Pliki:
- `src/sass/abstracts/_variables.scss` – mapa `$breakpoints`.
- `src/sass/abstracts/_mixins.scss` – mixiny: `respond`, `respond-up`, `respond-down`, `respond-between`, `fluid-type`.
- `src/sass/base/_base.scss` – reset, kontener `.container`, przykładowy `h1` z płynną typografią.

Importy w `style.scss`:
```scss
@use "abstracts/variables";
@use "abstracts/mixins";
@use "base/base";
@use "base/utilities";
```

Przykłady użycia:
```scss
.sidebar {
	@include mixins.respond-up(tab_land) { display: block; }
	@include mixins.respond-down(tab_port) { display: none; }
}

.grid {
	@include mixins.respond-between(tab_port, tab_land) {
		grid-template-columns: repeat(3, 1fr);
	}
}

h2 { @include mixins.fluid-type(2rem, 3.2rem, phone, tab_land); }
```

---
## 8. Obrazy
- `copyImages` – kopiuje.
- `optimizeImages` – imagemin (mozjpeg/pngquant/svgo).
- `compressImages` – TinyPNG (tylko zmienione pliki; potrzebny TINYPNG_API_KEY).
- Opcjonalnie w build: konwersja do WebP/AVIF (gdy zainstalujesz odpowiednie paczki). 

---
## 9. Build produkcyjny
Zadanie `build` może wykonywać dodatkowo:
- Minifikację HTML/PHP (jeśli zainstalowano `gulp-htmlmin`).
- Cache busting (rev+rewrite) jeśli dodasz `gulp-rev`, `gulp-rev-rewrite`.
- Generowanie WebP/AVIF jeśli dodasz `imagemin-webp`, `imagemin-avif`.

Jeśli moduł nie jest zainstalowany – build wypisze ostrzeżenie i pominie krok.

---
## 10. Live Reload / BrowserSync
Node: otwieraj ZAWSZE proxy: `http://localhost:PORT+1` (np. 10000), nie port Express (9999). 
Diagnostyka:
- Log `[BS] client connected` oznacza podłączoną przeglądarkę.
- Jeśli brak klientów – zobacz przypomnienia `[BS] Brak klientów – odwiedź proxy`. 
- FORCE_RELOAD_AFTER_CSS=true wymusza pełny reload po zmianie SCSS.
- BS_NOTIFY=true pokazuje bąbelki zmian.

---
## 11. Backup ZIP
```fish
npm run backup
```
Wynik: BACKUP_PATH/<nazwa_projektu>/<nazwa_projektu>.zip

---
## 12. Postgres (opcjonalnie)
Ustaw zmienne PG_ w `.env`. 
Inicjalizacja:
```fish
npm run db:init:pg
```
Test w kodzie:
```js
import { testConnection } from "./data/postgres.js";
await testConnection();
```

---
## 13. Debug / Najczęstsze problemy
1. Brak auto-reload: korzystasz z portu serwera (9999) zamiast proxy (10000).
2. Brak injekcji CSS: zostaw FORCE_RELOAD_AFTER_CSS=true (możliwy blokujący dodatek przeglądarki).
3. Tinify nic nie robi: brak TINYPNG_API_KEY lub pliki nie zmienione (cache).
4. Rev pominięty: brak zainstalowanych paczek `gulp-rev`, `gulp-rev-rewrite`.
5. WebP/AVIF pominięte: brak `imagemin-webp` / `imagemin-avif`.
6. HTML min pominięty: brak `gulp-htmlmin`.

---
## 14. Szybki start od zera
```fish
git clone <repo>
cd <repo>
npm install
cp .env.example .env   # uzupełnij PORT, ewentualnie TINYPNG_API_KEY
gulp                   # wybierz typ projektu jeśli nie wykryto
```
Otwórz (Node): http://localhost:PORT+1

---
## 15. Rozszerzenia / Pomysły
- Dodanie Husky (pre-commit: lint + format).
- TypeScript (tsconfig + integracja w pipeline).
- Storybook / komponenty UI osobno.
- Dockerfile dla środowiska CI.

---
## 16. FAQ (skrót)
Q: Mogę używać dawnych @import?  
A: Tak, ale zaleca się @use (już skonfigurowane w generatorze).

Q: Jak wyłączyć pełny reload po CSS?  
A: Ustaw w `.env` FORCE_RELOAD_AFTER_CSS=false.

Q: Jak dodać własny breakpoint?  
A: Dodaj do `$breakpoints` w `_variables.scss` np. `ultra: 160em` i używaj `@include mixins.respond-up(ultra)`.

Q: Dlaczego build pomija kroki?  
A: Brak odpowiednich paczek – z założenia są opcjonalne.

---
## 17. Licencja / Użycie
Dodaj `LICENSE` jeśli publikujesz. Szablon może być re-używany w projektach prywatnych i komercyjnych.

---
Miłej pracy! Jeśli potrzebujesz dodatkowych przykładów (grid, spacing utilities, mapy kolorów) – dopisz i zintegrowaj w `abstracts/`. 

