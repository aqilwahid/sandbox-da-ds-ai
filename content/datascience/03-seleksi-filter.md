---
id: ds-03-seleksi-filter
track: datascience
title: Memilih & Menyaring Data (Boolean Mask)
level: pemula
estimatedMinutes: 15
language: python
datasets: [properti]
concepts: [seleksi kolom, boolean mask, "operator & dan |", isin, kolom baru, sort_values]
prerequisites: [ds-02-dataframe]
---

## instruksi
Di SQL kita menyaring baris dengan `WHERE`. Di pandas caranya memakai **boolean mask**: sebuah Series berisi `True`/`False` — satu nilai untuk setiap baris. Baris yang `True` ikut, yang `False` dibuang.

```python
df["kamar_tidur"] >= 3        # Series True/False sepanjang 183 baris
df[df["kamar_tidur"] >= 3]    # hanya baris yang True
```

Beberapa syarat digabung dengan operator khusus pandas — padanannya di SQL:

| pandas | SQL | Arti |
|---|---|---|
| `(a) & (b)` | `a AND b` | keduanya benar |
| `(a) \| (b)` | `a OR b` | salah satu benar |
| `~(a)` | `NOT a` | kebalikannya |
| `df["lokasi"].isin(["Depok", "Bekasi"])` | `lokasi IN ('Depok', 'Bekasi')` | salah satu dari daftar |
| `df[["lokasi", "harga_juta"]]` | `SELECT lokasi, harga_juta` | pilih kolom (perhatikan kurung siku **ganda**) |
| `df.loc[mask, kolom]` | `SELECT kolom ... WHERE mask` | saring baris & pilih kolom sekaligus |
| `df.sort_values("x", ascending=False)` | `ORDER BY x DESC` | urutkan |
| `df["c"] = df["a"] / df["b"]` | `a / b AS c` | tambah kolom hasil hitungan |

> **Penting:** setiap kondisi **wajib dibungkus tanda kurung**, dan gunakan `&` / `|` — bukan `and` / `or`.

Alurnya: hitung kolom baru → saring → urutkan. Ikuti langkah demi langkah dan perhatikan baris mana yang bertahan:

```visual
jenis: transformasi
judul: Kolom baru → saring → urutkan
data:
  kolom: [id_properti, lokasi, kamar_tidur, luas_bangunan_m2, harga_juta]
  baris:
    - [R070, Depok, 3, 109, 770]
    - [R013, Depok, 5, 178, 2550]
    - [R040, Depok, 2, 104, 915]
    - [R097, Bekasi, 3, 104, 890]
    - [R028, Tangerang Selatan, 3, 120, 1915]
    - [R122, Tangerang, 3, 106, 905]
    - [R009, Jakarta Selatan, 3, 108, 2625]
    - [R012, Bekasi, 3, 100, 1105]
langkah:
  - operasi: kolom_baru
    nama: harga_per_m2
    rumus: "round(harga_juta / luas_bangunan_m2, 2)"
    kode: "df[\"harga_per_m2\"] = (df[\"harga_juta\"] / df[\"luas_bangunan_m2\"]).round(2)"
    penjelasan: Harga dibagi luas bangunan → juta rupiah per m². Rumah besar dan kecil jadi bisa dibandingkan secara adil.
  - operasi: filter
    kondisi:
      - {kolom: kamar_tidur, op: ">=", nilai: 3}
      - {kolom: lokasi, op: in, nilai: [Depok, Bekasi, Tangerang]}
      - {kolom: harga_juta, op: "<=", nilai: 1500}
    kode: "(df[\"kamar_tidur\"] >= 3) & (df[\"lokasi\"].isin([\"Depok\", \"Bekasi\", \"Tangerang\"])) & (df[\"harga_juta\"] <= 1500)"
    penjelasan: "Tiga syarat digabung dengan &, jadi semuanya harus benar. R040 gugur di syarat kamar; R013, R028, dan R009 gugur di syarat harga. R028 juga gagal di syarat lokasi karena isin() mencocokkan teks persis: Tangerang Selatan bukan Tangerang."
  - operasi: urut
    kolom: harga_per_m2
    arah: asc
    kode: ".sort_values(\"harga_per_m2\")"
    penjelasan: Rumah dengan harga per m² termurah ada di paling atas.
```

### Kasus
Pak Andi dan Bu Rina (keluarga muda, dua anak) meminta agen TokoKita Properti mencarikan rumah dengan syarat:
- minimal **3 kamar tidur**,
- di **Depok, Bekasi, atau Tangerang** (dekat kantor dan sekolah anak),
- harga **maksimal Rp1,5 miliar** (1.500 juta).

Mereka ingin tahu rumah mana yang paling **sepadan dengan harganya**, yaitu yang **harga per m² bangunannya paling murah**.

