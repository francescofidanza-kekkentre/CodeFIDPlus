import { FileTreeNode, GitHubBranch, GitHubRepo } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

function getHeaders(token: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

export function encodeUtf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeBase64ToUtf8(base64: string): string {
  const cleaned = base64.replace(/\s/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  if (!token.trim()) {
    return [];
  }
  const url = `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Errore GitHub API (${res.status}): ${errText}`);
  }
  return res.json();
}

export async function fetchRepoBranches(
  owner: string,
  repo: string,
  token: string
): Promise<GitHubBranch[]> {
  if (!owner.trim() || !repo.trim()) {
    return [];
  }
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches?per_page=100`,
    { headers: getHeaders(token) }
  );
  if (!res.ok) {
    throw new Error(`Impossibile caricare i branch (${res.status})`);
  }
  return res.json();
}

export async function createNewBranch(
  owner: string,
  repo: string,
  newBranchName: string,
  fromBranchSha: string,
  token: string
): Promise<void> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: `refs/heads/${newBranchName.trim()}`,
      sha: fromBranchSha,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Errore creazione branch (${res.status})`);
  }
}

interface RawGitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export function buildHierarchicalTree(flatItems: RawGitTreeItem[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const map: Record<string, FileTreeNode> = {};

  // Sort so directories come first, then alphabetically
  const sorted = [...flatItems].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const item of sorted) {
    const parts = item.path.split('/');
    const name = parts[parts.length - 1];
    const node: FileTreeNode = {
      path: item.path,
      name,
      type: item.type,
      sha: item.sha,
      size: item.size,
      children: item.type === 'tree' ? [] : undefined,
    };
    map[item.path] = node;
  }

  for (const item of sorted) {
    const node = map[item.path];
    const parts = item.path.split('/');
    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = map[parentPath];
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        root.push(node);
      }
    }
  }

  const sortRecursive = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => {
      if (n.children) sortRecursive(n.children);
    });
  };

  sortRecursive(root);
  return root;
}

export async function fetchRepoFileTree(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<FileTreeNode[]> {
  if (!owner.trim() || !repo.trim()) {
    return [];
  }
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: getHeaders(token) }
  );
  if (!res.ok) {
    if (res.status === 409 || res.status === 404) {
      // Repository might be empty
      return [];
    }
    throw new Error(`Errore caricamento albero file (${res.status})`);
  }
  const data = await res.json();
  const items: RawGitTreeItem[] = (data.tree || []).filter(
    (item: RawGitTreeItem) => item.type === 'blob' || item.type === 'tree'
  );
  return buildHierarchicalTree(items);
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<{ content: string; sha: string }> {
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    { headers: getHeaders(token) }
  );
  if (!res.ok) {
    throw new Error(`Impossibile leggere ${path} (${res.status})`);
  }
  const data = await res.json();
  const content = data.content ? decodeBase64ToUtf8(data.content) : '';
  return { content, sha: data.sha };
}

export interface FileCommitPayload {
  path: string;
  content: string;
  sha?: string;
}

/**
 * Performs an atomic multi-file commit on GitHub using the Git Data API,
 * falling back to Contents API if the repository is brand-new / empty.
 */
export async function commitMultipleFilesToGitHub(
  owner: string,
  repo: string,
  branch: string,
  message: string,
  files: FileCommitPayload[],
  token: string
): Promise<{ commitSha: string; htmlUrl: string }> {
  if (!token.trim()) {
    throw new Error('Inserisci un GitHub Personal Access Token (PAT) nelle Impostazioni per eseguire il commit.');
  }

  // Try getting the current branch reference
  const refRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    { headers: getHeaders(token) }
  );

  // If repo is empty or branch doesn't exist yet, commit sequentially via Contents API
  if (!refRes.ok) {
    let lastSha = '';
    let lastUrl = `https://github.com/${owner}/${repo}`;
    for (const file of files) {
      const encodedPath = file.path
        .split('/')
        .map((s) => encodeURIComponent(s))
        .join('/');
      const putRes = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodedPath}`,
        {
          method: 'PUT',
          headers: {
            ...getHeaders(token),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            content: encodeUtf8ToBase64(file.content),
            branch,
            ...(file.sha && !file.sha.startsWith('demo-') ? { sha: file.sha } : {}),
          }),
        }
      );
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err.message || `Errore salvataggio ${file.path} (${putRes.status})`);
      }
      const putData = await putRes.json();
      lastSha = putData.commit?.sha || '';
      lastUrl = putData.commit?.html_url || lastUrl;
    }
    return { commitSha: lastSha, htmlUrl: lastUrl };
  }

  const refData = await refRes.json();
  const latestCommitSha: string = refData.object.sha;

  // Fetch the commit to get its base tree SHA
  const commitRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
    { headers: getHeaders(token) }
  );
  if (!commitRes.ok) {
    throw new Error('Impossibile leggere il commit corrente del branch.');
  }
  const commitData = await commitRes.json();
  const baseTreeSha: string = commitData.tree.sha;

  // Build new tree with inline content
  const treeItems = files.map((f) => ({
    path: f.path,
    mode: '100644',
    type: 'blob',
    content: f.content,
  }));

  const newTreeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems,
    }),
  });
  if (!newTreeRes.ok) {
    const err = await newTreeRes.json().catch(() => ({}));
    throw new Error(err.message || 'Errore creazione Git Tree.');
  }
  const newTreeData = await newTreeRes.json();

  // Create the commit
  const createCommitRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      headers: {
        ...getHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        tree: newTreeData.sha,
        parents: [latestCommitSha],
      }),
    }
  );
  if (!createCommitRes.ok) {
    const err = await createCommitRes.json().catch(() => ({}));
    throw new Error(err.message || 'Errore creazione Git Commit.');
  }
  const createdCommit = await createCommitRes.json();

  // Update the branch reference
  const updateRefRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      method: 'PATCH',
      headers: {
        ...getHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: createdCommit.sha,
        force: false,
      }),
    }
  );
  if (!updateRefRes.ok) {
    throw new Error('Impossibile aggiornare il riferimento del branch su GitHub.');
  }

  return {
    commitSha: createdCommit.sha,
    htmlUrl: createdCommit.html_url || `https://github.com/${owner}/${repo}/commit/${createdCommit.sha}`,
  };
}

export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string,
  headBranch: string,
  baseBranch: string,
  token: string
): Promise<{ number: number; html_url: string }> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      head: headBranch,
      base: baseBranch,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Errore creazione Pull Request (${res.status})`);
  }
  return res.json();
}
