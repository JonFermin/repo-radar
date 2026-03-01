"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getScoreColor } from "@/lib/scoring";
import type { Finding } from "@/types";

interface DimensionBreakdownProps {
  title: string;
  icon: React.ReactNode;
  score: number;
  weight: string;
  findings: Finding[];
}

const COLOR_MAP = {
  red: "text-red-400",
  yellow: "text-yellow-400",
  green: "text-green-400",
};

const findingIcons = {
  positive: <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />,
  negative: <XCircle className="h-4 w-4 text-red-400 shrink-0" />,
  neutral: <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />,
};

export function DimensionBreakdown({
  title,
  icon,
  score,
  weight,
  findings,
}: DimensionBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scoreColor = COLOR_MAP[getScoreColor(score)];

  return (
    <Card className="bg-card/50">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {weight}
            </Badge>
          </div>
          <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0">
          <div className="space-y-3 border-t pt-4">
            {findings.map((finding, i) => (
              <div key={i} className="flex items-start gap-2">
                {findingIcons[finding.type]}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{finding.message}</p>
                  {finding.filePaths && finding.filePaths.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {finding.filePaths.map((fp) => (
                        <code
                          key={fp}
                          className="text-xs px-1 py-0.5 rounded bg-muted text-muted-foreground"
                        >
                          {fp}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {finding.score}/{finding.maxScore}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
