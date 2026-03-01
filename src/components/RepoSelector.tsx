"use client";

import { useState } from "react";
import { Search, Lock, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Repo } from "@/types";

interface RepoSelectorProps {
  repos: Repo[];
  onAnalyze: (repos: Repo[]) => void;
  analyzing: boolean;
}

export function RepoSelector({ repos, onAnalyze, analyzing }: RepoSelectorProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filtered = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRepo = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedRepos = repos.filter((r) => selected.has(r.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button
          onClick={() => onAnalyze(selectedRepos)}
          disabled={selected.size === 0 || analyzing}
        >
          {analyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            `Analyze ${selected.size > 0 ? `(${selected.size})` : ""}`
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {filtered.map((repo) => {
          const isSelected = selected.has(repo.id);
          return (
            <Card
              key={repo.id}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                isSelected ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => toggleRepo(repo.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {repo.private ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <p className="font-medium text-sm truncate">{repo.name}</p>
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {repo.language && (
                        <Badge variant="outline" className="text-xs">
                          {repo.language}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded border-2 shrink-0 ml-2 flex items-center justify-center ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No repositories found matching &quot;{search}&quot;
        </p>
      )}
    </div>
  );
}
