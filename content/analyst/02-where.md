---
id: da-02-where
track: analyst
title: Menyaring Baris dengan WHERE
level: pemula
estimatedMinutes: 12
language: sql
datasets: [penjualan]
concepts: [WHERE, AND, IN, operator perbandingan]
prerequisites: [da-01-select]
---

## instruksi
`WHERE` dipakai untuk **menyaring baris**: hanya baris yang memenuhi syarat yang ikut ke hasil. Bayangkan seperti saringan — baris yang tidak lolos dibuang.

```visual
jenis: transformasi
judul: WHERE membuang baris yang tidak memenuhi syarat
data:
  kolom: [id_transaksi, nama_produk, kategori, kota, total_harga]
  baris:
    - [T00012, Smartphone 128 GB, Elektronik, Jakarta, 3299000]
    - [T00013, Kopi Arabika Gayo 250 g, Makanan & Minuman, Bandung, 178000]
    - [T00014, Monitor 24 inci, Elektronik, Surabaya, 1899000]
    - [T00015, Headset Bluetooth, Elektronik, Bandung, 459000]
    - [T00016, Laptop 14 inci Core i5, Elektronik, Bandung, 8499000]
    - [T00017, Sepatu Lari, Fashion, Jakarta, 529000]
langkah:
  - operasi: filter
    kondisi:
      - {kolom: kategori, op: "=", nilai: Elektronik}
      - {kolom: total_harga, op: ">", nilai: 1000000}
      - {kolom: kota, op: in, nilai: [Jakarta, Bandung]}
    kode: "WHERE kategori = 'Elektronik' AND total_harga > 1000000 AND kota IN ('Jakarta', 'Bandung')"
    penjelasan: Semua syarat yang digabung dengan AND harus terpenuhi sekaligus.
```

Operator yang sering dipakai:

| Operator | Contoh | Arti |
|---|---|---|
| `=` / `<>` | `status = 'Selesai'` | sama dengan / tidak sama dengan |
| `>` `>=` `<` `<=` | `total_harga > 1000000` | perbandingan angka/tanggal |
| `AND` / `OR` | `a AND b` | keduanya benar / salah satu benar |
| `IN (...)` | `kota IN ('Jakarta', 'Bandung')` | salah satu dari daftar |
| `BETWEEN` | `tanggal BETWEEN '2025-03-01' AND '2025-03-31'` | dalam rentang (inklusif) |
| `LIKE` | `nama_produk LIKE '%Kopi%'` | pola teks (`%` = teks apa saja) |

> **Penting:** Teks ditulis dengan **kutip tunggal** `'Elektronik'` dan huruf besar-kecilnya harus sama persis. Angka ditulis **tanpa titik pemisah ribuan**: `1000000`, bukan `1.000.000`.

### Kasus
Tim promosi ingin menawarkan paket garansi tambahan untuk pembeli **produk Elektronik bernilai besar** di **Jakarta dan Bandung**. Mereka butuh daftar transaksi yang memenuhi syarat.

### Tugas
Tampilkan kolom `id_transaksi`, `tanggal`, `nama_produk`, `kota`, `total_harga` dari tabel `penjualan` dengan syarat:
1. `kategori` adalah `'Elektronik'`,
2. `total_harga` **lebih dari** 1.000.000,
3. `kota` adalah Jakarta **atau** Bandung (gunakan `IN`),
4. `status` transaksi `'Selesai'` (transaksi batal/retur tidak dihitung).

## starter
```sql
SELECT id_transaksi, tanggal, nama_produk, kota, total_harga
FROM penjualan
WHERE kategori = 'Elektronik';
-- Tambahkan syarat lain dengan AND
```

## solusi
```sql
SELECT id_transaksi, tanggal, nama_produk, kota, total_harga
FROM penjualan
WHERE kategori = 'Elektronik'
  AND total_harga > 1000000
  AND kota IN ('Jakarta', 'Bandung')
  AND status = 'Selesai';
```

## hint-1
Setiap syarat tambahan disambung dengan `AND`. Kueri boleh ditulis beberapa baris agar mudah dibaca.

## hint-2
Untuk "Jakarta atau Bandung" tulis `kota IN ('Jakarta', 'Bandung')`. Jangan lupa syarat `status = 'Selesai'`.

## hint-3
```sql
WHERE kategori = 'Elektronik'
  AND total_harga > ...
  AND kota IN (..., ...)
  AND status = ...
```

## pembahasan
- Hasilnya **22 transaksi**. Coba hapus syarat `status` — jumlahnya bertambah karena transaksi yang dibatalkan ikut terhitung. Inilah alasan analis selalu menanyakan *definisi* ("transaksi yang dihitung itu yang mana?").
- **Jebakan klasik `OR`:** `kategori = 'Elektronik' AND kota = 'Jakarta' OR kota = 'Bandung'` dibaca database sebagai `(kategori = 'Elektronik' AND kota = 'Jakarta') OR kota = 'Bandung'` — semua transaksi Bandung (termasuk kopi!) ikut masuk. Gunakan `IN (...)` atau tanda kurung: `AND (kota = 'Jakarta' OR kota = 'Bandung')`.
- Urutan penulisan syarat di `WHERE` tidak mengubah hasil — database mengoptimalkannya sendiri.
