---
id: ai-07-evaluasi
track: ai
title: Evaluasi Aplikasi LLM — Golden Set, Confusion Matrix & Recall
level: lanjut
estimatedMinutes: 20
language: python
datasets: [ulasan]
concepts: [golden set, akurasi, confusion matrix, precision, recall, F1, analisis kesalahan]
prerequisites: [ai-06-rag]
---

## instruksi
"Kelihatannya jawabannya bagus" **bukan metrik**. Sebelum aplikasi LLM dipakai sungguhan — dan setiap kali prompt atau model diganti — ujilah pada **golden set**: kumpulan contoh yang jawaban benarnya sudah dilabeli manusia. `ulasan.csv` berisi 160 ulasan yang dilabeli tim CS.

Akurasi saja bisa menipu. Untuk kasus CS, pertanyaan pentingnya adalah tentang kelas **negatif** (keluhan):

- **Recall** = dari semua keluhan sungguhan, berapa persen yang **tertangkap**? (Keluhan yang lolos = pelanggan marah yang diabaikan.)
- **Precision** = dari semua yang ditandai keluhan, berapa persen yang **benar** keluhan? (Salah tandai = waktu CS terbuang.)
- **F1** = rata-rata harmonik keduanya.

Berikut hasil versi **zero-shot** (tanpa contoh) untuk kelas negatif. Geser angkanya untuk merasakan hubungan precision dan recall:

```visual
jenis: confusion-matrix
judul: Zero-shot — apakah keluhan tertangkap?
label_positif: Negatif (dieskalasi)
label_negatif: Bukan negatif
tp: 46
fp: 9
fn: 24
tn: 81
keterangan: Angka asli dari 160 ulasan golden set. FN = 24 keluhan yang lolos tanpa eskalasi.
```

> **Catatan simulasi:** `LLMTiruan().klasifikasi_sentimen(teks, mode=...)` adalah jalan pintas untuk mengirim prompt zero-shot atau few-shot seperti di latihan Prompt Terstruktur — akurasinya sama dengan yang kamu ukur di sana.

### Kasus
TokoKita akan meneruskan setiap ulasan **negatif** ke CS senior dalam 1 jam. Ada dua kandidat: **zero-shot** (prompt pendek, lebih murah) dan **few-shot** (prompt dengan contoh, lebih banyak token). Manajer bertanya: *mana yang dipakai, dan apa buktinya?*

### Tugas
1. `pred_zero` sudah dibuat. Buat kolom `df["pred_few"]` dengan `llm.klasifikasi_sentimen(teks, mode="few-shot")`.
2. `akurasi` = dict `{"zero-shot": ..., "few-shot": ...}` memakai `accuracy_score(df["sentimen"], ...)`.
3. `cm_few` = `confusion_matrix(df["sentimen"], df["pred_few"], labels=LABEL)` (urutan `LABEL` = positif, netral, negatif; baris = label asli, kolom = prediksi).
4. Lengkapi fungsi `metrik(kolom_prediksi)` agar mengembalikan `precision`, `recall`, dan `f1` untuk kelas **negatif** (`precision_score(y_true, y_pred)`, dst.). DataFrame `metrik_negatif` (kolom `mode`, `precision`, `recall`, `f1`) akan terisi otomatis.
5. **Analisis kesalahan:** `kesalahan` = baris yang salah diprediksi few-shot (`df["pred_few"] != df["sentimen"]`) dengan kolom `id_ulasan`, `teks_ulasan`, `sentimen`, `pred_few`. Lihat teks mana yang sering salah.
6. Buat **grafik batang** precision/recall/F1 zero-shot vs few-shot (petunjuk: `metrik_negatif.set_index("mode").plot.bar()`) lengkap dengan judul.

## starter
```python
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score, f1_score
from simulasi_llm import LLMTiruan

df = pd.read_csv("ulasan.csv")          # golden set: 160 ulasan berlabel tim CS
llm = LLMTiruan()
LABEL = ["positif", "netral", "negatif"]
print("Distribusi label asli:", df["sentimen"].value_counts().to_dict())

# 1) Prediksi dua versi
df["pred_zero"] = df["teks_ulasan"].apply(lambda t: llm.klasifikasi_sentimen(t, mode="zero-shot"))
df["pred_few"] = "positif"               # TODO: mode="few-shot"

# 2) Akurasi
akurasi = {}                             # TODO: {"zero-shot": ..., "few-shot": ...}

# 3) Confusion matrix few-shot
cm_few = None                            # TODO


# 4) Precision, recall, F1 untuk kelas "negatif"
def metrik(kolom_prediksi):
    y_true = df["sentimen"] == "negatif"
    y_pred = df[kolom_prediksi] == "negatif"
    return {"precision": 0, "recall": 0, "f1": 0}      # TODO


metrik_negatif = pd.DataFrame([
    {"mode": "zero-shot", **metrik("pred_zero")},
    {"mode": "few-shot", **metrik("pred_few")},
])

# 5) Analisis kesalahan few-shot
kesalahan = pd.DataFrame()               # TODO

# 6) TODO: grafik batang precision/recall/F1 per mode (beri judul)

tampilkan(metrik_negatif, "Metrik kelas negatif")
pd.crosstab(df["sentimen"], df["pred_zero"], rownames=["asli"], colnames=["prediksi zero-shot"])
```

