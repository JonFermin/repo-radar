import type { DimensionResult, Finding } from "@/types";

interface HygieneInput {
  fileTree: string[];
  fileContents: Record<string, string>;
  branches: Array<{ name: string; commitDate: string | null }>;
  isDefaultBranchProtected: boolean;
  repoLanguage: string | null;
}

const GITIGNORE_LANGUAGE_PATTERNS: Record<string, string[]> = {
  JavaScript: ["node_modules", ".env", "dist", "build"],
  TypeScript: ["node_modules", ".env", "dist", "build", "*.js.map"],
  Python: ["__pycache__", "*.pyc", ".env", "venv", ".venv"],
  Java: ["*.class", "target/", "*.jar"],
  Go: ["bin/", "*.exe"],
  Ruby: ["*.gem", "vendor/bundle"],
  Rust: ["target/", "Cargo.lock"],
};

function scoreReadme(fileTree: string[], fileContents: Record<string, string>): {
  score: number;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  const readmePath = fileTree.find(
    (f) => /^readme(\.(md|txt|rst))?$/i.test(f)
  );

  if (!readmePath) {
    findings.push({
      type: "negative",
      category: "readme",
      message: "No README file found",
      score: 0,
      maxScore: 17,
    });
    return { score: 0, findings };
  }

  const content = fileContents[readmePath];
  if (!content) {
    findings.push({
      type: "neutral",
      category: "readme",
      message: "README exists but could not be read",
      filePaths: [readmePath],
      score: 5,
      maxScore: 17,
    });
    return { score: 5, findings };
  }

  const length = content.length;

  if (length > 2000) {
    findings.push({
      type: "positive",
      category: "readme",
      message: `Comprehensive README (${Math.round(length / 1000)}k chars)`,
      filePaths: [readmePath],
      score: 17,
      maxScore: 17,
    });
    return { score: 17, findings };
  }

  if (length > 500) {
    findings.push({
      type: "positive",
      category: "readme",
      message: `Good README (${length} chars)`,
      filePaths: [readmePath],
      score: 12,
      maxScore: 17,
    });
    return { score: 12, findings };
  }

  findings.push({
    type: "neutral",
    category: "readme",
    message: `README exists but is short (${length} chars)`,
    filePaths: [readmePath],
    score: 7,
    maxScore: 17,
  });
  return { score: 7, findings };
}

function scoreLicense(fileTree: string[]): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const hasLicense = fileTree.some((f) =>
    /^license(\.(md|txt))?$/i.test(f)
  );

  if (hasLicense) {
    findings.push({
      type: "positive",
      category: "license",
      message: "LICENSE file present",
      score: 17,
      maxScore: 17,
    });
    return { score: 17, findings };
  }

  findings.push({
    type: "negative",
    category: "license",
    message: "No LICENSE file found",
    score: 0,
    maxScore: 17,
  });
  return { score: 0, findings };
}

function scoreGitignore(
  fileTree: string[],
  fileContents: Record<string, string>,
  language: string | null
): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const hasGitignore = fileTree.includes(".gitignore");

  if (!hasGitignore) {
    findings.push({
      type: "negative",
      category: "gitignore",
      message: "No .gitignore file found",
      score: 0,
      maxScore: 17,
    });
    return { score: 0, findings };
  }

  const content = fileContents[".gitignore"] || "";
  const expectedPatterns = language
    ? GITIGNORE_LANGUAGE_PATTERNS[language] || []
    : [];

  if (expectedPatterns.length === 0) {
    findings.push({
      type: "positive",
      category: "gitignore",
      message: ".gitignore file present",
      filePaths: [".gitignore"],
      score: 17,
      maxScore: 17,
    });
    return { score: 17, findings };
  }

  const missingPatterns = expectedPatterns.filter(
    (p) => !content.includes(p)
  );

  if (missingPatterns.length === 0) {
    findings.push({
      type: "positive",
      category: "gitignore",
      message: ".gitignore is well-configured for the detected language",
      filePaths: [".gitignore"],
      score: 17,
      maxScore: 17,
    });
    return { score: 17, findings };
  }

  const coverage = 1 - missingPatterns.length / expectedPatterns.length;
  const score = Math.round(17 * coverage);

  findings.push({
    type: "neutral",
    category: "gitignore",
    message: `.gitignore exists but may be missing entries: ${missingPatterns.join(", ")}`,
    filePaths: [".gitignore"],
    score,
    maxScore: 17,
  });
  return { score, findings };
}

