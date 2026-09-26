---
id: ds-02-dataframe
track: datascience
title: Mengenal DataFrame — Membaca Data Harga Rumah
level: pemula
estimatedMinutes: 12
language: python
datasets: [properti]
concepts: [pandas, read_csv, DataFrame, Series, shape, dtypes, describe, mean vs median]
prerequisites: [ds-01-python-dasar]
---

## instruksi
TokoKita sedang merintis layanan baru: **TokoKita Properti**, marketplace iklan rumah di Jabodetabek. Sebelum membangun fitur apa pun, tim harus **mengenal datanya** dulu.

Untuk data berbentuk tabel, analis Python memakai library **pandas**. Objek utamanya adalah **DataFrame** — tabel dengan baris dan kolom, mirip satu sheet Excel:

```visual
jenis: tabel
judul: Anatomi DataFrame
kolom: [id_properti, lokasi, kamar_tidur, luas_bangunan_m2, harga_juta]
baris:
  - [R001, Jakarta Barat, 2, 107, 2665]
  - [R002, Bekasi, 5, 185, 2025]
  - [R003, Jakarta Barat, 2, 60, 1355]
  - [R004, Jakarta Timur, 3, 82, 1325]
  - [R005, Jakarta Utara, 3, 89, 1570]
tampilkan_index: true
sorot_kolom: [harga_juta]
sorot_baris: [1]
label_kolom: "Satu kolom = Series → df[\"harga_juta\"]"
label_baris: "Satu baris = satu rumah → df.loc[1]"
keterangan: "5 baris pertama properti.csv (sebagian kolom). Angka 0, 1, 2, … di kiri adalah index, yaitu label baris yang dimulai dari 0."
```

Perintah pertama yang hampir selalu dijalankan analis saat menerima data baru:

| Kode | Fungsi |
|---|---|
| `pd.read_csv("properti.csv")` | Membaca file CSV menjadi DataFrame |
| `df.head()` | Menampilkan 5 baris pertama (`df.head(10)` → 10 baris) |
| `df.shape` | Ukuran tabel `(jumlah_baris, jumlah_kolom)` — **tanpa** tanda kurung karena atribut, bukan fungsi |
| `df.dtypes` | Tipe data tiap kolom: `int64` (bilangan bulat), `float64` (desimal), `str` (teks) |
| `df.describe()` | Statistik ringkas kolom angka: `count`, `mean`, `std`, `min`, kuartil (`25%`, `50%` = median, `75%`), `max` |
| `df["harga_juta"]` | Mengambil satu kolom → **Series** |
| `.mean()` / `.median()` | Rata-rata / nilai tengah sebuah Series |

**Rata-rata (mean) vs median.** Mean = total ÷ banyaknya data. Median = nilai **tengah** setelah data diurutkan. Contoh 5 rumah seharga 800, 900, 1.000, 1.100, dan 5.000 juta: rata-ratanya 1.760 juta, padahal 4 dari 5 rumah harganya ≤ 1.100 juta. Mediannya 1.000 juta — jauh lebih mewakili rumah "pada umumnya". Satu rumah mewah cukup untuk "menarik" rata-rata ke atas.

### Kasus
Tim produk TokoKita Properti menerima file `properti.csv` berisi iklan rumah. Mereka bertanya: berapa banyak datanya, kolom apa saja isinya, dan **berapa harga rumah pada umumnya**?

### Tugas
1. Jalankan kode awal: file `properti.csv` dibaca ke variabel `df` dan 5 baris pertamanya ditampilkan.
2. Simpan jumlah baris dan jumlah kolom `df` ke variabel `jumlah_baris` dan `jumlah_kolom` (petunjuk: `df.shape`).
3. Tampilkan tipe data tiap kolom dengan `tampilkan(df.dtypes, "Tipe data")`, lalu simpan hasil `df.describe()` ke variabel `statistik` dan tampilkan juga. Perhatikan baris `count`: apakah semua kolom terisi penuh?
4. Ambil kolom `harga_juta` sebagai **Series** ke variabel `harga` (satu pasang kurung siku).
5. Hitung rata-rata harga ke `rata_rata_harga` (boleh dibulatkan 1 desimal dengan `round(..., 1)`) dan nilai tengahnya ke `median_harga`. Mana yang lebih besar?

> **Tips:** `tampilkan(obj, "judul")` menampilkan beberapa tabel sekaligus di panel **Hasil**. Baris terakhir yang berupa nilai (di sini `df.head()`) juga ditampilkan otomatis.

## starter
```python
import pandas as pd

# 1) Baca file CSV menjadi DataFrame
df = pd.read_csv("properti.csv")

# TODO 2: ukuran tabel
jumlah_baris = 0
jumlah_kolom = 0

# TODO 3: tipe data & statistik ringkas
statistik = None

# TODO 4-5: kolom harga, rata-rata, dan median
harga = None
rata_rata_harga = 0
median_harga = 0

df.head()
```

## solusi
```python
import pandas as pd

# 1) Baca file CSV menjadi DataFrame
df = pd.read_csv("properti.csv")

# 2) Ukuran tabel: shape = (baris, kolom)
jumlah_baris, jumlah_kolom = df.shape
print("Ukuran data:", jumlah_baris, "baris x", jumlah_kolom, "kolom")

# 3) Tipe data & statistik ringkas
tampilkan(df.dtypes, "Tipe data")
statistik = df.describe()
tampilkan(statistik, "Statistik ringkas kolom angka")

# 4-5) Satu kolom = Series, lalu hitung ukuran pemusatannya
harga = df["harga_juta"]
rata_rata_harga = round(harga.mean(), 1)
median_harga = harga.median()
print(f"Rata-rata harga: {rata_rata_harga} juta | Median harga: {median_harga} juta")

df.head()
```

