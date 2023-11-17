import fs from 'fs/promises';
import { Project } from 'ts-morph';
import path from 'path';
import { execAsync } from './execAsync.js';

/**
 * Initialize the TS-Morph project.
 *
 * @param {string} rootPath The path to the root of the LangChain repo.
 * @returns {Project} The initialized TS-Morph project.
 */
export async function initLangChainProject(rootPath: string, gitUrl: string) {
  // Check if project has already been cloned, and we have
  // write/read perms. Also verify it is a git repo.
  try {
    await fs.access(rootPath, fs.constants.W_OK | fs.constants.R_OK);
    // Output of this should be true.
    const { stdout } = await execAsync(
      `cd ${rootPath} && git rev-parse --is-inside-work-tree`
    );
    if (!stdout.includes('true')) {
      throw new Error(`Not a git repo. Output: ${stdout}`);
    }
    execAsync(`cd ${rootPath} && git pull`);
  } catch (err) {
    console.warn('threw err', err);
    // If an error if thrown, we need to clone the repo.

    // Clone the repo
    // Split off the `langchainjs` from the end of the path.
    // so the clone command will clone into the correct directory.
    const pathWithoutLangchain = rootPath
      .split(path.sep)
      .slice(0, -1)
      .join(path.sep);
    await execAsync(
      `cd ${pathWithoutLangchain} && git clone ${gitUrl} langchainjs`
    );
  }

  const tsConfigFilePath = path.join(rootPath, 'langchain', 'tsconfig.json');
  const project = new Project({
    tsConfigFilePath,
  });
  return project;
}
