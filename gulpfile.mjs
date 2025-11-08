// gulpfile.mjs
import gulp from "gulp";
import browserSyncModule from "browser-sync";
import fs from "fs";
import cleanCSS from "gulp-clean-css";
import * as sass from "sass";
import gulpSass from "gulp-sass";
const sassCompiler = gulpSass(sass);
import terser from "gulp-terser";
import fileInclude from "gulp-file-include";
import rename from "gulp-rename";
// Usunięto gulp-tinypng-compress (deprecated) – używamy oficjalnego API tinify
import tinify from "tinify";
import through2 from "through2";
import size from "gulp-size";
import newer from "gulp-newer";
import cached from "gulp-cached";
import remember from "gulp-remember";
import imagemin from "gulp-imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant from "imagemin-pngquant";
import imageminSvgo from "imagemin-svgo";
import { createFiles } from "./createFiles.mjs";
import dotenv from "dotenv";
import inquirer from "inquirer";
import phpConnect from "gulp-connect-php";
import { spawn } from "child_process";
import plumber from "gulp-plumber";
import notify from "gulp-notify";
import chalk from "chalk";
import { deleteAsync } from "del";
import nodemon from "gulp-nodemon";
import sourcemaps from "gulp-sourcemaps";
import postcss from "gulp-postcss";
import autoprefixer from "autoprefixer";

dotenv.config();

// Domyślne wartości (jeśli użytkownik nie ustawił w środowisku) – ułatwia uruchomienie "gulp" bez flag
const defaults = {
  NODE_ENV: "development",
  BS_NOTIFY: "true",
  FORCE_RELOAD_AFTER_CSS: "true",
  BROWSER_SYNC_OPEN: "false", // nie otwieraj dwóch okien, użyj naszego fallbacku
  ALWAYS_OPEN_PROXY: "true",
  ALWAYS_OPEN_DELAY: "1800",
  BS_REMINDER: "true",
};
for (const [k, v] of Object.entries(defaults)) {
  if (!process.env[k]) process.env[k] = v;
}

const browserSync = browserSyncModule.create();
let bsEventsBound = false;
let bsClients = 0;
let bsReady = false;
let cssLastHash = "";
let reloadTimer = null;

// Prosty debounce dla reloadów (scala szybkie serie zapisów)
function reloadBSDebounced(tag = "", delay = 250) {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => reloadBS(tag), delay);
}

function bindBrowserSyncEvents() {
  if (bsEventsBound) return;
  try {
    browserSync.emitter.on("client:connected", (data = {}) => {
      bsClients++;
      const ua = data.ua ? ` ua:${data.ua}` : "";
      console.log(`[BS] client connected (${bsClients})${ua}`);
    });
    browserSync.emitter.on("client:disconnected", () => {
      bsClients = Math.max(0, bsClients - 1);
      console.log(`[BS] client disconnected (${bsClients})`);
    });
    browserSync.emitter.on("browser:reload", () => {
      console.log(`[BS] browser:reload dispatched (clients=${bsClients})`);
    });
    browserSync.emitter.on("file:changed", (data = {}) => {
      const p = (data && data.path) || data || "";
      console.log(`[BS] file changed -> ${p}`);
    });
    bsEventsBound = true;
  } catch (_) {}
}

function reloadBS(tag = "") {
  const label = tag ? `(${tag}) ` : "";
  console.log(`[BS] reload requested ${label}clients=${bsClients}`);
  if (bsClients > 0) {
    browserSync.reload();
  } else {
    const currentPort =
      (typeof browserSync.getOption === "function" &&
        browserSync.getOption("port")) ||
      Number(process.env.PORT || 3005) + 1;
    console.warn(
      "[BS] Brak podłączonych klientów. Otwórz proxy BrowserSync: http://localhost:" +
        currentPort
    );
  }
}

export let projectType;

