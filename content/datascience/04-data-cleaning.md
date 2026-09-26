---
id: ds-04-data-cleaning
track: datascience
title: Membersihkan Data Kotor (Nilai Kosong & Duplikat)
level: menengah
estimatedMinutes: 15
language: python
datasets: [properti]
concepts: [isna, duplicated, drop_duplicates, fillna, dropna, astype, kualitas data]
prerequisites: [ds-03-seleksi-filter]
---

## instruksi
Data asli hampir tidak pernah bersih. Di dua latihan sebelumnya kita sudah melihat gejalanya: `describe()` menunjukkan kolom yang tidak terisi penuh, dan rumah R121 muncul dua kali di daftar kandidat. Sebelum dianalisis atau dipakai melatih model, data perlu **diperiksa lalu dibersihkan**.

| Kode | Fungsi |
|---|---|
| `df.isna().sum()` | Jumlah nilai kosong (`NaN`) di setiap kolom |
| `df.duplicated().sum()` | Jumlah baris yang merupakan salinan persis baris sebelumnya |
| `df.drop_duplicates()` | Membuang baris duplikat (kemunculan pertama dipertahankan) |
| `df["kol"].fillna(nilai)` | Mengisi nilai kosong dengan nilai tertentu |
| `df.dropna(subset=["kol"])` | Membuang baris yang kosong **di kolom tertentu saja** |
| `df["kol"].astype(int)` | Mengubah tipe data, mis. desimal → bilangan bulat |

Setiap langkah cleaning adalah **keputusan** yang harus bisa dijelaskan ke tim:

| Masalah | Keputusan | Alasan |
|---|---|---|
| Baris duplikat | Hapus | Iklan yang sama terunggah dua kali. Jika dibiarkan, rumah itu terhitung dua kali di rata-rata maupun di model. |
| `garasi` kosong | Isi `0` | **Asumsi**: pengiklan mengosongkan kolom garasi karena rumahnya memang tidak punya garasi. Asumsi ini perlu dicatat dan dikonfirmasi ke tim pembuat form iklan. |
| `harga_juta` kosong | Hapus barisnya | Harga adalah **target** yang ingin kita analisis dan prediksi. Mengisinya dengan tebakan (mis. rata-rata) sama saja dengan mengarang data. |

```visual
jenis: transformasi
judul: Tiga langkah pembersihan
data:
  kolom: [id_properti, lokasi, luas_bangunan_m2, garasi, harga_juta]
  baris:
    - [R018, Bekasi, 108, null, null]
    - [R053, Jakarta Selatan, 89, null, 2280]
    - [R055, Depok, 103, null, 1095]
    - [R065, Bekasi, 93, 1, 1100]
    - [R039, Jakarta Pusat, 156, 1, null]
    - [R065, Bekasi, 93, 1, 1100]
    - [R018, Bekasi, 108, null, null]
langkah:
  - operasi: hapus_duplikat
    kode: "df_bersih = df.drop_duplicates()"
    penjelasan: Salinan kedua R065 dan R018 dibuang; kemunculan pertamanya tetap ada.
  - operasi: isi_kosong
    kolom: garasi
    nilai: 0
    kode: "df_bersih[\"garasi\"] = df_bersih[\"garasi\"].fillna(0).astype(int)"
    penjelasan: Garasi kosong dianggap 0 (asumsi), lalu tipenya dikembalikan ke bilangan bulat.
  - operasi: hapus_kosong
    kolom: [harga_juta]
    kode: "df_bersih = df_bersih.dropna(subset=[\"harga_juta\"])"
    penjelasan: Hanya baris tanpa harga yang dibuang. Perhatikan R018 — duplikat sekaligus tanpa harga.
```

> **Penting:** di pandas 3 (versi yang dipakai sandbox ini), `df["garasi"].fillna(0, inplace=True)` **tidak mengubah apa pun** — hanya muncul peringatan `ChainedAssignmentError`. Selalu tulis ulang kolomnya: `df["garasi"] = df["garasi"].fillna(0)`.

### Kasus
Tim data TokoKita Properti akan membangun fitur estimasi harga. Manajer data meminta dua hal: **dataset yang sudah bersih**, dan **laporan kualitas data** singkat — berapa masalah yang ditemukan dan berapa baris yang tersisa.

### Tugas
1. Hitung jumlah nilai kosong per kolom di data mentah `df`, simpan ke `jumlah_kosong` (Series berisi **semua** kolom, termasuk yang nol). Kolom mana saja yang bermasalah?
2. Hitung jumlah baris duplikat di `df`, simpan ke `jumlah_duplikat`.
3. Buat `df_bersih` dari `df` (jangan menimpa `df`) dengan urutan:
   1. hapus baris duplikat,
   2. isi `garasi` yang kosong dengan `0`, lalu ubah ke bilangan bulat (`astype(int)`),
   3. hapus baris yang `harga_juta`-nya kosong.
