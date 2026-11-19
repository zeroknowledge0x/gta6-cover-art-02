// NEON COAST COVER STUDIO — the make.fun submission program.
// Node 22, standard library only, no network: it copies the static app and the screenshots into the output
// directory, then writes dossier.json with the vendored make.fun library, exactly as the starter plumbing did.
// The entry itself lives in app/: index.html, style.css and the ES modules under app/src/.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader calls the same program with MAKEFUN_OUTPUT_DIR=/output. Nothing is read from the network:
// buildDossier hashes the screenshots and inlines the source text entirely from the copied tree.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps: only text_max_bytes shapes the dossier text; the others make this program fail where the
// scorer would. The text is canonical and deterministic, so two runs into different directories agree bytewise.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
