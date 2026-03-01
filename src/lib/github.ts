import type { Repo } from "@/types";

const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL = "https://api.github.com/graphql";

interface TreeEntry {
  name: string;
  type: string;
  path: string;
  object?: {
    entries?: TreeEntry[];
    byteSize?: number;
    text?: string;
  };
}

function flattenTree(entries: TreeEntry[], prefix = ""): string[] {
  const paths: string[] = [];
  for (const entry of entries) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.type === "blob") {
      paths.push(fullPath);
    } else if (entry.type === "tree" && entry.object?.entries) {
      paths.push(fullPath + "/");
      paths.push(...flattenTree(entry.object.entries, fullPath));
    }
  }
  return paths;
}

export async function getRepoTree(
  owner: string,
  repo: string,
  token: string
): Promise<string[]> {
  const query = `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        defaultBranchRef {
          target {
            ... on Commit {
              tree {
                entries {
                  name
                  type
                  path
                  object {
                    ... on Tree {
                      entries {
                        name
                        type
                        path
                        object {
                          ... on Tree {
                            entries {
                              name
                              type
                              path
                              object {
                                ... on Tree {
                                  entries {
                                    name
                                    type
                                    path
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { owner, name: repo } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL API error: ${response.status}`);
  }

  const data = await response.json();
  const entries =
    data?.data?.repository?.defaultBranchRef?.target?.tree?.entries ?? [];
  return flattenTree(entries);
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  token: string
): Promise<string | null> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return null;
}

export async function getRepoMetadata(
  owner: string,
  repo: string,
  token: string
): Promise<{
  language: string | null;
  size: number;
  defaultBranch: string;
  description: string | null;
  hasIssues: boolean;
  hasWiki: boolean;
}> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repo metadata: ${response.status}`);
  }

  const data = await response.json();
  return {
    language: data.language,
    size: data.size,
    defaultBranch: data.default_branch,
    description: data.description,
    hasIssues: data.has_issues,
    hasWiki: data.has_wiki,
  };
}

export async function getBranches(
  owner: string,
  repo: string,
  token: string
): Promise<Array<{ name: string; commitDate: string | null }>> {
  const branches: Array<{ name: string; commitDate: string | null }> = [];
  let page = 1;

  while (page <= 3) {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) break;

    const data = await response.json();
    if (data.length === 0) break;

    for (const branch of data) {
      branches.push({
        name: branch.name,
        commitDate: branch.commit?.commit?.committer?.date ?? null,
      });
    }

    if (data.length < 100) break;
    page++;
  }

  return branches;
}

export async function getBranchProtection(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<boolean> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}/protection`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  return response.ok;
}

export async function listUserRepos(token: string): Promise<Repo[]> {
  const repos: Repo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `${GITHUB_API}/user/repos?per_page=${perPage}&page=${page}&sort=updated&type=all`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) break;

    const data = await response.json();
    if (data.length === 0) break;

    for (const repo of data) {
      repos.push({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner.login,
        description: repo.description,
        language: repo.language,
        private: repo.private,
        default_branch: repo.default_branch,
        stargazers_count: repo.stargazers_count,
        updated_at: repo.updated_at,
        html_url: repo.html_url,
      });
    }

    if (data.length < perPage) break;
    page++;
  }

  return repos;
}
