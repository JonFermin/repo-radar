import type { DimensionResult, Finding } from "@/types";

interface TestingInput {
  fileTree: string[];
  fileContents: Record<string, string>;
}

const TEST_FILE_PATTERNS = [
  /\.(test|spec)\.(ts|tsx|js|jsx|py|rb)$/,
  /^tests?\//,
  /\/__tests__\//,
  /test_.*\.py$/,
  /.*_test\.go$/,
  /.*_test\.rb$/,
];

const TEST_FRAMEWORK_CONFIGS = [
  "jest.config.js",
  "jest.config.ts",
  "jest.config.mjs",
  "jest.config.cjs",
  "vitest.config.ts",
  "vitest.config.js",
  "vitest.config.mts",
  "pytest.ini",
  "setup.cfg",
  "pyproject.toml",
  ".mocharc.yml",
  ".mocharc.yaml",
  ".mocharc.js",
  ".mocharc.json",
  "karma.conf.js",
  "karma.conf.ts",
  "phpunit.xml",
  "phpunit.xml.dist",
];

const CI_PATHS = [
  ".github/workflows/",
  ".gitlab-ci.yml",
  "Jenkinsfile",
  ".circleci/",
  "azure-pipelines.yml",
  ".travis.yml",
  "bitbucket-pipelines.yml",
  "Taskfile.yml",
];

const EVAL_PATTERNS = [
  /^evals?\//,
  /^benchmarks?\//,
  /eval[_-]suite/i,
  /prompt[_-]test/i,
];

const COVERAGE_CONFIGS = [
  ".nycrc",
  ".nycrc.json",
  ".nycrc.yml",
  ".c8rc.json",
  ".coveragerc",
  "codecov.yml",
  ".codecov.yml",
];

function scoreTestFiles(fileTree: string[]): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const sourceFiles = fileTree.filter(
    (f) =>
      !f.endsWith("/") &&
      !f.startsWith("node_modules/") &&
      !f.startsWith(".git/") &&
      /\.(ts|tsx|js|jsx|py|rb|go|java|rs)$/.test(f)
  );

  const testFiles = fileTree.filter((f) =>
    TEST_FILE_PATTERNS.some((pattern) => pattern.test(f))
  );

  if (sourceFiles.length === 0) return { score: 10, findings: [] };

  const testRatio = testFiles.length / sourceFiles.length;
  let score: number;

  if (testRatio >= 0.3) {
    score = 20;
  } else if (testRatio >= 0.1) {
    score = Math.round(10 + 10 * ((testRatio - 0.1) / 0.2));
  } else if (testRatio > 0) {
    score = Math.round(10 * (testRatio / 0.1));
  } else {
    score = 0;
  }

  if (testFiles.length === 0) {
    findings.push({
      type: "negative",
      category: "tests",
      message: "No test files found in the repository",
      score: 0,
      maxScore: 20,
    });
  } else {
    findings.push({
      type: testRatio >= 0.1 ? "positive" : "neutral",
      category: "tests",
      message: `${testFiles.length} test file(s) found (${Math.round(testRatio * 100)}% test-to-source ratio)`,
      filePaths: testFiles.slice(0, 5),
      score,
      maxScore: 20,
    });
  }

  return { score, findings };
}

function scoreTestFramework(fileTree: string[]): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const foundConfigs = fileTree.filter((f) => {
    const name = f.split("/").pop() || f;
    return TEST_FRAMEWORK_CONFIGS.includes(name);
  });

  if (foundConfigs.length > 0) {
    findings.push({
      type: "positive",
      category: "framework",
      message: `Test framework config found: ${foundConfigs.join(", ")}`,
      filePaths: foundConfigs,
      score: 20,
      maxScore: 20,
    });
    return { score: 20, findings };
  }

  const packageJson = fileTree.find((f) => f === "package.json");
  if (packageJson) {
    findings.push({
      type: "neutral",
      category: "framework",
      message: "No dedicated test framework config file (jest.config, vitest.config, etc.)",
      score: 5,
      maxScore: 20,
    });
    return { score: 5, findings };
  }

  findings.push({
    type: "negative",
    category: "framework",
    message: "No test framework configuration detected",
    score: 0,
    maxScore: 20,
  });
  return { score: 0, findings };
}

