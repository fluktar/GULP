// gulpfile.mjs
import gulp from "gulp";
import browserSyncModule from "browser-sync";
import nodemon from "gulp-nodemon";
import fs from "fs";
import cleanCSS from "gulp-clean-css";
import sass from "gulp-dart-sass";
import uglify from "gulp-uglify";
import fileInclude from "gulp-file-include";
import rename from "gulp-rename";
import tinypng from "gulp-tinypng-compress";
import imagemin from "gulp-imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant from "imagemin-pngquant";
import imageminSvgo from "imagemin-svgo";
import { createFiles } from "./createFiles.mjs";
import dotenv from "dotenv";
import inquirer from "inquirer";
import phpConnect from "gulp-connect-php";

dotenv.config();

const browserSync = browserSyncModule.create();

export let projectType;

// Funkcja wykrywająca typ projektu
function detectProjectType(done) {
  if (fs.existsSync("server.js")) {
    projectType = "node";
    console.log("Wykryto projekt Node.js");
  } else if (fs.existsSync("index.php") || fs.existsSync("src/php")) {
    projectType = "php";
    console.log("Wykryto projekt PHP");
  } else {
    console.log("Nie udało się wykryć typu projektu.");
  }
  done();
}

// Funkcja pytająca o typ projektu
async function askProjectType() {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "projectType",
      message: "Wybierz rodzaj projektu:",
      choices: ["php", "node", "html"],
      default: "html",
    },
  ]);
  projectType = answers.projectType;
  console.log(`Wybrano projekt: ${projectType}`);
}

// Funkcja tworząca foldery
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
    "src/sass/abstracts",
    "src/sass/base",
    "src/sass/components",
    "src/sass/layout",
    "instrukcja",
  ];

  if (projectType === "php") {
    foldersToCreate.push("src/php");
  }

  if (projectType === "node") {
    foldersToCreate.push("views", "routes", "data");
  }

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

// Funkcja kompresująca obrazy za pomocą TinyPNG
const compressImages = () => {
  return gulp
    .src("src/img/**/*.{png,jpg,jpeg}")
    .pipe(
      tinypng({
        key: process.env.TINYPNG_API_KEY,
        sigFile: "src/img/.tinypng-sigs",
        log: true,
      })
    )
    .pipe(gulp.dest("dist/img"));
};

// Funkcja optymalizująca obrazy
async function optimizeImages() {
  await imagemin(["src/img/**/*.{jpg,jpeg,png,svg,gif}"], {
    destination: "dist/img",
    plugins: [
      imageminMozjpeg({ quality: 75 }),
      imageminPngquant({ quality: [0.6, 0.8] }),
      imageminSvgo(),
    ],
  });

  console.log("Obrazy zoptymalizowane");
}

// Funkcja kopiująca obrazy
const copyImages = () => {
  return gulp.src("src/img/**/*").pipe(gulp.dest("dist/img"));
};

// Funkcja minifikująca JavaScript
const minifyJS = () => {
  return gulp
    .src("src/js/**/*.js")
    .pipe(uglify())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("dist/js"));
};

// Funkcja sprawdzająca i kopiująca pliki PHP
const checkPHP = (done) => {
  if (projectType === "php") {
    return gulp
      .src(["src/php/**/*.php", "!src/php/index.php"]) // Pomijamy index.php
      .pipe(gulp.dest("./"));
  }
  done();
};

// Funkcja kompilująca pliki .kit
const compileKit = () => {
  let ext = ".html";
  if (projectType === "php") {
    ext = ".php";
  } else if (projectType === "node") {
    ext = ".ejs"; // Bezpośrednio kompilujemy do .ejs
  }

  return gulp
    .src(["html/**/*.kit", "!html/**/_*.kit"])
    .pipe(
      fileInclude({
        prefix: "@@",
        basepath: "@file",
      })
    )
    .pipe(rename({ extname: ext }))
    .pipe(gulp.dest(projectType === "node" ? "views" : "./"))
    .on("end", () => {
      console.log(`Pliki .kit zostały skompilowane do ${ext}`);
    });
};

// Funkcja minifikująca CSS
function minifyCSS() {
  return gulp
    .src("src/sass/**/*.scss")
    .pipe(sass().on("error", sass.logError))
    .pipe(cleanCSS())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("dist/css"));
}

// Funkcja sprawdzająca aktualizacje pakietów
import { promisify } from "util";
import { exec as childExec } from "child_process";
import ncu from "npm-check-updates";

const exec = promisify(childExec);

async function checkPackageUpdates(done) {
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
  done();
}

// Funkcja tworząca kopię zapasową projektu
import zip from "gulp-zip";
import path from "path";
import { fileURLToPath } from "url";

