"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { getScoreColor, getScoreLabel } from "@/lib/scoring";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

const COLOR_MAP = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
};

const BG_COLOR = "hsl(0, 0%, 14.9%)";

export function ScoreGauge({ score, size = 240 }: ScoreGaugeProps) {
  const color = COLOR_MAP[getScoreColor(score)];
  const label = getScoreLabel(score);

  const data = [
    { name: "score", value: score },
    { name: "remainder", value: 100 - score },
  ];

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            startAngle={90}
            endAngle={-270}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill={BG_COLOR} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-sm text-muted-foreground mt-1">{label}</span>
      </div>
    </div>
  );
}
