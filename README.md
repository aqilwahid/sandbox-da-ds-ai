# Sandbox Data & AI — latihan hands-on di browser

Sandbox kelas untuk **Data Analyst (SQL)**, **Data Science (Python)**, dan **AI Engineering**. Semua berjalan di browser peserta: SQL sungguhan (DuckDB), Python 3.14 + pandas + matplotlib + scikit-learn (Pyodide/WebAssembly), dan simulasi aplikasi LLM tanpa API key. Setiap latihan punya **visual interaktif** yang menunjukkan apa yang terjadi pada data, **tabel & grafik otomatis** dari hasil kode, dan **penilaian otomatis** yang menjelaskan apa yang perlu diperbaiki.

Peserta tidak perlu menginstal apa pun dan tidak perlu akun. Progres tersimpan di browser dan bisa diekspor ke trainer.

## Isi pelatihan

| Track | Bahasa | Latihan | Durasi | Topik |
|---|---|---|---|---|
| Data Analyst | SQL (DuckDB) | 9 | ±2 jam | SELECT, WHERE, ORDER BY/LIMIT, agregat, GROUP BY/HAVING, CASE WHEN, JOIN, tren bulanan, CTE & window function |
| Data Science | Python | 8 | ±2 jam | list/dict/fungsi, DataFrame, boolean mask, data cleaning, groupby, visualisasi, regresi linear, klasifikasi |
| AI Engineering | Python (simulasi) | 8 | ±3 jam | token & biaya, softmax & temperature, prompt terstruktur (few-shot), output JSON, embedding, mini-RAG, evaluasi (golden set), agent dengan tool calling |

Semua dataset fiktif tetapi realistis: toko online TokoKita (penjualan, pelanggan, produk, ulasan, kebijakan), harga rumah Jabodetabek, dan member churn. Kamus data ada di [`content/datasets.yaml`](content/datasets.yaml).

## Fitur utama

- **Visual konsep interaktif** (14 jenis): tabel sebelum → sesudah per langkah, JOIN dengan diagram Venn, alur eksekusi, anatomi kueri/prompt, confusion matrix yang bisa diubah, regresi dengan slider, tokenizer, temperature, ruang embedding, dan lainnya. Tata letaknya menyesuaikan lebar panel.
- **Hasil kode langsung terlihat**: tabel dengan profil kolom, grafik otomatis dari hasil kueri (bisa diganti batang/garis/titik dan dipilih kolomnya), grafik matplotlib, konsol, dan penjelajah variabel.
- **Penilaian yang mendidik**: checklist kriteria, pesan dalam bahasa Indonesia yang menunjuk kesalahannya (kolom salah ketik, urutan belum sesuai, nilai tertukar, dll.), dan penjelasan error Python/SQL dengan baris yang disorot di editor.
- **Hint bertahap → solusi → pembahasan**: pembahasan terbuka setelah lulus atau setelah melihat solusi.
- **Siap kelas**: tema terang untuk proyektor, 3 ukuran huruf, halaman **Cek Kesiapan** perangkat, ekspor progres (CSV untuk rekap trainer, JSON untuk cadangan/pindah perangkat), tampilan tab untuk layar kecil.
- **Hybrid online/offline**: paket Python diambil dari CDN secara default (repo tetap ringan), atau disajikan dari laptop trainer untuk kelas **tanpa internet** — cukup satu perintah.

## Mulai cepat

Butuh **Node.js 20+**.

```bash
npm install        # juga menyalin inti Python (Pyodide) ke public/pyodide
npm run dev        # buka http://localhost:3000
```

Buka **Cek Kesiapan** di menu atas untuk memastikan semua komponen siap.

## Dua cara menjalankan kelas

