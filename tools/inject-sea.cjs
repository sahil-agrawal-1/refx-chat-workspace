const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nodeExe = process.execPath;
const target = path.join(root, 'dist-cli', 'refx.exe');
const blob = path.join(root, 'dist-cli', 'sea-prep.blob');

fs.copyFileSync(nodeExe, target);
console.log('Copied node.exe ->', target);

execSync(
  `npx --yes postject "${target}" NODE_SEA_BLOB "${blob}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
  { stdio: 'inherit', cwd: root }
);
console.log('Injected blob. refx.exe ready at', target);
