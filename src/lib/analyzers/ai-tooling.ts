import type { DimensionResult, Finding } from "@/types";

interface AIToolingInput {
  fileTree: string[];
  fileContents: Record<string, string>;
}

const AI_INSTRUCTION_FILES = [
  "CLAUDE.md",
  ".cursorrules",
  ".cursor/rules",
  ".github/copilot-instructions.md",
  "AGENTS.md",
  ".clinerules",
  "codex.md",
  ".github/copilot-instructions.md",
  "CONVENTIONS.md",
];

const AI_DEPENDENCIES = [
  "openai",
  "@openai/openai",
  "anthropic",
  "@anthropic-ai/sdk",
  "langchain",
  "@langchain/core",
  "@langchain/openai",
  "llamaindex",
  "ai",
  "@ai-sdk/openai",
  "@ai-sdk/anthropic",
  "cohere-ai",
  "replicate",
  "huggingface",
  "@huggingface/inference",
];

const PYTHON_AI_DEPS = [
  "openai",
  "anthropic",
  "langchain",
  "llama-index",
  "llamaindex",
  "cohere",
  "replicate",
  "transformers",
  "huggingface-hub",
  "tiktoken",
];

function scoreAIInstructionFiles(fileTree: string[]): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const foundFiles: string[] = [];

  for (const aiFile of AI_INSTRUCTION_FILES) {
    const matches = fileTree.filter(
      (f) => f === aiFile || f.endsWith(`/${aiFile}`)
    );
    foundFiles.push(...matches);
  }

  if (foundFiles.length >= 2) {
    findings.push({
      type: "positive",
      category: "ai-instructions",
      message: `Multiple AI instruction files found: ${foundFiles.join(", ")}`,
      filePaths: foundFiles,
      score: 20,
      maxScore: 20,
    });
    return { score: 20, findings };
  }

  if (foundFiles.length === 1) {
    findings.push({
      type: "positive",
      category: "ai-instructions",
      message: `AI instruction file found: ${foundFiles[0]}`,
      filePaths: foundFiles,
      score: 15,
      maxScore: 20,
    });
    return { score: 15, findings };
  }

  findings.push({
    type: "negative",
    category: "ai-instructions",
    message:
      "No AI instruction files found (CLAUDE.md, .cursorrules, copilot-instructions.md, etc.)",
    score: 0,
    maxScore: 20,
  });
  return { score: 0, findings };
}

function scoreContextWindowFriendliness(fileTree: string[]): {
  score: number;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  const sourceFiles = fileTree.filter(
    (f) =>
      !f.endsWith("/") &&
      !f.startsWith("node_modules/") &&
      !f.startsWith(".git/") &&
      /\.(ts|tsx|js|jsx|py|rb|go|java|rs|c|cpp|h)$/.test(f)
  );

  const maxDepth = Math.max(
    0,
    ...sourceFiles.map((f) => f.split("/").length)
  );

  let score = 20;
  const issues: string[] = [];

  if (maxDepth > 8) {
    score -= 5;
    issues.push(`deeply nested structure (max depth: ${maxDepth})`);
  }

  if (sourceFiles.length > 500) {
    score -= 5;
    issues.push(`large number of source files (${sourceFiles.length})`);
  }

  if (issues.length > 0) {
    findings.push({
      type: "negative",
      category: "context-window",
      message: `Context window challenges: ${issues.join(", ")}`,
      score: Math.max(0, score),
      maxScore: 20,
    });
  } else {
    findings.push({
      type: "positive",
      category: "context-window",
      message: "Codebase structure is context-window friendly",
      score,
      maxScore: 20,
    });
  }

  return { score: Math.max(0, score), findings };
}

function scorePromptManagement(fileTree: string[]): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];

  const promptDirs = fileTree.filter(
    (f) =>
      f.match(/^prompts?\//i) ||
      f.match(/\/prompts?\//i) ||
      f.endsWith(".prompt") ||
      f.endsWith(".prompt.txt") ||
      f.endsWith(".prompt.md")
  );

  if (promptDirs.length > 0) {
    findings.push({
      type: "positive",
      category: "prompts",
      message: `Organized prompt files/directories found: ${promptDirs.length} file(s)`,
      filePaths: promptDirs.slice(0, 5),
      score: 20,
      maxScore: 20,
    });
    return { score: 20, findings };
  }

  findings.push({
    type: "neutral",
    category: "prompts",
    message: "No dedicated prompt files or templates directory found",
    score: 0,
    maxScore: 20,
  });
  return { score: 0, findings };
}

function scoreMCPConfigs(fileTree: string[]): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];

  const mcpFiles = fileTree.filter(
    (f) =>
      f === ".mcp.json" ||
      f.startsWith("mcp/") ||
      f.includes("/.mcp.json") ||
      f.includes("/mcp/")
  );

  if (mcpFiles.length > 0) {
    findings.push({
      type: "positive",
      category: "mcp",
      message: `MCP configuration found: ${mcpFiles.length} file(s)`,
      filePaths: mcpFiles.slice(0, 5),
      score: 20,
      maxScore: 20,
    });
    return { score: 20, findings };
  }

  findings.push({
    type: "neutral",
    category: "mcp",
    message: "No MCP (Model Context Protocol) configuration found",
    score: 0,
    maxScore: 20,
  });
  return { score: 0, findings };
}

function scoreAIDependencies(fileContents: Record<string, string>): {
  score: number;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  const foundDeps: string[] = [];

  const packageJson = fileContents["package.json"];
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      for (const dep of AI_DEPENDENCIES) {
        if (allDeps[dep]) {
          foundDeps.push(dep);
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  const requirementsTxt = fileContents["requirements.txt"];
  if (requirementsTxt) {
    const lines = requirementsTxt.split("\n");
    for (const line of lines) {
      const pkgName = line.trim().split(/[=<>!~\[]/)[0].toLowerCase();
      if (PYTHON_AI_DEPS.includes(pkgName)) {
        foundDeps.push(pkgName);
      }
    }
  }

  if (foundDeps.length > 0) {
    findings.push({
      type: "positive",
      category: "ai-deps",
      message: `AI-related dependencies found: ${foundDeps.join(", ")}`,
      score: 20,
      maxScore: 20,
    });
    return { score: 20, findings };
  }

  findings.push({
    type: "neutral",
    category: "ai-deps",
    message: "No AI-related dependencies detected",
    score: 0,
    maxScore: 20,
  });
  return { score: 0, findings };
}

export function analyzeAITooling(input: AIToolingInput): DimensionResult {
  const instructions = scoreAIInstructionFiles(input.fileTree);
  const contextWindow = scoreContextWindowFriendliness(input.fileTree);
  const prompts = scorePromptManagement(input.fileTree);
  const mcp = scoreMCPConfigs(input.fileTree);
  const deps = scoreAIDependencies(input.fileContents);

  const score =
    instructions.score +
    contextWindow.score +
    prompts.score +
    mcp.score +
    deps.score;

  return {
    score: Math.min(100, Math.max(0, score)),
    findings: [
      ...instructions.findings,
      ...contextWindow.findings,
      ...prompts.findings,
      ...mcp.findings,
      ...deps.findings,
    ],
  };
}