**A. Online (disarankan jika internet stabil).** Deploy ke Vercel/Netlify/Cloudflare Pages (lihat [Deploy](#deploy)), bagikan URL-nya. Paket Python diunduh dari CDN jsDelivr saat pertama dipakai (±55–60 MB per peserta untuk semua track, termasuk inti Python), lalu tersimpan di browser untuk kunjungan berikutnya dan mode offline.

**B. Jaringan lokal/tanpa internet.** Laptop trainer menjadi server:

```bash
npm run setup:offline   # sekali saja, butuh internet: unduh ±50 MB paket ke public/pyodide
npm run build
npm run serve:lan       # peserta membuka http://<IP-laptop-trainer>:4173
```

Tanpa internet sama sekali? Unduh `pyodide-314.0.6.tar.bz2` dari [rilis Pyodide](https://github.com/pyodide/pyodide/releases), ekstrak, lalu `node scripts/setup-pyodide.mjs --offline --from <folder-hasil-ekstrak>`. Untuk kembali ke mode CDN: `npm run setup:online`.

Panduan lengkap persiapan kelas, alur mengajar, dan troubleshooting: **[docs/PANDUAN-TRAINER.md](docs/PANDUAN-TRAINER.md)**.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan (http://localhost:3000) |
| `npm run dev:lan` | Server pengembangan yang bisa diakses dari jaringan lokal |
| `npm run build` | Validasi konten → type-check → build ke `dist/` |
| `npm run preview` | Menyajikan hasil build (http://localhost:4173) |
| `npm run serve:lan` | Menyajikan hasil build ke jaringan lokal (port 4173) |
| `npm run setup:offline` | Unduh paket Python ke `public/pyodide` untuk mode tanpa internet (`--mirror <url>` / `--from <folder>` opsional) |
| `npm run setup:online` | Hapus paket offline, kembali memakai CDN |
| `npm run validate:content` | Periksa struktur semua latihan dan blok visual |
| `npm run test:content` | Jalankan setiap solusi terhadap checker-nya dan pastikan starter belum lulus (`-- da-03` untuk satu latihan, `-- --verbose` untuk detail) |
| `npm run datasets` | Buat ulang dataset CSV (Python 3, deterministik) |

## Konfigurasi

Salin `.env.example` menjadi `.env`:

| Variabel | Fungsi |
|---|---|
| `VITE_APP_NAME` | Nama aplikasi di header, judul tab, dan saat di-install sebagai aplikasi |
| `VITE_TRAINING_TITLE`, `VITE_ORG_NAME` | Nama pelatihan & penyelenggara, tampil di header dan beranda |
| `BASE_PATH` | Base path jika tidak di root domain (mis. `/sandbox-da-ds-ai/` untuk GitHub Pages) |

## Deploy

Hasil build adalah situs statis (`dist/`). Header `Cross-Origin-Opener-Policy: same-origin` dan `Cross-Origin-Embedder-Policy: require-corp` membuat tombol **Stop** bisa menghentikan kode seketika; tanpa header itu aplikasi tetap berjalan, hanya saja Stop memuat ulang Python (beberapa detik).

| Platform | Cara | Header COOP/COEP |
|---|---|---|
| Vercel | Import repo. Pengaturan sudah ada di `vercel.json` | Ya |
| Netlify | Import repo. Pengaturan di `netlify.toml` + `public/_headers` | Ya |
| Cloudflare Pages | Build command `npm run build`, output `dist`. Header dari `public/_headers` | Ya |
| GitHub Pages | Settings → Pages → Source: GitHub Actions, lalu jalankan workflow **Deploy ke GitHub Pages** | Tidak (fallback otomatis) |

Workflow **CI** (`.github/workflows/ci.yml`) menjalankan validasi, type-check, build, dan uji semua latihan di setiap push.

## Menambah atau mengubah latihan

Setiap latihan adalah satu file Markdown di `content/<track>/` berisi instruksi (boleh memuat blok ```` ```visual ````), starter, solusi, checker, hint, dan pembahasan. Spesifikasi lengkap, 14 jenis visual beserta contohnya, API penilai, dan API simulasi LLM ada di **[docs/PANDUAN-KONTEN.md](docs/PANDUAN-KONTEN.md)**.

Setelah mengedit:

```bash
npm run validate:content
npm run test:content -- <id-latihan>
```

## Struktur proyek

```
content/                 Latihan (Markdown) per track + datasets.yaml (kamus data)
public/datasets/         Dataset CSV
public/pyodide/          Dibuat otomatis: inti Pyodide (+ paket offline setelah setup:offline)
scripts/                 setup-pyodide, validasi & uji konten, generator dataset
src/runtime/             Web Worker Python + sandbox_runtime.py (eksekusi, SQL, penilai)
                         + simulasi_llm.py (LLM tiruan untuk track AI)
src/components/visuals/  Komponen visual konsep
src/components/output/   Panel hasil: tabel, grafik, konsol, variabel, penilaian
src/pages/               Beranda, latihan, progres, cek kesiapan
docs/                    Panduan konten & panduan trainer
```

## Teknologi

React 19, TypeScript, Vite 6, Tailwind CSS, CodeMirror 6, Dexie (IndexedDB), vite-plugin-pwa · Pyodide 314.0.6 (Python 3.14, pandas 3.0, NumPy 2.4, matplotlib 3.10, scikit-learn 1.8, DuckDB 1.5).

## Kebutuhan perangkat peserta

- Browser terbaru. Sudah diuji di **Chrome/Chromium**; Edge (berbasis Chromium) setara. Firefox dan Safari terbaru umumnya bisa, tetapi uji dulu lewat Cek Kesiapan.
- RAM disarankan ≥ 8 GB. Python di browser memakai ±0,5 GB per tab untuk SQL dan hingga ±1 GB saat latihan scikit-learn; di laptop 4 GB, tutup aplikasi lain.
- Layar ≥ 1024 px memakai tata letak tiga panel (bisa diatur lebarnya); layar lebih kecil otomatis memakai tab Instruksi/Kode/Hasil.
