---
id: ds-07-regresi
track: datascience
title: Memprediksi Harga Rumah (Regresi Linear)
level: lanjut
estimatedMinutes: 20
language: python
datasets: [properti]
concepts: [regresi linear, feature engineering, train_test_split, LinearRegression, MAE, R², koefisien]
prerequisites: [ds-06-visualisasi]
---

## instruksi
**Regresi linear** mencari garis lurus yang paling dekat dengan titik-titik data. Garis itu dipakai untuk menebak angka baru — di sini harga rumah. Coba geser garis di bawah: selisih vertikal antara titik dan garis disebut **residual** (kesalahan tebakan). Garis terbaik adalah yang membuat **jumlah kuadrat residual** paling kecil (metode *least squares*); di visual ini ukurannya ditampilkan sebagai MSE (*Mean Squared Error*).

```visual
jenis: regresi
judul: Mencari garis terbaik
x_label: Luas bangunan (m²)
y_label: Harga (juta Rp)
titik: [[51, 755], [82, 1100], [82, 1400], [106, 1605], [120, 1915], [127, 2305], [141, 2790], [175, 2875]]
keterangan: "8 rumah asli di Tangerang Selatan dari properti.csv."
```

Dengan banyak fitur sekaligus, modelnya menjadi:

`harga ≈ b₀ + b₁·luas_bangunan + b₂·luas_tanah + b₃·kamar_tidur + b₄·jarak + b₅·usia`

Model **belajar** nilai koefisien `b` dari data. Tetapi model harus diuji dengan rumah yang **belum pernah dilihatnya** — seperti ujian dengan soal baru, bukan soal latihan. Karena itu data dibagi dua:

```visual
jenis: split-data
judul: Data latih vs data uji
n: 40
test_size: 0.2
keterangan: "Ilustrasi 40 rumah. Di latihan ini 175 rumah dibagi menjadi 140 rumah latih dan 35 rumah uji."
```

```visual
jenis: alur
judul: Alur kerja model machine learning
langkah:
  - {judul: Siapkan X & y, isi: "X = tabel fitur (informasi rumah), y = target yang ingin ditebak (harga_juta)"}
  - {judul: Bagi data, isi: "train_test_split(X, y, test_size=0.2, random_state=42)"}
  - {judul: Latih, isi: "model.fit(X_train, y_train) — model mencari koefisien terbaik dari data latih"}
  - {judul: Prediksi, isi: "y_pred = model.predict(X_test) — menebak harga rumah yang belum pernah dilihat"}
  - {judul: Evaluasi, isi: "Bandingkan y_pred dengan y_test memakai MAE dan R²"}
```

Dua ukuran kualitas model regresi:

| Metrik | Arti | Cara membaca |
|---|---|---|
| **MAE** (*Mean Absolute Error*) | Rata-rata selisih mutlak antara harga asli dan tebakan | Satuannya sama dengan target: "rata-rata meleset ±X juta". Makin kecil makin baik |
| **R²** | Seberapa besar variasi harga yang bisa dijelaskan model | 1 = sempurna; 0 = sama saja dengan selalu menebak rata-rata; negatif = lebih buruk lagi |

> **Tips:** `random_state=42` membuat pembagian acak selalu sama setiap kali dijalankan — hasilmu bisa dibandingkan dengan hasil teman (dan dengan kunci jawaban).

### Kasus
TokoKita Properti ingin membuat fitur **Estimasi Harga Otomatis**: penjual cukup mengisi luas, jumlah kamar, jarak ke pusat kota, dan tahun dibangun, lalu sistem menyarankan harga jual. Kita buat versi pertamanya dengan regresi linear dan ukur seberapa jauh tebakannya meleset.

