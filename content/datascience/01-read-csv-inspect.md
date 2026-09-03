---
id: ds-01-read-csv
track: datascience
title: Membaca & Menginspeksi Dataset CSV
estimatedMinutes: 8
runtime: pyodide
packages: [pandas]
datasets: [housing_sample.csv]
prerequisites: []
---

## instruksi
Selamat datang di modul **Data Science**! Langkah pertama seorang Data Scientist adalah memuat data dan memahami struktur awal dataset (*Exploratory Data Analysis*).

### Kasus Bisnis:
Kita memiliki dataset properti perumahan di wilayah Jabodetabek (`housing_sample.csv`). Anda diminta untuk memuat dataset ini ke dalam DataFrame Pandas dan menghitung ringkasan statistik awalnya.

### Tugas Anda:
1. Baca file `housing_sample.csv` menggunakan `pd.read_csv('housing_sample.csv')` dan simpan ke variabel `df`.
2. Simpan jumlah baris dan kolom ke variabel `jumlah_baris, jumlah_kolom = df.shape`.
3. Hitung rata-rata harga properti (kolom `harga_juta`) dan simpan ke variabel `rata_rata_harga`.
4. Cetak (`print`) 5 baris pertama menggunakan `df.head()`.

## starter
import pandas as pd

# 1. Baca dataset
df = pd.read_csv('housing_sample.csv')

# 2. Ambil dimensi baris dan kolom
jumlah_baris, jumlah_kolom = df.shape

# 3. Hitung rata-rata harga
rata_rata_harga = 0.0

# 4. Tampilkan 5 baris pertama
print("5 Baris Pertama:")
print(df.head())

## solusi
import pandas as pd

df = pd.read_csv('housing_sample.csv')
jumlah_baris, jumlah_kolom = df.shape
rata_rata_harga = float(df['harga_juta'].mean())

print(f"Dimensi data: {jumlah_baris} baris, {jumlah_kolom} kolom")
print(f"Rata-rata harga rumah: Rp {rata_rata_harga:.2f} Juta")
print("\n5 Baris Pertama:")
print(df.head())

## checker
assert 'df' in locals() or 'df' in globals(), "Variabel 'df' belum dibuat."
assert_columns(df, ['lokasi', 'kamar_tidur', 'luas_bangunan_m2', 'harga_juta'])
assert_shape(df, rows=40, cols=11)
assert 'rata_rata_harga' in locals() or 'rata_rata_harga' in globals(), "Variabel 'rata_rata_harga' belum didefinisikan."
assert_close(rata_rata_harga, float(df['harga_juta'].mean()), tol=1.0)
report(True, "Bagus sekali! Dataset berhasil dibaca dan dimensi dianalisis dengan tepat.")

## hint-1
Gunakan `df['harga_juta'].mean()` untuk menghitung nilai rata-rata kolom numerik.

## hint-2
Dimensi DataFrame dapat diekstrak langsung dari atribut tuple `df.shape`.

## hint-3
Solusi:
```python
import pandas as pd
df = pd.read_csv('housing_sample.csv')
jumlah_baris, jumlah_kolom = df.shape
rata_rata_harga = float(df['harga_juta'].mean())
print(df.head())
```
