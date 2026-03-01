"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Radar, Github, Bot, TestTube, Wrench, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

const dimensions = [
  {
    icon: Bot,
    title: "LLM Readability",
    description:
      "How easily can an LLM understand your codebase? File naming, modular structure, type coverage, and consistent patterns.",
    color: "text-blue-400",
  },
  {
    icon: TestTube,
    title: "Eval & Testing",
    description:
      "Is there a safety net for AI-assisted changes? Test files, CI pipelines, eval suites, and coverage config.",
    color: "text-green-400",
  },
  {
    icon: Wrench,
    title: "AI Tooling Setup",
    description:
      "Is the repo configured for AI dev tools? CLAUDE.md, .cursorrules, MCP configs, and AI-related dependencies.",
    color: "text-purple-400",
  },
  {
    icon: Sparkles,
    title: "Codebase Hygiene",
    description:
      "Are the basics in good shape? README quality, license, .gitignore, dependency freshness, and branch protection.",
    color: "text-yellow-400",
  },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="flex flex-col items-center gap-8 py-24 px-4 text-center max-w-4xl mx-auto">
        <Badge variant="secondary" className="text-sm">
          Free to use
        </Badge>
        <div className="flex items-center gap-3">
          <Radar className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Is your repo <span className="text-primary">AI-ready</span>?
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl">
          LLM-powered dev workflows are only as good as the repo they&apos;re working in.
          RepoRadar scans your GitHub repos and tells you how well-optimized they are for
          AI-assisted development.
        </p>
        <Button size="lg" className="text-lg px-8 py-6" onClick={() => signIn("github")}>
          <Github className="mr-2 h-5 w-5" />
          Sign in with GitHub
        </Button>
      </section>

      {/* Four Dimensions */}
      <section className="w-full max-w-6xl mx-auto px-4 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          Four dimensions of AI readiness
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dimensions.map((dim) => (
            <Card key={dim.title} className="bg-card/50">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <dim.icon className={`h-6 w-6 ${dim.color}`} />
                <CardTitle className="text-lg">{dim.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{dim.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
