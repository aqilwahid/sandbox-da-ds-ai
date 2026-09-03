---
id: ds-03-groupby
track: datascience
title: Agregasi & Groupby Multidimensi
estimatedMinutes: 10
runtime: pyodide
packages: [pandas]
datasets: [housing_sample.csv]
prerequisites: [ds-02-cleaning]
---

## instruksi
Analisis data agregasi per kelompok (*Groupby*) adalah teknik fundamental untuk menemukan pola dan variasi harga properti antar-wilayah.

### Kasus Bisnis:
Manajer investasi ingin membandingkan harga rumah rata-rata, harga termurah, harga termahal, dan jumlah properti di masing-masing kota/wilayah (`lokasi`).

### Tugas Anda:
1. Baca file `housing_sample.csv` ke `df`.
2. Kelompokkan data berdasarkan kolom `lokasi` (`df.groupby('lokasi')`).
3. Lakukan agregasi pada kolom `harga_juta` dengan metrik:
   - `'mean'`: rata-rata harga
   - `'min'`: harga terendah
   - `'max'`: harga tertinggi
   - `'count'`: total jumlah properti
4. Simpan hasilnya ke variabel `ringkasan_lokasi` dan lakukan `.reset_index()`.
5. Urutkan dari `mean` tertinggi ke terendah menggunakan `.sort_values(by='mean', ascending=False)`.

## starter
import pandas as pd

df = pd.read_csv('housing_sample.csv')

# Lakukan groupby dan agregasi
ringkasan_lokasi = df.groupby('lokasi')['harga_juta'].agg(['mean', 'min', 'max', 'count']).reset_index()

# Urutkan berdasarkan mean harga tertinggi
# ringkasan_lokasi = ...

print("Ringkasan Harga per Wilayah:")
print(ringkasan_lokasi)

## solusi
import pandas as pd

df = pd.read_csv('housing_sample.csv')

ringkasan_lokasi = (
    df.groupby('lokasi')['harga_juta']
    .agg(['mean', 'min', 'max', 'count'])
    .reset_index()
    .sort_values(by='mean', ascending=False)
)

print("Ringkasan Harga per Wilayah (Urut Mean Tertinggi):")
print(ringkasan_lokasi)

## checker
assert 'ringkasan_lokasi' in locals() or 'ringkasan_lokasi' in globals(), "DataFrame 'ringkasan_lokasi' belum dibuat."
assert_columns(ringkasan_lokasi, ['lokasi', 'mean', 'min', 'max', 'count'])
assert len(ringkasan_lokasi) > 0, "DataFrame ringkasan tidak boleh kosong."
# Pastikan terurut descending
means = list(ringkasan_lokasi['mean'])
assert means == sorted(means, reverse=True), "Hasil belum diurutkan berdasarkan kolom 'mean' secara menurun (descending)."
report(True, "Hebat! Agregasi multidimensi per wilayah berhasil dihitung dan diurutkan.")

## hint-1
Gunakan `.agg(['mean', 'min', 'max', 'count'])` setelah memilih kolom target `['harga_juta']`.

## hint-2
Pastikan memanggil `.reset_index()` agar kolom `lokasi` kembali menjadi kolom biasa (bukan indeks DataFrame).

## hint-3
Gunakan `.sort_values(by='mean', ascending=False)` untuk mengurutkan data dari nilai rata-rata terbesar.
