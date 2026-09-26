# Panduan Trainer

Panduan ini untuk trainer yang memakai sandbox di kelas: persiapan, alur mengajar, rekap progres, dan penanganan masalah. Untuk menulis atau mengubah latihan, lihat [PANDUAN-KONTEN.md](PANDUAN-KONTEN.md).

## 1. Pilih mode kelas

| | Mode A — Online | Mode B — Jaringan lokal (LAN) |
|---|---|---|
| Kapan | Internet kelas stabil | Internet lemah/terbatas, atau kelas tanpa internet |
| Server | URL hasil deploy (Vercel/Netlify/Cloudflare Pages) | Laptop trainer |
| Unduhan per peserta | ±55–60 MB dari CDN (sekali, lalu tersimpan di browser) | Sama, tetapi dari laptop trainer lewat Wi-Fi/LAN |
| Mode offline di browser | Aktif (HTTPS) | Tidak aktif karena alamatnya `http://IP` — tidak masalah selama laptop trainer menyala |
| Tombol Stop | Seketika | Memuat ulang Python (beberapa detik) |

Untuk 25 peserta, mode A berarti ±1,5 GB lewat internet kelas di awal sesi. Jika bandwidth terbatas, pakai mode B atau minta peserta membuka **Cek Kesiapan** sehari sebelumnya dari rumah (paket tersimpan di browser mereka).

## 2. Persiapan (H-1)

### Mode A — Online
1. Deploy repo (lihat README → Deploy) dan buka URL-nya di browser.
2. Buka **Cek Kesiapan** → **Mulai pemeriksaan**. Semua baris harus hijau, termasuk *Mode offline*.
3. Kerjakan satu latihan per track sampai lulus untuk memastikan semuanya berjalan.
4. Siapkan pesan untuk peserta: URL + "buka Cek Kesiapan dan tunggu sampai semua hijau".

### Mode B — Laptop trainer sebagai server
1. Di laptop trainer (Node.js 20+), dengan internet:
   ```bash
   npm install
   npm run setup:offline      # unduh ±50 MB paket Python ke public/pyodide
   npm run build
   ```
   Tanpa internet: unduh `pyodide-314.0.6.tar.bz2` dari https://github.com/pyodide/pyodide/releases lebih dulu, ekstrak, lalu `node scripts/setup-pyodide.mjs --offline --from <folder>`.
2. Saat kelas: `npm run serve:lan`.
3. Cari IP laptop: Windows `ipconfig` (IPv4 Address), macOS `ipconfig getifaddr en0`, Linux `hostname -I`.
4. Peserta membuka `http://<IP>:4173`. Jika tidak bisa diakses, izinkan Node.js/port 4173 di firewall laptop dan pastikan semua perangkat di jaringan Wi-Fi yang sama (Wi-Fi tamu sering memblokir koneksi antarperangkat).
5. Uji dari satu perangkat lain: buka **Cek Kesiapan** — baris *Mesin Python* harus menyebut sumber paket "server lokal (offline)".

### Nama pelatihan di layar
Buat file `.env` (salin dari `.env.example`) sebelum `npm run build`, misalnya:
```
VITE_TRAINING_TITLE="Pelatihan Data Analyst — Batch 12"
VITE_ORG_NAME="Inixindo Jogja"
```

## 3. Di awal kelas (10 menit)

1. Peserta membuka URL/alamat server dengan Chrome atau Edge terbaru.
2. Minta peserta mengisi **nama** di halaman **Progres** (dipakai di file ekspor).
3. Minta peserta menjalankan **Cek Kesiapan**. Sambil menunggu (pertama kali ±30–60 detik), jelaskan tata letak layar:
   - **kiri**: daftar latihan per track (DA · DS · AI) — lingkaran hijau = lulus;
   - **tengah**: instruksi, visual interaktif, tab *Data* (kolom & contoh isi dataset), *Target* (hasil yang diharapkan, khusus SQL), dan *Pembahasan*;
   - **kanan atas**: editor kode — **Ctrl+Enter** untuk menjalankan;
   - **kanan bawah**: *Hasil* (tabel/grafik), *Grafik*, *Konsol*, *Variabel*, dan *Penilaian*.
4. Tampilan proyektor: tombol **T A** di kanan atas mengganti ukuran huruf (3 tingkat), tombol matahari/bulan mengganti tema — tema terang biasanya lebih terbaca di proyektor. Garis pembatas panel bisa diseret (atau difokuskan lalu digeser dengan tombol panah; klik ganda untuk ukuran awal).

## 4. Alur satu latihan (pola yang disarankan)