### Tugas
1. Tambahkan kolom `usia_bangunan` ke `df_bersih`: `2026 - tahun_dibangun` (*feature engineering* — tahun diubah menjadi umur yang lebih bermakna).
2. Buat `X` dari lima fitur `luas_bangunan_m2`, `luas_tanah_m2`, `kamar_tidur`, `jarak_pusat_kota_km`, `usia_bangunan`, dan `y` dari kolom `harga_juta` (Series).
3. Bagi data menjadi `X_train, X_test, y_train, y_test` dengan `train_test_split(X, y, test_size=0.2, random_state=42)`.
4. Latih `model = LinearRegression()` dengan data latih, lalu simpan prediksi untuk data uji ke `y_pred`.
5. Hitung `mae` (`mean_absolute_error`) dan `r2` (`r2_score`) dari `y_test` dan `y_pred` — nilai **aktual dulu**, baru prediksi.
6. Simpan koefisien model sebagai Series `koefisien` dengan index nama fitur: `pd.Series(model.coef_, index=fitur)`.
7. Buat scatter plot **harga aktual (sumbu X) vs harga prediksi (sumbu Y)** untuk data uji, tambahkan garis diagonal "prediksi sempurna" (mis. `ax.axline((0, 0), slope=1)`), lengkap dengan judul dan label sumbu.

## starter
```python
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score

# Pembersihan dari latihan sebelumnya
df = pd.read_csv("properti.csv")
df_bersih = df.drop_duplicates()
df_bersih["garasi"] = df_bersih["garasi"].fillna(0).astype(int)
df_bersih = df_bersih.dropna(subset=["harga_juta"])

# TODO 1: fitur baru usia_bangunan

# TODO 2: fitur (X) dan target (y) — tambahkan "usia_bangunan" setelah kolomnya dibuat
fitur = ["luas_bangunan_m2", "luas_tanah_m2", "kamar_tidur", "jarak_pusat_kota_km"]
X = df_bersih[fitur]
y = df_bersih["harga_juta"]
print("Ukuran X:", X.shape, "| Ukuran y:", y.shape)

# TODO 3-7: split, latih, prediksi, evaluasi, koefisien, grafik

X.head()
```

## solusi
```python
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score

# Pembersihan dari latihan sebelumnya
df = pd.read_csv("properti.csv")
df_bersih = df.drop_duplicates()
df_bersih["garasi"] = df_bersih["garasi"].fillna(0).astype(int)
df_bersih = df_bersih.dropna(subset=["harga_juta"])

# 1) Feature engineering
df_bersih["usia_bangunan"] = 2026 - df_bersih["tahun_dibangun"]

# 2) Fitur (X) dan target (y)
fitur = ["luas_bangunan_m2", "luas_tanah_m2", "kamar_tidur", "jarak_pusat_kota_km", "usia_bangunan"]
X = df_bersih[fitur]
y = df_bersih["harga_juta"]

# 3) Data latih 80% dan data uji 20%
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4) Latih model, lalu tebak harga rumah di data uji
model = LinearRegression()
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

# 5) Evaluasi
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
print(f"MAE: {mae:.1f} juta | R²: {r2:.3f}")

# 6) Koefisien: perubahan harga (juta Rp) untuk +1 satuan fitur, fitur lain tetap
koefisien = pd.Series(model.coef_, index=fitur)
tampilkan(koefisien.round(2), "Koefisien model (juta Rp per satuan fitur)")

# 7) Aktual vs prediksi
fig, ax = plt.subplots()
ax.scatter(y_test, y_pred, alpha=0.8)
ax.axline((0, 0), slope=1, color="black", linestyle="--", label="Prediksi sempurna")
ax.set_title("Harga aktual vs prediksi (data uji)")
ax.set_xlabel("Harga aktual (juta Rp)")
ax.set_ylabel("Harga prediksi (juta Rp)")
ax.legend()
```

