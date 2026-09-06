import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "./style.css";

createRoot(document.getElementById("root")!).render(<App />);
