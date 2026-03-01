"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RepoSelector } from "@/components/RepoSelector";
import { RepoCard } from "@/components/RepoCard";
import type { Repo, AnalysisResult } from "@/types";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session) return;

    async function fetchRepos() {
      setLoadingRepos(true);
      try {
        const res = await fetch("/api/repos");
        if (res.ok) {
          const data = await res.json();
          setRepos(data.repos);
        }
      } catch {
        // handle error silently
      } finally {
        setLoadingRepos(false);
      }
    }

    fetchRepos();
  }, [session]);

  const handleAnalyze = async (selectedRepos: Repo[]) => {
    setAnalyzing(true);

    const results: AnalysisResult[] = [];

    for (const repo of selectedRepos) {
      // Store repo info for detail page
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `repo-${repo.id}`,
          JSON.stringify({
            id: repo.id,
            owner: repo.owner,
            name: repo.name,
            full_name: repo.full_name,
          })
        );
      }

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: repo.owner,
            repo: repo.name,
            repoId: repo.id,
          }),
        });

        if (res.ok) {
          const analysis: AnalysisResult = await res.json();

          // Try to get insights
          try {
            const insightsRes = await fetch("/api/insights", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                analysisId: analysis.id,
                scanData: analysis.scanData,
              }),
            });
            if (insightsRes.ok) {
              analysis.insights = await insightsRes.json();
            }
          } catch {
            // Insights are optional
          }

          results.push(analysis);
          setAnalyses([...results]);
        }
      } catch {
        // Skip failed repos
      }
    }

    setAnalyzing(false);
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Analysis Results */}
      {analyses.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Analysis Results</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyses.map((analysis) => (
              <RepoCard key={analysis.repoFullName} analysis={analysis} />
            ))}
          </div>
        </div>
      )}

      {/* Repo Selector */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {analyses.length > 0 ? "Analyze More Repos" : "Select Repositories to Analyze"}
        </h2>
        {loadingRepos ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <RepoSelector
            repos={repos}
            onAnalyze={handleAnalyze}
            analyzing={analyzing}
          />
        )}
      </div>
    </div>
  );
}
