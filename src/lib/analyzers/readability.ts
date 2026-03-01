import type { DimensionResult, Finding } from "@/types";

interface ReadabilityInput {
  fileTree: string[];
  fileContents: Record<string, string>;
}

const ABBREVIATION_PATTERNS = /^[a-z]{1,2}$|^[A-Z]{1,2}$/;

function scoreNamingClarity(fileTree: string[]): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const sourceFiles = fileTree.filter(
    (f) => !f.endsWith("/") && !f.startsWith("node_modules/") && !f.startsWith(".git/")
  );

  if (sourceFiles.length === 0) return { score: 20, findings: [] };

  const crypticFiles: string[] = [];
  const singleCharDirs = new Set<string>();

  for (const filePath of sourceFiles) {
    const parts = filePath.split("/");
    for (const part of parts.slice(0, -1)) {
      if (ABBREVIATION_PATTERNS.test(part)) {
        singleCharDirs.add(part);
      }
    }
    const fileName = parts[parts.length - 1].replace(/\.[^.]+$/, "");
    if (fileName.length <= 2 && !["db", "ai"].includes(fileName.toLowerCase())) {
      crypticFiles.push(filePath);
    }
  }

  const crypticRatio = (crypticFiles.length + singleCharDirs.size) / sourceFiles.length;
  const score = Math.round(20 * Math.max(0, 1 - crypticRatio * 5));

  if (crypticFiles.length > 0) {
    findings.push({
      type: "negative",
      category: "naming",
      message: `${crypticFiles.length} file(s) with cryptic or overly abbreviated names`,
      filePaths: crypticFiles.slice(0, 10),
      score,
      maxScore: 20,
    });
  }
  if (singleCharDirs.size > 0) {
    findings.push({
      type: "negative",
      category: "naming",
      message: `${singleCharDirs.size} single-character directory name(s): ${Array.from(singleCharDirs).join(", ")}`,
      score,
      maxScore: 20,
    });
  }
  if (crypticFiles.length === 0 && singleCharDirs.size === 0) {
    findings.push({
      type: "positive",
      category: "naming",
      message: "File and directory names are clear and descriptive",
      score,
      maxScore: 20,
    });
  }

  return { score, findings };
}

function scoreModularStructure(fileTree: string[]): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const files = fileTree.filter(
    (f) => !f.endsWith("/") && !f.startsWith("node_modules/") && !f.startsWith(".git/")
  );

  if (files.length === 0) return { score: 20, findings: [] };

  const maxDepth = Math.max(...files.map((f) => f.split("/").length));
  const dirFileCounts = new Map<string, number>();

  for (const file of files) {
    const dir = file.split("/").slice(0, -1).join("/") || ".";
    dirFileCounts.set(dir, (dirFileCounts.get(dir) || 0) + 1);
  }

  const avgFilesPerDir =
    Array.from(dirFileCounts.values()).reduce((a, b) => a + b, 0) / dirFileCounts.size;

  let score = 20;

  if (maxDepth > 8) {
    score -= 5;
    findings.push({
      type: "negative",
      category: "structure",
      message: `Deep directory nesting detected (max depth: ${maxDepth})`,
      score: 0,
      maxScore: 5,
    });
  }

  if (avgFilesPerDir > 20) {
    score -= 5;
    findings.push({
      type: "negative",
      category: "structure",
      message: `Directories have too many files on average (${Math.round(avgFilesPerDir)} files/dir)`,
      score: 0,
      maxScore: 5,
    });
  }

  const largeDirectories = Array.from(dirFileCounts.entries())
    .filter(([, count]) => count > 30)
    .map(([dir]) => dir);

  if (largeDirectories.length > 0) {
    score -= 5;
    findings.push({
      type: "negative",
      category: "structure",
      message: `${largeDirectories.length} directory(ies) with 30+ files`,
      filePaths: largeDirectories.slice(0, 5),
      score: 0,
      maxScore: 5,
    });
  }

  if (files.length > 0 && maxDepth <= 6 && avgFilesPerDir <= 15) {
    findings.push({
      type: "positive",
      category: "structure",
      message: "Codebase has a well-organized modular structure",
      score: Math.min(score, 20),
      maxScore: 20,
    });
  }

  return { score: Math.max(0, score), findings };
}

