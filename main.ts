// A working best-game-01 entry (Node 22, standard library only): the game is this directory's
// game/ folder, plain static files a desktop browser loads offline (game/index.html and its ES
// modules, no library and no network request), and the program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library. A starting point, not a winner: Block Dodger, a
// plain 2D canvas game where a paddle dodges falling blocks and catches coins, with a title screen,
// score, lives and levels, game over and restart, flat colours and no sound. Build your own game
// (any genre, any library you vendor under game/, or none), put your 3 or 4 PNG or JPEG screenshots
// in screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

// Umami Rush — Midnight Ramen Stand: the game in game/ is a 90-second ramen
// cooking game (order tickets, a boil-timing pot, a plating counter and a pass
// shelf). The hand-in below is the kit's, plus a closing self-audit of ours:
// after the dossier is written we re-read the output and refuse to hand in a
// broken stall — a missing game page, the wrong number of screenshots, or a
// screenshot over the gate's size cap all stop the run loudly instead of
// silently scoring zero.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Closing self-audit (ours, not the kit's): the hand-in is only trustworthy
// if the output really holds the playable game and its screenshots.
function auditHandIn(outputDir) {
  const problems = [];
  if (!existsSync(join(outputDir, 'game', 'index.html'))) {
    problems.push('game/index.html is missing from the output');
  }
  const shotsDir = join(outputDir, 'screenshots');
  const shots = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter((name) => /\.(png|jpe?g)$/i.test(name))
    : [];
  if (shots.length < 3 || shots.length > 4) {
    problems.push(`expected 3 or 4 screenshots, found ${shots.length}`);
  }
  for (const name of shots) {
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > 262144) problems.push(`screenshot ${name} is ${bytes} bytes, over the 256 KiB cap`);
  }
  if (problems.length > 0) {
    throw new Error(`Umami Rush hand-in audit failed: ${problems.join('; ')}`);
  }
  console.log(`Umami Rush hand-in audit: game page present, ${shots.length} screenshots within caps.`);
}

auditHandIn(out);