function scoreDependencyFreshness(fileContents: Record<string, string>): {
  score: number;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  const packageJson = fileContents["package.json"];

  if (!packageJson) {
    findings.push({
      type: "neutral",
      category: "dependencies",
      message: "No package.json found for dependency analysis",
      score: 10,
      maxScore: 17,
    });
    return { score: 10, findings };
  }

  try {
    const pkg = JSON.parse(packageJson);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const depCount = Object.keys(deps).length;

    if (depCount === 0) {
      findings.push({
        type: "neutral",
        category: "dependencies",
        message: "No dependencies listed in package.json",
        score: 17,
        maxScore: 17,
      });
      return { score: 17, findings };
    }

    const veryOldPatterns = Object.entries(deps).filter(
      ([, version]) =>
        typeof version === "string" &&
        (version.startsWith("^0.") ||
          version.startsWith("~0.") ||
          version === "*")
    );

    if (veryOldPatterns.length > depCount * 0.3) {
      findings.push({
        type: "negative",
        category: "dependencies",
        message: `${veryOldPatterns.length} dependencies may be significantly outdated or use wildcard versions`,
        score: 5,
        maxScore: 17,
      });
      return { score: 5, findings };
    }

    findings.push({
      type: "positive",
      category: "dependencies",
      message: `${depCount} dependencies appear to be reasonably up to date`,
      score: 17,
      maxScore: 17,
    });
    return { score: 17, findings };
  } catch {
    findings.push({
      type: "neutral",
      category: "dependencies",
      message: "Could not parse package.json for dependency analysis",
      score: 8,
      maxScore: 17,
    });
    return { score: 8, findings };
  }
}

function scoreStaleBranches(
  branches: Array<{ name: string; commitDate: string | null }>
): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  const staleBranches = branches.filter((b) => {
    if (!b.commitDate) return false;
    const age = now - new Date(b.commitDate).getTime();
    return age > ninetyDaysMs;
  });

  if (staleBranches.length === 0) {
    findings.push({
      type: "positive",
      category: "branches",
      message:
        branches.length <= 1
          ? "Single branch repository"
          : `All ${branches.length} branches are active (updated within 90 days)`,
      score: 16,
      maxScore: 16,
    });
    return { score: 16, findings };
  }

  const staleRatio = staleBranches.length / branches.length;
  const score = Math.round(16 * (1 - staleRatio));

  findings.push({
    type: staleRatio > 0.5 ? "negative" : "neutral",
    category: "branches",
    message: `${staleBranches.length} of ${branches.length} branches are stale (no activity in 90+ days)`,
    score,
    maxScore: 16,
  });
  return { score, findings };
}

function scoreBranchProtection(isProtected: boolean): {
  score: number;
  findings: Finding[];
} {
  const findings: Finding[] = [];

  if (isProtected) {
    findings.push({
      type: "positive",
      category: "protection",
      message: "Default branch has protection rules enabled",
      score: 16,
      maxScore: 16,
    });
    return { score: 16, findings };
  }

  findings.push({
    type: "negative",
    category: "protection",
    message: "Default branch is not protected",
    score: 0,
    maxScore: 16,
  });
  return { score: 0, findings };
}

export function analyzeHygiene(input: HygieneInput): DimensionResult {
  const readme = scoreReadme(input.fileTree, input.fileContents);
  const license = scoreLicense(input.fileTree);
  const gitignore = scoreGitignore(
    input.fileTree,
    input.fileContents,
    input.repoLanguage
  );
  const deps = scoreDependencyFreshness(input.fileContents);
  const branches = scoreStaleBranches(input.branches);
  const protection = scoreBranchProtection(input.isDefaultBranchProtected);

  const score =
    readme.score +
    license.score +
    gitignore.score +
    deps.score +
    branches.score +
    protection.score;

  return {
    score: Math.min(100, Math.max(0, score)),
    findings: [
      ...readme.findings,
      ...license.findings,
      ...gitignore.findings,
      ...deps.findings,
      ...branches.findings,
      ...protection.findings,
    ],
  };
}