## checker
```python
import pandas as pd


def _angka(v):
    try:
        return float(v)
    except Exception:
        return float("nan")


def _ada(tabel, baris, kolom):
    return (kolom in tabel.columns and baris in tabel.index) or \
           (kolom in tabel.index and baris in tabel.columns)


wajib_variabel("df", pd.DataFrame)
check("df berisi seluruh isi properti.csv (183 baris × 11 kolom)", df.shape == (183, 11),
      f"Ukuran df sekarang {df.shape}. Baca dengan pd.read_csv(\"properti.csv\") tanpa diubah.")

wajib_variabel("jumlah_baris")
wajib_variabel("jumlah_kolom")
bandingkan_variabel("jumlah_baris", label="jumlah_baris = banyaknya baris (elemen pertama df.shape)")
bandingkan_variabel("jumlah_kolom", label="jumlah_kolom = banyaknya kolom (elemen kedua df.shape)")

wajib_variabel("statistik", pd.DataFrame)
check("statistik berisi hasil df.describe()",
      _ada(statistik, "mean", "harga_juta") and _ada(statistik, "50%", "harga_juta"),
      "Isi statistik dengan df.describe() — tabel berisi baris count, mean, std, min, 25%, 50%, 75%, max.")

wajib_variabel("harga", pd.Series,
               label="harga berupa Series (satu pasang kurung siku: df[\"harga_juta\"])")
check("harga adalah kolom harga_juta", harga.name == "harga_juta",
      f"Series harga sekarang berasal dari kolom {harga.name!r}. Ambil dengan df[\"harga_juta\"].")

wajib_variabel("rata_rata_harga")
target = float(nilai_solusi("harga").mean())
nilai = _angka(rata_rata_harga)
salah_bagi = float(nilai_solusi("harga").sum()) / len(nilai_solusi("df"))
if abs(nilai - salah_bagi) < 0.5:
    pesan = ("Sepertinya kamu membagi total harga dengan semua baris (183), padahal ada harga yang kosong. "
             "Gunakan harga.mean() — nilai kosong otomatis dilewati.")
else:
    pesan = f"Nilaimu {rata_rata_harga}, seharusnya sekitar {target:.1f}. Gunakan harga.mean()."
check("rata_rata_harga = rata-rata harga_juta (boleh dibulatkan)", abs(nilai - target) <= 0.5, pesan)

wajib_variabel("median_harga")
bandingkan_variabel("median_harga", label="median_harga = nilai tengah harga_juta")
```

## hint-1
Tidak perlu loop: semua jawaban sudah tersedia sebagai **atribut** atau **metode** DataFrame dan Series. Ukuran tabel ada di `df.shape`, statistik ringkas dari `df.describe()`, dan satu kolom diambil dengan satu pasang kurung siku.

## hint-2
`df.shape` menghasilkan *tuple* `(baris, kolom)` yang bisa langsung "dibongkar" ke dua variabel: `a, b = df.shape` (alternatif: `len(df)` untuk jumlah baris). Kolom `df["harga_juta"]` berupa **Series** yang punya metode statistik siap pakai: `.mean()`, `.median()`, `.min()`, `.max()`, `.count()`.

## hint-3
```python
jumlah_baris, jumlah_kolom = df.shape

tampilkan(df.dtypes, "Tipe data")
statistik = df.describe()
tampilkan(statistik, "Statistik ringkas")

harga = df["harga_juta"]
rata_rata_harga = round(harga.___(), 1)   # isi: metode rata-rata
median_harga = harga.___()                # isi: metode nilai tengah
```

## pembahasan
- **183 baris × 11 kolom**: 183 iklan rumah, masing-masing dengan 11 informasi. `df.shape` ditulis tanpa `()` karena atribut, bukan fungsi.
- **Tipe data:** `id_properti`, `lokasi`, dan `sertifikat` bertipe `str` (teks); sisanya angka. Perhatikan `garasi` bertipe `float64` padahal isinya jumlah mobil (bilangan bulat) — ini tanda ada **nilai kosong**. `NaN` (penanda sel kosong) adalah angka desimal, sehingga kolom bilangan bulat yang punya sel kosong otomatis disimpan sebagai `float64`.
- **Baris `count` di `describe()`** membongkar masalahnya: `garasi` hanya terisi 168 dan `harga_juta` 177 dari 183 baris. Data ini "kotor" (nanti ketahuan juga ada baris duplikat) — kita bersihkan di latihan Data Cleaning.
- **Rata-rata 1.786,4 juta vs median 1.525 juta.** Rata-rata ±261 juta lebih tinggi karena segelintir rumah sangat mahal (termahal 5.350 juta di Jakarta Pusat; ada 20 rumah di atas 3 miliar) menarik rata-rata ke atas. Buktinya, dari 177 baris yang harganya tercatat, hanya 71 (±40%) yang harganya di atas rata-rata. Untuk menjawab "harga rumah pada umumnya", **median lebih jujur**. Data seperti ini disebut *miring ke kanan* (right-skewed) — bentuknya akan terlihat jelas di latihan visualisasi.
- **Jebakan:** `harga.sum() / len(df)` menghasilkan 1.727,8 juta — salah, karena membagi dengan 183 baris padahal hanya 177 harga yang terisi. `.mean()` otomatis melewati nilai kosong.
- `df["harga_juta"]` (satu pasang kurung) menghasilkan **Series**; `df[["harga_juta"]]` (dua pasang) menghasilkan **DataFrame** berisi satu kolom. Bedanya penting saat memanggil metode berikutnya.
