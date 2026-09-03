---
id: sql-00-select
track: analyst
title: Dasar Kueri SELECT dan WHERE
estimatedMinutes: 8
runtime: duckdb
packages: []
datasets: [penjualan.parquet]
prerequisites: []
---

## instruksi
Selamat datang di modul **Data Analyst**! Pada latihan pertama ini, kita akan mempelajari dasar pengambilan data menggunakan klausa `SELECT` dan penyaringan baris dengan `WHERE`.

### Kasus Bisnis:
Manajer Penjualan ingin melihat daftar transaksi yang terjadi di kategori **"Elektronik"** dengan nilai penjualan lebih dari **Rp 1.000.000**.

### Tugas Anda:
Tulis kueri SQL untuk:
1. Mengambil kolom `id_transaksi`, `nama_produk`, `kategori`, dan `total_harga` dari tabel `penjualan`.
2. Menyaring hanya baris di mana `kategori = 'Elektronik'` dan `total_harga > 1000000`.
3. Mengurutkan hasil berdasarkan `total_harga` secara menurun (`DESC`).

## starter
-- Tulis kueri SQL Anda di bawah ini
SELECT 
    id_transaksi,
    nama_produk,
    kategori,
    total_harga
FROM penjualan
WHERE 1 = 1;

## solusi
SELECT 
    id_transaksi,
    nama_produk,
    kategori,
    total_harga
FROM penjualan
WHERE kategori = 'Elektronik' 
  AND total_harga > 1000000
ORDER BY total_harga DESC;

## checker
-- Grader logic
SELECT COUNT(*) FROM results WHERE kategori = 'Elektronik' AND total_harga > 1000000;

## hint-1
Gunakan kombinasi `AND` pada klausa `WHERE` untuk menggabungkan dua kondisi penyaringan.

## hint-2
Pastikan nama kategori diapit tanda petik tunggal: `'Elektronik'`, dan bandingkan nilai angka tanpa titik atau koma (misal: `1000000`).

## hint-3
Gunakan struktur berikut:
```sql
SELECT id_transaksi, nama_produk, kategori, total_harga
FROM penjualan
WHERE kategori = 'Elektronik' AND total_harga > 1000000
ORDER BY total_harga DESC;
```
