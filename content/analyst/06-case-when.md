---
id: da-06-case-when
track: analyst
title: Segmentasi dengan CASE WHEN
level: menengah
estimatedMinutes: 12
language: sql
datasets: [penjualan]
concepts: [CASE WHEN, kolom turunan, GROUP BY]
prerequisites: [da-05-group-by]
---

## instruksi
`CASE WHEN` membuat **kolom baru berdasarkan aturan** — seperti rumus `IF` di spreadsheet. Sangat berguna untuk membuat **segmen** atau kategori bisnis sendiri.

```visual
jenis: anatomi
judul: Anatomi CASE WHEN
bahasa: sql
bagian:
  - teks: "CASE"
    label: Mulai aturan
  - teks: "  WHEN total_harga < 100000  THEN 'Kecil'"
    label: Diperiksa pertama — jika benar, berhenti di sini
  - teks: "  WHEN total_harga < 1000000 THEN 'Sedang'"
    label: Diperiksa jika syarat sebelumnya salah
  - teks: "  ELSE 'Besar'"
    label: Jika tidak ada yang cocok
  - teks: "END AS segmen_nilai"
    label: Tutup dan beri nama kolom
```

Aturan dibaca **dari atas ke bawah**; baris berhenti di `WHEN` pertama yang benar. Karena itu `WHEN total_harga < 1000000` otomatis berarti "100 ribu sampai di bawah 1 juta".

```visual
jenis: transformasi
judul: Kolom baru dari aturan, lalu dikelompokkan
data:
  kolom: [id_transaksi, total_harga]
  baris:
    - [T00301, 45000]
    - [T00302, 459000]
    - [T00303, 8499000]
    - [T00304, 89000]
    - [T00305, 1899000]
    - [T00306, 245000]
langkah:
  - operasi: kolom_baru
    nama: segmen_nilai
    rumus: "total_harga"
    kasus:
      - {jika: "total_harga < 100000", maka: Kecil}
      - {jika: "total_harga < 1000000", maka: Sedang}
      - {lainnya: Besar}
    kode: "CASE WHEN ... THEN 'Kecil' WHEN ... THEN 'Sedang' ELSE 'Besar' END"
  - operasi: kelompok
    oleh: segmen_nilai
    agregasi:
      - {fungsi: count, nama: jumlah_transaksi}
      - {fungsi: sum, kolom: total_harga, nama: omzet}
    kode: GROUP BY segmen_nilai
```

### Kasus
Tim keuangan ingin tahu: omzet TokoKita sebenarnya ditopang oleh banyak transaksi kecil, atau oleh sedikit transaksi besar?

### Tugas
Dari transaksi berstatus `'Selesai'`:
1. Buat kolom `segmen_nilai` dengan aturan: `'Kecil'` jika `total_harga` < 100.000; `'Sedang'` jika < 1.000.000; selain itu `'Besar'`.
2. Kelompokkan per `segmen_nilai` dan hitung `jumlah_transaksi` serta `omzet` (total `total_harga`).
3. Urutkan dari `omzet` terbesar.

## starter
```sql
SELECT
    id_transaksi,
    total_harga,
    CASE
        WHEN total_harga < 100000 THEN 'Kecil'
        ELSE 'Lainnya'
    END AS segmen_nilai
FROM penjualan
WHERE status = 'Selesai'
LIMIT 10;
```

## solusi
```sql
SELECT
    CASE
        WHEN total_harga < 100000  THEN 'Kecil'
        WHEN total_harga < 1000000 THEN 'Sedang'
        ELSE 'Besar'
    END              AS segmen_nilai,
    COUNT(*)         AS jumlah_transaksi,
    SUM(total_harga) AS omzet
FROM penjualan
WHERE status = 'Selesai'
GROUP BY segmen_nilai
ORDER BY omzet DESC;
```

## hint-1
Lengkapi dulu aturannya: tambahkan `WHEN total_harga < 1000000 THEN 'Sedang'` dan ubah `ELSE` menjadi `'Besar'`. Jalankan untuk mengecek labelnya.

## hint-2
Setelah label benar, hapus kolom `id_transaksi` & `total_harga` dari `SELECT`, tambahkan `COUNT(*)` dan `SUM(total_harga)`, lalu `GROUP BY segmen_nilai` (DuckDB boleh mengelompokkan dengan nama alias). Jangan lupa hapus `LIMIT`.

## hint-3
```sql
SELECT
    CASE ... END AS segmen_nilai,
    COUNT(*)         AS jumlah_transaksi,
    SUM(total_harga) AS omzet
FROM penjualan
WHERE status = 'Selesai'
GROUP BY segmen_nilai
ORDER BY omzet DESC;
```

## pembahasan
- Hanya **59 transaksi "Besar"** (±8% dari semua transaksi) menyumbang **±Rp153 juta — hampir separuh omzet**. Sebaliknya 227 transaksi "Kecil" hanya ±Rp14 juta. Pola "sedikit menyumbang banyak" ini dikenal sebagai **prinsip Pareto (80/20)**.
- Implikasi bisnis: menjaga pembeli barang mahal (garansi, cicilan, layanan prioritas) berdampak besar pada omzet.
- Urutan `WHEN` penting! Jika `WHEN total_harga < 1000000` ditulis lebih dulu, transaksi Rp45.000 akan berlabel "Sedang" karena syarat pertama sudah benar.
- **Tantangan:** tambahkan kolom persentase omzet dengan subkueri: `ROUND(100.0 * SUM(total_harga) / (SELECT SUM(total_harga) FROM penjualan WHERE status = 'Selesai'), 1) AS persen_omzet`.
