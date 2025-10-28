import { Metadata } from "next";
import AuthShell from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Media Library - Openinary",
};

export default function MediaLibraryLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}