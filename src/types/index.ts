export interface Repo {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  language: string | null;
  private: boolean;
  default_branch: string;
  stargazers_count: number;
  updated_at: string;
  html_url: string;
}

export interface Finding {
  type: "positive" | "negative" | "neutral";
  category: string;
  message: string;
  filePaths?: string[];
  score: number;
  maxScore: number;
}

export interface DimensionResult {
  score: number;
  findings: Finding[];
}

export interface DimensionScores {
  readability: number;
  testing: number;
  aiTooling: number;
  hygiene: number;
}

export interface ScanData {
  repoFullName: string;
  repoMetadata: RepoMetadata;
  dimensions: DimensionScores;
  readabilityFindings: Finding[];
  testingFindings: Finding[];
  aiToolingFindings: Finding[];
  hygieneFindings: Finding[];
}

export interface RepoMetadata {
  language: string | null;
  size: number;
  defaultBranch: string;
  totalFiles: number;
  fileTree: string[];
}

export interface Nudge {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  affectedFiles: string[];
}

export interface RiskFlag {
  severity: "critical" | "warning";
  message: string;
  category: string;
}

export interface Insights {
  summary: string;
  nudges: Nudge[];
  riskFlags: RiskFlag[];
}

export interface AnalysisResult {
  id: number;
  repoFullName: string;
  repoId: number;
  overallScore: number;
  dimensions: DimensionScores;
  scanData: ScanData;
  insights: Insights | null;
  createdAt: string;
}

export type ScoreColor = "red" | "yellow" | "green";
