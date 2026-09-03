---
id: sql-01-agregasi
track: analyst
title: Agregasi Dasar & GROUP BY
estimatedMinutes: 10
runtime: duckdb
packages: []
datasets: [penjualan.parquet]
prerequisites: [sql-00-select]
---

## instruksi
Pada latihan ini, Anda akan melakukan analisis performa penjualan per kategori produk dengan menerapkan fungsi agregasi SQL (`COUNT`, `SUM`, dan `AVG`).

### Kasus Bisnis:
Manajemen ingin mengetahui total pendapatan (*revenue*) dan jumlah unit produk yang terjual untuk masing-masing kategori produk.

### Tugas Anda:
1. Hitung jumlah total unit terjual menggunakan `SUM(jumlah)` dan namai kolom sebagai `total_unit`.
2. Hitung total pendapatan menggunakan `SUM(total_harga)` dan namai kolom sebagai `total_pendapatan`.
3. Hitung rata-rata harga jual per unit menggunakan `AVG(harga_satuan)` dan namai kolom sebagai `avg_harga`.
4. Kelompokkan berdasarkan kolom `kategori` (`GROUP BY kategori`).
5. Urutkan dari kategori dengan total pendapatan tertinggi ke terendah.

## starter
-- Hitung metrik agregasi per kategori
SELECT 
    kategori,
    COUNT(*) AS total_transaksi
FROM penjualan
GROUP BY kategori;

## solusi
SELECT 
    kategori,
    SUM(jumlah) AS total_unit,
    SUM(total_harga) AS total_pendapatan,
    AVG(harga_satuan) AS avg_harga
FROM penjualan
GROUP BY kategori
ORDER BY total_pendapatan DESC;

## checker
SELECT 
    kategori,
    SUM(jumlah) AS total_unit,
    SUM(total_harga) AS total_pendapatan
FROM penjualan
GROUP BY kategori;

## hint-1
Gunakan fungsi `SUM(...)` untuk menjumlahkan metrik kuantitatif dan `AVG(...)` untuk nilai rata-rata.

## hint-2
Tambahkan `GROUP BY kategori` di bawah klausa `FROM` agar fungsi agregasi dihitung per kelompok kategori produk.

## hint-3
Kueri lengkap:
```sql
SELECT 
    kategori,
    SUM(jumlah) AS total_unit,
    SUM(total_harga) AS total_pendapatan,
    AVG(harga_satuan) AS avg_harga
FROM penjualan
GROUP BY kategori
ORDER BY total_pendapatan DESC;
```
