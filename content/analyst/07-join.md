---
id: da-07-join
track: analyst
title: Menggabungkan Tabel dengan JOIN
level: menengah
estimatedMinutes: 15
language: sql
datasets: [penjualan, pelanggan]
concepts: [JOIN, LEFT JOIN, alias tabel, COUNT DISTINCT]
prerequisites: [da-05-group-by]
---

## instruksi
Data bisnis biasanya tersebar di beberapa tabel. Tabel `penjualan` tidak menyimpan **segmen** pelanggan — informasi itu ada di tabel `pelanggan`. Keduanya dihubungkan oleh kolom kunci yang sama: `id_pelanggan`.

`JOIN` menggabungkan baris dari dua tabel yang **kuncinya cocok**. Coba ganti jenis JOIN di bawah dan perhatikan baris mana yang ikut:

```visual
jenis: join
kiri:
  nama: penjualan
  kolom: [id_transaksi, id_pelanggan, total_harga]
  baris:
    - [T00401, P012, 459000]
    - [T00402, P044, 89000]
    - [T00403, P012, 1899000]
    - [T00404, P099, 245000]
kanan:
  nama: pelanggan
  kolom: [id_pelanggan, nama, segmen]
  baris:
    - [P012, Siti Rahmawati, VIP]
    - [P044, Budi Santoso, Reguler]
    - [P115, Dewi Lestari, Member]
kunci: id_pelanggan
awal: inner
```

- **INNER JOIN** (atau cukup `JOIN`): hanya baris yang punya pasangan di kedua tabel.
- **LEFT JOIN**: semua baris tabel kiri; jika tidak ada pasangan, kolom tabel kanan berisi `NULL`.

Beri **alias** pendek pada tabel agar kueri ringkas, dan tulis nama kolom dengan awalan alias jika kolomnya ada di kedua tabel (mis. `p.id_pelanggan`):

```visual
jenis: anatomi
bahasa: sql
bagian:
  - teks: "FROM penjualan AS p"
    label: Tabel kiri, alias p
  - teks: "JOIN pelanggan AS c"
    label: Tabel kanan, alias c
  - teks: "  ON p.id_pelanggan = c.id_pelanggan"
    label: Syarat pencocokan (kolom kunci)
```

### Kasus
Tim CRM ingin membuktikan bahwa program **VIP** layak dipertahankan: apakah pelanggan VIP memang lebih bernilai daripada pelanggan Reguler?

### Tugas
Gabungkan `penjualan` (alias `p`) dengan `pelanggan` (alias `c`), ambil transaksi berstatus `'Selesai'`, lalu per `segmen` hitung:
1. `jumlah_pelanggan` — pelanggan unik (`COUNT(DISTINCT p.id_pelanggan)`)
2. `jumlah_transaksi`
3. `omzet` — total `total_harga`
4. `omzet_per_pelanggan` — `omzet` dibagi `jumlah_pelanggan`, **dibulatkan tanpa desimal**

Urutkan dari `omzet_per_pelanggan` terbesar.

## starter
```sql
-- Langkah 1: lihat hasil gabungan dua tabel
SELECT p.id_transaksi, p.id_pelanggan, c.nama, c.segmen, p.total_harga
FROM penjualan AS p
JOIN pelanggan AS c
  ON p.id_pelanggan = c.id_pelanggan
LIMIT 10;
```

## solusi
```sql
SELECT
    c.segmen,
    COUNT(DISTINCT p.id_pelanggan)                        AS jumlah_pelanggan,
    COUNT(*)                                              AS jumlah_transaksi,
    SUM(p.total_harga)                                    AS omzet,
    ROUND(SUM(p.total_harga) / COUNT(DISTINCT p.id_pelanggan)) AS omzet_per_pelanggan
FROM penjualan AS p
JOIN pelanggan AS c
  ON p.id_pelanggan = c.id_pelanggan
WHERE p.status = 'Selesai'
GROUP BY c.segmen
ORDER BY omzet_per_pelanggan DESC;
```

## checker
```python
bandingkan_hasil()
cek_kode("join", "Menggabungkan tabel dengan JOIN")
```

## hint-1
Pertahankan bagian `FROM ... JOIN ... ON ...` dari starter. Tambahkan `WHERE p.status = 'Selesai'`, lalu `GROUP BY c.segmen`.

## hint-2
`omzet_per_pelanggan` dihitung langsung dari dua agregat: `ROUND(SUM(p.total_harga) / COUNT(DISTINCT p.id_pelanggan))`. Alias di `SELECT` tidak bisa dipakai lagi di baris `SELECT` yang sama.

## hint-3
```sql
SELECT
    c.segmen,
    COUNT(DISTINCT p.id_pelanggan) AS jumlah_pelanggan,
    COUNT(*)                       AS jumlah_transaksi,
    SUM(p.total_harga)             AS omzet,
    ROUND(SUM(p.total_harga) / COUNT(DISTINCT p.id_pelanggan)) AS omzet_per_pelanggan
FROM penjualan AS p
JOIN pelanggan AS c ON p.id_pelanggan = c.id_pelanggan
WHERE p.status = 'Selesai'
GROUP BY c.segmen
ORDER BY omzet_per_pelanggan DESC;
```

## pembahasan
- Secara total, segmen **Reguler** menyumbang omzet terbesar (karena pelanggannya paling banyak). Tetapi **per pelanggan**, VIP bernilai ±**Rp4,9 juta** — hampir **2×** pelanggan Reguler (±Rp2,6 juta). Metrik yang tepat mengubah kesimpulan!
- Mengapa `COUNT(DISTINCT ...)`? Satu pelanggan bisa bertransaksi berkali-kali; `COUNT(*)` menghitung transaksi, bukan orang.
- **Bonus LEFT JOIN** — cari pelanggan yang belum pernah belanja (target kampanye aktivasi):

  ```sql
  SELECT c.id_pelanggan, c.nama, c.tanggal_daftar
  FROM pelanggan AS c
  LEFT JOIN penjualan AS p ON p.id_pelanggan = c.id_pelanggan
  WHERE p.id_transaksi IS NULL;
  ```
  Ada **12 pelanggan** tanpa transaksi sama sekali. Dengan `INNER JOIN` mereka tidak akan pernah terlihat.
