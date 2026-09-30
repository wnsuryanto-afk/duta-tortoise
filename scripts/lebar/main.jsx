import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import kasus from "../render/kasus.jsx";
import "@/index.css";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });

function Satu({ el }) {
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{el}</MemoryRouter>
    </QueryClientProvider>
  );
}

function App() {
  const [i, setI] = useState(0);
  useEffect(() => { window.__kasus = kasus.map(([n]) => n); window.__i = i; }, [i]);
  window.__pindah = (n) => setI(n);
  const [nama, el] = kasus[i] || ["—", null];
  window.__nama = nama;
  return (
    <div id="bingkai" style={{ width: 360, overflow: "visible" }}>
      {el ? <Satu el={el} /> : null}
    </div>
  );
}
createRoot(document.getElementById("akar")).render(<App />);
