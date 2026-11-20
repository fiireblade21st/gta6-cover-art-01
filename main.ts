// Vice Cover Studio: the program that hands this entry in.
//
// The app is plain static files under app/ — index.html, its scripts, styles
// and samples — plus the screenshots/ renders, and this file is the only code
// the grader runs. It first checks the entry is whole (every file the page
// and its modules load is really there, and screenshots/ holds 3 or 4
// renders), then copies both folders to the output directory and writes the
// dossier the judge reads (vendor/makefun-app.ts builds it). Run it with
// `node main.ts`; outside the grader's container MAKEFUN_OUTPUT_DIR stands
// in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app itself with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildDossier,
  htmlFacts,
  importMapOf,
  isRelativeRef,
  isRelativeSpecifier,
  mappedSpecifier,
  readAppTree,
  resolveAppPath,
  sourceImports,
} from './vendor/makefun-app.ts';
import type { ImportMap } from './vendor/makefun-app.ts';

/** The scorer's caps for this bounty, from its gate.json. */
const GATE = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

/** The fewest renders screenshots/ may hold: the bounty wants 3 or 4, the first by name the cover. */
const SHOTS_MIN = 3;

const root = fileURLToPath(new URL('./', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Stop the hand-in with a plain reason (the log gets the reason, not a stack trace). */
function refuse(why: string): never {
  throw new Error(why);
}

/** A screenshot: its file name under screenshots/ and its bytes. */
interface Shot {
  name: string;
  bytes: number;
}

/** screenshots/, in name order: 3 or 4 renders, each inside the byte cap. */
function checkShots(shotsDir: string): Shot[] {
  let names: string[];
  try {
    names = readdirSync(shotsDir);
  } catch {
    refuse('screenshots/: no such directory — hand in 3 or 4 renders of the app');
  }
  const shots: Shot[] = [];
  for (const name of names.filter((n) => !n.startsWith('.')).sort()) {
    const path = join(shotsDir, name);
    if (!existsSync(path)) refuse(`screenshots/${name}: cannot be read`);
    const st = statSync(path);
    if (!st.isFile()) refuse(`screenshots/${name}: a directory, not a render`);
    if (st.size > GATE.screenshots.max_bytes) {
      refuse(`screenshots/${name}: ${st.size} bytes, over the ${GATE.screenshots.max_bytes} a screenshot may be`);
    }
    shots.push({ name, bytes: st.size });
  }
  if (shots.length < SHOTS_MIN) {
    refuse(`screenshots/: only ${shots.length} render(s) — the bounty wants ${SHOTS_MIN} to ${GATE.screenshots.max}`);
  }
  if (shots.length > GATE.screenshots.max) {
    refuse(`screenshots/: ${shots.length} renders, over the ${GATE.screenshots.max} allowed`);
  }
  return shots;
}

/** One load the app makes: the file that names it and the reference it gives. */
interface Load {
  from: string;
  ref: string;
}

/** Resolve a page reference (a script src, a stylesheet href, a media src) to a path under app/, or null when it is no file at all. A data: URI (the page's favicon) is not a file and is left alone; anything else that is not a relative path — an absolute path, a network URL — cannot load from app/ in the grader's offline browser. */
function resolvePageRef(ref: string, where: string): string | null {
  if (!isRelativeRef(ref)) {
    if (ref.startsWith('data:')) return null;
    refuse(`${where}: ${JSON.stringify(ref)} is not a file of app/ — an offline app loads nothing from outside it`);
  }
  const path = resolveAppPath(ref, 'index.html');
  if (path === null) refuse(`${where}: ${JSON.stringify(ref)} climbs out of app/`);
  return path;
}

/** Resolve a module specifier to a path under app/, or null when it is no file at all. A relative specifier resolves against the importing module; a bare one goes through the page's import map, and one no map entry covers cannot load. */
function resolveSpecifier(map: ImportMap | null, spec: string, from: string): string | null {
  if (isRelativeSpecifier(spec)) {
    const path = resolveAppPath(spec, from);
    if (path === null) refuse(`app/${from}: import ${JSON.stringify(spec)} climbs out of app/`);
    return path;
  }
  const mapped = mappedSpecifier(map, spec, from);
  if (mapped === null) refuse(`app/${from}: import ${JSON.stringify(spec)} is bare and no import map maps it`);
  return resolvePageRef(mapped, `app/${from}`);
}

/** Check every file the app loads is really under app/: the page's scripts, styles and media, then depth-first the static imports of each module they reach. Neither the starter nor buildDossier looks at what the page loads — a missing script or stylesheet would ship an app that paints nothing in the grader's browser — so the hand-in stops here with the missing file named. */
function checkLoads(appDir: string): void {
  const indexPath = join(appDir, 'index.html');
  if (!existsSync(indexPath)) {
    refuse('app/index.html: no such file — an app is a directory of static files, its index.html at its root');
  }
  const facts = htmlFacts(readFileSync(indexPath, 'utf8'));
  const { map, error } = importMapOf(facts);
  if (error !== null) refuse(`app/index.html: ${error}`);
  const seen = new Set<string>();
  const modules: string[] = [];
  const wantFile = (path: string | null, load: Load): void => {
    if (path === null) return;
    if (!existsSync(join(appDir, path))) {
      refuse(`${load.from}: ${JSON.stringify(load.ref)} names app/${path}, which is not there`);
    }
    if (/\.(?:js|mjs)$/i.test(path) && !seen.has(path)) {
      seen.add(path);
      modules.push(path);
    }
  };
  const wantRef = (ref: string, where: string): void => {
    wantFile(resolvePageRef(ref, where), { from: where, ref });
  };
  const wantSpecifier = (spec: string, from: string): void => {
    wantFile(resolveSpecifier(map, spec, from), { from: `app/${from}`, ref: spec });
  };
  for (const s of facts.scripts) {
    if (s.src !== null) {
      wantRef(s.src, 'index.html <script>');
    } else if (s.type === 'module') {
      for (const spec of sourceImports(s.text)) wantSpecifier(spec, 'index.html');
    }
  }
  for (const l of facts.links) wantRef(l.href, 'index.html <link>');
  for (const r of facts.resources) wantRef(r.src, `index.html <${r.tag}>`);
  while (modules.length > 0) {
    const path = modules.pop()!;
    for (const spec of sourceImports(readFileSync(join(appDir, path), 'utf8'))) {
      wantSpecifier(spec, path);
    }
  }
}

/** Copy app/ and screenshots/ to the output directory and write the dossier; returns what was handed in, for the summary. */
function handIn(sourceDir: string, targetDir: string): { shots: Shot[]; files: number; bytes: number; dossierBytes: number } {
  const appDir = join(sourceDir, 'app');
  const shotsDir = join(sourceDir, 'screenshots');
  const shots = checkShots(shotsDir);
  checkLoads(appDir);
  const tree = readAppTree(appDir, {
    app_max_files: GATE.app_max_files,
    app_max_bytes: GATE.app_max_bytes,
    app_path_max_bytes: GATE.app_path_max_bytes,
  });
  mkdirSync(targetDir, { recursive: true });
  cpSync(appDir, join(targetDir, 'app'), { recursive: true });
  mkdirSync(join(targetDir, 'screenshots'), { recursive: true });
  if (existsSync(shotsDir)) cpSync(shotsDir, join(targetDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(targetDir, GATE);
  writeFileSync(join(targetDir, 'dossier.json'), dossier);
  return { shots, files: tree.count, bytes: tree.totalBytes, dossierBytes: dossier.length };
}

/** Hand this entry in, then say what was handed in. */
function main(): void {
  const done = handIn(root, outDir);
  const cover = done.shots[0]!;
  const shotList = done.shots.map((s) => `${s.name} (${s.bytes} bytes)`).join(', ');
  console.log(`vice-cover: handed in ${done.files} app entries (${done.bytes} bytes), ${done.shots.length} screenshots, cover ${cover.name}`);
  console.log(`vice-cover: screenshots ${shotList}`);
  console.log(`vice-cover: dossier.json ${done.dossierBytes} bytes -> ${join(outDir, 'dossier.json')}`);
}

try {
  main();
} catch (err) {
  console.error(`vice-cover: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
