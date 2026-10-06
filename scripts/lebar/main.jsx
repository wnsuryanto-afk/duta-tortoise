import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import kasus from "../render/kasus.jsx";
import "@/index.css";

/*
 * Query DINYALAKAN di sini, berbeda dari harness renderToString.
 *
 * Dengan `enabled: false`, useCurrentUser() tidak pernah memuat siapa pun,
 * sehingga setiap layar pengelolaan jatuh ke <AccessDenied /> dan yang
 * terukur cuma kartu itu. Stub base44 tidak menyentuh jaringan dan menjawab
 * daftar kosong seketika, jadi menyalakannya tidak membuat pengujian lambat
 * maupun bergantung pada data sungguhan.
 */
const qc = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
});

/*
 * Batas galat — sebab penjaga ini pernah hijau untuk 110 dari 123 kasus.
 *
 * Kasus ke-13 ("KeeperDashboard tanpa data") melempar galat setelah query
 * selesai. Tanpa batas galat, React 18 MELEPAS SELURUH AKAR: `#bingkai`
 * lenyap dari DOM, `ukur()` mengembalikan daftar kosong karena tidak
 * menemukan bingkainya, dan 110 kasus sesudahnya dilaporkan "tidak ada
 * tulisan terpotong" tanpa pernah sekali pun digambar.
 *
 * Satu kasus yang pecah tidak boleh membungkam seratus kasus lain. Batas ini
 * menangkapnya, mencatat namanya di `window.__rusak` supaya penjaga bisa
 * mengatakannya apa adanya, dan membiarkan kasus berikutnya tetap terukur.
 *
 * `key` pada pemakainya yang mengatur penyetelan ulang: ganti kasus berarti
 * batas baru, jadi galat satu kasus tidak menempel ke kasus sesudahnya.
 */
class Batas extends React.Component {
  constructor(props) {
    super(props);
    this.state = { galat: null };
  }
  static getDerivedStateFromError(e) {
    return { galat: e?.message || String(e) };
  }
  componentDidCatch(e) {
    window.__rusak = window.__rusak || {};
    window.__rusak[this.props.nama] = e?.message || String(e);
  }
  render() {
    if (this.state.galat) {
      return <div data-rusak="1">Kasus ini melempar galat: {this.state.galat}</div>;
    }
    return this.props.children;
  }
}

function Satu({ el, nama }) {
  return (
    <Batas nama={nama}>
      <QueryClientProvider client={qc}>
        <MemoryRouter>{el}</MemoryRouter>
      </QueryClientProvider>
    </Batas>
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
      {el ? <Satu key={i} el={el} nama={nama} /> : null}
    </div>
  );
}
createRoot(document.getElementById("akar")).render(<App />);
