---
id: py-00-intro
track: datascience
title: Pengenalan Python & Data Structure
estimatedMinutes: 8
runtime: pyodide
packages: []
datasets: []
prerequisites: []
---

## instruksi
Selamat datang di modul **Data Science**! Latihan ini menguji pemahaman dasar struktur data Python (`list` dan `dictionary`) serta operasi dasar statistik.

### Kasus Bisnis:
Diberikan daftar nilai transaksi harian selama 7 hari, Anda diminta untuk menghitung total transaksi, rata-rata, dan nilai tertinggi.

### Tugas Anda:
1. Lengkapi fungsi `analisis_transaksi(nilai_list)`.
2. Kembalikan sebuah dictionary dengan kunci:
   - `'total'`: total keseluruhan transaksi
   - `'rata_rata'`: nilai rata-rata (dibulatkan 2 desimal dengan `round()`)
   - `'maksimum'`: nilai transaksi tertinggi

## starter
def analisis_transaksi(nilai_list):
    # Tulis logika perhitungan Anda di sini
    hasil = {
        "total": 0,
        "rata_rata": 0.0,
        "maksimum": 0
    }
    return hasil

# Data uji
transaksi = [150000, 320000, 85000, 450000, 210000, 95000, 600000]
print(analisis_transaksi(transaksi))

## solusi
def analisis_transaksi(nilai_list):
    total = sum(nilai_list)
    rata_rata = round(total / len(nilai_list), 2)
    maksimum = max(nilai_list)
    return {
        "total": total,
        "rata_rata": rata_rata,
        "maksimum": maksimum
    }

transaksi = [150000, 320000, 85000, 450000, 210000, 95000, 600000]
print(analisis_transaksi(transaksi))

## checker
assert analisis_transaksi([10, 20, 30]) == {"total": 60, "rata_rata": 20.0, "maksimum": 30}
assert analisis_transaksi([100]) == {"total": 100, "rata_rata": 100.0, "maksimum": 100}

## hint-1
Gunakan fungsi bawaan Python seperti `sum()`, `len()`, dan `max()`.

## hint-2
Untuk rata-rata, bagi `sum(nilai_list)` dengan `len(nilai_list)` dan gunakan `round(..., 2)`.

## hint-3
Solusi singkat:
```python
def analisis_transaksi(nilai_list):
    return {
        "total": sum(nilai_list),
        "rata_rata": round(sum(nilai_list) / len(nilai_list), 2),
        "maksimum": max(nilai_list)
    }
```
