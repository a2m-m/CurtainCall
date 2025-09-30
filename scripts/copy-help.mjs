import { mkdir, rm, stat, cp } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, '..');
const assetDirs = ['help', 'modal'];

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

const copyAssetDirectory = async (dirName) => {
  const sourceDir = resolve(projectRoot, dirName);
  const targetDir = resolve(projectRoot, 'dist', dirName);

  if (!(await pathExists(sourceDir))) {
    console.warn(`${dirName} ディレクトリが見つからないためコピーをスキップしました。`);
    return;
  }

  await rm(targetDir, { recursive: true, force: true });
  await mkdir(dirname(targetDir), { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true });
  console.log(`${dirName} ディレクトリを dist/${dirName} にコピーしました。`);
};

const main = async () => {
  for (const dirName of assetDirs) {
    await copyAssetDirectory(dirName);
  }
};

main().catch((error) => {
  console.error('help ディレクトリのコピーに失敗しました。');
  console.error(error);
  process.exitCode = 1;
});
