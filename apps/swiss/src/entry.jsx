import React from "react";
import { createRoot } from "react-dom/client";
import App, { Gate, ErrorBoundary } from "./app.jsx";
createRoot(document.getElementById("root")).render(
  <ErrorBoundary><Gate><App /></Gate></ErrorBoundary>
);
