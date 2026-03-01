import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { Repo } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repos: Repo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&type=all`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch repos from GitHub" },
        { status: response.status }
      );
    }

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

  return NextResponse.json({ repos });
}
