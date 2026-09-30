import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Site from "./Site";
import "./styles.css";

// Redireccion temporal de la pagina principal al menu Yucatecos.
if (window.location.pathname === "/") {
  window.location.replace(`/yucatecos${window.location.search}${window.location.hash}`);
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Site />
    </StrictMode>,
  );
}