function scoreCIPipeline(fileTree: string[]): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const foundCI: string[] = [];

  for (const ciPath of CI_PATHS) {
    if (ciPath.endsWith("/")) {
      const hasDir = fileTree.some((f) => f.startsWith(ciPath));
      if (hasDir) foundCI.push(ciPath);
    } else {
      if (fileTree.includes(ciPath)) foundCI.push(ciPath);
    }
  }

  if (foundCI.length > 0) {
    findings.push({
      type: "positive",
      category: "ci",
      message: `CI/CD pipeline detected: ${foundCI.join(", ")}`,
      filePaths: foundCI,
      score: 20,
      maxScore: 20,
    });
    return { score: 20, findings };
  }

  findings.push({
    type: "negative",
    category: "ci",
    message: "No CI/CD pipeline detected — AI-generated code changes have no automated safety net",
    score: 0,
    maxScore: 20,
  });
  return { score: 0, findings };
}

function scoreEvalSuites(fileTree: string[]): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const evalFiles = fileTree.filter((f) =>
    EVAL_PATTERNS.some((pattern) => pattern.test(f))
  );

  if (evalFiles.length > 0) {
    findings.push({
      type: "positive",
      category: "evals",
      message: `Eval/benchmark suite detected: ${evalFiles.length} file(s)`,
      filePaths: evalFiles.slice(0, 5),
      score: 20,
      maxScore: 20,
    });
    return { score: 20, findings };
  }

  findings.push({
    type: "neutral",
    category: "evals",
    message: "No eval suites or benchmark files found",
    score: 0,
    maxScore: 20,
  });
  return { score: 0, findings };
}

function scoreCoverageConfig(
  fileTree: string[],
  fileContents: Record<string, string>
): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];

  const hasCoverageConfig = fileTree.some((f) => {
    const name = f.split("/").pop() || f;
    return COVERAGE_CONFIGS.includes(name);
  });

  if (hasCoverageConfig) {
    findings.push({
      type: "positive",
      category: "coverage",
      message: "Code coverage configuration detected",
      score: 20,
      maxScore: 20,
    });
    return { score: 20, findings };
  }

  const hasCoverageInConfig = Object.entries(fileContents).some(([path, content]) => {
    if (
      path.includes("jest.config") ||
      path.includes("vitest.config") ||
      path.includes("package.json")
    ) {
      return (
        content.includes("coverage") ||
        content.includes("collectCoverage") ||
        content.includes("c8")
      );
    }
    return false;
  });

  if (hasCoverageInConfig) {
    findings.push({
      type: "positive",
      category: "coverage",
      message: "Coverage settings found in test framework config",
      score: 15,
      maxScore: 20,
    });
    return { score: 15, findings };
  }

  const hasCoverageInCI = Object.entries(fileContents).some(([path, content]) => {
    return (
      (path.includes(".github/workflows/") || path.includes(".gitlab-ci")) &&
      (content.includes("coverage") || content.includes("codecov"))
    );
  });

  if (hasCoverageInCI) {
    findings.push({
      type: "positive",
      category: "coverage",
      message: "Coverage reporting found in CI pipeline",
      score: 15,
      maxScore: 20,
    });
    return { score: 15, findings };
  }

  findings.push({
    type: "neutral",
    category: "coverage",
    message: "No code coverage configuration detected",
    score: 0,
    maxScore: 20,
  });
  return { score: 0, findings };
}

export function analyzeTesting(input: TestingInput): DimensionResult {
  const testFiles = scoreTestFiles(input.fileTree);
  const framework = scoreTestFramework(input.fileTree);
  const ci = scoreCIPipeline(input.fileTree);
  const evals = scoreEvalSuites(input.fileTree);
  const coverage = scoreCoverageConfig(input.fileTree, input.fileContents);

  const score =
    testFiles.score + framework.score + ci.score + evals.score + coverage.score;

  return {
    score: Math.min(100, Math.max(0, score)),
    findings: [
      ...testFiles.findings,
      ...framework.findings,
      ...ci.findings,
      ...evals.findings,
      ...coverage.findings,
    ],
  };
}