4. Buat dictionary `laporan` dengan kunci:
   - `"baris_awal"` — jumlah baris `df`
   - `"duplikat"` — jumlah baris duplikat
   - `"garasi_kosong"` dan `"harga_kosong"` — jumlah nilai kosong **di data mentah** (ambil dari `jumlah_kosong`)
   - `"baris_akhir"` — jumlah baris `df_bersih`

## starter
```python
import pandas as pd

df = pd.read_csv("properti.csv")   # data mentah — jangan ditimpa

# Intip dulu: rumah yang harganya kosong
tampilkan(df[df["harga_juta"].isna()], "Rumah dengan harga kosong")

# TODO 1-2: deteksi masalah
jumlah_kosong = None
jumlah_duplikat = None

# TODO 3: bersihkan (hapus duplikat → isi garasi → hapus harga kosong)
df_bersih = df.copy()

# TODO 4: laporan kualitas data
laporan = {}

print("Ukuran data mentah:", df.shape)
print("Ukuran data bersih:", df_bersih.shape)
```

## solusi
```python
import pandas as pd

df = pd.read_csv("properti.csv")   # data mentah — jangan ditimpa

# 1-2) Deteksi masalah
jumlah_kosong = df.isna().sum()
jumlah_duplikat = int(df.duplicated().sum())
tampilkan(jumlah_kosong[jumlah_kosong > 0], "Kolom yang punya nilai kosong")
tampilkan(df[df.duplicated(keep=False)], "Baris duplikat (semua salinan)")

# 3) Bersihkan
df_bersih = df.drop_duplicates()
df_bersih["garasi"] = df_bersih["garasi"].fillna(0).astype(int)   # asumsi: kosong = tidak punya garasi
df_bersih = df_bersih.dropna(subset=["harga_juta"])                 # harga = target, jangan dikarang

# 4) Laporan kualitas data
laporan = {
    "baris_awal": len(df),
    "duplikat": jumlah_duplikat,
    "garasi_kosong": int(jumlah_kosong["garasi"]),
    "harga_kosong": int(jumlah_kosong["harga_juta"]),
    "baris_akhir": len(df_bersih),
}

print("Ukuran data mentah:", df.shape)
print("Ukuran data bersih:", df_bersih.shape)
laporan
```

## checker
```python
import pandas as pd

wajib_variabel("df", pd.DataFrame)
check("df tetap berisi data mentah (183 baris)", len(df) == 183,
      f"df sekarang {len(df)} baris. Jangan menimpa df — simpan hasil pembersihan di variabel baru df_bersih.")

wajib_variabel("jumlah_kosong", pd.Series)
if len(jumlah_kosong) < df.shape[1]:
    check("jumlah_kosong = jumlah nilai kosong per kolom, df.isna().sum()", False,
          f"jumlah_kosong baru berisi {len(jumlah_kosong)} kolom, seharusnya {df.shape[1]}. "
          "Simpan hasil df.isna().sum() apa adanya (semua kolom), jangan disaring dulu.")
else:
    bandingkan_variabel("jumlah_kosong", label="jumlah_kosong = jumlah nilai kosong per kolom, df.isna().sum()")

wajib_variabel("jumlah_duplikat")
bandingkan_variabel("jumlah_duplikat", label="jumlah_duplikat = banyaknya baris duplikat, df.duplicated().sum()")

wajib_variabel("df_bersih", pd.DataFrame)
ref_bersih = nilai_solusi("df_bersih")
check("Tidak ada baris duplikat di df_bersih", not df_bersih.duplicated().any(),
      "Buang baris kembar dengan .drop_duplicates().")
garasi_lengkap = False
if "garasi" in df_bersih.columns:
    n_kosong = int(df_bersih["garasi"].isna().sum())
    garasi_lengkap = n_kosong == 0
    if n_kosong and "inplace" in kode:
        pesan = ("fillna(..., inplace=True) tidak menyimpan perubahan di pandas 3. Tulis ulang kolomnya: "
                 "df_bersih[\"garasi\"] = df_bersih[\"garasi\"].fillna(0).astype(int)")
    else:
        pesan = f"Masih ada {n_kosong} garasi kosong. Isi dengan df_bersih[\"garasi\"].fillna(0)."
    check("Tidak ada garasi yang kosong", garasi_lengkap, pesan)
    check("Kolom garasi bertipe bilangan bulat", pd.api.types.is_integer_dtype(df_bersih["garasi"]),
          f"Tipe garasi sekarang {df_bersih['garasi'].dtype}. Setelah fillna(0), tambahkan .astype(int).")
if "harga_juta" in df_bersih.columns:
    n_kosong = int(df_bersih["harga_juta"].isna().sum())
    check("Tidak ada harga yang kosong", n_kosong == 0,
          f"Masih ada {n_kosong} harga kosong. Buang barisnya dengan dropna(subset=[\"harga_juta\"]) — "
          "harga adalah target, jangan diisi tebakan.")

n, n_ref = len(df_bersih), len(ref_bersih)
if n == 162:
    pesan = ("Sepertinya kamu memakai dropna() tanpa subset — rumah yang harganya lengkap tetapi garasinya "
             "kosong ikut terbuang. Gunakan dropna(subset=[\"harga_juta\"]).")
else:
    pesan = (f"df_bersih punya {n} baris, seharusnya {n_ref}. Ikuti urutannya: drop_duplicates() → "
             "isi garasi → dropna(subset=[\"harga_juta\"]).")
check(f"Jumlah baris df_bersih sesuai ({n_ref})", n == n_ref, pesan)
if n == n_ref and garasi_lengkap:
    check("Garasi yang kosong diisi 0 (asumsi: tidak punya garasi)",
          int((df_bersih["garasi"] == 0).sum()) == int((ref_bersih["garasi"] == 0).sum()),
          "Isi dengan 0 sesuai keputusan di instruksi, bukan dengan rata-rata atau median.")
bandingkan_variabel("df_bersih", label="Isi df_bersih sesuai hasil yang diharapkan")

wajib_variabel("laporan", dict)
KUNCI = ["baris_awal", "duplikat", "garasi_kosong", "harga_kosong", "baris_akhir"]
check("laporan punya 5 kunci yang diminta", sorted(map(str, laporan)) == sorted(KUNCI),
      f"Kunci sekarang: {list(laporan)}. Yang diminta: {KUNCI}.")
if laporan.get("garasi_kosong") == 14 or laporan.get("harga_kosong") == 5:
    check("Nilai kosong di laporan dihitung dari data mentah", False,
          "Hitung dari df sebelum dibersihkan (mis. jumlah_kosong[\"garasi\"]), bukan setelah drop_duplicates().")
bandingkan_variabel("laporan", label="Angka-angka di laporan sesuai")
```

