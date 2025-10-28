"use client";

import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      window.location.href = "/media";
    } else {
      window.location.href = "/login";
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="text-center text-slate-900 dark:text-white">
        Redirecting...
      </div>
    </div>
  );
}
