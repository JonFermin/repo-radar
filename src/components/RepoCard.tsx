import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getScoreColor, getScoreLabel } from "@/lib/scoring";
import type { AnalysisResult } from "@/types";
import Link from "next/link";

interface RepoCardProps {
  analysis: AnalysisResult;
}

const SCORE_BG: Record<string, string> = {
  red: "text-red-400",
  yellow: "text-yellow-400",
  green: "text-green-400",
};

export function RepoCard({ analysis }: RepoCardProps) {
  const color = getScoreColor(analysis.overallScore);
  const label = getScoreLabel(analysis.overallScore);

  const topRisk = analysis.insights?.riskFlags?.[0];

  return (
    <Link href={`/dashboard/${analysis.repoId}`}>
      <Card
        className="cursor-pointer transition-all hover:bg-accent/50 hover:border-accent-foreground/20"
        onClick={() => {
          if (typeof window !== "undefined") {
            const [owner, name] = analysis.repoFullName.split("/");
            sessionStorage.setItem(
              `repo-${analysis.repoId}`,
              JSON.stringify({
                id: analysis.repoId,
                owner,
                name,
                full_name: analysis.repoFullName,
              })
            );
          }
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base truncate flex-1">
              {analysis.repoFullName}
            </CardTitle>
            <div className="flex flex-col items-end gap-1 ml-2">
              <span className={`text-3xl font-bold ${SCORE_BG[color]}`}>
                {analysis.overallScore}
              </span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {(
              [
                { key: "readability", label: "Read" },
                { key: "testing", label: "Test" },
                { key: "aiTooling", label: "AI" },
                { key: "hygiene", label: "Hyg" },
              ] as const
            ).map((dim) => (
              <div key={dim.key} className="text-center">
                <p className="text-xs text-muted-foreground">{dim.label}</p>
                <p
                  className={`text-sm font-semibold ${
                    SCORE_BG[getScoreColor(analysis.dimensions[dim.key])]
                  }`}
                >
                  {analysis.dimensions[dim.key]}
                </p>
              </div>
            ))}
          </div>

          {topRisk && (
            <Badge
              variant={topRisk.severity === "critical" ? "destructive" : "warning"}
              className="text-xs"
            >
              {topRisk.message}
            </Badge>
          )}

          {analysis.scanData?.repoMetadata?.language && (
            <Badge variant="outline" className="text-xs ml-1">
              {analysis.scanData.repoMetadata.language}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
