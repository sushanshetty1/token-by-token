import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { AppHeader } from "@/components/shell/AppHeader";
import { MotionProvider } from "@/components/shell/MotionProvider";
import { themeScript } from "@/components/shell/ThemeToggle";

export const metadata: Metadata = {
  title: {
    default: "Token by Token: build an LLM from scratch in 7 days",
    template: "%s | Token by Token",
  },
  description:
    "Animated, step-by-step lessons that show what happens inside a large language model, paired with Karpathy's build-it-yourself videos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <MotionProvider>
          <AppHeader />
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
