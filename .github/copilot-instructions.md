# Wytyczne dla agentów AI (repo: GULP)

Repo to szablon front‑end z Gulpem, działający w trybach html/php/node. Gulp tworzy strukturę, buduje assety, uruchamia serwery dev (BrowserSync/PHP/Node), optymalizuje obrazy, sprawdza aktualizacje i robi backupy.

## Big picture

- Tryby: projectType = html | php | node (auto: `server.js`/pliki PHP; w innym razie pytanie interaktywne przy starcie).
- Domyślny pipeline: scaffold → compile .kit → minify CSS/JS → copy/optimize images → start server (wg trybu) → watch + live reload.
- Kompilacja `.kit`: do `.html` (html), `.php` (php), `.ejs` do `views/` (node).

## Kluczowe pliki/katalogi

- `gulpfile.mjs`: zadania + serwery + watch (rdzeń projektu).
- `createFiles.mjs`: generuje strukturę i pliki startowe (SCSS/JS/kit/itp.).
- `html/`: źródła `.kit` (partials z prefiksem `_`).
- `src/`: `sass/`, `js/`, `img/` → output w `dist/`.
- Tryb php: `src/php` → kopiowane do `/` (z wyłączeniem `index.php`).
- Tryb node: `server.js`, `views/` (EJS), `routes/`, `data/`.

## Przepływy i komendy

- Instalacja: `npm install`
- Start dev (watch+server): `npm start` (uruchamia domyślny task Gulpa)
- Pojedyncze zadania:
  - `gulp compileKit`, `gulp minifyCSS`, `gulp minifyJS`, `gulp copyImages`, `gulp optimizeImages`
  - `gulp backupProject` (zip do `$BACKUP_PATH/<repo>/<repo>.zip`, bez `node_modules`)
  - `gulp checkPackageUpdates` (zapis do `aktualizacja.txt` via ncu)

## Serwery i porty

- html: BrowserSync static → http://localhost:3000
- php: PHP 127.0.0.1:8000 + BrowserSync proxy → http://localhost:3000
- node: Gulp uruchamia `server.js` i BrowserSync proxy na `PORT+1`.
  - Uwaga: `server.js` sam też startuje BrowserSync i szuka wolnego portu (3000–3100) → możliwy duplikat/rozjazd. Najlepiej ustawić `PORT` w `.env` i wyłączyć BS w `server.js`, polegając na BS z Gulpa.

## Szablony i assety

- `.kit` via `gulp-file-include` (`@@include('_footer.kit')`, `basepath: @file`).
- SCSS: `src/sass/**/*.scss` → `dist/css/*.min.css` (dart-sass + clean-css).
- JS: `src/js/**/*.js` → `dist/js/*.min.js` (uglify).
- Obrazy: `src/img/**/*` → `dist/img` (TinyPNG z `TINYPNG_API_KEY` + imagemin mozjpeg/pngquant/svgo). Sygnatury: `src/img/.tinypng-sigs`.

## Środowisko (.env)

- Klucze: `TINYPNG_API_KEY`, `BACKUP_PATH=./backups`, `PORT=3005`, `DB_HOST/DB_NAME/DB_USER/DB_PASSWORD` (Node/MySQL).
- `.env` jest gitignorowany (patrz `.gitignore`).

## Tryb Node

- `server.js`: Express + EJS (`views/`), statyczne `/dist`, routing `routes/link.js`.
- `data/database.js`: `mysql2/promise` (pool). Przykład MongoDB w komentarzu (nieaktywny).

## Konwencje

- Partials `.kit` z prefiksem `_`, dołączane `@@include('...')`.
- Nie edytuj ręcznie `dist/` (tylko output).
- Nowe zadania Gulpa integruj w `watchFiles`; trzymaj output w `dist/`.
- `src/php/index.php` celowo nie jest kopiowany – nie zmieniaj tego zachowania bez potrzeby.

## Niuanse/pułapki

- Skrypty `build`/`backup` w `package.json` wskazują na `gulp build`/`gulp backup`, ale w pliku eksportowane są nazwy m.in. `watchFiles`, `backupProject`. Używaj nazw z sekcji powyżej albo zaktualizuj skrypty.
- Możliwa duplikacja BrowserSync w Node – preferuj jeden (Gulp) i spójny `PORT` w `.env`.
