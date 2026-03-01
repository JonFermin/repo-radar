import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { RiskFlag } from "@/types";

interface RiskBannerProps {
  riskFlags: RiskFlag[];
}

export function RiskBanner({ riskFlags }: RiskBannerProps) {
  if (riskFlags.length === 0) return null;

  const criticalFlags = riskFlags.filter((f) => f.severity === "critical");
  const warningFlags = riskFlags.filter((f) => f.severity === "warning");

  return (
    <div className="space-y-2">
      {criticalFlags.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-400 mb-1">Critical Issues</p>
            <ul className="space-y-1">
              {criticalFlags.map((flag, i) => (
                <li key={i} className="text-sm text-red-300/80">
                  {flag.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {warningFlags.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-400 mb-1">Warnings</p>
            <ul className="space-y-1">
              {warningFlags.map((flag, i) => (
                <li key={i} className="text-sm text-yellow-300/80">
                  {flag.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