## solusi
```python
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score, f1_score
from simulasi_llm import LLMTiruan

df = pd.read_csv("ulasan.csv")          # golden set: 160 ulasan berlabel tim CS
llm = LLMTiruan()
LABEL = ["positif", "netral", "negatif"]
print("Distribusi label asli:", df["sentimen"].value_counts().to_dict())

# 1) Prediksi dua versi
df["pred_zero"] = df["teks_ulasan"].apply(lambda t: llm.klasifikasi_sentimen(t, mode="zero-shot"))
df["pred_few"] = df["teks_ulasan"].apply(lambda t: llm.klasifikasi_sentimen(t, mode="few-shot"))

# 2) Akurasi
akurasi = {
    "zero-shot": accuracy_score(df["sentimen"], df["pred_zero"]),
    "few-shot": accuracy_score(df["sentimen"], df["pred_few"]),
}
print("Akurasi:", akurasi)

# 3) Confusion matrix few-shot
cm_few = confusion_matrix(df["sentimen"], df["pred_few"], labels=LABEL)
tampilkan(pd.DataFrame(cm_few, index=[f"asli {l}" for l in LABEL], columns=[f"prediksi {l}" for l in LABEL]),
          "Confusion matrix few-shot")


# 4) Precision, recall, F1 untuk kelas "negatif"
def metrik(kolom_prediksi):
    y_true = df["sentimen"] == "negatif"
    y_pred = df[kolom_prediksi] == "negatif"
    return {"precision": precision_score(y_true, y_pred),
            "recall": recall_score(y_true, y_pred),
            "f1": f1_score(y_true, y_pred)}


metrik_negatif = pd.DataFrame([
    {"mode": "zero-shot", **metrik("pred_zero")},
    {"mode": "few-shot", **metrik("pred_few")},
])

# 5) Analisis kesalahan few-shot
kesalahan = df.loc[df["pred_few"] != df["sentimen"], ["id_ulasan", "teks_ulasan", "sentimen", "pred_few"]]
print("Kesalahan few-shot:", len(kesalahan))
print(kesalahan["teks_ulasan"].value_counts())

# 6) Grafik batang precision/recall/F1 per mode
ax = metrik_negatif.set_index("mode").plot.bar(rot=0)
ax.set_title("Kelas negatif: zero-shot vs few-shot")
ax.set_ylabel("Skor")
ax.set_ylim(0, 1.05)

tampilkan(metrik_negatif.round(3), "Metrik kelas negatif")
pd.crosstab(df["sentimen"], df["pred_zero"], rownames=["asli"], colnames=["prediksi zero-shot"])
```

## checker
```python
import numpy as _np
import re as _re

wajib_variabel("df", "DataFrame")
cek_kolom(df, ["pred_zero", "pred_few"])
_ref = nilai_solusi("df")
check("`pred_zero` berisi prediksi zero-shot untuk 160 ulasan",
      "pred_zero" in df.columns and df["pred_zero"].tolist() == _ref["pred_zero"].tolist(),
      "Jangan ubah baris pred_zero dari starter.")
check("`pred_few` berisi prediksi few-shot untuk 160 ulasan",
      "pred_few" in df.columns and df["pred_few"].tolist() == _ref["pred_few"].tolist(),
      "Gunakan llm.klasifikasi_sentimen(t, mode='few-shot') untuk setiap teks_ulasan.")

wajib_variabel("akurasi", dict)
bandingkan_variabel("akurasi", toleransi=1e-3, label="`akurasi` zero-shot & few-shot benar")

wajib_variabel("cm_few")
_cm = _np.asarray(cm_few) if cm_few is not None else _np.zeros((0, 0))
_cm_ref = _np.asarray(nilai_solusi("cm_few"))
check("`cm_few` berukuran 3 × 3 (tiga label)", _cm.shape == (3, 3),
      f"Ukuran {_cm.shape}. Pakai confusion_matrix(df['sentimen'], df['pred_few'], labels=LABEL).")
check("Isi `cm_few` sesuai (baris = label asli, kolom = prediksi, urutan positif-netral-negatif)",
      _cm.shape == (3, 3) and bool((_cm == _cm_ref).all()),
      "Urutan argumen menentukan posisi angka: confusion_matrix(label_asli, prediksi, labels=LABEL). "
      "Tanpa labels=LABEL, urutannya menjadi abjad (negatif, netral, positif).")

wajib_variabel("metrik")
try:
    _uji = metrik("pred_few")
except Exception as _e:
    _uji = f"error {type(_e).__name__}: {_e}"
check("`metrik()` mengembalikan precision, recall, dan f1",
      isinstance(_uji, dict) and {"precision", "recall", "f1"} <= set(_uji),
      f"Hasil metrik('pred_few'): {_uji!r}")
wajib_variabel("metrik_negatif", "DataFrame")
cek_kolom(metrik_negatif, ["mode", "precision", "recall", "f1"])
bandingkan_variabel("metrik_negatif", toleransi=1e-3,
                    label="`metrik_negatif` = precision/recall/F1 kelas negatif untuk kedua mode")

wajib_variabel("kesalahan", "DataFrame")
cek_kolom(kesalahan, ["id_ulasan", "teks_ulasan", "sentimen", "pred_few"])
bandingkan_variabel("kesalahan", label="`kesalahan` = ulasan yang salah diprediksi few-shot")

_batang = sum(ax["bars"] for g in grafik for ax in g["axes"])
check("Ada grafik batang precision/recall/F1 untuk kedua mode (≥ 6 batang)", _batang >= 6,
      f"Baru ada {_batang} batang. Coba metrik_negatif.set_index('mode').plot.bar().")
check("Grafik diberi judul",
      any(any(ax["title"] for ax in g["axes"]) or not _re.fullmatch(r"Grafik \d+", g.get("title", "")) for g in grafik),
      "Tambahkan ax.set_title(...).")
```

