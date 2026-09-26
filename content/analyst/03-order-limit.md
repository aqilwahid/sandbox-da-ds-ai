---
id: da-03-order-limit
track: analyst
title: Mengurutkan & Top-N (ORDER BY, LIMIT)
level: pemula
estimatedMinutes: 10
language: sql
datasets: [penjualan]
concepts: [ORDER BY, DESC, LIMIT, tie-breaker]
prerequisites: [da-02-where]
---

## instruksi
`ORDER BY` mengurutkan hasil: `ASC` (kecil → besar, bawaan) atau `DESC` (besar → kecil). Digabung dengan `LIMIT`, kita mendapat laporan **Top-N** — "10 transaksi terbesar", "5 produk terlaris", dst.

```visual
jenis: transformasi
judul: Urutkan dulu, baru potong
data:
  kolom: [id_transaksi, nama_produk, total_harga]
  baris:
    - [T00101, Headset Bluetooth, 459000]
    - [T00102, Laptop 14 inci Core i5, 8499000]
    - [T00103, Smartphone 128 GB, 3299000]
    - [T00104, Monitor 24 inci, 1899000]
    - [T00099, Smartphone 128 GB, 3299000]
langkah:
  - operasi: urut
    kolom: [total_harga, id_transaksi]
    arah: [desc, asc]
    kode: ORDER BY total_harga DESC, id_transaksi
    penjelasan: Dua transaksi bernilai sama (3.299.000) — kolom kedua menentukan siapa duluan.
  - operasi: batasi
    n: 3
    kode: LIMIT 3
    penjelasan: Setelah urut, ambil 3 baris teratas.
```

> **Tips:** Jika dua baris punya nilai yang sama (**seri**), urutannya tidak pasti. Tambahkan kolom kedua sebagai **pengurut cadangan** (*tie-breaker*) agar laporan selalu konsisten.

### Kasus
Manajer ingin melihat **10 transaksi terbesar** tahun 2025 (hanya yang berstatus `'Selesai'`) untuk mengirim ucapan terima kasih ke pembelinya.

### Tugas
1. Tampilkan `id_transaksi`, `tanggal`, `nama_produk`, `kota`, `total_harga` untuk transaksi berstatus `'Selesai'`.
2. Urutkan dari `total_harga` **terbesar**. Jika nilainya sama, urutkan `id_transaksi` dari A ke Z.
3. Ambil **10 baris teratas**.

## starter
```sql
SELECT id_transaksi, tanggal, nama_produk, kota, total_harga
FROM penjualan
WHERE status = 'Selesai'
ORDER BY total_harga;
```

## solusi
```sql
SELECT id_transaksi, tanggal, nama_produk, kota, total_harga
FROM penjualan
WHERE status = 'Selesai'
ORDER BY total_harga DESC, id_transaksi ASC
LIMIT 10;
```

## hint-1
Starter sudah mengurutkan, tetapi dari yang terkecil. Kata kunci untuk urutan menurun adalah `DESC`.

## hint-2
Beberapa kolom pengurut dipisahkan koma: `ORDER BY kolom1 DESC, kolom2 ASC`. Lalu tambahkan `LIMIT` di paling akhir.

## hint-3
```sql
ORDER BY total_harga DESC, id_transaksi ASC
LIMIT 10;
```

## pembahasan
- Urutan klausa wajib: `SELECT → FROM → WHERE → ORDER BY → LIMIT`. `LIMIT` selalu paling akhir.
- Lima transaksi teratas bernilai sama persis (Rp8.499.000 — laptop tanpa diskon). Tanpa *tie-breaker* `id_transaksi`, dua orang yang menjalankan kueri yang sama bisa mendapat urutan berbeda.
- Coba ganti `LIMIT 10` menjadi `LIMIT 10 OFFSET 10` untuk melihat peringkat 11–20 (teknik *pagination*).
