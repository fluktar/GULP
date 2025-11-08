// createFiles.mjs
import fs from "fs";
import path from "path";

const createFiles = (projectType, done) => {
  const filesToCreate = [];

  // Pliki wspólne dla wszystkich projektów
  filesToCreate.push(
    {
      path: "html/index.kit",
      content: `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="description" content="Opis strony" />
    <meta name="keywords" content="słowa kluczowe" />
    <meta name="robots" content="index, follow" />
    <meta name="author" content="Twoje Imię" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tytuł strony</title>
    <link rel="stylesheet" href="/dist/css/style.min.css" />
    
</head>
<body>
    <h1>Hello All!</h1>
    @@include('_footer.kit')
    <script src="/dist/js/script.min.js"></script>
  </body>
</html>`,
    },
    {
      path: "html/_footer.kit",
      content: "<footer></footer>",
    },
    {
      path: "src/sass/abstracts/_variables.scss",
      content: `$breakpoints: (
  phone: 37.5em,       // ~600px
  tab_port: 56.25em,   // ~900px
  tab_land: 75em,      // ~1200px
  big_desktop: 112.5em // ~1800px
);`,
    },
    {
      path: "src/sass/abstracts/_mixins.scss",
      content: `@mixin center {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  position: absolute;
}

@use "./variables" as *;

// Mixin do obsługi responsywności (wstecznie kompatybilny)
@mixin respond($breakpoint) {
  $min: map-get($breakpoints, $breakpoint);
  @if $min {
    @media only screen and (min-width: $min) {
      @content;
    }
  }
}

// Dodatkowe, bardziej elastyczne mixiny
@mixin respond-up($breakpoint) {
  $min: map-get($breakpoints, $breakpoint);
  @if $min {
    @media only screen and (min-width: $min) {
      @content;
    }
  }
}

@mixin respond-down($breakpoint) {
  $max: map-get($breakpoints, $breakpoint);
  @if $max {
    @media only screen and (max-width: $max) {
      @content;
    }
  }
}

@mixin respond-between($from, $to) {
  $min: map-get($breakpoints, $from);
  $max: map-get($breakpoints, $to);
  @if $min and $max {
    @media only screen and (min-width: $min) and (max-width: $max) {
      @content;
    }
  }
}

// Płynna typografia (clamp)
// Przykład: @include fluid-type(16px, 24px, phone, tab_land);
@mixin fluid-type($minSize, $maxSize, $from: phone, $to: tab_land) {
  $min: map-get($breakpoints, $from);
  $max: map-get($breakpoints, $to);
  font-size: clamp(#{$minSize}, calc(#{$minSize} + (#{strip-unit($maxSize - $minSize)} * (100vw - #{$min})) / (#{strip-unit($max - $min)})), #{$maxSize});
}`,
    },
    {
      path: "src/sass/base/_base.scss",
      content: `@use "../abstracts/mixins";

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: inherit;
}

html {
  font-size: 62.5%;

  @include mixins.respond("phone") {
    font-size: 75%;
  }

  @include mixins.respond("tab_port") {
    font-size: 100%;
  }

  @include mixins.respond("tab_land") {
    font-size: 125%;
  }

  @include mixins.respond("big_desktop") {
    font-size: 150%;
  }
}

body {
  box-sizing: border-box;
}

// Uniwersalny kontener
.container {
  width: min(100% - 2rem, 120rem);
  margin-inline: auto;
  padding-inline: 1rem;
}

// Przykład płynnej typografii dla h1 (możesz przenieść do komponentów)
h1 {
  @include mixins.fluid-type(2.4rem, 4rem, phone, tab_land);
  line-height: 1.15;
}
`,
    },
    {
      path: "src/sass/base/_utilities.scss",
      content: `.u-center-text {
  text-align: center;
}
.u-margin-bottom-big {
  margin-bottom: 8rem;
}
.u-margin-bottom-medium {
  margin-bottom: 4rem;
}
.u-margin-bottom-small {
  margin-bottom: 1.5rem;
}
.u-margin-top-big {
  margin-top: 8rem;
}`,
    },
    {
      path: "src/sass/style.scss",
      content: `@use "abstracts/variables";
@use "abstracts/mixins";
@use "base/base";
@use "base/utilities";`,
    },
    {
      path: "src/js/script.js",
      content: `'use strict';

console.log('Script loaded');`,
    },
    {
      path: "instrukcja/instrukcja.md",
      content: `# Instrukcja

## Dodawanie plików zaimportowanych

Aby dodać plik zaimportowany, należy w \`index.kit\` dodać wpis \`@@include('_nav.kit')\`, a w utworzonym pliku dodać zawartość np. \`<nav></nav>\`.

## Sprawdzanie aktualizacji pakietów

Aby sprawdzić aktualizacje pakietów i utworzyć plik z informacjami o aktualizacjach:

1. Otwórz terminal w katalogu głównym projektu.
2. Wpisz polecenie \`gulp checkPackageUpdates\`.
3. Zadanie sprawdzi dostępne aktualizacje pakietów i wyświetli informacje o nich.

## Tworzenie kopii zapasowej

Aby utworzyć kopię zapasową projektu:

1. Upewnij się, że w pliku \`gulpfile.mjs\` zdefiniowane jest zadanie \`backupProject\`.
2. Otwórz terminal w katalogu głównym projektu.
3. Wpisz polecenie \`gulp backup\`.
4. Kopia zostanie utworzona w folderze określonym w zmiennej \`BACKUP_PATH\` w pliku \`.env\`.

## Ustawienia środowiskowe

Pamiętaj, aby utworzyć plik \`.env\` w katalogu głównym projektu i dodać do niego odpowiednie zmienne środowiskowe, takie jak klucz API TinyPNG i dane dostępu do bazy danych.

Przykład pliku \`.env\`:

\`\`\`
TINYPNG_API_KEY=Twój_Klucz_API_TinyPNG
DB_HOST=localhost
DB_NAME=blog
DB_USER=root
DB_PASSWORD=TwojeHasło
BACKUP_PATH=./backups
PORT=3005
\`\`\`

Upewnij się, że plik \`.env\` jest dodany do pliku \`.gitignore\`, aby nie został przypadkowo opublikowany.

## Kompresja obrazów za pomocą TinyPNG

Funkcja \`compressImages\` kompresuje obrazy za pomocą usługi TinyPNG. Upewnij się, że masz klucz API w pliku \`.env\`.

## Uruchamianie projektu

1. Upewnij się, że masz zainstalowane wszystkie zależności: \`npm install\`.
2. Uruchom projekt: \`gulp\`.

## Dodatkowe informacje

- Pliki SCSS znajdują się w folderze \`src/sass\`.
- Pliki JavaScript znajdują się w folderze \`src/js\`.
- Pliki szablonów \`.kit\` znajdują się w folderze \`html\`.
`,
    },
    {
      path: ".gitignore",
      content: `node_modules/
dist/
.env
*.log
*.zip
backups/
aktualizacja.txt`,
    }
  );

  // Pliki specyficzne dla Node
  if (projectType === "node") {
    filesToCreate.push(
      {
        path: "server.js",
        content: `import path from "path";
import express from "express";
import routs from "./routes/link.js";
import db from "./data/database.js";
import dotenv from "dotenv";
dotenv.config(); // Wczytaj zmienne środowiskowe z pliku .env

const app = express();
const __dirname = path.resolve();

// Aktywacja silnika widoków EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true })); // Parsowanie ciał żądań
app.use("/dist", express.static("dist")); // Serwowanie plików statycznych

app.use(routs);

// Obsługa błędów
app.use(function (error, req, res, next) {
  console.log(error);
  res.status(500).render("500");
});

const port = Number(process.env.PORT) || 3005;
app.listen(port, function () {
  console.log('Server is running on port ' + port);
});
`,
      },

      {
        path: "routes/link.js",
        content: `import express from "express";
const router = express.Router();

router.get("/", (req, res, next) => {
  res.render("index");
});

export default router;`,
      },
      {
        path: "data/database.js",
        content: `import mysql from "mysql2/promise";
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export default pool;

// Jeśli używasz MongoDB, użyj poniższego kodu i odpowiednio zmodyfikuj plik .env
/*
import mongodb from "mongodb";
const MongoClient = mongodb.MongoClient;
let database;

async function connect() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  database = client.db("blog");
}

export function getDb() {
  if (!database) {
    throw new Error("Database not initialized");
  }
  return database;
}

export default {
  connectToDatabase: connect,
  getDb: getDb,
};
*/
`,
      },
      {
        path: "views/500.ejs",
        content: `<h1>Błąd serwera</h1>
<p>Przepraszamy, wystąpił błąd serwera.</p>`,
      },
      {
        path: "views/index.ejs",
        content: `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Start</title>
    <link rel="stylesheet" href="/dist/css/style.min.css" />
  </head>
  <body>
    <h1>Hello EJS!</h1>
    <script src="/dist/js/script.min.js"></script>
  </body>
</html>`,
      }
    );
  }

  // Pliki specyficzne dla PHP
  if (projectType === "php") {
    filesToCreate.push({
      path: "src/php/app.php",
      content: `<?php
// Twój kod PHP
?>`,
    });
  }

  filesToCreate.forEach((file) => {
    if (!fs.existsSync(file.path)) {
      // Upewnij się, że katalog dla pliku istnieje
      fs.mkdirSync(path.dirname(file.path), { recursive: true });
      fs.writeFileSync(file.path, file.content);
      console.log(`Plik "${file.path}" został utworzony.`);
    } else {
      console.log(`Plik "${file.path}" już istnieje.`);
    }
  });
  done();
};

export { createFiles };
