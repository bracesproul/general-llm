import { execAsync } from './execAsync.js';

export async function openPullRequest(
  repoRootPath: string,
  branchName: string,
  title: string
) {
  await execAsync(
    `cd ${repoRootPath} && git checkout -b ${branchName} && git add -A && git commit -m "${title}" && git push --set-upstream origin ${branchName}`
  );
}

export async function lintAndFormatFiles(rootPath: string) {
  await execAsync(`cd ${rootPath} && yarn format && yarn lint`);
}
