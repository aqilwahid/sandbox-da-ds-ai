---
id: da-01-select
track: analyst
title: Mengenal Tabel & SELECT
level: pemula
estimatedMinutes: 10
language: sql
datasets: [penjualan]
concepts: [SELECT, FROM, LIMIT]
prerequisites: []
---

## instruksi
Selamat datang di **TokoKita**, toko online fiktif yang datanya akan kita analisis sepanjang track ini. 👋

Database menyimpan data dalam **tabel**: setiap **baris** adalah satu kejadian (di sini: satu transaksi), setiap **kolom** adalah satu jenis informasi (tanggal, produk, nilai, …). Buka tab **Data** di atas untuk melihat isi dan arti setiap kolom tabel `penjualan`.

Untuk mengambil data kita memakai perintah `SELECT`:

```visual
jenis: anatomi
judul: Anatomi kueri SELECT
bahasa: sql
bagian:
  - teks: "SELECT tanggal, nama_produk, total_harga"
    label: Kolom yang ingin ditampilkan (pisahkan dengan koma)
  - teks: "FROM penjualan"
    label: Tabel sumber datanya
  - teks: "LIMIT 5;"
    label: Ambil 5 baris saja
```

> **Tips:** `SELECT *` artinya "ambil **semua** kolom". Praktis untuk mengintip data, tetapi di laporan sebaiknya sebutkan kolom yang memang dibutuhkan.

### Kasus
Tim operasional ingin melihat contoh transaksi terbaru untuk memastikan data sudah masuk dengan benar. Mereka tidak butuh semua kolom — cukup yang penting saja.

### Tugas
1. Jalankan dulu kueri di editor (tekan **Jalankan** atau `Ctrl + Enter`) dan perhatikan hasilnya di panel bawah.
2. Ubah kueri sehingga hanya menampilkan kolom `id_transaksi`, `tanggal`, `nama_produk`, `jumlah`, dan `total_harga` — **dengan urutan kolom persis seperti itu**.
3. Tampilkan **10 baris** saja.

## starter
```sql
-- Intip isi tabel penjualan (semua kolom, 5 baris)
SELECT *
FROM penjualan
LIMIT 5;
```

## solusi
```sql
SELECT id_transaksi, tanggal, nama_produk, jumlah, total_harga
FROM penjualan
LIMIT 10;
```

## hint-1
Ganti tanda `*` dengan daftar nama kolom yang diminta, dipisahkan koma. Nama kolom bisa dilihat di tab **Data**.

## hint-2
Jumlah baris diatur oleh angka setelah `LIMIT`. Kalau diminta 10 baris, tulis `LIMIT 10`.

## hint-3
```sql
SELECT id_transaksi, tanggal, nama_produk, jumlah, total_harga
FROM penjualan
LIMIT ...;
```

## pembahasan
- `SELECT kolom1, kolom2` memilih **kolom** (memotong tabel secara vertikal), sedangkan `LIMIT n` membatasi **jumlah baris**.
- Urutan kolom di hasil mengikuti urutan yang kamu tulis setelah `SELECT`.
- Tanpa `ORDER BY`, database tidak menjamin urutan baris. Di latihan berikutnya kita akan mengurutkan data secara eksplisit.
- Kebiasaan baik analis: mulai dengan `SELECT * ... LIMIT 5` untuk mengenali data, lalu pilih kolom yang relevan saja.
