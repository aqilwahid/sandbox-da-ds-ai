# Panduan Menulis Konten Latihan

Dokumen ini untuk trainer / penulis materi yang ingin **menambah atau mengubah latihan**. Tidak perlu menyentuh kode React — cukup menulis file Markdown.

- [1. Letak & nama file](#1-letak--nama-file)
- [2. Frontmatter](#2-frontmatter)
- [3. Section](#3-section)
- [4. Cara runtime menjalankan kode](#4-cara-runtime-menjalankan-kode)
- [5. Menulis checker (penilai otomatis)](#5-menulis-checker-penilai-otomatis)
- [6. Blok visual konsep](#6-blok-visual-konsep)
- [7. Modul `simulasi_llm` (track AI)](#7-modul-simulasi_llm-track-ai)
- [8. Dataset](#8-dataset)
- [9. Menguji latihan](#9-menguji-latihan)
- [10. Gaya penulisan](#10-gaya-penulisan)

---

## 1. Letak & nama file

```
content/
├── datasets.yaml            ← kamus data semua dataset
├── analyst/                 ← track Data Analyst (SQL)
│   ├── 01-select.md
│   └── 02-where.md
├── datascience/             ← track Data Science (Python)
└── ai/                      ← track AI Engineering (Python + simulasi)
```

- Nama file **wajib** diawali nomor urut: `NN-slug.md`. Nomor menentukan urutan di sidebar dan tidak boleh dobel dalam satu track.
- File lain (mis. `README.md`, `_draft.md`) **diabaikan** oleh aplikasi — aman untuk catatan.

## 2. Frontmatter

```yaml
---
id: da-05-group-by            # unik global: huruf kecil, angka, tanda minus
track: analyst                # analyst | datascience | ai
title: Omzet per Kategori (GROUP BY & HAVING)
level: pemula                 # pemula | menengah | lanjut
estimatedMinutes: 12
language: sql                 # sql | python
datasets: [penjualan]         # nama dataset di content/datasets.yaml
packages: []                  # opsional: paket Pyodide yang dimuat saat latihan dibuka
concepts: [GROUP BY, HAVING]  # chip konsep yang tampil di header latihan
prerequisites: [da-04-agregasi]
timeoutSec: 20                # opsional (default SQL 20, Python 40)
---
```

- `datasets` untuk **SQL** = nama tabel yang dibuat otomatis (`FROM penjualan`). Untuk **Python** = file `<nama>.csv` tersedia di folder kerja (`pd.read_csv("penjualan.csv")`).
- `packages` jarang perlu diisi: `import` di starter/solusi dideteksi dan dimuat otomatis. Isi hanya bila paket dipakai tanpa `import` langsung.

## 3. Section

Setiap section diawali judul level-2 **satu kata** (`## nama`). Karena itu, di dalam `## instruksi` gunakan `###` untuk sub-judul.

| Section | Wajib | Isi |
|---|---|---|
| `## instruksi` | ✅ | Markdown: konsep singkat, blok visual, **Kasus**, **Tugas** (bernomor) |
| `## starter` | ✅ (boleh kosong) | Kode awal di editor. Sebaiknya bisa langsung dijalankan dan menampilkan sesuatu |
| `## solusi` | ✅ | Kode solusi referensi (juga dipakai untuk "Target" & pembanding checker) |
| `## checker` | Python ✅, SQL opsional | Kode Python penilai (lihat bagian 5) |
| `## hint-1`, `## hint-2`, … | disarankan 3 | Bertahap: arah konsep → potongan kode → hampir solusi |
| `## pembahasan` | disarankan | Terbuka setelah lulus/lihat solusi: kenapa begitu, insight bisnis, jebakan umum |

Kode di `starter`, `solusi`, `checker` boleh dibungkus pagar ```` ```sql ```` / ```` ```python ```` (disarankan, agar rapi di GitHub).

## 4. Cara runtime menjalankan kode

Semua kode berjalan **di browser peserta** (Pyodide/WebAssembly di Web Worker). Tidak ada server.

### Python
- Setiap **Jalankan** memakai namespace **baru** (variabel dari run sebelumnya tidak terbawa) → hasil selalu bisa diulang.
- Folder kerja = `/home/pyodide`; dataset di frontmatter tersedia sebagai file, mis. `pd.read_csv("properti.csv")`.
- **Nilai di baris terakhir** (bukan `print`) ditampilkan otomatis di panel **Hasil** — DataFrame jadi tabel interaktif (bisa di-sort, difilter, dan divisualisasikan).
- `tampilkan(obj, "judul")` (alias `display`) menampilkan beberapa DataFrame/list/dict sekaligus.
- Grafik **matplotlib** ditangkap otomatis setelah kode selesai (tidak perlu `plt.show()`). Gaya default sudah rapi (palet aman buta warna, grid tipis).
- Tab **Variabel** menampilkan semua variabel: tipe, ukuran, dan pratinjau.
- Pustaka tersedia: `pandas`, `numpy`, `matplotlib`, `scikit-learn`, `scipy`, `statsmodels`, `duckdb`, + modul bawaan `simulasi_llm` (track AI). **Tidak tersedia**: seaborn, plotly, tensorflow, pytorch, akses internet, `input()`.
- Batas waktu default 40 detik; infinite loop dihentikan otomatis (atau lewat tombol **Stop**).

### SQL
- Mesin: **DuckDB** (dialek mirip PostgreSQL). Tabel dibuat ulang dari CSV setiap kali dijalankan.
- Boleh beberapa pernyataan dipisah `;` — setiap `SELECT` tampil sebagai tabel terpisah; **yang dinilai adalah hasil `SELECT` terakhir**.
- Fungsi berguna: `strftime(tanggal, '%Y-%m')`, `date_trunc('month', tanggal)`, `ROUND(x, 2)`, `COUNT(DISTINCT x)`, window function, `QUALIFY`, CTE `WITH`.

## 5. Menulis checker (penilai otomatis)

Checker adalah kode **Python** yang dijalankan setelah kode peserta berhasil. Setiap pemeriksaan tampil sebagai **checklist** (✅/❌) lengkap dengan pesan perbaikan, jadi tulislah label yang menjelaskan *kriteria*, dan pesan gagal yang *mengarahkan*.

### 5.1 SQL — default sudah otomatis
Jika section `## checker` **dikosongkan/dihapus**, hasil `SELECT` terakhir peserta dibandingkan dengan hasil `## solusi`:

1. Kueri menghasilkan tabel
2. Nama kolom sama (tidak peka huruf besar/kecil; pesan menyarankan alias yang mirip)
3. Jumlah baris sama
4. Nilai sama (toleransi angka 1e-6; urutan baris diabaikan)
5. Urutan baris sama — **hanya jika solusi memakai `ORDER BY` di level teratas**. Nilai kembar (seri) pada kolom `ORDER BY` ditoleransi.

Checker kustom (opsional) dapat memakai:

| Nama | Keterangan |
|---|---|
| `bandingkan_hasil(urut=None, toleransi=1e-6, cek_nama_kolom=True)` | Perbandingan default di atas |
| `hasil` | Hasil terakhir peserta: `.kolom`, `.baris` (list tuple), `.jumlah_baris`, `.kolom_ke("nama")`, `.df()` |
| `kunci` | Hasil solusi (atribut sama dengan `hasil`) |
| `semua_hasil` | List semua hasil `SELECT` peserta |
| `kode` | Teks SQL peserta |
| `cek_kode(pola, label, regex=False)` | Kode memakai kata/pola tertentu, mis. `cek_kode("GROUP BY", "Memakai GROUP BY")` |

```python
bandingkan_hasil()
cek_kode("having", "Memakai HAVING untuk menyaring hasil agregat",
         pesan="Filter setelah GROUP BY ditulis dengan HAVING, bukan WHERE.")
```

> ⚠️ **Hindari hasil yang bergantung pada nilai seri di batas `LIMIT`.** Tambahkan pengurut kedua di instruksi (mis. "jika sama, urutkan `id_transaksi` A–Z").

### 5.2 Python — fungsi penilai
Checker Python melihat **semua variabel peserta** ditambah fungsi berikut:

| Fungsi | Keterangan |
|---|---|
| `check(label, kondisi, pesan=None)` | Kriteria umum (alias `cek`) |
| `wajib_variabel(nama, tipe=None, label=None)` | Variabel harus ada dan tidak `None` (opsional cek tipe, mis. `pd.DataFrame`). Jika gagal, pemeriksaan **berhenti** di sini |
| `bandingkan_variabel(nama, label=None, toleransi=1e-6, urut=True, cek_index=False)` | Bandingkan nilai variabel peserta dengan variabel yang sama di **solusi** (DataFrame, Series, array, list, dict, angka, teks). Cara paling kuat & ringkas. Untuk Series, `urut=False, cek_index=True` mencocokkan per label index tanpa peduli urutan |
| `nilai_solusi(nama)` | Ambil nilai variabel dari solusi untuk perbandingan kustom |
| `cek_kolom(df, [kolom...])` | Kolom ada (dengan saran jika salah ketik) |
| `cek_ukuran(df, baris=None, kolom=None)` | Dimensi DataFrame |
| `cek_tanpa_kosong(df, kolom=None)` | Tidak ada NaN |
| `cek_mendekati(nilai, target, toleransi, label)` | Angka mendekati target (toleransi **absolut**: `abs(nilai - target) <= toleransi`) |
| `cek_minimal(nilai, batas, nama)` | Metrik ≥ batas (mis. akurasi) |
| `cek_output(teks)` | Output `print` mengandung teks |
| `cek_kode(pola, label, regex=False)` | Kode memakai pola tertentu |
| `grafik` | List metadata grafik matplotlib: tiap item `{"title", "axes": [{"title","xlabel","ylabel","lines","bars","patches","collections","images","legend","xticklabels","yticklabels","texts","text_values"}]}`. Catatan: batang histogram juga terhitung di `bars`/`patches` |
| `output`, `kode` | Teks output konsol & kode peserta |
| `report(lulus, pesan)` | Pesan akhir kustom (opsional) |

> **Tentang `toleransi` di `bandingkan_variabel` / `bandingkan_hasil`:** untuk nilai ≤ 1 toleransinya **absolut**, untuk nilai > 1 **relatif** (proporsi dari nilai). Contoh: `toleransi=1e-3` pada nilai 2.600 berarti ±2,6; pada 96,5 berarti ±0,0965. Untuk menerima jawaban yang lupa dibulatkan 1 desimal (selisih maks. 0,05), pilih toleransi ≈ 0,05 ÷ nilai terkecil. Jawaban berupa teks (`"1525"`) atau `True/False` tidak pernah dianggap sama dengan angka.

Contoh:

```python
wajib_variabel("df_bersih", pd.DataFrame)
cek_tanpa_kosong(df_bersih, ["garasi", "harga_juta"])
check("Tidak ada baris duplikat", not df_bersih.duplicated().any(),
      "Gunakan df.drop_duplicates().")
bandingkan_variabel("df_bersih", label="Isi df_bersih sesuai hasil yang diharapkan")
check("Grafik punya judul", len(grafik) > 0 and grafik[0]["axes"][0]["title"] != "",
      "Tambahkan ax.set_title(...) atau plt.title(...).")
```

Catatan versi pustaka (Pyodide 314.0.6):
- **pandas 3.x**: kolom teks bertipe `str` (bukan `object`), dan `df["kol"].fillna(0, inplace=True)` **tidak mengubah** `df` (copy-on-write). Ajarkan bentuk `df["kol"] = df["kol"].fillna(0)`.
- `astype(int)` menghasilkan `int32` di WebAssembly. Di checker gunakan `pd.api.types.is_integer_dtype(...)`, bukan `== "int64"`.

Tips:
- Urutkan pemeriksaan dari yang paling dasar (variabel ada) ke yang paling detail (nilai tepat).
- Uji fungsi peserta dengan input lain (`ringkas([10, 20, 30])`) agar jawaban tidak bisa "ditulis manual".
- Pakai `bandingkan_variabel` untuk nilai yang panjang — pesan perbedaannya sudah jelas.

## 6. Blok visual konsep

Di dalam `## instruksi`, tulis blok kode berbahasa `visual` berisi YAML. Blok ini dirender menjadi **visual interaktif**. Semua visual mendukung `judul:` dan `keterangan:` (opsional).

### 6.1 `anatomi` — potongan kode/teks berlabel
```visual
jenis: anatomi
judul: Anatomi kueri SELECT
bahasa: sql              # sql | python | teks
bagian:
  - teks: "SELECT tanggal, total_harga"
    label: Kolom yang ditampilkan
  - teks: "FROM penjualan"
    label: Tabel sumber
```

### 6.2 `tabel` — tabel mini dengan sorotan
```visual
jenis: tabel
judul: Anatomi DataFrame
kolom: [lokasi, kamar_tidur, harga_juta]
baris:
  - [Depok, 3, 1250]
  - [Bekasi, 2, 890]
tampilkan_index: true    # tampilkan index 0,1,2 di kiri
sorot_kolom: [harga_juta]
sorot_baris: [1]         # indeks baris (mulai 0)
label_kolom: "Satu kolom = Series"
label_baris: "Satu baris = satu rumah"
```

### 6.3 `transformasi` — sebelum → sesudah, langkah demi langkah
Data mini + daftar langkah. Setiap langkah punya `operasi`, `kode` (potongan kode yang ditampilkan), dan `penjelasan` (opsional).
```visual
jenis: transformasi
judul: WHERE lalu ORDER BY
data:
  kolom: [produk, kategori, total]
  baris:
    - [Laptop, Elektronik, 8499000]
    - [Kopi Gayo, Makanan, 89000]
    - [Monitor, Elektronik, 1899000]
langkah:
  - operasi: filter
    kondisi: [{kolom: kategori, op: "=", nilai: Elektronik}]
    kode: "WHERE kategori = 'Elektronik'"
    penjelasan: Baris yang tidak memenuhi syarat dibuang.
  - operasi: urut
    kolom: total
    arah: desc
    kode: ORDER BY total DESC
```

| `operasi` | Parameter |
|---|---|
| `filter` | `kondisi: [{kolom, op, nilai}]`, `gabung: and\|or` (default and). `op`: `=`, `!=`, `>`, `>=`, `<`, `<=`, `in` (nilai list), `like` (pakai `%`), `kosong`, `tidak_kosong` |
| `urut` | `kolom` (teks atau list), `arah: asc\|desc` (atau list) |
| `batasi` | `n` |
| `pilih` | `kolom: [...]` |
| `kolom_baru` | `nama`, `rumus` (ekspresi: nama kolom, angka, `'teks'`, `+ - * / ( )`, perbandingan `< <= > >= == !=`, `and`/`or`, fungsi `round(x, n)`, `abs(x)`, `substr(teks, awal, panjang)`, `upper(x)`, `lower(x)`), **atau** `kasus: [{jika: "total_harga < 100000", maka: Kecil}, {lainnya: Besar}]` untuk aturan bertingkat ala CASE WHEN |
| `kelompok` | `oleh` (kolom atau list), `agregasi: [{fungsi: sum\|count\|avg\|mean\|min\|max\|median, kolom, nama}]` |
| `agregat` | `agregasi: [...]` seperti di atas, tanpa `oleh` (hasil 1 baris) |
| `gabung` | `dengan: {nama, kolom, baris}`, `kunci` (atau `kunci_kiri`/`kunci_kanan`), `tipe: inner\|left` |
| `peringkat` | `partisi` (opsional), `urut`, `arah`, `nama`, `fungsi: row_number\|rank` |
| `isi_kosong` | `kolom`, `nilai` atau `metode: mean\|median` |
| `hapus_kosong` | `kolom: [...]` (opsional) |
| `hapus_duplikat` | `kolom: [...]` (opsional) |

Sel kosong ditulis `null` atau `~`. Teks yang mengandung `:` `#` `[` `{` atau diawali tanda kutip harus dibungkus kutip ganda di YAML.

### 6.4 `join` — jenis JOIN interaktif (Venn + hasil)
```visual
jenis: join
kiri:
  nama: penjualan
  kolom: [id_transaksi, id_pelanggan, total]
  baris: [[T1, P01, 150000], [T2, P02, 89000], [T3, P09, 459000]]
kanan:
  nama: pelanggan
  kolom: [id_pelanggan, segmen]
  baris: [[P01, VIP], [P02, Reguler], [P05, Member]]
kunci: id_pelanggan
awal: inner              # inner | left | right | full
```

### 6.5 `alur` — diagram alur / pipeline (boleh berputar)
```visual
jenis: alur
judul: Urutan eksekusi kueri
langkah:
  - {judul: FROM, isi: Ambil tabel sumber}
  - {judul: WHERE, isi: Saring baris}
  - {judul: GROUP BY, isi: Bentuk kelompok}
  - {judul: SELECT, isi: Hitung & pilih kolom}
  - {judul: ORDER BY, isi: Urutkan hasil}
putaran: false           # true = gambar panah kembali (loop), mis. agent
kembali_ke: 1            # (dengan putaran) indeks langkah tujuan panah balik, mulai 0
```
Klik langkah untuk melihat penjelasan; tombol ▶ memutar animasi langkah demi langkah.

### 6.6 `struktur` — list & dict Python
```visual
jenis: struktur
item:
  - nama: penjualan
    nilai: [4.2, 3.8, 5.1]
    keterangan: list — diakses lewat posisi
  - nama: per_hari
    nilai: {Senin: 4.2, Selasa: 3.8}
```

### 6.7 `pilih-grafik` — memilih jenis grafik
```visual
jenis: pilih-grafik
sorot: [histogram, scatter]   # opsional: batang, garis, histogram, scatter, kotak
```

### 6.8 `regresi` — garis regresi interaktif
```visual
jenis: regresi
x_label: Luas bangunan (m²)
y_label: Harga (juta)
titik: [[36, 610], [54, 890], [70, 1150], [90, 1560], [120, 2100], [150, 2480]]
```
Peserta menggeser kemiringan & intersep, melihat residual dan MSE, lalu menekan "Garis terbaik".

### 6.9 `split-data` — train/test split
```visual
jenis: split-data
n: 40
test_size: 0.25
```

### 6.10 `confusion-matrix` — metrik klasifikasi interaktif
```visual
jenis: confusion-matrix
label_positif: Churn
label_negatif: Tidak churn
urutan: sklearn        # opsional: susunan [[TN, FP], [FN, TP]] seperti scikit-learn (default: TP di kiri atas)
tp: 38
fp: 12
fn: 17
tn: 83
```
Sel bisa diubah dengan tombol −/+; metrik dihitung ulang dan sel yang dipakai disorot saat kursor di atas metrik.

### 6.11 `tokenisasi` — tokenizer interaktif
```visual
jenis: tokenisasi
teks: "Pengiriman paket ini sangat cepat, terima kasih!"
```
Memakai tokenizer yang sama persis dengan `simulasi_llm.tokenisasi`.

### 6.12 `temperature` — softmax & sampling
```visual
jenis: temperature
konteks: "Pengiriman paket ini sangat"
kandidat: [[cepat, 3.2], [lambat, 2.6], [aman, 1.8], [rapi, 1.1], [mahal, 0.6], [biru, -1.4]]
```

### 6.13 `embedding` — ruang vektor & cosine similarity
```visual
jenis: embedding
titik:
  - {teks: "Paket datang terlambat", x: 0.9, y: 0.35, grup: Pengiriman}
  - {teks: "Kurir telat mengantar", x: 0.85, y: 0.45, grup: Pengiriman}
  - {teks: "Bahannya tipis", x: 0.2, y: 0.95, grup: Kualitas}
query: 0                 # indeks titik yang dipilih di awal
```

### 6.14 `perbandingan` — dua kolom (kurang tepat vs lebih baik)
```visual
jenis: perbandingan
bahasa: teks             # teks | sql | python
kiri:
  judul: Prompt kurang jelas
  isi: "Apa sentimen ulasan ini?"
kanan:
  judul: Prompt terstruktur
  isi: |
    Kamu adalah analis CS. Klasifikasikan sentimen
    (positif/negatif/netral). Balas hanya JSON.
```

## 7. Modul `simulasi_llm` (track AI)

LLM **tiruan** yang deterministik — tanpa API key, tanpa biaya, hasil selalu sama. Perilakunya meniru pola LLM asli sehingga konsep bisa diukur. Selalu jelaskan ke peserta bahwa ini simulasi.

```python
from simulasi_llm import (tokenisasi, id_token, hitung_token, estimasi_biaya,
                          kandidat_token_berikutnya, softmax, embedding_semantik,
                          DIMENSI_KONSEP, LLMTiruan)
```

| API | Keterangan |
|---|---|
| `tokenisasi(teks) -> list[str]` | Token sub-kata; spasi depan menempel di token (seperti GPT) |
| `id_token(teks) -> list[int]`, `hitung_token(teks) -> int` | ID & jumlah token |
| `estimasi_biaya(token_in, token_out=0, harga_input_per_1k=15, harga_output_per_1k=60)` | Biaya (Rp, tarif fiktif) |
| `kandidat_token_berikutnya(konteks) -> [(token, logit)]` | Kandidat token berikutnya |
| `softmax(logits, temperature)` | Referensi softmax |
| `embedding_semantik(teks) -> list[float]` | Vektor konsep 16 dimensi (`DIMENSI_KONSEP`), sinonim ("telat"/"terlambat") berdekatan |
| `LLMTiruan().jawab(prompt)` | Respons sensitif terhadap prompt (lihat bawah) |
| `LLMTiruan().klasifikasi_sentimen(teks, mode)` | `mode="zero-shot"` (±66% akurat) atau `"few-shot"` (±89%) |
| `LLMTiruan().langkah_agen(pertanyaan, riwayat, alat)` | Satu langkah agent: `{"aksi": "panggil_alat", "alat", "argumen", "alasan"}` atau `{"aksi": "jawab", "jawaban", "alasan"}` |

Perilaku `jawab(prompt)`:
- **Klasifikasi** (prompt menyebut "sentimen"/"klasifikasi" + berisi `Ulasan: "..."`):
  - Label keluar persis `positif/negatif/netral` hanya jika ketiga label disebut di prompt; jika tidak, jawabannya bebas ("Negatif, pelanggan kecewa").
  - Minta "JSON" → objek JSON `{"sentimen": ...}` (+ `"aspek"` jika kata *aspek* disebut). Jawaban hanya berupa JSON murni bila prompt tegas: "hanya … JSON" (mis. *balas hanya JSON*, *hanya dengan format JSON*), "JSON saja", atau "tanpa teks lain / tanpa penjelasan / tanpa basa-basi". Selain itu, JSON dibungkus basa-basi dan pagar ```` ```json ````.
  - Ada ≥ 2 contoh berlabel → mode few-shot (lebih akurat). Yang dihitung: baris berisi satu label jawaban dan penanda contoh (`Contoh:`, `->`, `→`), atau baris `Sentimen: <label>` di bawah contoh. Baris definisi label (memuat ketiga label) dan baris `Format:` tidak dihitung.
- **RAG** (prompt berisi baris konteks berawalan `[K01]`, `[K02]`, … dan `Pertanyaan: ...`): menjawab dengan kalimat paling relevan dari konteks. Tambahkan `[Kxx]` jika prompt meminta *sumber/kutip*. Jika informasi tidak ada: dengan aturan "hanya berdasarkan konteks / katakan tidak tahu" → menolak dengan sopan; tanpa aturan itu → **berhalusinasi**.
- **Tanpa konteks** untuk pertanyaan kebijakan → jawaban meyakinkan tapi **salah** (halusinasi), berguna untuk membandingkan dengan RAG.

Agent (`langkah_agen`) mengenali niat: stok (`cek_stok(nama_produk)`), ongkir (`hitung_ongkir(kota, berat_gram)`), status pesanan (`cek_status_pesanan(id_transaksi)`), termasuk pertanyaan ganda. Hasil alat sebaiknya berupa dict dengan kunci `stok` / `ongkir` / `status` / `error` agar jawaban akhir tersusun rapi.

## 8. Dataset

- File CSV di `public/datasets/`, didaftarkan di `content/datasets.yaml` (judul, deskripsi, arti tiap kolom — tampil di tab **Data**).
- Dataset bawaan dibuat oleh `python3 scripts/generate_datasets.py` (seed tetap). Jika mengubah generator, jalankan ulang `npm run test:content` karena kunci jawaban bisa berubah.
- Menambah dataset sendiri: taruh CSV di `public/datasets/`, daftarkan di `datasets.yaml`, lalu sebutkan namanya di frontmatter `datasets`.

## 9. Menguji latihan

```bash
npm run validate:content      # cek struktur (juga otomatis saat build)
npm run test:content          # jalankan SOLUSI (harus lulus) & STARTER (tidak boleh lulus) semua latihan
npm run test:content -- da-05 --verbose   # satu latihan, tampilkan detail checklist
```

`test:content` memakai runtime Python yang sama persis dengan browser (Pyodide di Node). Paket diunduh dari CDN sekali lalu di-cache; setelah `npm run setup:offline` paket diambil dari `public/pyodide`.

## 10. Gaya penulisan

- **Satu latihan = satu konsep utama.** Mulai dari *mengapa* (kasus bisnis), baru *bagaimana*.
- Struktur instruksi: paragraf konsep singkat → **blok visual** → `### Kasus` → `### Tugas` bernomor, dengan nama kolom/variabel dalam `backtick`.
- Sebutkan nama variabel/alias yang dinilai **persis** (checker membandingkannya).
- Starter sebaiknya **bisa langsung dijalankan** dan menampilkan sesuatu — peserta belajar dari melihat hasil.
- Hint bertahap: (1) konsep/arah, (2) potongan kode, (3) kerangka hampir lengkap.
- Pembahasan: jelaskan logika solusi, jebakan umum, dan **insight** yang terlihat dari data.
- Bahasa Indonesia yang ramah; istilah teknis tetap dalam bahasa aslinya (`GROUP BY`, `DataFrame`, `token`).
