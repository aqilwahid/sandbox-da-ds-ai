---
id: ds-08-klasifikasi
track: datascience
title: Memprediksi Member yang Akan Churn (Klasifikasi)
level: lanjut
estimatedMinutes: 20
language: python
datasets: [churn_member]
concepts: [klasifikasi, LogisticRegression, stratify, baseline, confusion matrix, precision, recall]
prerequisites: [ds-07-regresi]
---

## instruksi
Regresi menebak **angka** (harga rumah). **Klasifikasi** menebak **kelas** — di sini: apakah seorang member akan **churn** (`1`, berhenti belanja) atau tetap aktif (`0`). Alur kerjanya sama seperti regresi: siapkan `X` & `y` → bagi data → `fit` → `predict` → evaluasi. Yang berbeda adalah **cara menilainya**.

**Jebakan akurasi.** Hanya ±27% member yang churn. Model "malas" yang selalu menebak *tidak churn* sudah benar ±73% — tanpa belajar apa pun, dan tanpa menemukan satu pun member yang akan pergi. Karena itu setiap model harus dibandingkan dengan **baseline** ini, dan dinilai dengan **confusion matrix**:

```visual
jenis: confusion-matrix
judul: Confusion matrix model churn (100 member di data uji)
label_positif: Churn
label_negatif: Tidak churn
urutan: sklearn
tp: 14
fp: 5
fn: 13
tn: 68
keterangan: "Angka ini adalah hasil model yang akan kamu bangun. Susunannya sama dengan output confusion_matrix scikit-learn. Arahkan kursor ke metrik untuk melihat sel mana yang dipakai."
```

| Metrik | Rumus | Pertanyaan bisnisnya |
|---|---|---|
| Akurasi | (TP + TN) ÷ semua | Berapa persen tebakan yang benar? |
| Precision | TP ÷ (TP + FP) | Dari member yang kita tandai "akan churn", berapa yang benar-benar churn? → **voucher tidak terbuang** |
| Recall | TP ÷ (TP + FN) | Dari semua member yang benar-benar churn, berapa yang berhasil kita temukan? → **pelanggan tidak lolos** |

Tiga hal teknis baru:
- Model hanya menerima angka. Kolom teks `Ya`/`Tidak` diubah dengan `.map({"Ya": 1, "Tidak": 0})`.
- `train_test_split(..., stratify=y)` menjaga proporsi churn 27% tetap sama di data latih maupun data uji. Tanpa itu, bisa saja data uji kebetulan berisi terlalu sedikit member churn.
- `confusion_matrix(y_test, y_pred)` dari scikit-learn menyusun **baris = aktual, kolom = prediksi**, dengan urutan kelas `0` lalu `1` — sama seperti visual di atas: `cm[0, 0]` = TN, `cm[0, 1]` = FP, `cm[1, 0]` = FN, `cm[1, 1]` = TP. (Banyak buku menaruh TP di kiri atas; selalu cek label baris dan kolomnya.)

### Kasus
Tim CRM TokoKita ingin mengirim **voucher retensi** ke member yang berisiko churn sebelum mereka benar-benar pergi. Anggaran voucher terbatas, jadi mereka butuh model yang bisa menunjuk siapa saja yang berisiko — dan butuh tahu **seberapa bisa model itu dipercaya**.

### Tugas
1. Ubah kolom `pakai_aplikasi` menjadi angka: `Ya` → `1`, `Tidak` → `0`.
2. Buat `X` dari tujuh fitur di daftar `fitur` (lihat kode awal) dan `y` dari kolom `churn`.
3. Bagi data menjadi `X_train, X_test, y_train, y_test` dengan `test_size=0.2`, `stratify=y`, `random_state=42`.
4. Latih `model = LogisticRegression(max_iter=1000)` dengan data latih, lalu simpan prediksi data uji ke `y_pred`.
5. Hitung `akurasi` (`accuracy_score`) dan `akurasi_baseline` — akurasi jika **selalu menebak 0** (tidak churn).
6. Hitung `cm = confusion_matrix(y_test, y_pred)`, lalu `presisi` (`precision_score`) dan `recall` (`recall_score`) untuk kelas churn = 1.
7. Gambar confusion matrix dengan `ax.imshow(cm)`, tulis angka di setiap kotak dengan `ax.text(...)`, dan beri judul serta label sumbu (prediksi & aktual).

