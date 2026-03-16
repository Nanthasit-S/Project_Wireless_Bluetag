#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const validProfiles = new Set(['devbuild', 'expo-go']);
const profile = process.argv[2];

if (!profile || !validProfiles.has(profile)) {
  console.error('Usage: node scripts/switch-version.mjs <devbuild|expo-go>');
  process.exit(1);
}

const root = process.cwd();
const packagePath = resolve(root, 'package.json');
const lockfilePath = resolve(root, 'package-lock.json');
const profilePath = resolve(root, 'profiles', `dependencies.${profile}.json`);

if (!existsSync(packagePath) || !existsSync(profilePath)) {
  console.error('Missing package.json or profile file.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const deps = JSON.parse(readFileSync(profilePath, 'utf8'));
pkg.dependencies = deps;

writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Switched dependencies to profile: ${profile}`);

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (existsSync(lockfilePath)) {
  run(npmCmd, ['install']);
} else {
  run(npmCmd, ['install']);
}

run(npmCmd, ['run', 'sync:expo']);
console.log(`Profile '${profile}' is ready.`);