// Funkcja wykrywająca typ projektu
function detectProjectType(done) {
  if (fs.existsSync("server.js")) {
    projectType = "node";
    console.log(chalk.green("Wykryto projekt Node.js"));
  } else if (fs.existsSync("index.php") || fs.existsSync("src/php")) {
    projectType = "php";
    console.log(chalk.blue("Wykryto projekt PHP"));
  } else {
    console.log(chalk.yellow("Nie udało się wykryć typu projektu."));
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
  console.log(chalk.cyan(`Wybrano projekt: ${projectType}`));
}

// Funkcja tworząca foldery
function createFolders(done) {
  const foldersToCreate = [
    "dist",
    "dist/css",
    "dist/js",
    "dist/img",
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
      console.log(chalk.green(`Folder "${folder}" został utworzony.`));
    } else {
      console.log(chalk.gray(`Folder "${folder}" już istnieje.`));
    }
  });

  done();
}

// Funkcja kompresująca obrazy za pomocą TinyPNG (tinify) – selektywnie
const compressImages = () => {
  if (!process.env.TINYPNG_API_KEY) {
    console.log(
      chalk.yellow("Brak TINYPNG_API_KEY w .env — pomijam Tinify i kopiuję obrazy.")
    );
    return copyImages();
  }
  tinify.key = process.env.TINYPNG_API_KEY;

  const signaturesPath = "src/img/.tinify-cache.json";
  let cache = {};
  if (fs.existsSync(signaturesPath)) {
    try {
      cache = JSON.parse(fs.readFileSync(signaturesPath, "utf-8"));
    } catch (_) {}
  }

  const filesToProcess = [];

  return gulp
    .src("src/img/**/*.{png,jpg,jpeg}")
    .pipe(
      through2.obj(function (file, _, cb) {
        if (file.isBuffer()) {
          const rel = file.relative;
          const mtime = fs.statSync(file.path).mtimeMs;
          if (!cache[rel] || cache[rel] !== mtime) {
            filesToProcess.push(rel);
            tinify.fromBuffer(file.contents).toBuffer(function (err, resultData) {
              if (err) {
                console.log(chalk.red(`Tinify error ${rel}: ${err.message}`));
                return cb(null, file);
              }
              file.contents = resultData;
              cache[rel] = mtime;
              cb(null, file);
            });
          } else {
            cb(null, file);
          }
        } else {
          cb(null, file);
        }
      })
    )
    .pipe(gulp.dest("dist/img"))
    .on("end", () => {
      try {
        fs.writeFileSync(signaturesPath, JSON.stringify(cache, null, 2));
      } catch (_) {}
      const msg =
        filesToProcess.length > 0
          ? `Tinify: skompresowano ${filesToProcess.length} plików.`
          : "Tinify: brak nowych/zmienionych plików do kompresji.";
      console.log(chalk.green(msg));
    });
};

// Funkcja optymalizująca obrazy
function optimizeImages() {
  return gulp
    .src("src/img/**/*.{jpg,jpeg,png,svg,gif}")
    .pipe(
      imagemin([
        imageminMozjpeg({ quality: 75 }),
        imageminPngquant({ quality: [0.6, 0.8] }),
        imageminSvgo(),
      ])
    )
    .pipe(gulp.dest("dist/img"));
}

// Funkcja kopiująca obrazy
const copyImages = () => {
  return gulp
    .src("src/img/**/*")
    .pipe(newer("dist/img"))
    .pipe(gulp.dest("dist/img"));
};

// Funkcja minifikująca JavaScript
const minifyJS = () => {
  const isProd = process.env.NODE_ENV === "production";
  return gulp
    .src("src/js/**/*.js")
    .pipe(
      plumber({
        errorHandler: notify.onError({
          title: "Błąd JS",
          message: "<%= error.message %>",
          sound: "Funk",
        }),
      })
    )
    .pipe(isProd ? through2.obj((f, _, cb) => cb(null, f)) : sourcemaps.init())
    .pipe(cached("js"))
    .pipe(terser())
    .pipe(remember("js"))
    .pipe(rename({ suffix: ".min" }))
    .pipe(isProd ? sourcemaps.write(".") : sourcemaps.write())
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
      console.log(chalk.magenta(`Pliki .kit zostały skompilowane do ${ext}`));
    });
};

