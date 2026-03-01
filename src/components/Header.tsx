"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Radar, LogOut, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center mx-auto px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Radar className="h-6 w-6 text-primary" />
          <span>RepoRadar</span>
        </Link>

        <nav className="ml-auto flex items-center gap-4">
          {session ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? "User"} />
                  <AvatarFallback>{session.user?.name?.[0] ?? "U"}</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={() => signIn("github")} size="sm">
              <Github className="mr-2 h-4 w-4" />
              Sign in with GitHub
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
