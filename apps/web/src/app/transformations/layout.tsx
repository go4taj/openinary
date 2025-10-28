import { Metadata } from "next";
import AuthShell from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Named Transformations - Openinary",
};

export default function TransformationsLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}