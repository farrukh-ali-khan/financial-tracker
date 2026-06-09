import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initLogger } from "./services/logger";
import { initNotifications } from "./services/notifications";

// Initialize services before render
Promise.all([initLogger(), initNotifications()]).then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