### Tugas
1. Tambahkan kolom `harga_per_m2` ke `df`: `harga_juta` ÷ `luas_bangunan_m2`, dibulatkan 2 desimal (`.round(2)`).
2. Buat boolean mask untuk ketiga syarat di atas (simpan di variabel, mis. `syarat`). Gunakan `.isin()` untuk lokasi.
3. Buat DataFrame `kandidat` berisi rumah yang lolos syarat, **hanya** dengan kolom `id_properti`, `lokasi`, `kamar_tidur`, `luas_bangunan_m2`, `harga_juta`, `harga_per_m2` (urutan kolom persis seperti itu), diurutkan dari `harga_per_m2` **termurah**.
4. Simpan banyaknya kandidat ke `jumlah_kandidat` dan `id_properti` rumah di baris teratas `kandidat` ke `rumah_terbaik` (petunjuk: `.iloc[0]`).

## starter
```python
import pandas as pd

df = pd.read_csv("properti.csv")

# Contoh 1: memilih beberapa kolom (kurung siku ganda)
tampilkan(df[["id_properti", "lokasi", "harga_juta"]].head(3), "Memilih kolom")

# Contoh 2: boolean mask = Series berisi True/False
mask_depok = df["lokasi"] == "Depok"
print("Jumlah rumah di Depok:", mask_depok.sum())

# TODO 1: tambahkan kolom harga_per_m2

# TODO 2-3: buat mask untuk ketiga syarat, lalu kandidat
kandidat = df[mask_depok]

# TODO 4
jumlah_kandidat = len(kandidat)
rumah_terbaik = ""

kandidat
```

## solusi
```python
import pandas as pd

df = pd.read_csv("properti.csv")

# 1) Kolom baru: harga per m² bangunan (juta rupiah)
df["harga_per_m2"] = (df["harga_juta"] / df["luas_bangunan_m2"]).round(2)

# 2) Boolean mask: setiap kondisi dibungkus kurung, digabung dengan &
syarat = (
    (df["kamar_tidur"] >= 3)
    & (df["lokasi"].isin(["Depok", "Bekasi", "Tangerang"]))
    & (df["harga_juta"] <= 1500)
)

# 3) Saring baris + pilih kolom sekaligus, lalu urutkan
kolom = ["id_properti", "lokasi", "kamar_tidur", "luas_bangunan_m2", "harga_juta", "harga_per_m2"]
kandidat = df.loc[syarat, kolom].sort_values("harga_per_m2")

# 4) Ringkasan untuk klien
jumlah_kandidat = len(kandidat)
rumah_terbaik = kandidat.iloc[0]["id_properti"]
print("Jumlah kandidat:", jumlah_kandidat, "| Rekomendasi utama:", rumah_terbaik)

kandidat
```

## checker
```python
import pandas as pd

KOLOM = ["id_properti", "lokasi", "kamar_tidur", "luas_bangunan_m2", "harga_juta", "harga_per_m2"]
LOKASI = ["Depok", "Bekasi", "Tangerang"]

wajib_variabel("df", pd.DataFrame)
cek_kolom(df, ["harga_per_m2"], label="Kolom baru `harga_per_m2` sudah ditambahkan ke df")
if "harga_per_m2" in df.columns:
    acuan = df["harga_juta"] / df["luas_bangunan_m2"]
    beda = (pd.to_numeric(df["harga_per_m2"], errors="coerce") - acuan).abs()
    check("harga_per_m2 = harga_juta ÷ luas_bangunan_m2 (juta rupiah per m²)",
          bool((beda[acuan.notna()] <= 0.006).all()),
          "Hitung df[\"harga_juta\"] / df[\"luas_bangunan_m2\"], lalu bulatkan dengan .round(2).")

wajib_variabel("kandidat", pd.DataFrame)
check("kandidat hanya berisi 6 kolom yang diminta, dengan urutan yang sama",
      list(kandidat.columns) == KOLOM,
      f"Kolom kandidat sekarang: {list(kandidat.columns)}. Pilih kolom dengan df.loc[syarat, kolom].")

if {"kamar_tidur", "lokasi", "harga_juta"} <= set(kandidat.columns):
    masalah = []
    n = int((kandidat["kamar_tidur"] < 3).sum())
    if n:
        masalah.append(f"{n} rumah kamarnya kurang dari 3")
    n = int((~kandidat["lokasi"].isin(LOKASI)).sum())
    if n:
        masalah.append(f"{n} rumah di luar Depok/Bekasi/Tangerang")
    n = int((~(kandidat["harga_juta"] <= 1500)).sum())
    if n:
        masalah.append(f"{n} rumah harganya di atas 1.500 juta (atau kosong)")
    check("Semua baris kandidat memenuhi ketiga syarat", not masalah,
          "Masih ada: " + "; ".join(masalah) +
          ". Bungkus setiap kondisi dengan kurung dan gabungkan dengan & (bukan |, and, atau or).")

ref = nilai_solusi("kandidat")
if "id_properti" in kandidat.columns:
    hilang = sorted(set(ref["id_properti"]) - set(kandidat["id_properti"]))
    check("Tidak ada rumah memenuhi syarat yang terlewat", not hilang,
          f"{len(hilang)} rumah memenuhi syarat tetapi belum ada di kandidat, mis. {', '.join(hilang[:3])}. "
          "Cek operatornya: 'minimal 3' ditulis >= 3 dan 'maksimal 1.500' ditulis <= 1500.")

if "harga_per_m2" in kandidat.columns:
    check("kandidat diurutkan dari harga_per_m2 termurah",
          pd.to_numeric(kandidat["harga_per_m2"], errors="coerce").dropna().is_monotonic_increasing,
          "Gunakan .sort_values(\"harga_per_m2\") — bawaannya ascending (kecil → besar).")

if list(kandidat.columns) == KOLOM:
    # Duplikat diabaikan: membuang baris kembar dengan drop_duplicates() juga benar.
    punyamu = kandidat.drop_duplicates().reset_index(drop=True)
    kunci = ref.drop_duplicates().reset_index(drop=True)
    sama = (len(punyamu) == len(kunci)
            and punyamu["id_properti"].tolist() == kunci["id_properti"].tolist()
            and bool(((pd.to_numeric(punyamu["harga_per_m2"], errors="coerce")
                       - kunci["harga_per_m2"]).abs() <= 0.006).all()))
    check("Isi & urutan kandidat sesuai hasil yang diharapkan", sama,
          "Ikuti urutan langkahnya: tambah kolom → saring dengan mask → pilih kolom → urutkan.")

wajib_variabel("jumlah_kandidat")
check("jumlah_kandidat = banyaknya baris kandidat", jumlah_kandidat == len(kandidat),
      f"jumlah_kandidat = {jumlah_kandidat}, padahal kandidat punya {len(kandidat)} baris. Gunakan len(kandidat).")

wajib_variabel("rumah_terbaik")
bandingkan_variabel("rumah_terbaik", label="rumah_terbaik = id_properti di baris teratas kandidat")
```