## hint-1
Semua metrik sudah ada di `sklearn.metrics`. Kuncinya adalah **membandingkan dua kolom**: label asli (`df["sentimen"]`) dan prediksi. Untuk precision/recall kelas negatif, ubah dulu menjadi **benar/salah**: `y_true = df["sentimen"] == "negatif"`, `y_pred = df[kolom] == "negatif"`.

## hint-2
```python
akurasi = {
    "zero-shot": accuracy_score(df["sentimen"], df["pred_zero"]),
    "few-shot": accuracy_score(df["sentimen"], df["pred_few"]),
}
cm_few = confusion_matrix(df["sentimen"], df["pred_few"], labels=LABEL)
```

Baris yang salah: `df["pred_few"] != df["sentimen"]` — pakai sebagai filter di `df.loc[filter, [kolom...]]`.

## hint-3
```python
df["pred_few"] = df["teks_ulasan"].apply(lambda t: llm.klasifikasi_sentimen(t, mode=...))

def metrik(kolom_prediksi):
    y_true = df["sentimen"] == "negatif"
    y_pred = df[kolom_prediksi] == "negatif"
    return {"precision": precision_score(y_true, y_pred),
            "recall": ...,
            "f1": ...}

kesalahan = df.loc[df["pred_few"] != df["sentimen"], ["id_ulasan", "teks_ulasan", "sentimen", "pred_few"]]

ax = metrik_negatif.set_index("mode").plot.bar()
ax.set_title(...)
```

## pembahasan
Golden set berisi 70 ulasan negatif, 60 positif, dan 30 netral.

| Mode | Akurasi | Precision negatif | Recall negatif | F1 negatif |
|---|---|---|---|---|
| Zero-shot | 66,25% | 0,836 | 0,657 | 0,736 |
| Few-shot | **88,75%** | 0,886 | **1,000** | **0,940** |

- **Zero-shot melewatkan 24 dari 70 keluhan** (recall 66%) — semuanya dianggap *positif*. Sebagian adalah keluhan halus tanpa kata negatif yang gamblang (*"Komplain saya diabaikan."*, *"Refund belum masuk padahal sudah lewat seminggu."*, *"Admin tidak ramah saat ditanya."*), sebagian lagi terkecoh kata permukaan, mis. *"Baterainya cepat habis, mengecewakan."* (kata *cepat* terbaca sebagai pujian). Zero-shot juga **tidak pernah** menjawab `netral` — di crosstab starter, kolom prediksi `netral` bahkan tidak muncul.
- **Few-shot menangkap 70 dari 70 keluhan** (recall 100%) dengan 9 alarm palsu (precision 0,886). Untuk eskalasi CS, ini pertukaran yang sehat: memeriksa 9 ulasan netral jauh lebih murah daripada mengabaikan 24 pelanggan yang kecewa. Biaya token few-shot yang lebih besar terbayar oleh recall ini.
- **Analisis kesalahan** memberi arah perbaikan yang jelas: ke-18 kesalahan few-shot hanya berasal dari **2 teks**, yaitu *"Kualitas cukup, tidak terlalu istimewa."* (9×, dianggap negatif) dan *"Oke lah."* (9×, dianggap positif). Keduanya netral yang ambigu — solusinya: tambahkan contoh netral semacam ini ke prompt, lalu **ukur ulang**. Per aspek, akurasi terendah ada di aspek *Umum* (70%).
- Akurasi 88,75% terdengar bagus, tetapi confusion matrix menunjukkan kelas **netral** hanya benar 12 dari 30. Selalu lihat metrik **per kelas**, bukan hanya satu angka.
- **Di dunia nyata:** jadikan golden set sebagai *regression test* — jalankan setiap kali prompt, model, atau data RAG berubah. Golden set harus mewakili trafik nyata dan diperbarui berkala. Untuk output terbuka (ringkasan, jawaban chatbot) yang tidak punya satu label benar, tim biasanya memakai rubrik penilaian manusia atau *LLM-as-a-judge* yang juga perlu divalidasi.
