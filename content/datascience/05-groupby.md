---
id: ds-05-groupby
track: datascience
title: Ringkasan Harga per Lokasi (groupby & agg)
level: menengah
estimatedMinutes: 15
language: python
datasets: [properti]
concepts: [groupby, agg, named aggregation, reset_index, split-apply-combine]
prerequisites: [ds-04-data-cleaning]
---

## instruksi
`groupby` di pandas sama dengan `GROUP BY` di SQL: data dipecah per kelompok (**split**), setiap kelompok dihitung agregatnya (**apply**), lalu hasilnya digabung menjadi tabel baru (**combine**).

```visual
jenis: transformasi
judul: Split → apply → combine
data:
  kolom: [id_properti, lokasi, harga_juta, luas_bangunan_m2]
  baris:
    - [R009, Jakarta Selatan, 2625, 108]
    - [R012, Bekasi, 1105, 100]
    - [R023, Bogor, 945, 120]
    - [R038, Jakarta Selatan, 2910, 117]
    - [R016, Bekasi, 740, 76]
    - [R030, Bogor, 850, 92]
    - [R053, Jakarta Selatan, 2280, 89]
    - [R022, Bekasi, 1065, 122]
langkah:
  - operasi: kelompok
    oleh: lokasi
    agregasi:
      - {fungsi: count, kolom: id_properti, nama: jumlah_rumah}
      - {fungsi: median, kolom: harga_juta, nama: median_harga}
      - {fungsi: mean, kolom: harga_juta, nama: rata_harga}
    kode: "df_bersih.groupby(\"lokasi\").agg(jumlah_rumah=(\"id_properti\", \"count\"), median_harga=(\"harga_juta\", \"median\"), rata_harga=(\"harga_juta\", \"mean\"))"
    penjelasan: Baris dengan lokasi yang sama dikumpulkan, lalu setiap kelompok diringkas menjadi satu baris.
```

Cara paling rapi menulis beberapa agregat sekaligus adalah **named aggregation** — nama kolom hasilnya langsung kita tentukan:

```visual
jenis: anatomi
judul: Anatomi groupby + agg
bahasa: python
bagian:
  - teks: "ringkasan_lokasi = (df_bersih.groupby(\"lokasi\")"
    label: "Split: kelompokkan baris berdasarkan nilai kolom lokasi (seluruh rantai dibungkus kurung)"
  - teks: "    .agg(jumlah_rumah=(\"id_properti\", \"count\"),"
    label: "Apply & combine: setiap kelompok diringkas dengan nama_kolom_hasil=(kolom_sumber, fungsi), lalu digabung jadi satu tabel"
  - teks: "         median_harga=(\"harga_juta\", \"median\"))"
    label: Boleh banyak agregat sekaligus, dipisah koma
  - teks: "    .round(1)"
    label: Bulatkan semua angka hasil
  - teks: "    .sort_values(\"median_harga\", ascending=False)"
    label: Urutkan kelompok, terbesar dulu
  - teks: "    .reset_index())"
    label: "lokasi (yang tadinya index) kembali menjadi kolom biasa"
```

Fungsi yang sering dipakai di `agg`: `"count"`, `"sum"`, `"mean"`, `"median"`, `"min"`, `"max"`, `"nunique"` (jumlah nilai unik).

> **Tips:** menulis metode berantai di dalam tanda kurung `( ... )` membuat setiap langkah bisa ditulis satu baris — lebih mudah dibaca dan diberi komentar.

### Kasus
Tim marketing TokoKita Properti menyiapkan artikel **"Panduan Harga Rumah Jabodetabek 2026"**. Mereka butuh satu tabel: untuk setiap wilayah, berapa banyak rumah yang diiklankan, berapa harga tipikalnya, dan berapa rata-rata luas bangunannya.

### Tugas
Kode awal sudah berisi langkah pembersihan dari latihan sebelumnya (`df_bersih`). Dari `df_bersih`, buat DataFrame `ringkasan_lokasi` — satu baris per lokasi — dengan kolom:
1. `lokasi`
2. `jumlah_rumah` — banyaknya rumah (`"count"` dari `id_properti`)
3. `median_harga` — median `harga_juta`
4. `rata_harga` — rata-rata `harga_juta`
5. `rata_luas_bangunan` — rata-rata `luas_bangunan_m2`

Bulatkan hasilnya 1 desimal, urutkan dari `median_harga` **terbesar**, dan jadikan `lokasi` kolom biasa dengan `.reset_index()`. Setelah berhasil, klik tombol **Grafik** di atas tabel hasil untuk membandingkan harga antar-lokasi.

## starter
```python
import pandas as pd

# Pembersihan dari latihan sebelumnya
df = pd.read_csv("properti.csv")
df_bersih = df.drop_duplicates()
df_bersih["garasi"] = df_bersih["garasi"].fillna(0).astype(int)
df_bersih = df_bersih.dropna(subset=["harga_juta"])

# Contoh: satu agregat untuk satu kolom → hasilnya Series
jumlah_per_lokasi = df_bersih.groupby("lokasi")["id_properti"].count()
tampilkan(jumlah_per_lokasi, "Jumlah rumah per lokasi")

# TODO: lengkapi agregatnya, lalu .round(1), .sort_values(...), dan .reset_index()
ringkasan_lokasi = df_bersih.groupby("lokasi").agg(
    jumlah_rumah=("id_properti", "count"),
)

ringkasan_lokasi
```

