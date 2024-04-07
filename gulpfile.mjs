import gulp from "gulp";
import fs from "fs";
import cleanCSS from "gulp-clean-css";
// import sassPackage from 'gulp-sass';
// import sassCompiler from 'sass';
import sass from "gulp-dart-sass";
import uglify from "gulp-uglify";
import fileInclude from "gulp-file-include";
import browserSyncPackage from "browser-sync";
import rename from "gulp-rename";
import tinypng from "gulp-tinypng-compress";
import imagemin from "gulp-imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant from "imagemin-pngquant";
import imageminSvgo from "imagemin-svgo";

const browserSync = browserSyncPackage.create();
const browserSyncServer = browserSyncPackage.create();
// const sass = sassPackage(sassCompiler);

const compressImages = () => {
  return gulp
    .src("src/img/**/*.{png,jpg,jpeg}")
    .pipe(
      tinypng({
        key: "tMnDBmcM1TWnVp4xLtGl6699tyBhXngQ",
        sigFile: "src/img/.tinypng-sigs",
        log: true,
      })
    )
    .pipe(gulp.dest("dist/img"))
    .pipe(browserSync.stream());
};

async function optimizeImages() {
  const files = await imagemin(["src/img/**/*.{jpg,jpeg,png,svg,gif}"], {
    destination: "dist/img",
    plugins: [
      imageminMozjpeg({ quality: 75 }),
      imageminPngquant({ quality: [0.6, 0.8] }),
      imageminSvgo(),
    ],
  });

  console.log("Obrazy zoptymalizowane");
}

function createFolders(done) {
  const foldersToCreate = [
    "dist",
    "data",
    "routes",
    "dist/css",
    "dist/js",
    "html",
    "views", // Added views folder
    "src",
    "src/img",
    "src/js",
    "src/php",
    "src/sass",
    "src/sass/abstracts",
    "src/sass/base",
    "src/sass/components",
    "src/sass/layout",
    "instrukcja", // Dodanie folderu instrukcja
  ];
  "instrukcja", // Dodanie folderu instrukcja
    "server.js", // Dodanie nowego pliku server.js, który służy jako prosty serwer HTTP
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
    const folders = [
      "dist",
      "data",
      "routes",
      "html",
      "views", // Added views folder
      "src",
      "src/img",
      "src/js",
      "src/sass",
      "src/php",
    ];

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

import { createFiles } from "./createFiles.mjs";

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
const checkPHP = () => {
  return (
    gulp
      .src("src/php/**/*.php")
      //   .pipe(uglify())
      .pipe(gulp.dest("./"))
      .pipe(browserSync.stream())
  );
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
  gulp.watch("html/**/*.kit", compileEjs);
  gulp.watch("src/sass/**/*.scss", minifyCSS);
  gulp.watch("src/js/**/*.js", minifyJS);
  gulp.watch("src/php/**/*.php", checkPHP);
  gulp.watch("src/img/**/*", copyImages);
  gulp.watch("./*.html").on("change", browserSync.reload);
  gulp.watch("src/sass/**/*.scss,").on("change", browserSync.reload);
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
import zip from "gulp-zip";
import path from "path";
import { fileURLToPath } from "url";

async function backupProject() {
  const currentPath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentPath);
  const projectName = path.basename(currentDir);
  const backupName = `${projectName}.zip`;
  const outputDirectory = "Z:/www";
  const projectDirectory = path.join(outputDirectory, projectName);

  // Sprawdź, czy istnieje folder projektu w katalogu docelowym
  try {
    await fs.promises.access(projectDirectory);
  } catch {
    // Utwórz folder, jeśli nie istnieje
    await fs.promises.mkdir(projectDirectory);
  }

  // Usuń istniejący plik .zip w folderze projektu (jeśli istnieje)
  const existingZipPath = path.join(projectDirectory, backupName);
  try {
    await fs.promises.access(existingZipPath);
    await fs.promises.unlink(existingZipPath);
    console.log(`Usunięto istniejący plik: ${existingZipPath}`);
  } catch {
    // Nic nie rób, jeśli plik .zip nie istnieje
  }

  return gulp
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
    });
}

// --------------------------------------------------------------

// --------------------------------------------------------------
// --------------------------------------------------------------
gulp.task("compressImages", compressImages);
gulp.task("optimizeImages", optimizeImages);

gulp.task("backup", backupProject);
gulp.task("checkFoldersAndFiles", checkFoldersAndFiles);
gulp.task("compileKit", gulp.series("checkFoldersAndFiles", compileKit));
gulp.task("minifyCSS", minifyCSS);
gulp.task("minifyJS", minifyJS);
// gulp.task("compileEjs", compileEjs);
gulp.task("compileEjs", gulp.series("checkFoldersAndFiles", compileEjs));
gulp.task("checkPHP", checkPHP);
// zadanie do uruchamiania serwera za pomocą nodemon

gulp.task("start-server", function (done) {
  nodemon({
    script: "server.js",
    ext: "js",
    watch: [
      "server.js",
      "routes/**/*.js",
      "html/**/*.kit",
      "html/**/**/*.kit",
      "src/sass/**/*.scss",
      "**/*.js",
      "**/*.kit",
      "**/*.scss",
    ],
    env: { NODE_ENV: "development" },
  })
    .on("restart", function () {
      console.log("Server restarted!");
      browserSync.reload();
    })
    .once("start", done);
});

function compileEjs() {
  return gulp
    .src(["html/**/*.kit", "!html/**/_*.kit"])
    .pipe(
      fileInclude({
        prefix: "@@",
        basepath: "@file",
      })
    )
    .pipe(rename({ extname: ".ejs" })) // Change the extension to .ejs
    .pipe(gulp.dest("views")) // Copy to views folder in the root directory
    .pipe(browserSync.stream())
    .on("end", function () {
      browserSync.reload();
    });
}

gulp.task("watch", function () {
  watch("server.js", function () {
    gulp.series("start-server")();
  });
});
gulp.task("copyImages", copyImages);
gulp.task(
  "watch",
  gulp.series(
    "compileKit",
    "compileEjs",
    "minifyCSS",
    "minifyJS",
    "copyImages",
    "checkPHP",
    "optimizeImages",
    "start-server",
    "watch",
    watch
  )
);

import { createServerFile } from "./createServerFile.mjs";

gulp.task("createServerFile", createServerFile);
gulp.task("default", gulp.series("createServerFile", "watch"));

import nodemon from "nodemon";
