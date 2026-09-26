---
id: da-04-agregasi
track: analyst
title: Ringkasan KPI dengan Fungsi Agregat
level: pemula
estimatedMinutes: 12
language: sql
datasets: [penjualan]
concepts: [COUNT, SUM, AVG, MAX, COUNT DISTINCT, ROUND]
prerequisites: [da-03-order-limit]
---

## instruksi
**Fungsi agregat** meringkas banyak baris menjadi satu angka. Inilah bahan utama **KPI** (*Key Performance Indicator*) di dashboard.

```visual
jenis: transformasi
judul: Banyak baris → satu baris ringkasan
data:
  kolom: [id_transaksi, id_pelanggan, total_harga]
  baris:
    - [T00201, P012, 459000]
    - [T00202, P044, 89000]
    - [T00203, P012, 1899000]
    - [T00204, P087, 245000]
langkah:
  - operasi: agregat
    agregasi:
      - {fungsi: count, nama: jumlah_transaksi}
      - {fungsi: sum, kolom: total_harga, nama: total_omzet}
      - {fungsi: avg, kolom: total_harga, nama: rata_rata}
      - {fungsi: max, kolom: total_harga, nama: terbesar}
    kode: "SELECT COUNT(*), SUM(total_harga), AVG(total_harga), MAX(total_harga) FROM ..."
    penjelasan: Empat baris diringkas menjadi satu baris berisi empat angka.
```

| Fungsi | Arti |
|---|---|
| `COUNT(*)` | banyaknya baris |
| `COUNT(DISTINCT kolom)` | banyaknya nilai **unik** (mis. pelanggan berbeda) |
| `SUM(kolom)` / `AVG(kolom)` | jumlah / rata-rata |
| `MIN(kolom)` / `MAX(kolom)` | terkecil / terbesar |
| `ROUND(x, n)` | bulatkan ke `n` desimal (`ROUND(x)` = tanpa desimal) |

Beri nama setiap hasil dengan **alias** `AS nama_kolom` agar mudah dibaca.

### Kasus
Direktur meminta **ringkasan kinerja TokoKita 2025** untuk slide rapat tahunan. Hanya transaksi berstatus `'Selesai'` yang dihitung.

### Tugas
Buat satu baris hasil dengan kolom (alias) berikut:
1. `jumlah_transaksi` — banyaknya transaksi
2. `total_omzet` — total `total_harga`
3. `rata_rata_transaksi` — rata-rata `total_harga`, **dibulatkan tanpa desimal**
4. `transaksi_terbesar` — `total_harga` tertinggi
5. `jumlah_pelanggan` — banyaknya **pelanggan unik** yang bertransaksi

## starter
```sql
SELECT
    COUNT(*) AS jumlah_transaksi
FROM penjualan
WHERE status = 'Selesai';
```

## solusi
```sql
SELECT
    COUNT(*)                     AS jumlah_transaksi,
    SUM(total_harga)             AS total_omzet,
    ROUND(AVG(total_harga))      AS rata_rata_transaksi,
    MAX(total_harga)             AS transaksi_terbesar,
    COUNT(DISTINCT id_pelanggan) AS jumlah_pelanggan
FROM penjualan
WHERE status = 'Selesai';
```

## hint-1
Setiap KPI adalah satu ekspresi di `SELECT`, dipisahkan koma, masing-masing dengan `AS nama_alias`.

## hint-2
Pelanggan unik dihitung dengan `COUNT(DISTINCT id_pelanggan)`. Rata-rata tanpa desimal: `ROUND(AVG(total_harga))`.

## hint-3
```sql
SELECT
    COUNT(*)                     AS jumlah_transaksi,
    SUM(total_harga)             AS total_omzet,
    ROUND(AVG(...))              AS rata_rata_transaksi,
    MAX(...)                     AS transaksi_terbesar,
    COUNT(DISTINCT ...)          AS jumlah_pelanggan
FROM penjualan
WHERE status = 'Selesai';
```

## pembahasan
- Hasil satu baris ini ditampilkan sebagai **kartu KPI** — begitulah angka ringkasan biasa muncul di dashboard.
- **770 transaksi** dari **108 pelanggan** menghasilkan omzet **±Rp336 juta**; rata-rata nilai transaksi (*Average Order Value*) sekitar **Rp436 ribu**.
- `COUNT(*)` menghitung baris, `COUNT(DISTINCT id_pelanggan)` menghitung orang. Rata-rata transaksi per pelanggan = 770 ÷ 108 ≈ 7 kali setahun.
- `AVG` mudah terpengaruh nilai ekstrem (laptop Rp8,5 juta). Di track Data Science kamu akan membandingkannya dengan **median**.
