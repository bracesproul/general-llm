import { glob } from 'glob';

export const loadFilesFromDirectory = async (dir: string) => {
  const directory = dir.endsWith('/') ? dir : `${dir}/`;
  const allFiles = await glob(`${directory}**/*`, {
    absolute: true,
  });
  const allTsFiles = allFiles.flatMap((file) => {
    if (
      !file.endsWith('.ts') ||
      file.endsWith('.tsx') ||
      file.endsWith('.test.ts') ||
      file.endsWith('d.ts')
    ) {
      return [];
    }
    return file;
  });
  return allTsFiles;
};
