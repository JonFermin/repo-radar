"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { DimensionScores } from "@/types";
import { DIMENSION_LABELS } from "@/lib/scoring";

interface RadarChartProps {
  dimensions: DimensionScores;
}

export function RadarChart({ dimensions }: RadarChartProps) {
  const data = [
    { dimension: DIMENSION_LABELS.readability, score: dimensions.readability, fullMark: 100 },
    { dimension: DIMENSION_LABELS.testing, score: dimensions.testing, fullMark: 100 },
    { dimension: DIMENSION_LABELS.aiTooling, score: dimensions.aiTooling, fullMark: 100 },
    { dimension: DIMENSION_LABELS.hygiene, score: dimensions.hygiene, fullMark: 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="hsl(0, 0%, 20%)" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "hsl(0, 0%, 63.9%)", fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "hsl(0, 0%, 40%)", fontSize: 10 }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="hsl(142, 76%, 46%)"
          fill="hsl(142, 76%, 46%)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
