import { Metadata } from "next";
import ThemeToggle from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Login - Openinary",
  description: "Sign in to your Openinary account",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ThemeToggle hidden />
    </>
  );
}