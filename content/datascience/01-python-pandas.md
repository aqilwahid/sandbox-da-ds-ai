---
id: py-01-pandas
track: datascience
title: Manipulasi DataFrame dengan Pandas
estimatedMinutes: 12
runtime: pyodide
packages: [pandas]
datasets: [sales_data.csv]
prerequisites: [py-00-intro]
---

## instruksi
Pada latihan ini, Anda akan memproses dan menyaring data penjualan menggunakan pustaka **Pandas**.

### Kasus Bisnis:
Tim pemasaran ingin melihat ringkasan performa kampanye iklan berdasarkan saluran (*channel*) yang memiliki rasio konversi (*conversion rate*) di atas rata-rata.

### Tugas Anda:
1. Buat kolom baru `conversion_rate` dengan rumus `(clicks / impressions) * 100`.
2. Saring hanya baris di mana `conversion_rate` lebih besar dari rata-rata seluruh baris.
3. Kembalikan DataFrame yang sudah disaring diurutkan dari `conversion_rate` tertinggi.

## starter
import pandas as pd

data = {
    'channel': ['Instagram Ads', 'Google Search', 'TikTok Ads', 'Email Newsletter', 'Affiliate'],
    'impressions': [100000, 250000, 180000, 50000, 75000],
    'clicks': [3200, 12500, 4500, 3000, 1800]
}

df = pd.DataFrame(data)

# Tulis kode manipulasi pandas di sini
print(df)

## solusi
import pandas as pd

data = {
    'channel': ['Instagram Ads', 'Google Search', 'TikTok Ads', 'Email Newsletter', 'Affiliate'],
    'impressions': [100000, 250000, 180000, 50000, 75000],
    'clicks': [3200, 12500, 4500, 3000, 1800]
}

df = pd.DataFrame(data)
df['conversion_rate'] = (df['clicks'] / df['impressions']) * 100
avg_cr = df['conversion_rate'].mean()
hasil_df = df[df['conversion_rate'] > avg_cr].sort_values(by='conversion_rate', ascending=False)
print(hasil_df)

## checker
assert 'conversion_rate' in df.columns
assert len(hasil_df) > 0

## hint-1
Buat kolom baru dengan menetapkan ekspresi matematika: `df['conversion_rate'] = (df['clicks'] / df['impressions']) * 100`.

## hint-2
Hitung nilai rata-rata dengan `df['conversion_rate'].mean()` dan gunakan boolean indexing `df[df['conversion_rate'] > avg_cr]`.

## hint-3
Urutkan dengan `.sort_values(by='conversion_rate', ascending=False)`.
