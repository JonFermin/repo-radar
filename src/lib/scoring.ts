import type { DimensionScores, ScoreColor } from "@/types";

const WEIGHTS = {
  readability: 0.3,
  testing: 0.25,
  aiTooling: 0.25,
  hygiene: 0.2,
} as const;

export function calculateOverallScore(dimensions: DimensionScores): number {
  return Math.round(
    dimensions.readability * WEIGHTS.readability +
      dimensions.testing * WEIGHTS.testing +
      dimensions.aiTooling * WEIGHTS.aiTooling +
      dimensions.hygiene * WEIGHTS.hygiene
  );
}

export function getScoreColor(score: number): ScoreColor {
  if (score <= 40) return "red";
  if (score <= 70) return "yellow";
  return "green";
}

export function getScoreLabel(score: number): string {
  if (score <= 20) return "Not Ready";
  if (score <= 40) return "Needs Work";
  if (score <= 60) return "Getting There";
  if (score <= 80) return "Good Shape";
  return "AI-Ready";
}

export const DIMENSION_LABELS: Record<keyof DimensionScores, string> = {
  readability: "LLM Readability",
  testing: "Eval & Testing",
  aiTooling: "AI Tooling Setup",
  hygiene: "Codebase Hygiene",
};

export const DIMENSION_WEIGHTS: Record<keyof DimensionScores, number> = WEIGHTS;
