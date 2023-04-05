import gulp from "gulp";
import fs from "fs";
import cleanCSS from "gulp-clean-css";
import sassPackage from "gulp-sass";
import sassCompiler from "sass";
import uglify from "gulp-uglify";
import fileInclude from "gulp-file-include";
import browserSyncPackage from "browser-sync";
import rename from "gulp-rename";

const browserSync = browserSyncPackage.create();
const sass = sassPackage(sassCompiler);

function createFolders(done) {
  const foldersToCreate = [
    "dist",
    "dist/css",
    "dist/js",
    "html",
    "src",
    "src/img",
    "src/js",
    "src/sass",
    "instrukcja", // Dodanie folderu instrukcja
  ];

  foldersToCreate.forEach((folder) => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      console.log(`Folder "${folder}" został utworzony.`);
    } else {
      console.log(`Folder "${folder}" już istnieje.`);
    }
  });

  done();
}

const copyImages = () => {
  return gulp
    .src("src/img/**/*")
    .pipe(gulp.dest("dist/img"))
    .pipe(browserSync.stream());
};

const checkFoldersExist = () => {
  return new Promise((resolve, reject) => {
    const folders = ["dist", "html", "src", "src/img", "src/js", "src/sass"];

    let allFoldersExist = true;
    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        allFoldersExist = false;
        break;
      }
    }

    if (allFoldersExist) {
      resolve();
    } else {
      reject();
    }
  });
};

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
    <link rel="stylesheet" href="../dist/css/style.min.css">
</head>
<body>
    <h1>Hello All !</h1>
    @@include('_footer.kit')
    <script src="../dist/js/script.min.js"></script>
</body>
</html>`,
    },
    {
      path: "html/_footer.kit",
      content: "<footer></footer>",
    },
    {
      path: "src/sass/style.scss",
      content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}`,
    },
    {
      path: "src/js/script.js",
      content: "'use strict'",
    },
    {
      path: "instrukcja/instrukcja.md",
      content: `# Instrukcja

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
<meta
      name="description"
      content="Jesteśmy młodym "
    />
    <meta
      name="keywords"
      content="tworzenie stron www... "
    />
    <meta name="robots" content="index, follow">
    <meta name="author" content="uroboros.online">
 
  `,
    },
    {
      path: ".gitignore", // Dodanie pliku .gitignore w katalogu głównym
      content: `# Ignorowane pliki i foldery
	node_modules/
	src/
	html/
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

const checkFoldersAndFiles = (done) => {
  createFolders(done);
  createFiles(done);
  done();
};

const minifyJS = () => {
  return gulp
    .src("src/js/**/*.js")
    .pipe(uglify())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("dist/js"))
    .pipe(browserSync.stream());
};
const compileKit = () => {
  return gulp
    .src(["html/**/*.kit", "!html/**/_*.kit"])
    .pipe(
      fileInclude({
        prefix: "@@",
        basepath: "@file",
      })
    )
    .pipe(rename({ extname: ".html" }))
    .pipe(gulp.dest("./"))
    .on("end", () => {
      console.log("Pliki .kit zostały skompilowane do .html");
    });
};

function minifyCSS() {
  return gulp
    .src("src/sass/**/*.scss")
    .pipe(sass().on("error", sass.logError))
    .pipe(cleanCSS())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("dist/css"))
    .pipe(browserSync.stream());
}

const watch = () => {
  browserSync.init({
    server: {
      baseDir: "./",
    },
  });

  gulp.watch("html/**/*.kit", compileKit);
  gulp.watch("src/sass/**/*.scss", minifyCSS);
  gulp.watch("src/js/**/*.js", minifyJS);
  gulp.watch("src/img/**/*", copyImages);
  gulp.watch("./*.html").on("change", browserSync.reload);
};

// ---------------------------------------------------------------

import { promisify } from "util";
import { exec as childExec } from "child_process";
import ncu from "npm-check-updates";

const exec = promisify(childExec);

async function checkPackageUpdates() {
  try {
    const upgraded = await ncu.run({
      packageFile: "package.json",
      upgrade: false,
    });

    if (!Object.keys(upgraded).length) {
      console.log("Wszystkie pakiety są aktualne.");
    } else {
      const updateInfo = Object.entries(upgraded)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
      console.log(`Znaleziono aktualizacje pakietów:\n${updateInfo}`);
      fs.writeFileSync("aktualizacja.txt", updateInfo);
    }
  } catch (error) {
    console.error(
      `Wystąpił błąd podczas sprawdzania aktualizacji pakietów: ${error}`
    );
  }
}

// ------------------------------------------------------------

gulp.task("checkPackageUpdates", checkPackageUpdates);

// --------------------------------------------------------------

// PROJEKT BACKUP
// --------------------------------------------------------------
// --------------------------------------------------------------

// import fs from 'fs';
import path from "path";
// import { promisify } from 'util';
import { fileURLToPath } from "url";
import { dirname } from "path";

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const copyFile = promisify(fs.copyFile);
const writeFile = promisify(fs.writeFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function backupProject() {
  const sourceFolders = ["dist", "html", "instrukcja", "src"];
  const sourceFiles = ["gulpfile.mjs", ".gitignore", "package.json"];
  const backupPath = "Z:\\www\\";
  const projectPath = process.cwd();

  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error("Nie można połączyć się z Z:\\www");
    }

    const nrFile = path.join(backupPath, "nr.txt");
    let backupNumber = 1;

    if (fs.existsSync(nrFile)) {
      const content = fs.readFileSync(nrFile, "utf-8");
      backupNumber = parseInt(content) + 1;
    }

    const backupFolder = path.join(backupPath, `backup_${backupNumber}`);
    await mkdir(backupFolder);

    for (const folder of sourceFolders) {
      await copyFolder(
        path.join(projectPath, folder),
        path.join(backupFolder, folder)
      );
    }

    for (const file of sourceFiles) {
      await copyFile(
        path.join(projectPath, file),
        path.join(backupFolder, file)
      );
    }

    await writeFile(nrFile, backupNumber.toString());
    await writeFile(path.join(projectPath, "nr.txt"), backupNumber.toString());

    console.log(`Pomyślnie utworzono kopię zapasową: ${backupFolder}`);
  } catch (error) {
    console.error(`Wystąpił błąd podczas tworzenia kopii zapasowej: ${error}`);

    const errorMessage = `Nie udało się utworzyć kopii zapasowej: ${error}\nData i godzina: ${new Date().toISOString()}\n`;
    await writeFile(path.join(projectPath, "error.txt"), errorMessage);
  }
}

async function copyFolder(src, dest) {
  if (!fs.existsSync(dest)) {
    await mkdir(dest);
  }

  const files = await readdir(src);

  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      await copyFolder(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

export { backupProject };

// --------------------------------------------------------------

gulp.task("backup", backupProject);

// --------------------------------------------------------------
// --------------------------------------------------------------

gulp.task("checkFoldersAndFiles", checkFoldersAndFiles);
gulp.task("compileKit", gulp.series("checkFoldersAndFiles", compileKit));
gulp.task("minifyCSS", minifyCSS);
gulp.task("minifyJS", minifyJS);
gulp.task("copyImages", copyImages);
gulp.task(
  "watch",
  gulp.series("compileKit", "minifyCSS", "minifyJS", "copyImages", watch)
);
gulp.task("default", gulp.series("watch"));
