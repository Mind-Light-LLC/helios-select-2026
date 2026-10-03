import { spawnSync } from 'node:child_process';

type CommandResult = { status: number; stdout: string; stderr: string };
type Worktree = { path: string; branch: string };

function run(command: string, args: string[], cwd?: string): CommandResult {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  return {
    status: result.status ?? 1,
    stdout: typeof result.stdout === 'string' ? result.stdout.trim() : '',
    stderr: result.error?.message ?? (typeof result.stderr === 'string' ? result.stderr.trim() : ''),
  };
}

function git(args: string[], cwd?: string): string {
  const result = run('git', args, cwd);
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr}`);
  return result.stdout;
}

function worktrees(repo: string): Worktree[] {
  return git(['worktree', 'list', '--porcelain'], repo).split(/\n\n/).map((block) => {
    const lines = block.split('\n');
    const path = lines.find((line) => line.startsWith('worktree '))?.slice(9);
    const branch = lines.find((line) => line.startsWith('branch '))?.slice(18) ?? '(detached)';
    if (!path) throw new Error('Git returned a worktree without a path');
    return { path, branch };
  });
}

try {
  const repo = git(['rev-parse', '--show-toplevel']);
  const fetch = run('git', ['fetch', 'origin', '--quiet'], repo);
  if (fetch.status !== 0) console.error(`Fetch failed; origin/main may be stale: ${fetch.stderr}`);
  const main = git(['rev-parse', '--short', 'origin/main'], repo);
  const trees = worktrees(repo);
  console.log(`origin/main ${main} | ${trees.length} worktrees`);
  console.log('Dirty counts are local files; ahead/behind and containment describe committed HEAD only.');
  for (const tree of trees) {
    const dirty = git(['status', '--porcelain=v1', '-uall'], tree.path).split('\n').filter(Boolean).length;
    const ahead = git(['rev-list', '--count', 'origin/main..HEAD'], tree.path);
    const behind = git(['rev-list', '--count', 'HEAD..origin/main'], tree.path);
    const included = run('git', ['merge-base', '--is-ancestor', 'HEAD', 'origin/main'], tree.path).status === 0;
    console.log(`${dirty} dirty | ${ahead} ahead | ${behind} behind | ${included ? 'HEAD in main' : 'HEAD pending'} | ${tree.branch} | ${tree.path}`);
  }
  const prs = run('gh', [
    'pr', 'list', '--state', 'open', '--limit', '30',
    '--json', 'number,title,headRefName,baseRefName,isDraft',
    '--jq', '.[] | "#\\(.number) \\(if .isDraft then "[draft]" else "[open]" end) \\(.headRefName) -> \\(.baseRefName): \\(.title)"',
  ], repo);
  console.log(`\nOpen PRs (up to 30):\n${prs.status === 0 ? prs.stdout || '(none)' : `Unavailable: ${prs.stderr}`}`);
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : 'Repository status failed');
  process.exitCode = 1;
}
