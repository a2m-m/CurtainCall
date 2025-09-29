import { mkdir, rm, stat, cp } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, '..');
const sourceDir = resolve(projectRoot, 'help');
const targetDir = resolve(projectRoot, 'dist', 'help');

const pathExists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

const main = async () => {
  if (!(await pathExists(sourceDir))) {
    console.warn('help ディレクトリが見つからないためコピーをスキップしました。');
    return;
  }

  await rm(targetDir, { recursive: true, force: true });
  await mkdir(dirname(targetDir), { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true });
  console.log('help ディレクトリを dist/help にコピーしました。');
};

main().catch((error) => {
  console.error('help ディレクトリのコピーに失敗しました。');
  console.error(error);
  process.exitCode = 1;
});