1. **Konsep (3–5 menit, trainer).** Tampilkan visual di instruksi dan mainkan: tombol **Putar** untuk visual langkah demi langkah, ganti jenis JOIN, geser slider regresi, ubah angka confusion matrix, klik titik embedding. Visual menunjukkan *apa yang terjadi pada data* sebelum peserta menulis kode.
2. **Kerjakan (peserta).** Bagian **Kasus** memberi konteks bisnis, **Tugas** berisi langkah bernomor. Editor sudah berisi starter dengan tanda `TODO`.
3. **Jalankan & baca umpan balik.** Setiap kali dijalankan, kode dinilai otomatis. Tab *Penilaian* berisi checklist; pesan di kriteria yang gagal menjelaskan apa yang perlu diperbaiki. Error Python/SQL diterjemahkan ke bahasa Indonesia dan barisnya disorot di editor.
4. **Macet?** Tombol **Hint** membuka petunjuk bertahap (konsep → potongan kode → kerangka). **Solusi** ada di belakang konfirmasi dan tercatat sebagai "solusi dilihat" di progres.
5. **Pembahasan.** Setelah lulus (atau setelah melihat solusi), tab *Pembahasan* terbuka: interpretasi hasil, jebakan umum, dan tantangan tambahan — bahan diskusi kelas yang baik.

Tips mengajar:
- Untuk SQL, tab **Target** menampilkan tabel hasil yang diharapkan — minta peserta membandingkannya dengan hasil mereka.
- Hasil kueri bisa dilihat sebagai **grafik** (tombol *Grafik* di tabel hasil). Ajak peserta menebak bentuk grafik sebelum menekan tombol.
- Kode peserta tersimpan otomatis per latihan. Tombol **Reset** mengembalikan starter.
- Track AI memakai **LLM tiruan** yang deterministik (tanpa API key) agar hasil semua peserta sama dan bisa didiskusikan bersama. Bagian "Catatan simulasi" di tiap latihan menjelaskan bedanya dengan LLM asli.

## 5. Rekap progres

Semua progres tersimpan di **browser perangkat peserta** (bukan di server).

- **Ekspor CSV (rekap trainer)** di halaman Progres: satu baris per latihan — status, kriteria terakhir, jumlah percobaan, hint dipakai, solusi dilihat, waktu terakhir. Minta peserta mengirim file ini di akhir sesi, lalu gabungkan di spreadsheet.
- **Ekspor JSON (cadangan)**: untuk pindah perangkat/browser atau berjaga-jaga sebelum data browser dibersihkan. **Impor JSON** memulihkannya.
- Mode penyamaran (incognito) menghapus progres saat jendela ditutup — minta peserta memakai jendela biasa.

## 6. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| "Memuat Python…" lama sekali saat pertama | Normal untuk unduhan pertama (±15 MB inti + paket per latihan). Berikutnya jauh lebih cepat. Jalankan Cek Kesiapan lebih awal. |
| Paket gagal dimuat / Cek Kesiapan merah di *Pustaka* | Internet terputus atau `cdn.jsdelivr.net` diblokir jaringan kantor. Minta IT membuka domain itu, atau pakai mode B (LAN). |
| Kode tidak berhenti (loop tak berujung) | Tekan **Stop**. Jika kode tidak berhenti dalam ±3 detik, Python dimuat ulang otomatis; kode di editor tidak hilang. |
| Hasil lama/aneh setelah banyak percobaan | Tekan **Reset** untuk kembali ke starter, atau muat ulang halaman. Variabel dibuat ulang setiap kali kode dijalankan. |
| Laptop peserta lambat atau tab crash | Python + scikit-learn memakai hingga ±1 GB RAM per tab. Tutup tab/aplikasi lain; jangan membuka sandbox di banyak tab sekaligus. |
| Peserta di LAN tidak bisa membuka `http://IP:4173` | Firewall laptop trainer memblokir port 4173, atau perangkat berada di jaringan berbeda/Wi-Fi tamu. |
| Setelah update aplikasi, tampilan masih versi lama | Aplikasi memperbarui diri otomatis saat dibuka ulang. Jika belum, muat ulang halaman sekali lagi. |
| Progres hilang | Data browser dibersihkan, mode incognito, atau ganti browser/perangkat. Impor dari file JSON cadangan. |
| Tampilan terpotong di layar kecil | Di bawah 1024 px otomatis memakai tab Instruksi/Kode/Hasil. Perkecil ukuran huruf (T A) atau lebar panel. |

## 7. Setelah kelas

- Kumpulkan file CSV progres.
- Latihan bisa diperbaiki atau ditambah lewat file Markdown di `content/` (lihat PANDUAN-KONTEN.md), lalu jalankan `npm run validate:content` dan `npm run test:content` sebelum build ulang.
