// Load only Latin subset for fonts to reduce bundle size
import "@fontsource/fira-code/latin.css";
import "@fontsource/roboto-mono/latin.css";
import "@fontsource/roboto/latin.css";
import spaceGrotesk from "@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2";
import "@fontsource/space-grotesk/latin.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { Helmet, HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import "./fonts.css";
import reportWebVitals from "./reportWebVitals";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <Helmet>
        <link rel="preload" href={spaceGrotesk} as="font" type="font/woff2" crossOrigin="" />
        <script src="https://analytics.ahrefs.com/analytics.js" data-key="trm7GqzX/ZpzFhsBA7bHyA" async></script>
      </Helmet>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
