"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bot, TestTube, Wrench, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreGauge } from "@/components/ScoreGauge";
import { RadarChart } from "@/components/RadarChart";
import { InsightCard } from "@/components/InsightCard";
import { DimensionBreakdown } from "@/components/DimensionBreakdown";
import { RiskBanner } from "@/components/RiskBanner";
import type { AnalysisResult, Insights } from "@/types";
import Link from "next/link";

const DIMENSION_ICONS = {
  readability: <Bot className="h-5 w-5 text-blue-400" />,
  testing: <TestTube className="h-5 w-5 text-green-400" />,
  aiTooling: <Wrench className="h-5 w-5 text-purple-400" />,
  hygiene: <Sparkles className="h-5 w-5 text-yellow-400" />,
};

const DIMENSION_CONFIG = [
  { key: "readability" as const, label: "LLM Readability", weight: "30%", findingsKey: "readabilityFindings" as const },
  { key: "testing" as const, label: "Eval & Testing", weight: "25%", findingsKey: "testingFindings" as const },
  { key: "aiTooling" as const, label: "AI Tooling Setup", weight: "25%", findingsKey: "aiToolingFindings" as const },
  { key: "hygiene" as const, label: "Codebase Hygiene", weight: "20%", findingsKey: "hygieneFindings" as const },
];

export default function RepoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repoId = params.repoId as string;

  useEffect(() => {
    if (!session) return;

    const repoInfo = typeof window !== "undefined"
      ? JSON.parse(sessionStorage.getItem(`repo-${repoId}`) || "null")
      : null;

    if (!repoInfo) return;

    async function runAnalysis() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: repoInfo.owner,
            repo: repoInfo.name,
            repoId: repoInfo.id,
          }),
        });

        if (!res.ok) throw new Error("Analysis failed");

        const data: AnalysisResult = await res.json();
        setAnalysis(data);

        // Fetch AI insights
        setInsightsLoading(true);
        try {
          const insightsRes = await fetch("/api/insights", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              analysisId: data.id,
              scanData: data.scanData,
            }),
          });

          if (insightsRes.ok) {
            const insightsData: Insights = await insightsRes.json();
            setInsights(insightsData);
          }
        } catch {
          // Insights are optional
        } finally {
          setInsightsLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setLoading(false);
      }
    }

    runAnalysis();
  }, [session, repoId]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please sign in to view analysis.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-2 mb-8">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px] lg:col-span-2" />
        </div>
        <div className="mt-6 space-y-4">
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <p className="text-destructive text-lg">{error || "Analysis not found"}</p>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{analysis.repoFullName}</h1>
          <p className="text-sm text-muted-foreground">
            {analysis.scanData.repoMetadata.language || "Unknown"} &middot;{" "}
            {analysis.scanData.repoMetadata.totalFiles} files &middot;{" "}
            {Math.round(analysis.scanData.repoMetadata.size / 1024)}MB
          </p>
        </div>
      </div>

      {/* Risk Flags */}
      {insights && <RiskBanner riskFlags={insights.riskFlags} />}

      {/* Score + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="flex flex-col items-center justify-center py-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-lg">AI Readiness Score</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreGauge score={analysis.overallScore} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Dimension Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <RadarChart dimensions={analysis.dimensions} />
          </CardContent>
        </Card>
      </div>

      {/* AI Summary */}
      {insights && insights.summary && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{insights.summary}</p>
          </CardContent>
        </Card>
      )}

      {insightsLoading && (
        <Card className="mt-6">
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-muted-foreground">Generating AI insights...</p>
          </CardContent>
        </Card>
      )}

      {/* Nudges */}
      {insights && insights.nudges.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Top Recommendations</h2>
          <div className="space-y-4">
            {insights.nudges.map((nudge, i) => (
              <InsightCard key={i} nudge={nudge} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Dimension Breakdowns */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Detailed Scores</h2>
        <div className="space-y-3">
          {DIMENSION_CONFIG.map((dim) => (
            <DimensionBreakdown
              key={dim.key}
              title={dim.label}
              icon={DIMENSION_ICONS[dim.key]}
              score={analysis.dimensions[dim.key]}
              weight={dim.weight}
              findings={analysis.scanData[dim.findingsKey]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
