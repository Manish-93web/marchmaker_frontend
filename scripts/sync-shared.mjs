// The shared package (types, schemas, the matching engine) is owned by the backend repo. The frontend keeps a copy so
// that it builds on its own, for example on Vercel, where the backend repo is not available.
//
//   node scripts/sync-shared.mjs          copy it from ../marchmaker_backend/packages/shared
//   node scripts/sync-shared.mjs --check  exit with an error if the copy is out of date
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.resolve(root, '..', 'marchmaker_backend', 'packages', 'shared');
const to = path.join(root, 'packages', 'shared');
const parts = ['src', 'test', 'package.json', 'tsconfig.json'];

if (!existsSync(from)) {
  console.error(`Cannot find the backend shared package at ${from}. Clone marchmaker_backend next to this repo.`);
  process.exit(1);
}

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)).map((f) => path.join(e.name, f)) : [e.name]));

if (process.argv.includes('--check')) {
  const stale = [];
  for (const p of parts) {
    const a = path.join(from, p);
    const b = path.join(to, p);
    const list = statSync(a).isDirectory() ? files(a).map((f) => path.join(p, f)) : [p];
    for (const f of list) {
      const x = path.join(from, f);
      const y = path.join(to, f);
      if (!existsSync(y) || !readFileSync(x).equals(readFileSync(y))) stale.push(f);
    }
    if (statSync(a).isDirectory() && existsSync(b)) {
      for (const f of files(b)) if (!existsSync(path.join(a, f))) stale.push(path.join(p, f));
    }
  }
  if (stale.length) {
    console.error(`packages/shared is out of date with the backend (${stale.length} file(s), for example ${stale[0]}). Run: pnpm sync:shared`);
    process.exit(1);
  }
  console.log('packages/shared matches the backend.');
} else {
  for (const p of parts) {
    const a = path.join(from, p);
    const b = path.join(to, p);
    if (statSync(a).isDirectory()) rmSync(b, { recursive: true, force: true });
    cpSync(a, b, { recursive: true });
  }
  console.log('Copied packages/shared from the backend. Review the changes, then commit.');
}
