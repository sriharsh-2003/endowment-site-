import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');

for (const directory of ['css', 'js']) {
  fs.cpSync(path.join(root, directory), path.join(dist, directory), {recursive: true});
}