// Funkcja minifikująca CSS
function minifyCSS() {
  const isProd = process.env.NODE_ENV === "production";
  return gulp
    .src("src/sass/style.scss")
    .pipe(
      plumber({
        errorHandler: notify.onError({
          title: "Błąd SCSS",
          message: "<%= error.message %>",
          sound: "Funk",
        }),
      })
    )
    .pipe(isProd ? through2.obj((f, _, cb) => cb(null, f)) : sourcemaps.init())
    .pipe(sassCompiler().on("error", sassCompiler.logError))
    .pipe(postcss([autoprefixer()]))
    .pipe(cleanCSS())
    .pipe(rename({ suffix: ".min" }))
    .pipe(isProd ? sourcemaps.write(".") : sourcemaps.write())
    .pipe(gulp.dest("dist/css"))
    .pipe(browserSync.stream({ match: "**/*.css" }))
    .on("end", () => {
      if (process.env.FORCE_RELOAD_AFTER_CSS === "true") {
        console.log("[CSS] FORCE_RELOAD_AFTER_CSS aktywny – pełny reload strony.");
        reloadBSDebounced("css-force");
        if (bsClients === 0) {
          setTimeout(() => {
            if (bsClients > 0) reloadBSDebounced("css-force-retry");
            else console.log(chalk.gray("[CSS] Retry pominięty – brak klientów"));
          }, 1200);
        }
        return;
      }
      // Fallback tylko gdy BS gotowy, brak klientów i CSS faktycznie się zmienił
      try {
        const cssPath = "dist/css/style.min.css";
        if (fs.existsSync(cssPath)) {
          const content = fs.readFileSync(cssPath, "utf-8");
          const hash = Buffer.from(content).toString("base64").slice(0, 16);
          const changed = hash !== cssLastHash;
          cssLastHash = hash;
          if (bsReady && bsClients === 0 && changed) {
            console.log(
              chalk.yellow(
                "[CSS] Brak klientów – zmiana CSS wykryta, fallback reload."
              )
            );
            reloadBS("css-fallback");
          }
        }
      } catch (_) {}
    });
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
      console.log(chalk.green("Wszystkie pakiety są aktualne."));
    } else {
      const updateInfo = Object.entries(upgraded)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
      console.log(
        chalk.yellow(`Znaleziono aktualizacje pakietów:\n${updateInfo}`)
      );
      fs.writeFileSync("aktualizacja.txt", updateInfo);
    }
  } catch (error) {
    console.error(
      chalk.red(
        `Wystąpił błąd podczas sprawdzania aktualizacji pakietów: ${error}`
      )
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
        chalk.green(
          `Kopia zapasowa została utworzona: ${projectDirectory}/${backupName}`
        )
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
export const startServer = async (done) => {
  if (projectType === "node") {
    // Pobierz port z server.js (dynamiczny)
    let port = process.env.PORT || 3005;
    try {
      // Odczytaj port z pliku .env jeśli istnieje
      if (fs.existsSync(".env")) {
        const envContent = fs.readFileSync(".env", "utf-8");
        const match = envContent.match(/^PORT=(\d+)/m);
        if (match) port = match[1];
      }
    } catch (e) {}
    if (process.env.FULL_RELOAD_ON_SAVE === "true") {
      // Pełny restart procesu node przy zapisie (dowolny plik)
      let started = false;
      const browserSyncPort = parseInt(port, 10) + 1;
      const stream = nodemon({
        exec: "node server.js",
        // Ograniczamy restart tylko do plików serwerowych (redukcja podwójnych reloadów)
        watch: [
          "server.js",
          "routes/**/*.js",
          "views/**/*.ejs",
          "data/**/*.js",
          ".env",
        ],
        ext: "js,mjs,ejs,kit,scss,css,php,json,env",
        ignore: ["dist/**", "node_modules/**", "backups/**"],
        env: { ...process.env },
      });

      stream
        .on("start", function () {
          if (!started) {
            started = true;
            browserSync.init({
              proxy: `http://localhost:${port}`,
              port: browserSyncPort,
              open: process.env.BROWSER_SYNC_OPEN !== "false",
              notify: process.env.BS_NOTIFY === "true",
              ghostMode: { clicks: true, forms: true, scroll: true },
              snippetOptions: {
                rule: {
                  match: /<\/body>/i,
                  fn: function (snippet, match) {
                    return snippet + match;
                  },
                },
              },
              https:
                process.env.BS_HTTPS === "true" &&
                fs.existsSync("certs/localhost.key") &&
                fs.existsSync("certs/localhost.crt")
                  ? {
                      key: fs.readFileSync("certs/localhost.key"),
                      cert: fs.readFileSync("certs/localhost.crt"),
                    }
                  : false,
              files: ["dist/css/*.css", "dist/js/*.js", "views/**/*.ejs"],
              reloadDelay: 300,
            });
            bsReady = true;
            bindBrowserSyncEvents();
            if (process.env.BS_REMINDER === "true") {
              let reminderCount = 0;
              const reminderTimer = setInterval(() => {
                if (bsClients > 0) {
                  clearInterval(reminderTimer);
                } else if (reminderCount < 5) {
                  console.log(
                    chalk.yellow(
                      `[BS] Brak klientów – odwiedź proxy: http://localhost:${browserSyncPort}`
                    )
                  );
                  reminderCount++;
                } else {
                  clearInterval(reminderTimer);
                }
              }, 3000);
            }
            // Opcjonalne wymuszenie otwarcia proxy jeśli nikt się nie podłączył
            if (process.env.ALWAYS_OPEN_PROXY === "true") {
              setTimeout(() => {
                if (bsClients === 0) {
                  try {
                    const url = `http://localhost:${browserSyncPort}`;
                    const opener =
                      process.platform === "darwin"
                        ? "open"
                        : process.platform === "win32"
                        ? "start"
                        : "xdg-open";
                    spawn(opener, [url], {
                      stdio: "ignore",
                      shell: true,
                      detached: true,
                    }).unref();
                    console.log(chalk.gray("[BS] Auto-open (ALWAYS_OPEN_PROXY)"));
                  } catch (_) {}
                }
              }, Number(process.env.ALWAYS_OPEN_DELAY || 1800));
            }
            setTimeout(() => {
              if (
                bsClients === 0 &&
                process.env.BROWSER_SYNC_OPEN !== "false"
              ) {
                try {
                  const url = `http://localhost:${browserSyncPort}`;
                  const opener =
                    process.platform === "darwin"
                      ? "open"
                      : process.platform === "win32"
                      ? "start"
                      : "xdg-open";
                  spawn(opener, [url], {
                    stdio: "ignore",
                    shell: true,
                    detached: true,
                  }).unref();
                } catch (_) {}
              }
            }, 2000);
            console.log(
              chalk.green(
                `Serwer Node.js (nodemon) na http://localhost:${port} – pełny restart przy zapisie`
              )
            );
            done();
          }
        })
        .on("restart", function () {
          // Daj serwerowi chwilę na podniesienie
          setTimeout(() => reloadBS("nodemon"), 600);
        });
    } else {
      // Domyślny spawn bez restartu procesu
      let nodeProcess = spawn("node", ["server.js"], { stdio: "inherit" });
      process.on("exit", () => nodeProcess.kill());
      process.on("SIGINT", () => {
        nodeProcess.kill();
        process.exit();
      });
      // Nasłuchuj komendy 'exit' w terminalu
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", function (data) {
        if (data.trim() === "exit") {
          nodeProcess.kill();
          process.exit();
        }
      });
      // Inicjalizacja BrowserSync na tym samym porcie co serwer node + 1
      const browserSyncPort = parseInt(port, 10) + 1;
      browserSync.init({
        proxy: `http://localhost:${port}`,
        port: browserSyncPort,
        open: process.env.BROWSER_SYNC_OPEN !== "false",
        notify: process.env.BS_NOTIFY === "true",
        ghostMode: { clicks: true, forms: true, scroll: true },
        snippetOptions: {
          rule: {
            match: /<\/body>/i,
            fn: function (snippet, match) {
              return snippet + match;
            },
          },
        },
        https:
          process.env.BS_HTTPS === "true" &&
          fs.existsSync("certs/localhost.key") &&
          fs.existsSync("certs/localhost.crt")
            ? {
                key: fs.readFileSync("certs/localhost.key"),
                cert: fs.readFileSync("certs/localhost.crt"),
              }
            : false,
        files: ["dist/css/*.css", "dist/js/*.js", "views/**/*.ejs"],
        reloadDelay: 300,
      });
      bsReady = true;
      bindBrowserSyncEvents();
      if (process.env.BS_REMINDER === "true") {
        let reminderCount = 0;
        const reminderTimer = setInterval(() => {
          if (bsClients > 0) {
            clearInterval(reminderTimer);
          } else if (reminderCount < 5) {
            console.log(
              chalk.yellow(
                `[BS] Brak klientów – odwiedź proxy: http://localhost:${browserSyncPort}`
              )
            );
            reminderCount++;
          } else {
            clearInterval(reminderTimer);
          }
        }, 3000);
      }
      if (process.env.ALWAYS_OPEN_PROXY === "true") {
        setTimeout(() => {
          if (bsClients === 0) {
            try {
              const url = `http://localhost:${browserSyncPort}`;
              const opener =
                process.platform === "darwin"
                  ? "open"
                  : process.platform === "win32"
                  ? "start"
                  : "xdg-open";
              spawn(opener, [url], {
                stdio: "ignore",
                shell: true,
                detached: true,
              }).unref();
              console.log(chalk.gray("[BS] Auto-open (ALWAYS_OPEN_PROXY)"));
            } catch (_) {}
          }
        }, Number(process.env.ALWAYS_OPEN_DELAY || 1800));
      }
      console.log(
        chalk.green(`Serwer Node.js uruchomiony na http://localhost:${port}`)
      );
      done();
    }
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
          open: process.env.BROWSER_SYNC_OPEN !== "false",
          notify: process.env.BS_NOTIFY === "true",
          ghostMode: { clicks: true, forms: true, scroll: true },
          snippetOptions: {
            rule: {
              match: /<\/body>/i,
              fn: function (snippet, match) {
                return snippet + match;
              },
            },
          },
        });
        bsReady = true;
        console.log(
          chalk.blue("Serwer PHP uruchomiony na http://localhost:8000")
        );
        console.log(
          chalk.green("BrowserSync uruchomiony na http://localhost:3000")
        );
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
      open: process.env.BROWSER_SYNC_OPEN !== "false",
      notify: process.env.BS_NOTIFY === "true",
      ghostMode: { clicks: true, forms: true, scroll: true },
      snippetOptions: {
        rule: {
          match: /<\/body>/i,
          fn: function (snippet, match) {
            return snippet + match;
          },
        },
      },
    });
    bsReady = true;
    console.log(
      chalk.green("BrowserSync uruchomiony na http://localhost:3000")
    );
    done();
  }
};

