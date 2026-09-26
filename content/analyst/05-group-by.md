---
id: da-05-group-by
track: analyst
title: Omzet per Kategori (GROUP BY & HAVING)
level: pemula
estimatedMinutes: 15
language: sql
datasets: [penjualan]
concepts: [GROUP BY, HAVING, split-apply-combine]
prerequisites: [da-04-agregasi]
---

## instruksi
`GROUP BY` memecah tabel menjadi **kelompok** berdasarkan nilai kolom, lalu fungsi agregat dihitung **per kelompok**. Pola ini disebut *split → apply → combine*.

```visual
jenis: transformasi
judul: Split → apply → combine
data:
  kolom: [kategori, nama_produk, total_harga]
  baris:
    - [Elektronik, Headset Bluetooth, 459000]
    - [Fashion, Sepatu Lari, 529000]
    - [Elektronik, Mouse Nirkabel, 149000]
    - [Fashion, Kaos Polos Premium, 158000]
    - [Elektronik, Power Bank 10.000 mAh, 229000]
    - [Makanan & Minuman, Madu Hutan 500 ml, 115000]
langkah:
  - operasi: kelompok
    oleh: kategori
    agregasi:
      - {fungsi: count, nama: jumlah_transaksi}
      - {fungsi: sum, kolom: total_harga, nama: omzet}
    kode: "SELECT kategori, COUNT(*), SUM(total_harga) FROM ... GROUP BY kategori"
    penjelasan: Baris dengan kategori sama dikumpulkan (warna sama), lalu dihitung jumlah dan totalnya.
```

Untuk **menyaring hasil agregat** gunakan `HAVING` — bukan `WHERE`. Perhatikan kapan masing-masing bekerja:

```visual
jenis: alur
judul: Urutan kerja database
langkah:
  - {judul: FROM, isi: Ambil tabel penjualan}
  - {judul: WHERE, isi: "Saring BARIS (mis. status = 'Selesai') — sebelum dikelompokkan"}
  - {judul: GROUP BY, isi: Bentuk kelompok per kategori}
  - {judul: HAVING, isi: "Saring KELOMPOK (mis. SUM(total_harga) > 20 juta) — setelah dihitung"}
  - {judul: SELECT, isi: Tampilkan kolom & hasil agregat}
  - {judul: ORDER BY, isi: Urutkan hasil akhir}
```

### Kasus
Tim merchandising ingin tahu **kategori mana yang paling menghasilkan**, tetapi hanya kategori "besar" (omzet di atas **Rp20 juta**) yang akan dibahas di rapat.

### Tugas
Dari transaksi berstatus `'Selesai'`, buat tabel per `kategori` dengan kolom:
1. `kategori`
2. `jumlah_transaksi` — banyaknya transaksi
3. `unit_terjual` — total `jumlah`
4. `omzet` — total `total_harga`

Tampilkan hanya kategori dengan omzet **lebih dari 20.000.000** (pakai `HAVING`) dan urutkan dari omzet **terbesar**. Setelah berhasil, klik **Grafik** di panel hasil untuk melihat perbandingannya.

## starter
```sql
SELECT
    kategori,
    COUNT(*) AS jumlah_transaksi
FROM penjualan
WHERE status = 'Selesai'
GROUP BY kategori;
```

## solusi
```sql
SELECT
    kategori,
    COUNT(*)         AS jumlah_transaksi,
    SUM(jumlah)      AS unit_terjual,
    SUM(total_harga) AS omzet
FROM penjualan
WHERE status = 'Selesai'
GROUP BY kategori
HAVING SUM(total_harga) > 20000000
ORDER BY omzet DESC;
```

## checker
```python
bandingkan_hasil()
cek_kode("having", "Menyaring kelompok dengan HAVING",
         pesan="Filter berdasarkan hasil SUM() harus ditulis di HAVING (setelah GROUP BY), bukan di WHERE.")
```

## hint-1
Tambahkan dua agregat lagi di `SELECT`: `SUM(jumlah)` dan `SUM(total_harga)`, masing-masing dengan alias.

## hint-2
Klausa `HAVING` ditulis **setelah** `GROUP BY` dan boleh memakai fungsi agregat: `HAVING SUM(total_harga) > 20000000`.

## hint-3
```sql
GROUP BY kategori
HAVING SUM(total_harga) > 20000000
ORDER BY omzet DESC;
```

## pembahasan
- **Elektronik** menyumbang ±Rp172 juta — lebih dari separuh omzet — padahal jumlah transaksinya kalah dari Fashion dan Makanan & Minuman. Nilai per transaksi yang besar membuat kategori ini dominan.
- **Makanan & Minuman** menjual unit terbanyak (349) tetapi omzetnya terkecil di antara empat besar: produk murah, volume tinggi. Dua KPI (unit vs omzet) bisa menceritakan kisah yang berbeda!
- `WHERE status = 'Selesai'` bekerja **sebelum** pengelompokan (menyaring baris), sedangkan `HAVING` bekerja **sesudahnya** (menyaring kelompok). Menulis `WHERE SUM(total_harga) > ...` akan error karena kelompoknya belum terbentuk.
- Aturan emas `GROUP BY`: setiap kolom di `SELECT` harus ada di `GROUP BY` **atau** dibungkus fungsi agregat.
