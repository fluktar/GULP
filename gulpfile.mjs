import gulp from 'gulp';
import fs from 'fs';
import cleanCSS from 'gulp-clean-css';
import sassPackage from 'gulp-sass';
import sassCompiler from 'sass';
import uglify from 'gulp-uglify';
import fileInclude from 'gulp-file-include';
import browserSyncPackage from 'browser-sync';
import rename from 'gulp-rename';
import tinypng from 'gulp-tinypng-compress';
import imagemin from 'gulp-imagemin';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import imageminSvgo from 'imagemin-svgo';

const browserSync = browserSyncPackage.create();
const sass = sassPackage(sassCompiler);

const compressImages = () => {
	return gulp
		.src('src/img/**/*.{png,jpg,jpeg}')
		.pipe(
			tinypng({
				key: 'tMnDBmcM1TWnVp4xLtGl6699tyBhXngQ',
				sigFile: 'src/img/.tinypng-sigs',
				log: true,
			})
		)
		.pipe(gulp.dest('dist/img'))
		.pipe(browserSync.stream());
};

async function optimizeImages() {
	const files = await imagemin(['src/img/**/*.{jpg,jpeg,png,svg,gif}'], {
		destination: 'dist/img',
		plugins: [
			imageminMozjpeg({ quality: 75 }),
			imageminPngquant({ quality: [0.6, 0.8] }),
			imageminSvgo(),
		],
	});

	console.log('Obrazy zoptymalizowane');
}

