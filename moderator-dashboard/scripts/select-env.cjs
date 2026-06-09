const fs = require('fs');
const path = require('path');

const managedKeys = ['VITE_API_BASE_URL', 'VITE_SOCKET_URL'];
const profile = process.argv[2];

if (!profile) {
  console.error('Usage: node scripts/select-env.js <local|deployed>');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const profilePath = path.join(projectRoot, 'env-profiles', `${profile}.profile`);
const envPath = path.join(projectRoot, '.env');

if (!fs.existsSync(profilePath)) {
  console.error(`Unknown environment profile: ${profile}`);
  process.exit(1);
}

const parseEnv = (content) => {
  const values = new Map();
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (match) values.set(match[1], match[2]);
  }
  return values;
};

const profileValues = parseEnv(fs.readFileSync(profilePath, 'utf8'));
const currentLines = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  : [];
const nextLines = [];
const writtenKeys = new Set();

for (const line of currentLines) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/);
  const key = match?.[1];

  if (!key || !managedKeys.includes(key)) {
    nextLines.push(line);
    continue;
  }

  if (profileValues.has(key)) {
    nextLines.push(`${key}=${profileValues.get(key)}`);
    writtenKeys.add(key);
  }
}

for (const key of managedKeys) {
  if (profileValues.has(key) && !writtenKeys.has(key)) {
    nextLines.push(`${key}=${profileValues.get(key)}`);
  }
}

fs.writeFileSync(envPath, nextLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');

const activeKeys = managedKeys.filter((key) => profileValues.has(key)).join(', ') || 'Vite auto-detection';
console.log(`Selected ${profile} environment (${activeKeys}).`);
