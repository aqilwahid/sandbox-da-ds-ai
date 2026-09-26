---
id: da-09-window-function
track: analyst
title: Top 3 Produk per Kategori (CTE & Window Function)
level: lanjut
estimatedMinutes: 18
language: sql
datasets: [penjualan]
concepts: [WITH (CTE), RANK, OVER, PARTITION BY]
prerequisites: [da-05-group-by, da-08-tren-waktu]
---

## instruksi
Pertanyaan "**Top-N per kelompok**" (3 produk terlaris *di setiap kategori*) tidak bisa dijawab dengan `ORDER BY ... LIMIT` biasa, karena `LIMIT` memotong seluruh hasil — bukan per kategori. Solusinya **window function**.

`RANK() OVER (PARTITION BY kategori ORDER BY omzet DESC)` memberi nomor peringkat **di dalam setiap kategori**, tanpa meringkas baris seperti `GROUP BY`:

```visual
jenis: transformasi
judul: Peringkat di dalam setiap partisi
data:
  kolom: [kategori, nama_produk, omzet]
  baris:
    - [Elektronik, Laptop 14 inci Core i5, 50144100]
    - [Fashion, Sepatu Lari, 20683900]
    - [Elektronik, Monitor 24 inci, 31808250]
    - [Fashion, Gamis Katun, 11478250]
    - [Elektronik, Smartphone 128 GB, 37443650]
    - [Fashion, Tas Ransel Kerja, 14096250]
    - [Elektronik, Speaker Portabel, 16467550]
langkah:
  - operasi: peringkat
    partisi: kategori
    urut: omzet
    arah: desc
    nama: peringkat
    fungsi: rank
    kode: "RANK() OVER (PARTITION BY kategori ORDER BY omzet DESC) AS peringkat"
    penjelasan: Nomor peringkat dimulai ulang dari 1 di setiap kategori.
  - operasi: filter
    kondisi: [{kolom: peringkat, op: "<=", nilai: 2}]
    kode: WHERE peringkat <= 2
```

Kueri yang bertahap lebih mudah dibaca dengan **CTE** (`WITH nama AS (...)`) — seperti membuat tabel sementara bernama:

```visual
jenis: alur
judul: Tiga tahap kueri
langkah:
  - {judul: "CTE omzet_produk", isi: "GROUP BY kategori, nama_produk → omzet tiap produk"}
  - {judul: "CTE berperingkat", isi: "RANK() OVER (PARTITION BY kategori ...) → peringkat di dalam kategori"}
  - {judul: "SELECT akhir", isi: "WHERE peringkat <= 3 → ambil 3 teratas per kategori"}
```

### Kasus
Setiap *category manager* ingin tahu **3 produk dengan omzet tertinggi** di kategorinya untuk dipajang di halaman depan.

### Tugas
Dari transaksi berstatus `'Selesai'`:
1. Hitung `omzet` (total `total_harga`) per `kategori` dan `nama_produk`.
2. Beri `peringkat` di dalam setiap kategori berdasarkan omzet tertinggi, memakai `RANK()`.
3. Tampilkan hanya peringkat **1 sampai 3**, dengan kolom `kategori`, `peringkat`, `nama_produk`, `omzet`.
4. Urutkan berdasarkan `kategori` lalu `peringkat`.

## starter
```sql
WITH omzet_produk AS (
    SELECT kategori, nama_produk, SUM(total_harga) AS omzet
    FROM penjualan
    WHERE status = 'Selesai'
    GROUP BY kategori, nama_produk
)
SELECT *
FROM omzet_produk
ORDER BY kategori, omzet DESC;
```

## solusi
```sql
WITH omzet_produk AS (
    SELECT kategori, nama_produk, SUM(total_harga) AS omzet
    FROM penjualan
    WHERE status = 'Selesai'
    GROUP BY kategori, nama_produk
),
berperingkat AS (
    SELECT
        kategori,
        nama_produk,
        omzet,
        RANK() OVER (PARTITION BY kategori ORDER BY omzet DESC) AS peringkat
    FROM omzet_produk
)
SELECT kategori, peringkat, nama_produk, omzet
FROM berperingkat
WHERE peringkat <= 3
ORDER BY kategori, peringkat;
```

## checker
```python
bandingkan_hasil()
cek_kode(r"over\s*\(\s*partition\s+by", "Memakai window function dengan PARTITION BY", regex=True,
         pesan="Gunakan RANK() OVER (PARTITION BY kategori ORDER BY omzet DESC).")
```

## hint-1
Starter sudah menghitung omzet per produk. Tambahkan CTE kedua (dipisah koma setelah tanda kurung tutup CTE pertama) yang menambahkan kolom `RANK() OVER (...)`.

## hint-2
Kolom peringkat **tidak bisa** langsung disaring dengan `WHERE` di `SELECT` yang sama tempat ia dibuat — karena itu perlu CTE kedua, lalu `WHERE peringkat <= 3` di `SELECT` terakhir. (Alternatif khusus DuckDB: `QUALIFY peringkat <= 3`.)

## hint-3
```sql
berperingkat AS (
    SELECT kategori, nama_produk, omzet,
           RANK() OVER (PARTITION BY kategori ORDER BY omzet DESC) AS peringkat
    FROM omzet_produk
)
SELECT kategori, peringkat, nama_produk, omzet
FROM berperingkat
WHERE peringkat <= 3
ORDER BY kategori, peringkat;
```

## pembahasan
- `GROUP BY` **meringkas** baris; window function **mempertahankan** setiap baris sambil menambahkan hasil hitungan atas "jendela" baris lain (di sini: produk lain dalam kategori yang sama).
- `RANK()` memberi peringkat sama untuk nilai seri (1, 2, 2, 4); `ROW_NUMBER()` selalu unik (1, 2, 3, 4); `DENSE_RANK()` tanpa loncatan (1, 2, 2, 3). Pilih sesuai kebutuhan bisnis.
- Window function lain yang sering dipakai analis: `SUM(omzet) OVER (ORDER BY bulan)` untuk **total berjalan**, dan `LAG(omzet) OVER (ORDER BY bulan)` untuk **pertumbuhan bulan ke bulan**.
- Hasil ini bisa langsung menjadi bahan rekomendasi: Laptop, Smartphone, dan Monitor mendominasi Elektronik; di Makanan & Minuman, Kurma Premium unggul jauh (dampak Ramadan).
