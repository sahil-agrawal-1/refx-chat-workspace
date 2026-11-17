const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'dist-cli', 'refx.exe');
if (!fs.existsSync(src)) {
  console.error('dist-cli/refx.exe not found. Run: pnpm build:exe');
  process.exit(1);
}

const binDir = process.env.REFX_BIN_DIR || path.join(os.homedir(), 'bin');
fs.mkdirSync(binDir, { recursive: true });
const dest = path.join(binDir, 'refx.exe');
fs.copyFileSync(src, dest);
console.log('Installed refx.exe to', dest);

// Add binDir to user PATH if missing (uses .NET API to avoid setx 1024-char truncation).
if (process.platform === 'win32') {
  const { execSync } = require('node:child_process');
  const escaped = binDir.replace(/'/g, "''");
  const ps = `powershell -NoProfile -Command "$p=[Environment]::GetEnvironmentVariable('PATH','User'); if (-not ($p.Split(';') -contains '${escaped}')) { [Environment]::SetEnvironmentVariable('PATH', ($p + ';${escaped}'), 'User'); Write-Host 'PATH updated.' } else { Write-Host 'already on PATH' }"`;
  try {
    execSync(ps, { stdio: 'inherit' });
    console.log('Restart your terminal to use `refx`.');
  } catch (err) {
    console.warn('Could not update PATH automatically. Add manually:', binDir);
  }
}