function createFolders(done) {
	const foldersToCreate = [
		'dist',
		'dist/css',
		'dist/js',
		'html',
		'src',
		'src/img',
		'src/js',
		'src/php',
		'src/sass',
		'instrukcja', // Dodanie folderu instrukcja
	];

	foldersToCreate.forEach(folder => {
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
		.src('src/img/**/*')
		.pipe(gulp.dest('dist/img'))
		.pipe(browserSync.stream());
};

const checkFoldersExist = () => {
	return new Promise((resolve, reject) => {
		const folders = [
			'dist',
			'html',
			'src',
			'src/img',
			'src/js',
			'src/sass',
			'src/php',
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

const createFiles = done => {
	const filesToCreate = [
		{
			path: 'html/index.kit',
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
			path: 'html/_footer.kit',
			content: '<footer></footer>',
		},
		{
			path: 'src/sass/style.scss',
			content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}`,
		},
		{
			path: 'src/js/script.js',
			content: "'use strict'",
		},
		{
			path: 'src/php/index.php',
			content: '<?php     ',
		},
		{
			path: 'instrukcja/instrukcja.md',
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
    <meta name="author" content="uroboros.online"></meta>

## Kompresja obrazów za pomocą TinyPNG

Funkcja "compressImages" pozwala na kompresję obrazów w formatach PNG, JPG i JPEG za pomocą usługi TinyPNG. Kompresja obrazów może znacznie zmniejszyć ich rozmiar, co przekłada się na szybsze wczytywanie strony.

Aby skorzystać z funkcji "compressImages", należy wykonać następujące kroki:

1. Upewnij się, że pakiet "gulp-tinypng-compress" jest zainstalowany w projekcie (jeśli nie, postępuj zgodnie z wcześniejszymi instrukcjami instalacji).

2. Zamień "YOUR_API_KEY" na klucz API TinyPNG w funkcji "compressImages" w pliku "gulpfile.mjs". Klucz API można uzyskać, rejestrując się na stronie [TinyPNG Developer API](https://tinypng.com/developers).

3. Uruchom zadanie Gulp, które kompresuje obrazy za pomocą TinyPNG. Otwórz terminal w katalogu głównym projektu i wpisz polecenie:

gulp compressImages


Skompresowane obrazy zostaną zapisane w folderze "dist/img".

## Wyjaśnienie funkcji

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

backupProject - funkcja tworzy kopię zapasową projektu, zapisując ją jako plik .zip w określonym katalogu.
   `,
		},
		{
			path: '.gitignore', // Dodanie pliku .gitignore w katalogu głównym
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

	filesToCreate.forEach(file => {
		if (!fs.existsSync(file.path)) {
			fs.writeFileSync(file.path, file.content);
			console.log(`Plik "${file.path}" został utworzony.`);
		} else {
			console.log(`Plik "${file.path}" już istnieje.`);
		}
	});
	done();
};

const checkFoldersAndFiles = done => {
	createFolders(done);
	createFiles(done);
	done();
};

const minifyJS = () => {
	return gulp
		.src('src/js/**/*.js')
		.pipe(uglify())
		.pipe(rename({ suffix: '.min' }))
		.pipe(gulp.dest('dist/js'))
		.pipe(browserSync.stream());
};
const checkPHP = () => {
	return (
		gulp
			.src('src/php/**/*.php')
			//   .pipe(uglify())
			.pipe(gulp.dest('./'))
			.pipe(browserSync.stream())
	);
};
const compileKit = () => {
	return gulp
		.src(['html/**/*.kit', '!html/**/_*.kit'])
		.pipe(
			fileInclude({
				prefix: '@@',
				basepath: '@file',
			})
		)
		.pipe(rename({ extname: '.html' }))
		.pipe(gulp.dest('./'))
		.on('end', () => {
			console.log('Pliki .kit zostały skompilowane do .html');
		});
};

function minifyCSS() {
	return gulp
		.src('src/sass/**/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(cleanCSS())
		.pipe(rename({ suffix: '.min' }))
		.pipe(gulp.dest('dist/css'))
		.pipe(browserSync.stream());
}

const watch = () => {
	browserSync.init({
		server: {
			baseDir: './',
		},
	});

	gulp.watch('html/**/*.kit', compileKit);
	gulp.watch('src/sass/**/*.scss', minifyCSS);
	gulp.watch('src/js/**/*.js', minifyJS);
	gulp.watch('src/php/**/*.php', checkPHP);
	gulp.watch('src/img/**/*', copyImages);
	gulp.watch('./*.html').on('change', browserSync.reload);
};

// ---------------------------------------------------------------

import { promisify } from 'util';
import { exec as childExec } from 'child_process';
import ncu from 'npm-check-updates';

const exec = promisify(childExec);

async function checkPackageUpdates() {
	try {
		const upgraded = await ncu.run({
			packageFile: 'package.json',
			upgrade: false,
		});

		if (!Object.keys(upgraded).length) {
			console.log('Wszystkie pakiety są aktualne.');
		} else {
			const updateInfo = Object.entries(upgraded)
				.map(([key, value]) => `${key}: ${value}`)
				.join('\n');
			console.log(`Znaleziono aktualizacje pakietów:\n${updateInfo}`);
			fs.writeFileSync('aktualizacja.txt', updateInfo);
		}
	} catch (error) {
		console.error(
			`Wystąpił błąd podczas sprawdzania aktualizacji pakietów: ${error}`
		);
	}
}

// ------------------------------------------------------------

gulp.task('checkPackageUpdates', checkPackageUpdates);

// --------------------------------------------------------------

// PROJEKT BACKUP
// --------------------------------------------------------------
// --------------------------------------------------------------
import zip from 'gulp-zip';
import path from 'path';
import { fileURLToPath } from 'url';

async function backupProject() {
	const currentPath = fileURLToPath(import.meta.url);
	const currentDir = path.dirname(currentPath);
	const projectName = path.basename(currentDir);
	const backupName = `${projectName}.zip`;
	const outputDirectory = 'Z:/www';
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
				'dist/**/*',
				'html/**/*',
				'src/**/*',
				'instrukcja/**/*',
				'gulpfile.mjs',
				'package.json',
				'!node_modules/**/*',
			],
			{ base: '.', dot: true }
		)
		.pipe(zip(backupName))
		.pipe(gulp.dest(projectDirectory))
		.on('end', () => {
			console.log(
				`Kopia zapasowa została utworzona: ${projectDirectory}/${backupName}`
			);
		});
}

// --------------------------------------------------------------

// --------------------------------------------------------------
// --------------------------------------------------------------
gulp.task('compressImages', compressImages);
gulp.task('optimizeImages', optimizeImages);

gulp.task('backup', backupProject);
gulp.task('checkFoldersAndFiles', checkFoldersAndFiles);
gulp.task('compileKit', gulp.series('checkFoldersAndFiles', compileKit));
gulp.task('minifyCSS', minifyCSS);
gulp.task('minifyJS', minifyJS);
gulp.task('checkPHP', checkPHP);
gulp.task('copyImages', copyImages);
gulp.task(
	'watch',
	gulp.series(
		'compileKit',
		'minifyCSS',
		'minifyJS',
		'copyImages',
		'checkPHP',
		'optimizeImages',
		watch
	)
);
gulp.task('default', gulp.series('watch'));
