---
id: ds-04-feature-engineering
track: datascience
title: Rekayasa Fitur (Feature Engineering)
estimatedMinutes: 12
runtime: pyodide
packages: [pandas, numpy]
datasets: [housing_sample.csv]
prerequisites: [ds-03-groupby]
---

## instruksi
Performa model Machine Learning sangat bergantung pada kualitas fitur yang dirancang. Pada tahap ini, Anda akan merekayasa fitur-fitur baru (*derived features*) yang bermakna bagi penentuan harga rumah.

### Kasus Bisnis:
Harga total rumah dipengaruhi oleh usia bangunan, efisiensi luas bangunan, serta rasio luas bangunan terhadap luas tanah.

### Tugas Anda:
1. Baca file `housing_sample.csv` ke `df`.
2. Buat kolom baru `usia_bangunan` dengan rumus `2026 - df['tahun_dibangun']`.
3. Buat kolom baru `rasio_luas` dengan rumus `df['luas_bangunan_m2'] / df['luas_tanah_m2']`.
4. Buat kolom baru `harga_per_m2` dengan rumus `(df['harga_juta'] * 1000000) / df['luas_bangunan_m2']`.
5. Simpan DataFrame akhir ke variabel `df_featured`.

## starter
import pandas as pd
import numpy as np

df = pd.read_csv('housing_sample.csv')
df_featured = df.copy()

# 1. Buat fitur usia bangunan
# df_featured['usia_bangunan'] = ...

# 2. Buat fitur rasio luas
# df_featured['rasio_luas'] = ...

# 3. Buat fitur harga per meter persegi
# df_featured['harga_per_m2'] = ...

print("Fitur Baru yang Terbentuk:")
print(df_featured[['lokasi', 'usia_bangunan', 'rasio_luas', 'harga_per_m2']].head())

## solusi
import pandas as pd
import numpy as np

df = pd.read_csv('housing_sample.csv')
df_featured = df.copy()

df_featured['usia_bangunan'] = 2026 - df_featured['tahun_dibangun']
df_featured['rasio_luas'] = df_featured['luas_bangunan_m2'] / df_featured['luas_tanah_m2']
df_featured['harga_per_m2'] = (df_featured['harga_juta'] * 1000000) / df_featured['luas_bangunan_m2']

print("Fitur Baru yang Terbentuk:")
print(df_featured[['lokasi', 'usia_bangunan', 'rasio_luas', 'harga_per_m2']].head())

## checker
assert 'df_featured' in locals() or 'df_featured' in globals(), "DataFrame 'df_featured' belum didefinisikan."
assert_columns(df_featured, ['usia_bangunan', 'rasio_luas', 'harga_per_m2'])
assert (df_featured['usia_bangunan'] >= 0).all(), "Fitur 'usia_bangunan' tidak boleh negatif."
assert (df_featured['rasio_luas'] > 0).all(), "Fitur 'rasio_luas' harus bernilai positif."
assert_no_nulls(df_featured, ['usia_bangunan', 'rasio_luas', 'harga_per_m2'])
report(True, "Mantap! Fitur-fitur baru berhasil direkayasa dan siap digunakan untuk pemodelan.")

## hint-1
Hitung usia bangunan dengan mengurangi tahun saat ini (2026) dengan kolom `tahun_dibangun`.

## hint-2
Hitung harga per meter persegi dalam satuan Rupiah dengan rumus: `(df_featured['harga_juta'] * 1000000) / df_featured['luas_bangunan_m2']`.

## hint-3
Solusi lengkap:
```python
df_featured['usia_bangunan'] = 2026 - df_featured['tahun_dibangun']
df_featured['rasio_luas'] = df_featured['luas_bangunan_m2'] / df_featured['luas_tanah_m2']
df_featured['harga_per_m2'] = (df_featured['harga_juta'] * 1000000) / df_featured['luas_bangunan_m2']
```
