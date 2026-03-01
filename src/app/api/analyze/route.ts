import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getRepoTree,
  getFileContent,
  getRepoMetadata,
  getBranches,
  getBranchProtection,
} from "@/lib/github";
import { analyzeReadability } from "@/lib/analyzers/readability";
import { analyzeTesting } from "@/lib/analyzers/testing";
import { analyzeAITooling } from "@/lib/analyzers/ai-tooling";
import { analyzeHygiene } from "@/lib/analyzers/hygiene";
import { calculateOverallScore } from "@/lib/scoring";
import { getDb } from "@/lib/db";
import type { ScanData, DimensionScores } from "@/types";

const KEY_FILES = [
  "package.json",
  "tsconfig.json",
  "jest.config.js",
  "jest.config.ts",
  "vitest.config.ts",
  "vitest.config.js",
  "pytest.ini",
  "pyproject.toml",
  "setup.cfg",
  ".gitignore",
  "README.md",
  "readme.md",
  "README.rst",
  "LICENSE",
  "LICENSE.md",
  "requirements.txt",
  "CLAUDE.md",
  ".cursorrules",
  ".mcp.json",
];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { owner, repo, repoId } = body;

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Missing owner or repo" },
      { status: 400 }
    );
  }

  const token = session.accessToken;

  // Fetch repo data in parallel
  const [fileTree, metadata, branches] = await Promise.all([
    getRepoTree(owner, repo, token),
    getRepoMetadata(owner, repo, token),
    getBranches(owner, repo, token),
  ]);

  const isProtected = await getBranchProtection(
    owner,
    repo,
    metadata.defaultBranch,
    token
  );

  // Fetch key file contents
  const fileContents: Record<string, string> = {};
  const filesToFetch = KEY_FILES.filter((f) => fileTree.includes(f));

  // Also fetch CI workflow files
  const ciFiles = fileTree.filter(
    (f) => f.startsWith(".github/workflows/") && f.endsWith(".yml")
  );
  filesToFetch.push(...ciFiles.slice(0, 5));

  // Sample some source files for comment analysis
  const sourceFiles = fileTree
    .filter(
      (f) =>
        /\.(ts|tsx|js|jsx|py)$/.test(f) &&
        !f.includes("node_modules") &&
        !f.includes(".next")
    )
    .slice(0, 10);
  filesToFetch.push(...sourceFiles);

  const fetchResults = await Promise.all(
    filesToFetch.map(async (f) => {
      const content = await getFileContent(owner, repo, f, token);
      return [f, content] as const;
    })
  );

  for (const [path, content] of fetchResults) {
    if (content) {
      fileContents[path] = content;
    }
  }

  // Run all analyzers
  const [readabilityResult, testingResult, aiToolingResult, hygieneResult] =
    await Promise.all([
      analyzeReadability({ fileTree, fileContents }),
      analyzeTesting({ fileTree, fileContents }),
      analyzeAITooling({ fileTree, fileContents }),
      analyzeHygiene({
        fileTree,
        fileContents,
        branches,
        isDefaultBranchProtected: isProtected,
        repoLanguage: metadata.language,
      }),
    ]);

  const dimensions: DimensionScores = {
    readability: readabilityResult.score,
    testing: testingResult.score,
    aiTooling: aiToolingResult.score,
    hygiene: hygieneResult.score,
  };

  const overallScore = calculateOverallScore(dimensions);

  const scanData: ScanData = {
    repoFullName: `${owner}/${repo}`,
    repoMetadata: {
      language: metadata.language,
      size: metadata.size,
      defaultBranch: metadata.defaultBranch,
      totalFiles: fileTree.filter((f) => !f.endsWith("/")).length,
      fileTree,
    },
    dimensions,
    readabilityFindings: readabilityResult.findings,
    testingFindings: testingResult.findings,
    aiToolingFindings: aiToolingResult.findings,
    hygieneFindings: hygieneResult.findings,
  };

  // Store in database
  let analysisId: number | null = null;
  try {
    const sql = getDb();
    const result = await sql`
      INSERT INTO analyses (
        repo_full_name, repo_id, overall_score,
        readability_score, testing_score, ai_tooling_score, hygiene_score,
        scan_data
      ) VALUES (
        ${`${owner}/${repo}`}, ${repoId || 0}, ${overallScore},
        ${dimensions.readability}, ${dimensions.testing},
        ${dimensions.aiTooling}, ${dimensions.hygiene},
        ${JSON.stringify(scanData)}
      )
      RETURNING id
    `;
    analysisId = result[0]?.id ?? null;
  } catch (err) {
    console.error("Failed to store analysis:", err);
    // Continue even if DB storage fails
  }

  return NextResponse.json({
    id: analysisId,
    repoFullName: `${owner}/${repo}`,
    repoId: repoId || 0,
    overallScore,
    dimensions,
    scanData,
    insights: null,
    createdAt: new Date().toISOString(),
  });
}