## starter
```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score

df = pd.read_csv("churn_member.csv")
print("Jumlah member :", len(df))
print("Proporsi churn:", round(df["churn"].mean(), 3))
tampilkan(df.groupby("jumlah_keluhan")["churn"].agg(["mean", "count"]).round(3),
          "Tingkat churn per jumlah keluhan")

# TODO 1: ubah pakai_aplikasi (Ya/Tidak) menjadi 1/0

# TODO 2: fitur (X) & target (y)
fitur = ["usia", "lama_member_bulan", "frekuensi_belanja_bulanan", "rata_belanja_ribu",
         "jumlah_keluhan", "pakai_aplikasi", "skor_kepuasan"]

# TODO 3-7: split (dengan stratify), latih, prediksi, evaluasi, confusion matrix, grafik

df.head()
```

## solusi
```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score

df = pd.read_csv("churn_member.csv")

# 1) Teks → angka
df["pakai_aplikasi"] = df["pakai_aplikasi"].map({"Ya": 1, "Tidak": 0})

# 2) Fitur (X) & target (y)
fitur = ["usia", "lama_member_bulan", "frekuensi_belanja_bulanan", "rata_belanja_ribu",
         "jumlah_keluhan", "pakai_aplikasi", "skor_kepuasan"]
X = df[fitur]
y = df["churn"]

# 3) Bagi data — stratify menjaga proporsi churn di latih & uji
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# 4) Latih & prediksi
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

# 5) Akurasi model vs baseline "selalu tebak tidak churn"
akurasi = accuracy_score(y_test, y_pred)
akurasi_baseline = accuracy_score(y_test, np.zeros(len(y_test), dtype=int))

# 6) Confusion matrix, precision, recall (kelas positif = churn = 1)
cm = confusion_matrix(y_test, y_pred)
presisi = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
print(f"Akurasi model    : {akurasi:.2f}")
print(f"Akurasi baseline : {akurasi_baseline:.2f}  (selalu menebak tidak churn)")
print(f"Precision churn  : {presisi:.2f}")
print(f"Recall churn     : {recall:.2f}")

# 7) Visualisasi confusion matrix
fig, ax = plt.subplots(figsize=(5, 4.2))
ax.imshow(cm, cmap="Blues")
for i in range(2):
    for j in range(2):
        warna = "white" if cm[i, j] > cm.max() / 2 else "black"
        ax.text(j, i, cm[i, j], ha="center", va="center", fontsize=18, color=warna)
ax.set_xticks([0, 1], ["Tidak churn", "Churn"])
ax.set_yticks([0, 1], ["Tidak churn", "Churn"])
ax.set_xlabel("Prediksi model")
ax.set_ylabel("Aktual")
ax.set_title("Confusion matrix — data uji")
ax.grid(False)
```