## solusi
```python
import pandas as pd

# Pembersihan dari latihan sebelumnya
df = pd.read_csv("properti.csv")
df_bersih = df.drop_duplicates()
df_bersih["garasi"] = df_bersih["garasi"].fillna(0).astype(int)
df_bersih = df_bersih.dropna(subset=["harga_juta"])

ringkasan_lokasi = (
    df_bersih.groupby("lokasi")
    .agg(
        jumlah_rumah=("id_properti", "count"),
        median_harga=("harga_juta", "median"),
        rata_harga=("harga_juta", "mean"),
        rata_luas_bangunan=("luas_bangunan_m2", "mean"),
    )
    .round(1)
    .sort_values("median_harga", ascending=False)
    .reset_index()
)

ringkasan_lokasi
```

## checker
```python
import pandas as pd

KOLOM = ["lokasi", "jumlah_rumah", "median_harga", "rata_harga", "rata_luas_bangunan"]

wajib_variabel("ringkasan_lokasi", pd.DataFrame)
check("lokasi menjadi kolom biasa (pakai .reset_index())", "lokasi" in ringkasan_lokasi.columns,
      "Setelah groupby, lokasi menjadi index. Tambahkan .reset_index() di akhir rantai.")
cek_kolom(ringkasan_lokasi, KOLOM)
check("Satu baris untuk setiap lokasi (10 lokasi)", len(ringkasan_lokasi) == 10,
      f"ringkasan_lokasi punya {len(ringkasan_lokasi)} baris. Kelompokkan hanya berdasarkan \"lokasi\".")
if "jumlah_rumah" in ringkasan_lokasi.columns:
    total = pd.to_numeric(ringkasan_lokasi["jumlah_rumah"], errors="coerce").sum()
    check("Dihitung dari data bersih (total 175 rumah)", total == 175,
          f"Total jumlah_rumah = {total}. Pastikan groupby dilakukan pada df_bersih, bukan df mentah.")
if "median_harga" in ringkasan_lokasi.columns:
    check("Diurutkan dari median_harga terbesar",
          pd.to_numeric(ringkasan_lokasi["median_harga"], errors="coerce").is_monotonic_decreasing,
          "Gunakan .sort_values(\"median_harga\", ascending=False).")
if {"lokasi", "rata_harga", "median_harga"} <= set(ringkasan_lokasi.columns):
    ref = nilai_solusi("ringkasan_lokasi").set_index("lokasi")
    punyamu = ringkasan_lokasi.set_index("lokasi")
    tertukar = bool(((pd.to_numeric(punyamu["rata_harga"], errors="coerce") - ref["median_harga"]).abs() < 1).all())
    check("rata_harga (mean) dan median_harga (median) tidak tertukar", not tertukar,
          "Kolom rata_harga memakai fungsi \"mean\", median_harga memakai \"median\".")
bandingkan_variabel("ringkasan_lokasi", toleransi=1e-3,
                    label="Nilai ringkasan sesuai (selisih pembulatan ditoleransi)")
```

## hint-1
Starter sudah punya satu agregat di dalam `.agg(...)`. Tambahkan tiga agregat lagi dengan pola yang sama: `nama_kolom_hasil=("kolom_sumber", "fungsi")`, dipisahkan koma.

## hint-2
Setelah `.agg(...)`, sambung dengan `.round(1)`, lalu `.sort_values("median_harga", ascending=False)`, dan terakhir `.reset_index()`. Bungkus seluruh rantai dengan tanda kurung agar bisa ditulis beberapa baris.

## hint-3
```python
ringkasan_lokasi = (
    df_bersih.groupby("lokasi")
    .agg(
        jumlah_rumah=("id_properti", "count"),
        median_harga=("harga_juta", "median"),
        rata_harga=("harga_juta", ___),
        rata_luas_bangunan=(___, "mean"),
    )
    .round(1)
    .sort_values(___, ascending=False)
    .reset_index()
)
```

## pembahasan
- **Lokasi menentukan harga.** Median harga di **Jakarta Pusat 3.680 juta**, sekitar **4× lipat Bogor (912,5 juta)**. Padahal rata-rata luas bangunannya justru lebih kecil (107,6 m² vs 114,8 m²). Rata-rata luas bangunan semua wilayah mirip (96,5–121,9 m²), jadi selisih harga antar-wilayah bukan karena rumahnya lebih besar — **lokasi** berperan besar. Catat ini untuk latihan regresi nanti.
- **Mean vs median per kelompok.** Di Jakarta Timur rata-rata (1.943,8 juta) lebih tinggi 156 juta dari median (1.787,5 juta) — selisih terbesar di tabel. Penyebab utamanya satu rumah besar seharga 3.920 juta (R177, 5 kamar, 202 m²). Median lebih tahan terhadap pencilan seperti ini.
- **Selalu tampilkan jumlah data.** Jakarta Pusat hanya punya 9 rumah — sampel kecil, sehingga mediannya bisa berubah banyak ketika ada iklan baru. Kolom `jumlah_rumah` membantu pembaca menilai seberapa bisa dipercaya angkanya.
- **Kenapa `reset_index()`?** Setelah `groupby`, `lokasi` menjadi *index*. `reset_index()` mengembalikannya menjadi kolom biasa sehingga tabel mudah digrafikkan, digabung (`merge`), atau diekspor.
- Named aggregation (`nama=("kolom", "fungsi")`) langsung menghasilkan nama kolom yang rapi — tidak perlu `rename` lagi.
- **Coba sendiri:** bandingkan median per sertifikat dengan `df_bersih.groupby("sertifikat")["harga_juta"].median()`, lalu kelompokkan berdasarkan dua kolom sekaligus: `df_bersih.groupby(["lokasi", "sertifikat"])["harga_juta"].median()`. Median rumah SHM (1.605 juta) lebih tinggi daripada HGB (1.350 juta) dan Girik (1.025 juta, hanya 11 rumah).
