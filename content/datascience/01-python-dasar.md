---
id: ds-01-python-dasar
track: datascience
title: Python untuk Analisis — List, Dictionary & Fungsi
level: pemula
estimatedMinutes: 12
language: python
datasets: []
concepts: [list, dict, fungsi, zip, max]
prerequisites: []
---

## instruksi
Sebelum memakai pandas, kita kenali dulu dua "wadah" data paling dasar di Python.

- **list** menyimpan data **berurutan**. Setiap elemen punya posisi (indeks) yang dimulai dari **0**.
- **dictionary** (`dict`) menyimpan pasangan **kunci → nilai**, seperti kamus: cari kuncinya, dapat nilainya.

```visual
jenis: struktur
judul: List vs dictionary
item:
  - nama: penjualan
    nilai: [4.2, 3.8, 5.1, 4.7, 6.3, 8.9, 7.4]
    keterangan: list — diakses lewat posisi, mis. penjualan[0] = 4.2
  - nama: per_hari
    nilai: {Senin: 4.2, Selasa: 3.8, Rabu: 5.1, Kamis: 4.7, Jumat: 6.3, Sabtu: 8.9, Minggu: 7.4}
    keterangan: dict — diakses lewat kunci, mis. per_hari["Sabtu"] = 8.9
```

### Kasus
Kepala toko mencatat omzet harian TokoKita selama satu minggu (dalam **juta rupiah**) dan ingin ringkasan cepat: total, rata-rata, nilai tertinggi & terendah, serta hari dengan omzet terbesar.

### Tugas
1. Lengkapi fungsi `ringkas(data)` agar mengembalikan **dictionary** dengan kunci:
   - `"total"` — jumlah semua nilai (`sum`)
   - `"rata_rata"` — rata-rata, dibulatkan **2 desimal** (`round(..., 2)`)
   - `"tertinggi"` dan `"terendah"` — `max` dan `min`
2. Simpan hasil `ringkas(penjualan)` ke variabel `ringkasan`.
3. Buat dictionary `per_hari` yang memasangkan nama hari dengan omzetnya (petunjuk: `dict(zip(hari, penjualan))`).
4. Simpan nama hari dengan omzet terbesar ke variabel `hari_terbaik`.

> **Tips:** Baris terakhir yang berupa **nilai** (bukan `print`) akan ditampilkan otomatis di panel **Hasil**, seperti di Jupyter Notebook. Buka juga tab **Variabel** untuk melihat semua variabel yang kamu buat.

## starter
```python
hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
penjualan = [4.2, 3.8, 5.1, 4.7, 6.3, 8.9, 7.4]   # juta rupiah

print("Omzet hari pertama:", penjualan[0])
print("Jumlah hari:", len(penjualan))


def ringkas(data):
    # TODO: hitung total, rata-rata (2 desimal), tertinggi, terendah
    return {
        "total": 0,
        "rata_rata": 0,
        "tertinggi": 0,
        "terendah": 0,
    }


ringkasan = ringkas(penjualan)

# TODO: buat dictionary per_hari dan cari hari_terbaik
per_hari = {}
hari_terbaik = ""

ringkasan
```

## solusi
```python
hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
penjualan = [4.2, 3.8, 5.1, 4.7, 6.3, 8.9, 7.4]   # juta rupiah

print("Omzet hari pertama:", penjualan[0])
print("Jumlah hari:", len(penjualan))


def ringkas(data):
    return {
        "total": round(sum(data), 2),
        "rata_rata": round(sum(data) / len(data), 2),
        "tertinggi": max(data),
        "terendah": min(data),
    }


ringkasan = ringkas(penjualan)

per_hari = dict(zip(hari, penjualan))
hari_terbaik = max(per_hari, key=per_hari.get)

print("Hari terbaik:", hari_terbaik, "dengan omzet", per_hari[hari_terbaik], "juta")
ringkasan
```

## checker
```python
wajib_variabel("ringkasan", dict)
check("Kunci ringkasan lengkap (total, rata_rata, tertinggi, terendah)",
      set(ringkasan.keys()) == {"total", "rata_rata", "tertinggi", "terendah"},
      f"Kunci yang ada sekarang: {sorted(ringkasan.keys())}")
cek_mendekati(ringkasan.get("total", 0), 40.4, 0.01, label="Total omzet benar (40,4 juta)")
cek_mendekati(ringkasan.get("rata_rata", 0), 5.77, 0.001, label="Rata-rata benar dan dibulatkan 2 desimal")
check("Nilai tertinggi & terendah benar", ringkasan.get("tertinggi") == 8.9 and ringkasan.get("terendah") == 3.8,
      "Gunakan max(data) dan min(data).")
wajib_variabel("ringkas")
try:
    uji = ringkas([10, 20, 30])
    pesan_uji = f"ringkas([10, 20, 30]) menghasilkan {uji!r}"
except Exception as e:
    uji, pesan_uji = None, f"ringkas([10, 20, 30]) error: {type(e).__name__}: {e}"
check("Fungsi ringkas() bekerja untuk data lain (bukan angka yang ditulis manual)",
      isinstance(uji, dict) and uji.get("total") == 60 and uji.get("rata_rata") == 20 and uji.get("tertinggi") == 30,
      pesan_uji)
wajib_variabel("per_hari", dict)
check("per_hari memasangkan 7 hari dengan omzetnya", len(per_hari) == 7 and per_hari.get("Sabtu") == 8.9,
      "Gunakan dict(zip(hari, penjualan)).")
bandingkan_variabel("hari_terbaik", label="hari_terbaik = hari dengan omzet terbesar")
```

## hint-1
Fungsi bawaan Python sudah menyediakan semuanya: `sum(data)`, `len(data)`, `max(data)`, `min(data)`. Rata-rata = total ÷ banyaknya data.

## hint-2
`zip(hari, penjualan)` memasangkan elemen kedua list satu per satu: `("Senin", 4.2), ("Selasa", 3.8), ...`. Bungkus dengan `dict(...)` agar menjadi dictionary.

## hint-3
```python
def ringkas(data):
    return {
        "total": round(sum(data), 2),
        "rata_rata": round(___ / ___, 2),   # total ÷ banyaknya data
        "tertinggi": ___(data),
        "terendah": ___(data),
    }

per_hari = dict(zip(___, ___))
hari_terbaik = max(per_hari, key=per_hari.get)   # key= → bandingkan omzetnya, bukan nama harinya
```

## pembahasan
- **List** cocok untuk data berurutan (deret waktu, daftar nilai); **dict** cocok untuk data berlabel (hari → omzet).
- `max(per_hari, key=per_hari.get)` artinya: dari semua **kunci**, pilih yang **nilainya** paling besar.
- Kita menulis logika di dalam **fungsi** agar bisa dipakai ulang untuk minggu berikutnya — itulah sebabnya checker menguji `ringkas([10, 20, 30])`.
- Di dunia nyata datanya ribuan baris. Menulis loop sendiri jadi repot — di latihan berikutnya kita memakai **pandas** yang melakukan semua ini dalam satu baris.
