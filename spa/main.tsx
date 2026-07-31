import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KaleidoscopeApp } from "../src/components/KaleidoscopeApp";
import "../src/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <KaleidoscopeApp />
  </StrictMode>,
);