## checker
```python
import numpy as np
import pandas as pd

FITUR = ["usia", "lama_member_bulan", "frekuensi_belanja_bulanan", "rata_belanja_ribu",
         "jumlah_keluhan", "pakai_aplikasi", "skor_kepuasan"]


def _angka(v):
    try:
        return float(v)
    except Exception:
        return float("nan")


wajib_variabel("df", pd.DataFrame)
app = df["pakai_aplikasi"] if "pakai_aplikasi" in df.columns else pd.Series(dtype=object)
isi_app = set(app.dropna().unique().tolist())
app_angka = len(app) > 0 and bool(app.notna().all()) and isi_app <= {0, 1}
check("pakai_aplikasi sudah diubah menjadi angka 1/0", app_angka,
      "Gunakan df[\"pakai_aplikasi\"] = df[\"pakai_aplikasi\"].map({\"Ya\": 1, \"Tidak\": 0}) — "
      "huruf besar-kecilnya harus persis sama dengan isi data.")
if app_angka:
    check("Ya → 1 dan Tidak → 0 (tidak terbalik)",
          int((app == 1).sum()) == int(nilai_solusi("df")["pakai_aplikasi"].sum()),
          "Pemetaannya terbalik. Member yang memakai aplikasi (Ya) harus bernilai 1.")

wajib_variabel("X", pd.DataFrame)
check("Label churn tidak ikut di X", "churn" not in X.columns,
      "Kolom churn adalah jawaban yang ingin ditebak. Jika ikut di X, model \"menyontek\" dan hasilnya menipu.")
check("X berisi 7 fitur yang diminta", set(X.columns) == set(FITUR),
      f"Kolom X sekarang: {list(X.columns)}. Gunakan X = df[fitur].")
wajib_variabel("y", pd.Series, label="y berupa Series kolom churn")
check("y adalah kolom churn (500 member)", y.name == "churn" and len(y) == 500,
      f"y sekarang: kolom {y.name!r}, {len(y)} nilai. Gunakan y = df[\"churn\"].")

wajib_variabel("X_train", pd.DataFrame)
wajib_variabel("X_test", pd.DataFrame)
wajib_variabel("y_test")
check("Data uji berisi 100 member (test_size=0.2)", len(X_test) == 100,
      f"Data uji sekarang {len(X_test)} baris. Gunakan test_size=0.2.")
check("Proporsi churn di data uji tetap 27% (stratify=y)",
      abs(_angka(np.mean(y_test)) - _angka(np.mean(nilai_solusi("y_test")))) < 1e-9,
      f"Proporsi churn di data ujimu {_angka(np.mean(y_test)):.2f}. Tambahkan stratify=y di train_test_split.")
ref_uji = nilai_solusi("X_test")
split_sama = (set(X_test.columns) == set(ref_uji.columns) and X_test.shape == ref_uji.shape and
              np.allclose(X_test[list(ref_uji.columns)].to_numpy(dtype=float), ref_uji.to_numpy(dtype=float)))
check("Pembagian data memakai stratify=y dan random_state=42", split_sama,
      "Gunakan train_test_split(X, y, test_size=0.2, stratify=y, random_state=42).")

wajib_variabel("model")
check("Model sudah dilatih (fit)", hasattr(model, "classes_"),
      "Panggil model.fit(X_train, y_train) sebelum model.predict(...).")
if hasattr(model, "n_iter_") and hasattr(model, "max_iter"):
    check("Pelatihan model selesai (konvergen)", int(np.max(model.n_iter_)) < int(model.max_iter),
          "Pelatihan berhenti sebelum selesai (muncul ConvergenceWarning). Gunakan LogisticRegression(max_iter=1000).")
wajib_variabel("y_pred")
bandingkan_variabel("y_pred", label="Prediksi y_pred untuk data uji sesuai")

wajib_variabel("akurasi")
bandingkan_variabel("akurasi", label="akurasi model benar")
wajib_variabel("akurasi_baseline")
bandingkan_variabel("akurasi_baseline", label="akurasi_baseline = akurasi jika selalu menebak 0 (tidak churn)")

wajib_variabel("cm")
cm_mu, cm_ref = np.asarray(cm), np.asarray(nilai_solusi("cm"))
check("cm berupa tabel 2×2", cm_mu.shape == (2, 2),
      f"Ukuran cm sekarang {cm_mu.shape}. Gunakan cm = confusion_matrix(y_test, y_pred).")
if cm_mu.shape == (2, 2) and np.array_equal(cm_mu, cm_ref.T) and not np.array_equal(cm_ref, cm_ref.T):
    check("Urutan argumen confusion_matrix benar", False,
          "Tulis confusion_matrix(y_test, y_pred): baris = aktual, kolom = prediksi.")
bandingkan_variabel("cm", label="Isi confusion matrix sesuai")

wajib_variabel("presisi")
wajib_variabel("recall")
ref_presisi, ref_recall = float(nilai_solusi("presisi")), float(nilai_solusi("recall"))
if abs(_angka(presisi) - ref_recall) < 1e-9 and abs(_angka(recall) - ref_presisi) < 1e-9:
    check("presisi dan recall tidak tertukar", False,
          "Nilai presisi dan recall-mu tertukar. Ingat: precision = TP ÷ (TP + FP), recall = TP ÷ (TP + FN). "
          "Urutan argumen selalu (y_test, y_pred).")
bandingkan_variabel("presisi", label="presisi (precision) kelas churn benar")
bandingkan_variabel("recall", label="recall kelas churn benar")

gambar = [ax for fig in grafik for ax in fig["axes"] if ax["images"] > 0]
check("Ada grafik confusion matrix (imshow)", bool(gambar),
      "Gambar dengan ax.imshow(cm, cmap=\"Blues\"), lalu tulis angkanya dengan ax.text(kolom, baris, cm[baris, kolom]).")
check("Angka ditulis di setiap kotak (ax.text)", any(ax["texts"] >= 4 for ax in gambar),
      "Tulis keempat angkanya dengan ax.text(kolom, baris, cm[baris, kolom]) di dalam dua perulangan for.")
check("Grafik confusion matrix punya judul dan label sumbu",
      any(ax["title"].strip() and ax["xlabel"].strip() and ax["ylabel"].strip() for ax in gambar),
      "Tambahkan ax.set_title(...), ax.set_xlabel(\"Prediksi model\"), dan ax.set_ylabel(\"Aktual\").")
```