## hint-1
`df.isna()` menghasilkan tabel `True`/`False` (True = kosong). Karena `True` dihitung sebagai 1, `.sum()` langsung memberi jumlah nilai kosong per kolom. Pola yang sama berlaku untuk `df.duplicated().sum()`.

## hint-2
Setiap langkah menghasilkan DataFrame baru, jadi simpan ulang hasilnya:

```python
df_bersih = df.drop_duplicates()
df_bersih["garasi"] = df_bersih["garasi"].fillna(0).astype(int)
df_bersih = df_bersih.dropna(subset=["harga_juta"])
```

## hint-3
```python
jumlah_kosong = df.isna().sum()
jumlah_duplikat = int(df.duplicated().sum())

# ... tiga langkah pembersihan dari hint-2 ...

laporan = {
    "baris_awal": len(df),
    "duplikat": jumlah_duplikat,
    "garasi_kosong": int(jumlah_kosong["garasi"]),
    "harga_kosong": ___,     # isi: pola yang sama seperti garasi_kosong
    "baris_akhir": ___,      # isi: jumlah baris df_bersih
}
```

## pembahasan
- **Temuan:** 15 `garasi` kosong, 6 `harga_juta` kosong, dan 3 baris duplikat (R018, R065, R121 — ketiganya iklan Bekasi yang terunggah dua kali). Setelah dibersihkan tersisa **175 dari 183 baris**.
- **Teka-teki:** 183 − 3 duplikat − 6 harga kosong = 174, tetapi hasilnya 175. Kenapa? **R018 duplikat sekaligus tidak punya harga** — satu baris punya dua masalah. Setelah duplikat dibuang, hanya tersisa 5 baris tanpa harga. Karena itu laporan kualitas data sebaiknya mencatat angka *sebelum* dan *sesudah*, bukan sekadar menjumlahkan masalah.
- **Uji asumsimu dengan data.** Median harga 13 rumah yang garasinya kosong 1.690 juta — lebih mirip rumah bergarasi 1 (1.605 juta) daripada rumah tanpa garasi (1.217,5 juta). Sampelnya kecil, tetapi ini petunjuk bahwa asumsi "kosong = tidak punya garasi" belum tentu benar; mengisi dengan nilai yang paling sering muncul (1) juga masuk akal. Inilah alasan setiap asumsi harus ditulis dan dikonfirmasi ke pemilik data.
- **Jebakan `dropna()` tanpa `subset`:** jika dijalankan sebelum garasi diisi, rumah yang harganya lengkap tetapi garasinya kosong ikut terbuang → hanya 162 baris tersisa (13 rumah valid hilang percuma).
- **Jebakan `inplace`:** `df_bersih["garasi"].fillna(0, inplace=True)` tidak menyimpan perubahan di pandas 3. Pola aman: `df_bersih["garasi"] = df_bersih["garasi"].fillna(0)`.
- Setelah tidak ada `NaN`, kolom `garasi` bisa kembali menjadi bilangan bulat dengan `astype(int)` — ingat, `NaN` itulah yang membuatnya bertipe `float64`.
- `drop_duplicates()` membandingkan **semua kolom**. Jika yang penting hanya ID-nya (mis. iklan yang diperbarui harganya), gunakan `drop_duplicates(subset=["id_properti"], keep="last")`.