## checker
```python
import numpy as np
import pandas as pd
from sklearn.metrics import r2_score

FITUR = ["luas_bangunan_m2", "luas_tanah_m2", "kamar_tidur", "jarak_pusat_kota_km", "usia_bangunan"]


def _angka(v):
    try:
        return float(v)
    except Exception:
        return float("nan")


wajib_variabel("df_bersih", pd.DataFrame)
cek_kolom(df_bersih, ["usia_bangunan"], label="Kolom baru `usia_bangunan` sudah ditambahkan ke df_bersih")
if "usia_bangunan" in df_bersih.columns:
    check("usia_bangunan = 2026 − tahun_dibangun",
          bool((df_bersih["usia_bangunan"] == 2026 - df_bersih["tahun_dibangun"]).all()),
          "Hitung dengan df_bersih[\"usia_bangunan\"] = 2026 - df_bersih[\"tahun_dibangun\"].")

wajib_variabel("X", pd.DataFrame)
check("Kolom target harga_juta tidak ikut di X", "harga_juta" not in X.columns,
      "Target jangan dimasukkan ke fitur — sama saja memberi kunci jawaban ke model.")
check("X berisi 5 fitur yang diminta", set(X.columns) == set(FITUR),
      f"Kolom X sekarang: {list(X.columns)}. Yang diminta: {FITUR}.")
wajib_variabel("y", pd.Series, label="y berupa Series harga_juta (satu pasang kurung siku)")
check("y adalah kolom harga_juta dari df_bersih (175 rumah)", y.name == "harga_juta" and len(y) == 175,
      f"y sekarang: kolom {y.name!r}, {len(y)} nilai. Gunakan y = df_bersih[\"harga_juta\"].")

wajib_variabel("X_train", pd.DataFrame)
wajib_variabel("X_test", pd.DataFrame)
check("Data dibagi 80:20 (140 rumah latih, 35 rumah uji)", len(X_train) == 140 and len(X_test) == 35,
      f"Sekarang {len(X_train)} latih dan {len(X_test)} uji. Gunakan test_size=0.2.")
ref_uji = nilai_solusi("X_test")
split_sama = (set(X_test.columns) == set(ref_uji.columns) and X_test.shape == ref_uji.shape and
              np.allclose(X_test[list(ref_uji.columns)].to_numpy(dtype=float), ref_uji.to_numpy(dtype=float)))
check("Pembagian data memakai random_state=42", split_sama,
      "Gunakan train_test_split(X, y, test_size=0.2, random_state=42) — random_state menentukan rumah mana yang masuk data uji.")

wajib_variabel("model")
check("Model LinearRegression sudah dilatih (fit)", hasattr(model, "coef_"),
      "Panggil model.fit(X_train, y_train) sebelum model.predict(...).")
wajib_variabel("y_pred")
bandingkan_variabel("y_pred", label="Prediksi y_pred untuk data uji sesuai")

wajib_variabel("mae")
bandingkan_variabel("mae", label="MAE dihitung dengan benar")
wajib_variabel("r2")
r2_terbalik = r2_score(nilai_solusi("y_pred"), nilai_solusi("y_test"))
if abs(_angka(r2) - r2_terbalik) < 1e-6:
    check("Urutan argumen r2_score benar", False,
          "Tulis r2_score(y_test, y_pred): nilai aktual dulu, baru prediksi. Jika tertukar, hasil R² berubah.")
bandingkan_variabel("r2", label="R² dihitung dengan benar")

wajib_variabel("koefisien", pd.Series)
ref_koef = nilai_solusi("koefisien")
check("koefisien punya satu nilai per fitur, dengan index nama fitur",
      set(map(str, koefisien.index)) == set(FITUR),
      "Buat dengan pd.Series(model.coef_, index=fitur) — urutan fitur harus sama dengan kolom X.")
if set(map(str, koefisien.index)) == set(FITUR):
    check("Nilai koefisien sesuai model",
          all(abs(_angka(koefisien[f]) - float(ref_koef[f])) <= 1e-6 * max(1.0, abs(float(ref_koef[f]))) for f in FITUR),
          "Ambil dari model.coef_ setelah model dilatih, dengan index = daftar fitur yang sama dengan kolom X.")

sumbu = [ax for fig in grafik for ax in fig["axes"]]
kandidat = [ax for ax in sumbu if (ax["collections"] > 0 and ax["lines"] > 0) or ax["lines"] >= 2]
check("Ada scatter aktual vs prediksi dengan garis diagonal", bool(kandidat),
      "Gambar ax.scatter(y_test, y_pred), lalu tambahkan garis diagonal, mis. ax.axline((0, 0), slope=1).")
check("Grafik punya judul dan label sumbu X & Y",
      any(ax["title"].strip() and ax["xlabel"].strip() and ax["ylabel"].strip() for ax in kandidat),
      "Tambahkan ax.set_title(...), ax.set_xlabel(\"Harga aktual (juta Rp)\"), dan ax.set_ylabel(\"Harga prediksi (juta Rp)\").")
```