## hint-1
Alurnya sama persis dengan latihan regresi — hanya modelnya `LogisticRegression` dan metriknya berbeda. Untuk baseline, bayangkan sebuah "model" yang selalu menjawab 0: prediksinya `np.zeros(len(y_test))`, lalu hitung akurasinya dengan `accuracy_score`.

## hint-2
```python
df["pakai_aplikasi"] = df["pakai_aplikasi"].map({"Ya": 1, "Tidak": 0})
X = df[fitur]
y = df["churn"]
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)
```

Semua metrik ditulis dengan pola `metrik(y_test, y_pred)` — nilai aktual dulu, baru prediksi.

## hint-3
```python
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

akurasi = accuracy_score(y_test, y_pred)
akurasi_baseline = accuracy_score(y_test, ___)   # isi: prediksi "selalu 0" sepanjang y_test
cm = confusion_matrix(y_test, y_pred)
presisi = ___(y_test, y_pred)                     # isi: fungsi precision
recall = ___(y_test, y_pred)                      # isi: fungsi recall

fig, ax = plt.subplots()
ax.imshow(cm, cmap="Blues")
for i in range(2):          # i = baris (aktual)
    for j in range(2):      # j = kolom (prediksi)
        ax.text(j, i, cm[i, j], ha="center", va="center")
# ... judul & label sumbu ...
```

## pembahasan
- **Akurasi 82% terdengar bagus — sampai dibandingkan dengan baseline 73%.** Model hanya unggul 9 poin persentase dari tebakan "malas" yang tidak pernah menemukan satu pun member yang akan churn (recall baseline = 0).
- **Confusion matrix** (100 member di data uji): 14 member churn berhasil ditandai (TP), 13 member churn **lolos** (FN), 5 member setia salah ditandai (FP), dan 68 member aktif benar ditebak aktif (TN). Di array scikit-learn tertulis `[[68, 5], [13, 14]]` — baris aktual, kolom prediksi.
- **Recall 52%** — hanya sekitar separuh member yang akan pergi berhasil ditemukan. **Precision 74%** — dari 19 member yang ditandai berisiko, 14 memang churn, jadi sebagian besar voucher tepat sasaran.
- **Mana yang lebih penting?** Salah alarm (FP) berarti satu voucher terkirim ke member yang sebenarnya setia — biayanya kecil. Churn yang lolos (FN) berarti kehilangan pelanggan beserta belanjanya di bulan-bulan berikutnya. Untuk kasus churn, **recall biasanya lebih diutamakan** — selama anggaran voucher masih cukup untuk menanggung salah alarm.
- **Geser *threshold*.** `model.predict` memakai batas probabilitas 0,5. Dengan `proba = model.predict_proba(X_test)[:, 1]` dan `(proba >= 0.3).astype(int)`, recall naik dari 52% menjadi **78%** (21 dari 27 member churn tertangkap), precision turun menjadi 64%, dan akurasinya tetap 82%. Angka ambang adalah **keputusan bisnis**, bukan setelan bawaan.
- **Apa yang dipelajari model?** Koefisien `jumlah_keluhan` positif (makin banyak keluhan → makin berisiko), sedangkan `frekuensi_belanja_bulanan`, `pakai_aplikasi`, dan `skor_kepuasan` negatif (menurunkan risiko). Datanya sejalan: tingkat churn member tanpa keluhan 14,7% (217 member), sedangkan member dengan 5 keluhan 76,9% (13 member); pemakai aplikasi churn 24,4% vs 31,8% yang tidak memakai.
- **Kenapa `max_iter=1000`?** LogisticRegression mencari koefisiennya secara bertahap (iteratif). Dengan batas bawaan 100 langkah, muncul `ConvergenceWarning` karena skala fitur sangat berbeda (skor kepuasan 1–5, rata-rata belanja 40–800 ribu); model ini butuh 158 langkah. Cara yang lebih rapi adalah menyamakan skala fitur dengan `StandardScaler` (`from sklearn.preprocessing import StandardScaler`) — coba sebagai tantangan.
- **Kenapa `stratify=y`?** Hasilnya data latih berisi 109 churn dari 400 member dan data uji 27 dari 100 — sama-sama ±27%. Tanpa `stratify` (dengan `random_state=42` yang sama), data uji hanya berisi 20% member churn. Dengan kelas yang tidak seimbang, hasil evaluasi jadi bisa naik-turun hanya karena kebetulan pembagian.
