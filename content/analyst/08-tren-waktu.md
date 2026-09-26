---
id: da-08-tren-waktu
track: analyst
title: Tren Omzet Bulanan (Fungsi Tanggal)
level: menengah
estimatedMinutes: 12
language: sql
datasets: [penjualan]
concepts: [strftime, date_trunc, time series, GROUP BY tanggal]
prerequisites: [da-05-group-by]
---

## instruksi
Kolom `tanggal` bertipe `DATE`. Untuk melihat **tren**, tanggal harian perlu "dipadatkan" ke periode yang lebih besar (minggu, bulan, kuartal), lalu dijumlahkan per periode.

| Fungsi DuckDB | Contoh hasil | Keterangan |
|---|---|---|
| `strftime(tanggal, '%Y-%m')` | `'2025-03'` | Format tanggal menjadi teks tahun-bulan |
| `date_trunc('month', tanggal)` | `2025-03-01` | Bulatkan ke awal bulan (tetap bertipe tanggal) |
| `EXTRACT(month FROM tanggal)` | `3` | Ambil angka bulannya saja |
| `dayname(tanggal)` | `'Saturday'` | Nama hari (berguna untuk pola mingguan) |

```visual
jenis: transformasi
judul: Tanggal harian → periode bulanan
data:
  kolom: [tanggal, total_harga]
  baris:
    - [2025-03-02, 245000]
    - [2025-03-15, 1899000]
    - [2025-03-29, 135000]
    - [2025-04-03, 459000]
    - [2025-04-20, 89000]
langkah:
  - operasi: kolom_baru
    nama: bulan
    rumus: "substr(tanggal, 1, 7)"
    kode: "strftime(tanggal, '%Y-%m') AS bulan"
  - operasi: kelompok
    oleh: bulan
    agregasi:
      - {fungsi: count, nama: jumlah_transaksi}
      - {fungsi: sum, kolom: total_harga, nama: omzet}
    kode: GROUP BY bulan ORDER BY bulan
```

### Kasus
Tim perencanaan stok butuh **pola musiman** penjualan 2025: di bulan apa permintaan melonjak, sehingga stok dan kurir harus disiapkan lebih awal?

### Tugas
Dari transaksi berstatus `'Selesai'`, buat tabel per bulan dengan kolom:
1. `bulan` — dengan format `'YYYY-MM'` (gunakan `strftime(tanggal, '%Y-%m')`)
2. `jumlah_transaksi`
3. `omzet` — total `total_harga`

Urutkan dari bulan paling awal. Lalu buka **Grafik** di panel hasil: grafik garis akan menunjukkan trennya.

## starter
```sql
SELECT
    tanggal,
    strftime(tanggal, '%Y-%m') AS bulan,
    total_harga
FROM penjualan
WHERE status = 'Selesai'
LIMIT 10;
```

## solusi
```sql
SELECT
    strftime(tanggal, '%Y-%m') AS bulan,
    COUNT(*)                   AS jumlah_transaksi,
    SUM(total_harga)           AS omzet
FROM penjualan
WHERE status = 'Selesai'
GROUP BY bulan
ORDER BY bulan;
```

## hint-1
Kelompokkan berdasarkan hasil `strftime(tanggal, '%Y-%m')`. Kolom `tanggal` asli tidak boleh ikut di `SELECT` karena tidak dikelompokkan.

## hint-2
Teks `'2025-01'`, `'2025-02'`, … bisa diurutkan dengan `ORDER BY bulan` karena formatnya tahun dulu baru bulan.

## hint-3
```sql
SELECT
    strftime(tanggal, '%Y-%m') AS bulan,
    COUNT(*)         AS jumlah_transaksi,
    SUM(total_harga) AS omzet
FROM penjualan
WHERE status = 'Selesai'
GROUP BY bulan
ORDER BY bulan;
```

## pembahasan
- Ada tiga puncak yang jelas: **Maret** (Ramadan menjelang Lebaran), **Agustus** (musim kembali ke sekolah untuk kategori buku & alat tulis), serta **November–Desember** (promo 11.11, 12.12, dan akhir tahun). **Desember** adalah bulan tertinggi (±Rp50,7 juta).
- **Mei** justru paling sepi (±Rp14 juta) — cocok untuk jadwal promo pendongkrak.
- Format `'%Y-%m'` bisa diurutkan sebagai teks. Format `'%m-%Y'` (`'03-2025'`) tidak — Januari 2026 akan muncul di awal!
- Coba ganti menjadi pola harian per nama hari: `GROUP BY dayname(tanggal)` — apakah akhir pekan lebih ramai?
