---
id: ds-02-cleaning
track: datascience
title: Pembersihan Data (Missing Values & Tipe Data)
estimatedMinutes: 10
runtime: pyodide
packages: [pandas, numpy]
datasets: [housing_sample.csv]
prerequisites: [ds-01-read-csv]
---

## instruksi
Data mentah di dunia nyata seringkali memiliki baris yang tidak lengkap atau anomali tipe data. Pada latihan ini, Anda akan memproses dan membersihkan dataset.

### Kasus Bisnis:
Sebelum melakukan permodelan prediktif, kita perlu memastikan tidak ada nilai kosong (*missing values*) dan memastikan kolom `tahun_dibangun` dan `garasi` bertipe integer.

### Tugas Anda:
1. Baca dataset `housing_sample.csv` ke `df`.
2. Salin DataFrame ke `df_clean = df.copy()`.
3. Isi (*impute*) nilai kosong pada kolom `garasi` dengan nilai `0` menggunakan `.fillna(0)`.
4. Pastikan kolom `garasi` bertipe data integer (`int64` / `int`) menggunakan `.astype(int)`.
5. Hapus baris apapun yang memiliki nilai kosong pada kolom `harga_juta` menggunakan `.dropna(subset=['harga_juta'])`.

## starter
import pandas as pd
import numpy as np

df = pd.read_csv('housing_sample.csv')

# 1. Salin data
df_clean = df.copy()

# 2. Tangani missing value pada garasi dan ubah tipe data
# df_clean['garasi'] = ...

# 3. Hapus baris dengan harga_juta kosong
# df_clean = ...

print("Pemeriksaan Missing Values:")
print(df_clean.isnull().sum())

## solusi
import pandas as pd
import numpy as np

df = pd.read_csv('housing_sample.csv')
df_clean = df.copy()

df_clean['garasi'] = df_clean['garasi'].fillna(0).astype(int)
df_clean = df_clean.dropna(subset=['harga_juta'])

print("Pemeriksaan Missing Values:")
print(df_clean.isnull().sum())
print("\nTipe Data:")
print(df_clean.dtypes)

## checker
assert 'df_clean' in locals() or 'df_clean' in globals(), "DataFrame 'df_clean' belum dibuat."
assert_no_nulls(df_clean, ['garasi', 'harga_juta'])
assert df_clean['garasi'].dtype == 'int64' or df_clean['garasi'].dtype == 'int32' or str(df_clean['garasi'].dtype).startswith('int'), "Kolom 'garasi' harus bertipe integer."
assert len(df_clean) > 0, "DataFrame 'df_clean' tidak boleh kosong."
report(True, "Sempurna! Data berhasil dibersihkan dan siap untuk tahap analisis lanjutan.")

## hint-1
Gunakan kombinasi metode berantai: `df_clean['garasi'] = df_clean['garasi'].fillna(0).astype(int)`.

## hint-2
Untuk menghapus baris dengan nilai null pada kolom tertentu, gunakan `df_clean = df_clean.dropna(subset=['harga_juta'])`.

## hint-3
Solusi lengkap:
```python
df_clean = df.copy()
df_clean['garasi'] = df_clean['garasi'].fillna(0).astype(int)
df_clean = df_clean.dropna(subset=['harga_juta'])
```
