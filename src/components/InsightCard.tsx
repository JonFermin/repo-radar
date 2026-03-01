import { Lightbulb, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Nudge } from "@/types";

interface InsightCardProps {
  nudge: Nudge;
  index: number;
}

const impactColors = {
  high: "destructive" as const,
  medium: "warning" as const,
  low: "secondary" as const,
};

export function InsightCard({ nudge, index }: InsightCardProps) {
  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lightbulb className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">
              {index + 1}. {nudge.title}
            </CardTitle>
          </div>
          <Badge variant={impactColors[nudge.impact]}>
            <ArrowUp className="mr-1 h-3 w-3" />
            {nudge.impact} impact
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{nudge.description}</p>
        {nudge.affectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {nudge.affectedFiles.map((file) => (
              <code
                key={file}
                className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {file}
              </code>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
