import fs from "fs";

const createFiles = (done) => {
  const filesToCreate = [
    {
      path: "html/index.kit",
      content: `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="/dist/css/style.min.css">
</head>
<body>
    <h1>Hello All !</h1>
    @@include('_footer.kit')
    <script src="/dist/js/script.min.js"></script>
</body>
</html>`,
    },
    {
      path: "routes/link.js",
      content: `const express = require("express");
			const router = express.Router();
			router.get("/", (req, res, next) => {
			  res.redirect("index");
			});
			router.get("/posts-list", (req, res, next) => {
			  res.render("posts-list");
			});
			module.exports = router;`,
    },
    {
      path: "data/database.js",
      content: `
      // decyduj który potrzebujesz sql czy mongo, pamiętaj, że trzeba uruchomić bazę danych przed przystąpieniem do programowania, chyba, że mongo to nie trzeba - ponieważ jest w chmurze ale może być i lokalnie.
      //tutaj jest sql
      const mysql = require("mysql2/promise");
			const pool = mysql.createPool({
			  host: "localhost",
			  databasea: "blog",
			  user: "root",
			  password: "Sojokotojo1@3",
			});
			module.exports = pool;
// ---------------------------------------------------------------
//tutaj jest mongodb
// const mongodb = require("mongodb");
// const MongoClient = mongodb.MongoClient;
// let database;
// async function connect() {
//   const client = await MongoClient.connect("mongodb://localhost:27017");
//   database = client.db("blog");
// }

// function getDb() {
//   if (!database) {
//     throw new Error("Database not initialized");
//   }
//   return database;
// }
// module.exports = {
//   connectToDatabase: connect,
//   getDb: getDb,
// };

`,
    },
    {
      path: "html/_footer.kit",
      content: "<footer></footer>",
    },
    {
      path: "src/sass/abstracts/_mixins.scss",
      content: `
      @mixin center {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        position: absolute;
      }
      //MEDIA QUERY MIXINS
      /*
      0-600px - Phone
      600-900px - Tablet portrait
      900-1200px - Tablet landscape
      1200-1800px - Desktop
      1800px + - Big desktop
      
      $breakpoint: 
      phone, 
      tab-port, 
      tab-land, 
      big-desktop
      1em = 16px
      */
      
      @mixin respond($breakpoint) {
        @if $breakpoint == phone {
          @media (max-width: 37.5em) {
            @content;
          }
        }
        @if $breakpoint == tab-port {
          @media (max-width: 56.25em) {
            @content;
          }
        }
        @if $breakpoint == tab-land {
          @media (max-width: 75em) {
            @content;
          }
        }
        @if $breakpoint == big-desktop {
          @media (min-width: 112.5em) {
            @content;
          }
        }
      }
      `,
    },
    {
      path: "src/sass/base/_base.scss",
      content: `
      *,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: inherit;
}
html {
  font-size: 62.5%;

  @include respond(tab-land) {
    font-size: 56.25%;
  }
  @include respond(tab-port) {
    font-size: 50%;
  }
  @include respond(phone) {
    font-size: 37.5%;
  }
  @include respond(big-desktop) {
    font-size: 80%;
  }
}
body {
  box-sizing: border-box;
}

      `,
    },
    {
      path: "src/sass/base/_utilities.scss",
      content: `
      .u-center-text {
        text-align: center !important;
      }
      .u-margin-bottom-big {
        margin-bottom: 8rem !important;
      }
      .u-margin-bottom-small {
        margin-bottom: 1.5rem !important;
      }
      .u-margin-bottom-medium {
        margin-bottom: 4rem !important;
      }
      .u-margin-top-big {
        margin-top: 8rem !important;
      }
      `,
    },
    {
      path: "src/sass/style.scss",
      content: `
      @import "abstracts/mixins";
      @import "base/base";
      @import "base/utilities";
      
      `,
    },
    {
      path: "src/js/script.js",
      content: "'use strict'",
    },
    {
      path: "src/php/index.php",
      content: `<?php
      function redirectToIndex() {
          header('Location: index.html');
          exit();
      }
      redirectToIndex();
      
      ?>`,
    },
    {
      path: "instrukcja/instrukcja.md",
      content: `
# Instrukcja

## Dodawanie plików zaimportowanych

  Aby dodać plik zaimportowany, należy w \`index.kit\` dodać wpis \`@@include('_nav.kit')\`, a w utworzonym pliku dodać wpis np \`<nav></nav>\`.

## Sprawdzanie aktualizacji pakietów

  Aby sprawdzić aktualizacje pakietów i utworzyć plik z informacjami o aktualizacjach, wykonaj następujące kroki:

  1. Otwórz terminal w katalogu głównym projektu.
  2. Wpisz polecenie \`gulp checkPackageUpdates\`.
  3. Zadanie sprawdzi dostępne aktualizacje pakietów i wyświetli informacjami o aktualizacjach.

  Pamiętaj, aby regularnie sprawdzać aktualizacje, aby utrzymać swoje zależności na bieżąco.
  
## Tworzenie kopii zapasowej

Aby utworzyć kopię zapasową folderów "dist", "html", "instrukcja", "src" oraz plików "gulpfile.mjs", ".gitignore" i "package.json", wykonaj następujące kroki:

1. Upewnij się, że dodano funkcję "backupProject" oraz odpowiednie importy do pliku "gulpfile.mjs" oraz zdefiniowano nowe zadanie Gulp o nazwie "backup".

2. Otwórz konsolę i przejdź do katalogu głównego projektu.

3. Wpisz w konsoli polecenie: gulp backup

4. Kopia zostanie wykonana "Z:_www"
5. w Katalogu głównym sprawdz plik nr.txt w którym będzie unikalny numer backup utworzonego dla twojej kopii
6. Utworzona kopia będzie miała nazwę z tym numerem

## Pamiętaj o meta

<!-- <meta
      name="description"
      content="Jesteśmy młodym "
    />
    <meta
      name="keywords"
      content="tworzenie stron www... "
    />
    <meta name="robots" content="index, follow">
    <meta name="author" content="uroboros.online">
</meta> -->

## Kompresja obrazów za pomocą TinyPNG

Funkcja "compressImages" pozwala na kompresję obrazów w formatach PNG, JPG i JPEG za pomocą usługi TinyPNG. Kompresja obrazów może znacznie zmniejszyć ich rozmiar, co przekłada się na szybsze wczytywanie strony.

Aby skorzystać z funkcji "compressImages", należy wykonać następujące kroki:

1. Upewnij się, że pakiet "gulp-tinypng-compress" jest zainstalowany w projekcie (jeśli nie, postępuj zgodnie z wcześniejszymi instrukcjami instalacji).

2. Zamień "YOUR_API_KEY" na klucz API TinyPNG w funkcji "compressImages" w pliku "gulpfile.mjs". Klucz API można uzyskać, rejestrując się na stronie [TinyPNG Developer API](https://tinypng.com/developers).

3. Uruchom zadanie Gulp, które kompresuje obrazy za pomocą TinyPNG. Otwórz terminal w katalogu głównym projektu i wpisz polecenie:

gulp compressImages

Skompresowane obrazy zostaną zapisane w folderze "dist/img".

## Wyjaśnienie funkcji

createServerFile() - Funkcja createServerFile tworzy plik server.js, który służy jako prosty serwer HTTP. Dzięki temu można szybko uruchomić lokalny serwer, aby sprawdzić działanie aplikacji lub strony internetowej w środowisku deweloperskim.
  
Plik server.js jest tworzony w głównym katalogu projektu (tam, gdzie znajduje się plik gulpfile.mjs).
 
Aby uruchomić serwer, otwórz terminal w głównym katalogu projektu i wpisz:

node server.js

Po uruchomieniu, serwer będzie dostępny pod adresem http://localhost:3005/.

compressImages - funkcja kompresuje obrazy w formatach PNG, JPG i JPEG za pomocą usługi TinyPNG. Skompresowane obrazy zostają zapisane w folderze "dist/img".

optimizeImages - funkcja optymalizuje obrazy, zmniejszając ich rozmiar bez znacznego wpływu na jakość. Obrazy zoptymalizowane zostają zapisane w folderze "dist/img".

createFolders - funkcja tworzy foldery niezbędne do prawidłowego działania projektu, jeśli jeszcze nie istnieją.

copyImages - funkcja kopiuje obrazy z folderu "src/img" do folderu "dist/img".

checkFoldersExist - funkcja sprawdza, czy wszystkie potrzebne foldery istnieją.

createFiles - funkcja tworzy pliki niezbędne do prawidłowego działania projektu, jeśli jeszcze nie istnieją.

checkFoldersAndFiles - funkcja wywołuje funkcje createFolders oraz createFiles.

minifyJS - funkcja minifikuje pliki JavaScript z folderu "src/js" i zapisuje je w folderze "dist/js" z rozszerzeniem ".min.js".

checkPHP - funkcja kopiuje pliki PHP z folderu "src/php" do głównego folderu projektu.

compileKit - funkcja kompiluje pliki .kit z folderu "html" do plików .html i zapisuje je w głównym folderze projektu.

minifyCSS - funkcja kompiluje i minifikuje pliki SCSS z folderu "src/sass" do plików CSS, zapisując je w folderze "dist/css" z rozszerzeniem ".min.css".

watch - funkcja monitoruje zmiany we wszystkich plikach projektu i wywołuje odpowiednie funkcje, gdy pliki zostają zmienione. Ponadto, funkcja synchronizuje przeglądarkę, aby odświeżać stronę po każdej zmianie.

checkPackageUpdates - funkcja sprawdza dostępne aktualizacje pakietów npm, a następnie tworzy plik "aktualizacja.txt" z informacjami o aktualizacjach.

backupProject - funkcja tworzy kopię zapasową projektu, zapisując ją jako plik .zip w określonym katalogu.`,
    },
    {
      path: ".gitignore", // Dodanie pliku .gitignore w katalogu głównym
      content: `node_modules
	src
	html
	gulpfile.mjs
	package.json
	package-lock.json
	*.log`,
    },
  ];

  filesToCreate.forEach((file) => {
    if (!fs.existsSync(file.path)) {
      fs.writeFileSync(file.path, file.content);
      console.log(`Plik "${file.path}" został utworzony.`);
    } else {
      console.log(`Plik "${file.path}" już istnieje.`);
    }
  });
  done();
};

export { createFiles };