function scoreTypeCoverage(
  fileTree: string[],
  fileContents: Record<string, string>
): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const sourceFiles = fileTree.filter(
    (f) => !f.endsWith("/") && !f.startsWith("node_modules/")
  );

  const tsFiles = sourceFiles.filter((f) => /\.(ts|tsx)$/.test(f));
  const jsFiles = sourceFiles.filter((f) => /\.(js|jsx)$/.test(f));
  const pyFiles = sourceFiles.filter((f) => f.endsWith(".py"));
  const hasTsConfig = fileTree.some((f) => f === "tsconfig.json" || f.endsWith("/tsconfig.json"));
  const hasMypyConfig = fileTree.some(
    (f) => f === "mypy.ini" || f === ".mypy.ini" || f === "setup.cfg" || f === "py.typed"
  );

  let score = 0;

  if (tsFiles.length + jsFiles.length > 0) {
    const tsRatio = tsFiles.length / (tsFiles.length + jsFiles.length);
    score = Math.round(15 * tsRatio);
    if (hasTsConfig) score += 5;

    if (tsRatio > 0.8) {
      findings.push({
        type: "positive",
        category: "types",
        message: `Strong TypeScript adoption: ${Math.round(tsRatio * 100)}% of JS/TS files use TypeScript`,
        score,
        maxScore: 20,
      });
    } else if (tsRatio > 0) {
      findings.push({
        type: "neutral",
        category: "types",
        message: `Partial TypeScript adoption: ${Math.round(tsRatio * 100)}% of JS/TS files use TypeScript`,
        filePaths: jsFiles.slice(0, 5),
        score,
        maxScore: 20,
      });
    } else {
      findings.push({
        type: "negative",
        category: "types",
        message: "No TypeScript files found — JavaScript only",
        score: 0,
        maxScore: 20,
      });
    }
  } else if (pyFiles.length > 0) {
    if (hasMypyConfig) {
      score = 15;
      findings.push({
        type: "positive",
        category: "types",
        message: "Type checking config detected (mypy/py.typed)",
        score,
        maxScore: 20,
      });
    }

    const typedFiles = pyFiles.filter((f) => {
      const content = fileContents[f];
      return content && (content.includes(": ") || content.includes("-> ") || content.includes("from typing"));
    });

    if (typedFiles.length > 0) {
      const typeRatio = typedFiles.length / pyFiles.length;
      score += Math.round(5 * typeRatio);
      findings.push({
        type: typeRatio > 0.5 ? "positive" : "neutral",
        category: "types",
        message: `${Math.round(typeRatio * 100)}% of Python files have type annotations`,
        score,
        maxScore: 20,
      });
    }
  } else {
    score = 10;
    findings.push({
      type: "neutral",
      category: "types",
      message: "No JS/TS/Python files detected for type analysis",
      score,
      maxScore: 20,
    });
  }

  return { score: Math.min(score, 20), findings };
}

function scoreCommentQuality(fileContents: Record<string, string>): {
  score: number;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  const relevantFiles = Object.entries(fileContents).filter(
    ([path]) =>
      /\.(ts|tsx|js|jsx|py)$/.test(path) && !path.includes("node_modules")
  );

  if (relevantFiles.length === 0) return { score: 10, findings: [] };

  let filesWithDocs = 0;

  for (const [, content] of relevantFiles) {
    const hasJSDoc = content.includes("/**");
    const hasDocstring = content.includes('"""') || content.includes("'''");
    const hasModuleComment = content.match(/^\/\*\*|^\/\/\s+\w|^#\s+\w/m);

    if (hasJSDoc || hasDocstring || hasModuleComment) {
      filesWithDocs++;
    }
  }

  const docRatio = filesWithDocs / relevantFiles.length;
  const score = Math.round(20 * docRatio);

  if (docRatio > 0.5) {
    findings.push({
      type: "positive",
      category: "comments",
      message: `${Math.round(docRatio * 100)}% of key files have documentation comments`,
      score,
      maxScore: 20,
    });
  } else if (docRatio > 0) {
    findings.push({
      type: "neutral",
      category: "comments",
      message: `Only ${Math.round(docRatio * 100)}% of key files have documentation comments`,
      score,
      maxScore: 20,
    });
  } else {
    findings.push({
      type: "negative",
      category: "comments",
      message: "No documentation comments (JSDoc/docstrings) found in sampled files",
      score: 0,
      maxScore: 20,
    });
  }

  return { score, findings };
}

function scoreConsistentPatterns(fileTree: string[]): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const sourceFiles = fileTree.filter(
    (f) => !f.endsWith("/") && !f.startsWith("node_modules/") && !f.startsWith(".git/")
  );

  if (sourceFiles.length === 0) return { score: 20, findings: [] };

  const fileNames = sourceFiles.map((f) => f.split("/").pop()!.replace(/\.[^.]+$/, ""));

  let camelCount = 0;
  let snakeCount = 0;
  let kebabCount = 0;
  let pascalCount = 0;

  for (const name of fileNames) {
    if (/^[a-z][a-zA-Z0-9]*$/.test(name) && /[A-Z]/.test(name)) camelCount++;
    else if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(name)) snakeCount++;
    else if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(name)) kebabCount++;
    else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) pascalCount++;
  }

  const total = camelCount + snakeCount + kebabCount + pascalCount;

  let score = 20;

  if (total > 0) {
    const maxConvention = Math.max(camelCount, snakeCount, kebabCount, pascalCount);
    const consistency = maxConvention / total;

    if (consistency < 0.5) {
      score = 5;
      findings.push({
        type: "negative",
        category: "patterns",
        message: "Inconsistent naming conventions across files (mix of camelCase, snake_case, kebab-case)",
        score,
        maxScore: 20,
      });
    } else if (consistency < 0.8) {
      score = 12;
      findings.push({
        type: "neutral",
        category: "patterns",
        message: "Mostly consistent naming conventions with some exceptions",
        score,
        maxScore: 20,
      });
    } else {
      findings.push({
        type: "positive",
        category: "patterns",
        message: "Consistent naming conventions across the codebase",
        score,
        maxScore: 20,
      });
    }
  }

  return { score, findings };
}

export function analyzeReadability(input: ReadabilityInput): DimensionResult {
  const naming = scoreNamingClarity(input.fileTree);
  const structure = scoreModularStructure(input.fileTree);
  const types = scoreTypeCoverage(input.fileTree, input.fileContents);
  const comments = scoreCommentQuality(input.fileContents);
  const patterns = scoreConsistentPatterns(input.fileTree);

  const score = naming.score + structure.score + types.score + comments.score + patterns.score;

  return {
    score: Math.min(100, Math.max(0, score)),
    findings: [
      ...naming.findings,
      ...structure.findings,
      ...types.findings,
      ...comments.findings,
      ...patterns.findings,
    ],
  };
}