async function backupProject(done) {
  const currentPath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentPath);
  const projectName = path.basename(currentDir);
  const outputDirectory = process.env.BACKUP_PATH || "./backups";
  const projectDirectory = path.join(outputDirectory, projectName);

  if (!fs.existsSync(projectDirectory)) {
    fs.mkdirSync(projectDirectory, { recursive: true });
  }

  const backupName = `${projectName}.zip`;

  const existingZipPath = path.join(projectDirectory, backupName);
  if (fs.existsSync(existingZipPath)) {
    fs.unlinkSync(existingZipPath);
    console.log(`Usunięto istniejący plik: ${existingZipPath}`);
  }

  gulp
    .src(
      [
        "dist/**/*",
        "html/**/*",
        "src/**/*",
        "instrukcja/**/*",
        "gulpfile.mjs",
        "package.json",
        "!node_modules/**/*",
      ],
      { base: ".", dot: true }
    )
    .pipe(zip(backupName))
    .pipe(gulp.dest(projectDirectory))
    .on("end", () => {
      console.log(
        `Kopia zapasowa została utworzona: ${projectDirectory}/${backupName}`
      );
      done();
    });
}

export { compressImages, optimizeImages, backupProject, checkPackageUpdates };

// Funkcja tworząca foldery i pliki
const checkFoldersAndFiles = gulp.series(createFolders, function (done) {
  createFiles(projectType, done);
});

// Funkcja startująca serwer
export const startServer = (done) => {
  if (projectType === "node") {
    let started = false;

    return nodemon({
      script: "server.js",
      ext: "js",
      env: { ...process.env, NODE_ENV: "development" },
      watch: ["server.js", "routes/**/*.js", "views/**/*.ejs"],
    })
      .on("start", function () {
        if (!started) {
          started = true;
          // Inicjalizacja BrowserSync
          browserSync.init({
            proxy: `http://localhost:${process.env.PORT || 3005}`,
            port: 3000,
            open: true,
            notify: false,
          });
          console.log(
            `Serwer Node.js uruchomiony na http://localhost:${
              process.env.PORT || 3005
            }`
          );
          done();
        }
      })
      .on("restart", function () {
        setTimeout(function () {
          browserSync.reload();
        }, 1000);
        console.log("Server restarted!");
      });
  } else if (projectType === "php") {
    // Uruchomienie serwera PHP z wyłączeniem open_basedir
    phpConnect.server(
      {
        base: "./",
        port: 8000,
        keepalive: true,
        ini: {
          open_basedir: "none", // Wyłączenie restrykcji open_basedir
        },
      },
      function () {
        // Inicjalizacja BrowserSync
        browserSync.init({
          proxy: "127.0.0.1:8000",
          files: ["./*.php", "dist/css/*.css", "dist/js/*.js"],
          port: 3000,
          open: true,
          notify: false,
        });
        console.log("Serwer PHP uruchomiony na http://localhost:8000");
        console.log("BrowserSync uruchomiony na http://localhost:3000");
        done();
      }
    );
  } else {
    // Uruchomienie BrowserSync dla HTML
    browserSync.init({
      server: {
        baseDir: "./",
      },
      port: 3000,
      open: true,
      notify: false,
    });
    console.log("BrowserSync uruchomiony na http://localhost:3000");
    done();
  }
};

// Funkcja obserwująca pliki
export const watchFiles = gulp.series(
  checkFoldersAndFiles,
  compileKit,
  minifyCSS,
  minifyJS,
  copyImages,
  optimizeImages,
  startServer,
  function watchFiles() {
    gulp.watch(
      "html/**/*.kit",
      gulp.series(compileKit, function (done) {
        browserSync.reload();
        done();
      })
    );
    gulp.watch(
      "src/sass/**/*.scss",
      gulp.series(minifyCSS, function (done) {
        browserSync.reload();
        done();
      })
    );
    gulp.watch(
      "src/js/**/*.js",
      gulp.series(minifyJS, function (done) {
        browserSync.reload();
        done();
      })
    );
    gulp.watch(
      "src/img/**/*",
      gulp.series(copyImages, function (done) {
        browserSync.reload();
        done();
      })
    );

    if (projectType === "node") {
      gulp.watch("views/**/*.ejs").on("change", browserSync.reload);
      gulp.watch("routes/**/*.js").on("change", function () {
        browserSync.reload();
      });
    } else if (projectType === "php") {
      gulp
        .watch(["./*.php", "dist/css/*.css", "dist/js/*.js"])
        .on("change", browserSync.reload);
      gulp.watch(
        "src/php/**/*.php",
        gulp.series(checkPHP, function (done) {
          browserSync.reload();
          done();
        })
      );
    } else if (projectType === "html") {
      gulp
        .watch(["./*.html", "dist/css/*.css", "dist/js/*.js"])
        .on("change", browserSync.reload);
    }

    // Nie wywołujemy done(), aby zadanie trwało w nieskończoność
  }
);

// Domyślne zadanie Gulp
export default gulp.series(
  detectProjectType,
  async function decideProjectType() {
    if (!projectType) {
      await askProjectType();
    }
    console.log(`Projekt: ${projectType}`);
  },
  watchFiles
);
