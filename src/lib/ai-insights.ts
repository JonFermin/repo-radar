import Anthropic from "@anthropic-ai/sdk";
import type { ScanData, Insights } from "@/types";

const SYSTEM_PROMPT = `You are RepoRadar, an expert at analyzing code repositories for AI-readiness. Your job is to take structured scan data from a repository and generate helpful, constructive insights.

Your tone should be:
- Helpful and forward-looking, not judgmental
- Specific — reference actual file paths, numbers, and metrics from the scan
- Constructive — focus on "here's how to get more out of your AI tools" not "you're doing it wrong"
- Concise — every word should add value

You must respond with valid JSON matching this schema:
{
  "summary": "2-3 sentence plain-English summary of the repo's AI readiness",
  "nudges": [
    {
      "title": "Short actionable title",
      "description": "Specific, actionable recommendation referencing real files/metrics",
      "impact": "high" | "medium" | "low",
      "affectedFiles": ["path/to/file1", "path/to/file2"]
    }
  ],
  "riskFlags": [
    {
      "severity": "critical" | "warning",
      "message": "Specific risk description",
      "category": "tests" | "types" | "ci" | "structure" | "docs" | "ai-config"
    }
  ]
}

Return exactly 3 nudges ranked by impact, and include risk flags only for critical missing items.`;

function buildUserPrompt(scanData: ScanData): string {
  const { repoFullName, repoMetadata, dimensions } = scanData;

  const findings = [
    ...scanData.readabilityFindings.map((f) => `[Readability] ${f.message}`),
    ...scanData.testingFindings.map((f) => `[Testing] ${f.message}`),
    ...scanData.aiToolingFindings.map((f) => `[AI Tooling] ${f.message}`),
    ...scanData.hygieneFindings.map((f) => `[Hygiene] ${f.message}`),
  ];

  return `Analyze this repository scan data and generate insights:

Repository: ${repoFullName}
Language: ${repoMetadata.language || "Unknown"}
Total Files: ${repoMetadata.totalFiles}
Repo Size: ${repoMetadata.size}KB

Dimension Scores (0-100):
- LLM Readability: ${dimensions.readability}/100
- Eval & Testing: ${dimensions.testing}/100
- AI Tooling Setup: ${dimensions.aiTooling}/100
- Codebase Hygiene: ${dimensions.hygiene}/100

Detailed Findings:
${findings.map((f) => `- ${f}`).join("\n")}

Generate a JSON response with summary, top 3 nudges, and risk flags.`;
}

export async function generateInsights(scanData: ScanData): Promise<Insights> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      summary: "AI insights are unavailable — ANTHROPIC_API_KEY is not configured.",
      nudges: [],
      riskFlags: [],
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(scanData),
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Extract JSON from the response (handle potential markdown code blocks)
  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr) as Insights;

  return {
    summary: parsed.summary || "",
    nudges: (parsed.nudges || []).slice(0, 3),
    riskFlags: parsed.riskFlags || [],
  };
}