## hint-1
Ikuti pola baku scikit-learn: **buat model → `fit` → `predict`**. Semua fungsi yang dibutuhkan sudah di-*import* di baris atas kode awal. Jangan lupa menambahkan `"usia_bangunan"` ke daftar `fitur` setelah kolomnya dibuat.

## hint-2
`train_test_split` mengembalikan **empat** bagian sekaligus, dengan urutan yang harus tepat:

```python
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
```

Metrik dihitung dari nilai aktual dan prediksi: `mean_absolute_error(y_test, y_pred)` dan `r2_score(y_test, y_pred)`.

## hint-3
```python
df_bersih["usia_bangunan"] = 2026 - df_bersih["tahun_dibangun"]
fitur = ["luas_bangunan_m2", "luas_tanah_m2", "kamar_tidur", "jarak_pusat_kota_km", "usia_bangunan"]
X = df_bersih[fitur]
y = df_bersih["harga_juta"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = LinearRegression()
model.fit(___, ___)            # isi: fitur & target data latih
y_pred = model.predict(___)    # isi: fitur data uji

mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
koefisien = pd.Series(model.coef_, index=fitur)

fig, ax = plt.subplots()
ax.scatter(y_test, y_pred)
ax.axline((0, 0), slope=1, color="black", linestyle="--")
# ... judul & label sumbu ...
```

## pembahasan
- **MAE ±539 juta:** rata-rata tebakan meleset sekitar Rp539 juta. Untuk rumah di data uji yang harga mediannya 1.595 juta, itu masih besar — belum layak dipakai sebagai "harga resmi". Tetapi jauh lebih baik daripada cara paling sederhana, yaitu menebak semua rumah dengan rata-rata harga data latih (MAE 794 juta).
- **R² ±0,54:** model menjelaskan sekitar 54% variasi harga di data uji. Di data latih R²-nya 0,62 — wajar sedikit lebih tinggi, karena model "sudah melihat" rumah-rumah itu.
- **Membaca koefisien** (selalu dengan syarat *fitur lain tetap*):
  - `luas_bangunan_m2` **+9,2 juta** per m² dan `luas_tanah_m2` **+8,2 juta** per m²,
  - `jarak_pusat_kota_km` **−43,5 juta** per km menjauh dari pusat kota,
  - `usia_bangunan` **−18,3 juta** per tahun,
  - `kamar_tidur` **−226 juta** per kamar?! Bukan berarti kamar menurunkan harga. Penjelasan yang masuk akal: pada **luas bangunan yang sama**, kamar yang lebih banyak berarti setiap kamar lebih sempit. Koefisien tidak bisa dibaca sendiri-sendiri tanpa konteks fitur lain.
- **Lihat grafiknya:** kesalahan terbesar ada di rumah premium Jakarta — R059 di Jakarta Pusat (aktual 5.350 juta) hanya ditebak ±3.007 juta. Model hanya tahu *jarak*, bukan *lokasi*, padahal di latihan groupby kita melihat lokasi sangat menentukan harga.
- **Prediksi yang mustahil:** satu rumah di Bogor (R044, aktual 690 juta) ditebak **−89 juta**. Rumah ini berjarak 53,7 km dari pusat kota (terjauh ke-4 dari 175 rumah), sehingga sumbangan fitur jarak saja sudah sekitar **−2.335 juta** (53,7 km × −43,5 juta per km). Regresi linear tidak tahu bahwa harga tidak mungkin negatif — hati-hati memakainya untuk rumah yang jauh berbeda dari kebanyakan data.
- **Tantangan:** tambahkan lokasi sebagai fitur dengan *one-hot encoding*:

  ```python
  X2 = pd.get_dummies(df_bersih[fitur + ["lokasi"]], columns=["lokasi"], drop_first=True, dtype=int)
  ```

  Dengan pembagian data yang sama (`random_state=42`), MAE turun menjadi **±253 juta** dan R² naik menjadi **±0,88**. Fitur yang tepat sering lebih berpengaruh daripada algoritma yang rumit.