## hint-1
Kerjakan bertahap dan jalankan setiap langkah. Mulai dari satu syarat, misalnya `df[df["kamar_tidur"] >= 3]`, lalu tambahkan syarat berikutnya dengan `&`. Untuk "salah satu dari beberapa lokasi", gunakan `df["lokasi"].isin([...])`.

## hint-2
Pembagian dua kolom menghasilkan Series baru yang bisa langsung disimpan sebagai kolom:

```python
df["harga_per_m2"] = (df["harga_juta"] / df["luas_bangunan_m2"]).round(2)
```

Untuk menyaring baris **dan** memilih kolom sekaligus: `df.loc[syarat, daftar_kolom]`.

## hint-3
```python
syarat = (
    (df["kamar_tidur"] >= 3)
    & (df["lokasi"].isin(___))          # isi: list tiga lokasi
    & (df["harga_juta"] <= 1500)
)
kolom = ["id_properti", "lokasi", "kamar_tidur", "luas_bangunan_m2", "harga_juta", "harga_per_m2"]
kandidat = df.loc[syarat, kolom].sort_values(___)   # isi: nama kolom pengurut

jumlah_kandidat = len(kandidat)
rumah_terbaik = kandidat.iloc[0]["id_properti"]
```

## pembahasan
- Ada **24 baris** kandidat. Rekomendasi utama: **R070 di Depok** — 3 kamar, 109 m², 770 juta, hanya **7,06 juta/m²**. Itu kurang dari separuh median harga per m² seluruh data (14,33 juta/m²).
- Perhatikan, **R121 muncul dua kali** di hasil! Data mentah masih mengandung baris duplikat — klien bisa bingung melihat "rumah kembar". Kita membereskannya di latihan berikutnya. (Jika kamu sudah memakai `drop_duplicates()` dan mendapat 23 baris, itu juga benar.)
- **Jebakan urutan operator:** `&` lebih kuat daripada `|`. Kode `(df["kamar_tidur"] >= 3) & (df["lokasi"] == "Depok") | (df["lokasi"] == "Bekasi") | (df["lokasi"] == "Tangerang") & (df["harga_juta"] <= 1500)` dibaca Python sebagai "3+ kamar di Depok, **atau semua rumah Bekasi**, atau rumah Tangerang ≤ 1,5 M" → 57 baris, termasuk rumah Bekasi seharga 2 miliar. `.isin()` menghindari jebakan ini.
- **Lupa kurung** bisa berbahaya. `df["kamar_tidur"] >= 3 & df["harga_juta"] <= 1500` langsung error (`TypeError: Cannot perform 'rand_' ...`) karena Python menghitung `3 & df["harga_juta"]` lebih dulu. Lebih parah, `df[df["kamar_tidur"] >= 3 & df["lokasi"].isin(["Depok"])]` **tidak error** tetapi diam-diam mengembalikan semua 183 baris!
- Memakai `and`/`or` menghasilkan `ValueError: The truth value of a Series is ambiguous` — `and`/`or` hanya bekerja untuk **satu** nilai True/False, sedangkan mask berisi 183 nilai.
- `.isin()` mencocokkan teks **persis**: `"Tangerang"` tidak mencakup `"Tangerang Selatan"`. Jika klien juga mau Tangerang Selatan, tambahkan ke daftar secara eksplisit.
- `df.loc[syarat, kolom]` menyaring dan memilih kolom dalam satu langkah. Hasilnya sama dengan `df[syarat][kolom]`, tetapi lebih ringkas dan jelas maksudnya: `.loc[baris, kolom]`.
