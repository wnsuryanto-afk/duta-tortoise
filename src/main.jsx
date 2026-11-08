import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { pasangIsyaratTampil } from '@/lib/isyaratTampil'

/*
  Memberi tahu pembungkus preview bahwa aplikasi sudah tampil.

  Alasannya panjang dan ada di lib/isyaratTampil.js. Ringkasnya: pil
  "Loading preview" menunggu pesan yang, pada aplikasi hasil build, tidak
  pernah terkirim oleh skrip bawaan Base44 karena syaratnya atribut yang
  hanya ada saat kode diproses untuk editor.

  Dipasang SEBELUM render: pelapornya menunggu akar React terisi, jadi
  urutannya tidak masalah, dan memasangnya duluan berarti tidak ada
  kemungkinan isyarat pertama terlewat.
*/
pasangIsyaratTampil()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
