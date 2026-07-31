import { createFileRoute } from "@tanstack/react-router";
import { KaleidoscopeApp } from "@/components/KaleidoscopeApp";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <KaleidoscopeApp />;
}