// Funkcja obserwująca pliki
export const watchFiles = gulp.series(
  checkFoldersAndFiles,
  compileKit,
  startServer,
  gulp.parallel(minifyCSS, minifyJS, copyImages),
  function watchFiles() {
    const watchOpts = {
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    };

    const kitWatcher = gulp.watch(
      "html/**/*.kit",
      watchOpts,
      gulp.series(compileKit, function (done) {
        reloadBSDebounced("kit");
        done();
      })
    );
    const scssWatcher = gulp.watch(
      "src/sass/**/*.scss",
      watchOpts,
      gulp.series(minifyCSS)
    );
    const jsWatcher = gulp.watch(
      "src/js/**/*.js",
      watchOpts,
      gulp.series(minifyJS, function (done) {
        reloadBSDebounced("js");
        done();
      })
    );
    const imgWatcher = gulp.watch(
      "src/img/**/*",
      watchOpts,
      gulp.series(copyImages, function (done) {
        reloadBSDebounced("img");
        done();
      })
    );

    // Obsługa unlink – usuwaj z dist i z cache
    jsWatcher.on("unlink", (filePath) => {
      try {
        remember.forget("js", filePath);
        if (cached.caches.js) delete cached.caches.js[filePath];
        const outPath = filePath
          .replace(/\\/g, "/")
          .replace("src/js/", "dist/js/")
          .replace(/\.js$/, ".min.js");
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        reloadBSDebounced("js-unlink");
      } catch (_) {}
    });
    imgWatcher.on("unlink", (filePath) => {
      try {
        const outPath = filePath
          .replace(/\\/g, "/")
          .replace("src/img/", "dist/img/");
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        reloadBSDebounced("img-unlink");
      } catch (_) {}
    });

    if (projectType === "node") {
      gulp.watch("views/**/*.ejs").on("change", () => reloadBS("ejs"));
      gulp.watch("routes/**/*.js").on("change", function () {
        reloadBSDebounced("routes");
      });
    } else if (projectType === "php") {
      gulp
        .watch(["./*.php", "dist/css/*.css", "dist/js/*.js"])
        .on("change", () => reloadBS("php"));
      gulp.watch(
        "src/php/**/*.php",
        gulp.series(checkPHP, function (done) {
          browserSync.reload();
          done();
        })
      );
    } else if (projectType === "html") {
      gulp
        .watch(["./*.html", "dist/css/*.css", "dist/js/*.js"], watchOpts)
        .on("change", () => reloadBSDebounced("html"));
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
    console.log(chalk.cyan(`Projekt: ${projectType}`));
  },
  watchFiles
);

// Dodatkowe aliasy zadań
export const clean = async function clean() {
  await deleteAsync(["dist/**", "!dist"]);
};
export const build = gulp.series(
  clean,
  checkFoldersAndFiles,
  compileKit,
  minifyCSS,
  minifyJS,
  copyImages,
  optimizeImages,
  compressImages,
  // Konwersje WebP
  async function generateWebp() {
    let imageminWebp;
    try {
      imageminWebp = (await import("imagemin-webp")).default;
    } catch (_) {
      console.log(chalk.yellow("[webp] Pomijam generowanie WebP – brak imagemin-webp"));
      return Promise.resolve();
    }
    return gulp
      .src("src/img/**/*.{jpg,jpeg,png}")
      .pipe(imagemin([imageminWebp({ quality: 75 })]))
      .pipe(
        rename(function (p) {
          p.extname = ".webp";
        })
      )
      .pipe(gulp.dest("dist/img"));
  },
  // Konwersje AVIF
  async function generateAvif() {
    let imageminAvif;
    try {
      imageminAvif = (await import("imagemin-avif")).default;
    } catch (_) {
      console.log(chalk.yellow("[avif] Pomijam generowanie AVIF – brak imagemin-avif"));
      return Promise.resolve();
    }
    return gulp
      .src("src/img/**/*.{jpg,jpeg,png}")
      .pipe(imagemin([imageminAvif({ quality: 50 })]))
      .pipe(
        rename(function (p) {
          p.extname = ".avif";
        })
      )
      .pipe(gulp.dest("dist/img"));
  },
  // Rev assets i przepięcie referencji (opcjonalne – jeśli paczki są zainstalowane)
  async function revAssetsTask() {
    let rev, revDel;
    try {
      rev = (await import("gulp-rev")).default;
      revDel = (await import("gulp-rev-delete-original")).default;
    } catch (e) {
      console.log(chalk.yellow("[rev] Pomijam cache busting – brak modułów gulp-rev.*"));
      return Promise.resolve();
    }
    return gulp
      .src(["dist/css/*.css", "dist/js/*.js"], { base: "dist" })
      .pipe(rev())
      .pipe(revDel())
      .pipe(gulp.dest("dist"))
      .pipe(rev.manifest("rev-manifest.json", { merge: true }))
      .pipe(gulp.dest("dist"));
  },
  async function rewriteRefs() {
    const manifestPath = "dist/rev-manifest.json";
    if (!fs.existsSync(manifestPath)) return Promise.resolve();
    let revRewrite;
    try {
      revRewrite = (await import("gulp-rev-rewrite")).default;
    } catch (e) {
      console.log(chalk.yellow("[revRewrite] Pomijam przepięcie referencji – brak gulp-rev-rewrite"));
      return Promise.resolve();
    }
    const manifest = fs.readFileSync(manifestPath);
    if (projectType === "node") {
      return gulp
        .src(["views/**/*.ejs"], { base: "." })
        .pipe(gulp.dest("build"))
        .pipe(revRewrite({ manifest }))
        .pipe(gulp.dest("build"));
    } else if (projectType === "php") {
      return gulp.src(["./*.php"]).pipe(revRewrite({ manifest })).pipe(gulp.dest("."));
    } else {
      return gulp.src(["./*.html"]).pipe(revRewrite({ manifest })).pipe(gulp.dest("."));
    }
  },
  // Minifikacja HTML/PHP jeśli dostępny gulp-htmlmin
  async function minifyHtmlPhp() {
    let htmlmin;
    try {
      htmlmin = (await import("gulp-htmlmin")).default;
    } catch (_) {
      console.log(chalk.yellow("[htmlmin] Pomijam minifikację HTML/PHP – brak gulp-htmlmin"));
      return Promise.resolve();
    }
    if (projectType === "node") return Promise.resolve();
    if (projectType === "php") {
      return gulp
        .src(["./*.php"]) // minifikuj HTML w plikach PHP (ignorując fragmenty PHP)
        .pipe(
          htmlmin({
            collapseWhitespace: true,
            removeComments: true,
            ignoreCustomFragments: [/<\?php[\s\S]*?\?>/],
          })
        )
        .pipe(gulp.dest("."));
    }
    return gulp
      .src(["./*.html"]) 
      .pipe(
        htmlmin({
          collapseWhitespace: true,
          removeComments: true,
        })
      )
      .pipe(gulp.dest("."));
  },
  function reportSize() {
    return gulp
      .src([
        "dist/css/*.css",
        "dist/js/*.js",
        "dist/img/**/*.{png,jpg,jpeg,svg,gif}",
      ])
      .pipe(size({ showFiles: true, gzip: true }));
  }
);

export const backup = backupProject;
// Szybki dev (bez optymalizacji i kompresji obrazów)
export const devFast = gulp.series(
  detectProjectType,
  async function decideProjectType() {
    if (!projectType) {
      await askProjectType();
    }
    console.log(chalk.cyan(`Projekt (fast): ${projectType}`));
  },
  checkFoldersAndFiles,
  compileKit,
  minifyCSS,
  minifyJS,
  startServer,
  function fastWatch() {
    gulp.watch(
      "html/**/*.kit",
      gulp.series(compileKit, (d) => {
        browserSync.reload();
        d();
      })
    );
    gulp.watch(
      "src/sass/**/*.scss",
      gulp.series(minifyCSS, (d) => {
        browserSync.reload();
        d();
      })
    );
    gulp.watch(
      "src/js/**/*.js",
      gulp.series(minifyJS, (d) => {
        browserSync.reload();
        d();
      })
    );
  }
);

// Lekki tryb tylko dla szybkiego HTML/CSS/JS (bez Node/PHP) – wymusza projectType=html
export const browserOnly = gulp.series(
  async function setHtmlType() {
    projectType = "html"; // nadpisz typ
    console.log(chalk.cyan("[browserOnly] Tryb HTML"));
  },
  checkFoldersAndFiles,
  compileKit,
  minifyCSS,
  minifyJS,
  function startLiteServer(done) {
    browserSync.init({
      server: { baseDir: "./" },
      port: 3100,
      open: process.env.BROWSER_SYNC_OPEN !== "false",
      notify: false,
      files: ["dist/css/*.css", "dist/js/*.js", "./*.html"],
    });
    bindBrowserSyncEvents();
    console.log(
      chalk.green("[browserOnly] BrowserSync na http://localhost:3100")
    );
    done();
  },
  function watchLite() {
    gulp.watch(
      "html/**/*.kit",
      gulp.series(compileKit, function (d) {
        reloadBSDebounced("kit");
        d();
      })
    );
    gulp.watch("src/sass/**/*.scss", gulp.series(minifyCSS));
    gulp.watch(
      "src/js/**/*.js",
      gulp.series(minifyJS, function (d) {
        reloadBSDebounced("js");
        d();
      })
    );
  }
);
