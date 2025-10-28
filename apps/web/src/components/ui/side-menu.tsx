"use client";
import { useEffect, useState } from "react";
import { Button } from "./button";
import { TransformationForm } from "./transformation-form";

interface Transformation {
  id: string;
  name: string;
  config: Record<string, any>;
}

interface NavigationItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function NavigationList() {
  return (
    <nav className="flex flex-col gap-2 text-sm">
      {[
        {
          href: "/",
          icon: <span className="w-2 h-2 bg-yellow-400 rounded-full"/>,
          label: "Media Library"
        },
        {
          href: "/transformations",
          icon: <span className="w-2 h-2 bg-blue-400 rounded-full"/>,
          label: "Named Transformations"
        }
      ].map((item) => (
        <a 
          key={item.href} 
          href={item.href} 
          className="flex items-center gap-3 px-2 py-2 hover:bg-accent/10 rounded-sm"
        >
          {item.icon}
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export default function SideMenu({ onSignOut, userEmail }: { onSignOut?: () => void; userEmail?: string | null }) {
  return (
    <aside className="w-56 bg-sidebar text-sidebar-foreground h-screen p-4 flex flex-col">
      <div className="space-y-4">
        <div className="px-2 py-1 text-sm uppercase tracking-wide text-muted-foreground">Digital Asset Management</div>
        <NavigationList />
      </div>

      <div className="mt-auto px-2 pb-4">
        {userEmail && (
          <div className="mb-2 text-sm text-muted-foreground break-words">{userEmail}</div>
        )}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            localStorage.removeItem("token");
            if (onSignOut) onSignOut();
            if (typeof window !== "undefined") window.location.href = "/";
          }}
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
