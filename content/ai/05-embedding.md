---
id: ai-05-embedding
track: ai
title: Embedding — Teks Jadi Vektor & Pencarian Berdasarkan Makna
level: menengah
estimatedMinutes: 25
language: python
datasets: [ulasan]
concepts: [embedding, vektor, cosine similarity, TF-IDF, semantic search]
prerequisites: [ai-04-output-json]
---

## instruksi
Komputer tidak bisa membandingkan *makna* kata secara langsung — ia membandingkan **angka**. **Embedding** mengubah teks menjadi **vektor** (deretan angka). Teks yang maknanya mirip menghasilkan vektor yang **arahnya mirip**.

Kemiripan dua vektor diukur dengan **cosine similarity** — kosinus sudut di antara keduanya:

```
cosine(a, b) = (a · b) / (|a| × |b|)        1 = searah (sangat mirip), 0 = tidak berhubungan, -1 = berlawanan arah
```

Klik titik mana saja untuk menjadikannya *query* dan lihat skor kemiripannya:

```visual
jenis: embedding
judul: Ruang makna (ilustrasi 2 dimensi)
titik:
  - {teks: "Kurir telat mengantar paket", x: 0.95, y: 0.05, grup: Pengiriman lambat}
  - {teks: "Paket datang terlambat", x: 0.90, y: 0.12, grup: Pengiriman lambat}
  - {teks: "Pengiriman lambat sekali", x: 0.85, y: 0.08, grup: Pengiriman lambat}
  - {teks: "Barang rusak dan penyok", x: 0.06, y: 0.93, grup: Kualitas produk}
  - {teks: "Barang cacat, ada goresan", x: 0.12, y: 0.88, grup: Kualitas produk}
  - {teks: "Warnanya luntur setelah dicuci", x: 0.08, y: 0.80, grup: Kualitas produk}
query: 0
keterangan: Posisi 2D hanya ilustrasi. Vektor embedding_semantik yang sebenarnya punya 16 dimensi.
```

Ada dua cara mengubah teks menjadi vektor:

| | **TF-IDF** (kata kunci) | **Embedding semantik** (makna) |
|---|---|---|
| Satu dimensi = | satu **kata** di kosakata | satu **konsep** (di simulasi ini: *pengiriman*, *lambat*, *rusak*, …) |
| "kurir telat" vs "pengiriman lambat" | tidak ada kata yang sama → **0** | konsepnya sama → **tinggi** |
| Di dunia nyata | `TfidfVectorizer`, BM25 | model embedding (ratusan–ribuan dimensi) |

> **Catatan simulasi:** `embedding_semantik(teks)` di `simulasi_llm` adalah embedding **tiruan**: kamus sinonim ke 16 konsep (`DIMENSI_KONSEP`), misalnya *telat*, *terlambat*, dan *lama* sama-sama masuk dimensi `lambat`. Model embedding asli mempelajari kedekatan makna sendiri dari teks dalam jumlah sangat besar, dan arti setiap dimensinya tidak bisa dibaca langsung seperti di sini.

### Kasus
Supervisor CS TokoKita akan rapat dengan mitra kurir dan butuh daftar keluhan **"pengiriman lambat"**. Pencarian di panel admin lama hanya mencocokkan kata yang persis sama. Kamu diminta membandingkan pencarian kata kunci (TF-IDF) dengan pencarian makna (embedding).

### Tugas
1. Lengkapi fungsi `cosine(a, b)`: `np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))`. Jika salah satu vektor panjangnya 0, kembalikan `0.0` (hindari pembagian dengan nol).
2. **TF-IDF** — `vectorizer` dan `X_tfidf` sudah disiapkan. Hitung `skor_tfidf` = kemiripan `QUERY` dengan setiap ulasan (array 160 angka): `cosine_similarity(vectorizer.transform([QUERY]), X_tfidf)[0]`, lalu `top5_tfidf = ambil_top(skor_tfidf)`.
3. **Embedding** — matriks `E` (160 × 16) dan `vektor_query` sudah disiapkan. Hitung `skor_semantik` = `cosine(vektor_query, e)` untuk setiap baris `e` di `E` (pakai fungsi buatanmu; jadikan `np.array`), lalu `top5_semantik = ambil_top(skor_semantik)`.
4. Buat matriks kemiripan 6 × 6 antar `KALIMAT`:
   - `matriks_tfidf` = `cosine_similarity(vectorizer.transform(KALIMAT))`
   - `matriks_semantik` = `cosine_similarity(...)` dari embedding_semantik setiap kalimat

   lalu gambar keduanya berdampingan sebagai **heatmap** dengan `gambar_heatmap(ax, matriks, judul)` (sudah disediakan) memakai `fig, axes = plt.subplots(1, 2, ...)`.

## starter
```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from simulasi_llm import embedding_semantik, DIMENSI_KONSEP

df = pd.read_csv("ulasan.csv")
QUERY = "pengiriman lambat"

# Seperti apa sebuah embedding? (hanya dimensi yang tidak nol)
contoh = embedding_semantik("Kurir telat mengantar paket")
print("Embedding 'Kurir telat mengantar paket':", {d: v for d, v in zip(DIMENSI_KONSEP, contoh) if v})


def cosine(a, b):
    # TODO: a·b / (|a| × |b|); jika salah satu panjangnya 0 -> 0.0
    return 0.0


def ambil_top(skor, k=5):
    """k ulasan dengan skor tertinggi (skor dibulatkan 4 desimal; jika seri, id_ulasan terkecil dulu)."""
    hasil = df[["id_ulasan", "teks_ulasan"]].copy()
    hasil["skor"] = np.round(np.asarray(skor, dtype=float), 4)
    return hasil.sort_values(["skor", "id_ulasan"], ascending=[False, True]).head(k).reset_index(drop=True)


# 1) Pencarian kata kunci: TF-IDF
vectorizer = TfidfVectorizer()
X_tfidf = vectorizer.fit_transform(df["teks_ulasan"])      # 160 ulasan × kosakata
skor_tfidf = np.zeros(len(df))                             # TODO
top5_tfidf = ambil_top(skor_tfidf)

# 2) Pencarian makna: embedding semantik
E = np.array([embedding_semantik(t) for t in df["teks_ulasan"]])   # 160 × 16
vektor_query = embedding_semantik(QUERY)
skor_semantik = np.zeros(len(df))                          # TODO: pakai cosine() untuk setiap baris E
top5_semantik = ambil_top(skor_semantik)

# 3) Matriks kemiripan antar kalimat
KALIMAT = [
    "Kurir telat mengantar paket",
    "Pengiriman lambat sekali",
    "Paket datang terlambat",
    "Barang rusak dan penyok",
    "Harganya terlalu mahal",
    "Pelayanan admin ramah",
]
matriks_tfidf = np.zeros((6, 6))       # TODO
matriks_semantik = np.zeros((6, 6))    # TODO


def gambar_heatmap(ax, matriks, judul):
    matriks = np.asarray(matriks, dtype=float)
    ax.imshow(matriks, vmin=0, vmax=1, cmap="Blues")
    ax.set_xticks(range(len(KALIMAT)))
    ax.set_xticklabels([str(i) for i in range(len(KALIMAT))])
    ax.set_yticks(range(len(KALIMAT)))
    ax.set_yticklabels([f"{i} {k}" for i, k in enumerate(KALIMAT)])
    for i in range(matriks.shape[0]):
        for j in range(matriks.shape[1]):
            ax.text(j, i, f"{matriks[i, j]:.2f}", ha="center", va="center", fontsize=8,
                    color="white" if matriks[i, j] > 0.6 else "black")
    ax.set_title(judul)
    ax.grid(False)


# TODO 4) dua heatmap berdampingan: fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))

tampilkan(top5_tfidf, "Top-5 TF-IDF untuk 'pengiriman lambat'")
top5_semantik
```

## solusi
```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from simulasi_llm import embedding_semantik, DIMENSI_KONSEP

df = pd.read_csv("ulasan.csv")
QUERY = "pengiriman lambat"

# Seperti apa sebuah embedding? (hanya dimensi yang tidak nol)
contoh = embedding_semantik("Kurir telat mengantar paket")
print("Embedding 'Kurir telat mengantar paket':", {d: v for d, v in zip(DIMENSI_KONSEP, contoh) if v})


def cosine(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    panjang = np.linalg.norm(a) * np.linalg.norm(b)
    if panjang == 0:
        return 0.0
    return float(np.dot(a, b) / panjang)


def ambil_top(skor, k=5):
    """k ulasan dengan skor tertinggi (skor dibulatkan 4 desimal; jika seri, id_ulasan terkecil dulu)."""
    hasil = df[["id_ulasan", "teks_ulasan"]].copy()
    hasil["skor"] = np.round(np.asarray(skor, dtype=float), 4)
    return hasil.sort_values(["skor", "id_ulasan"], ascending=[False, True]).head(k).reset_index(drop=True)


# 1) Pencarian kata kunci: TF-IDF
vectorizer = TfidfVectorizer()
X_tfidf = vectorizer.fit_transform(df["teks_ulasan"])      # 160 ulasan × kosakata
skor_tfidf = cosine_similarity(vectorizer.transform([QUERY]), X_tfidf)[0]
top5_tfidf = ambil_top(skor_tfidf)

# 2) Pencarian makna: embedding semantik
E = np.array([embedding_semantik(t) for t in df["teks_ulasan"]])   # 160 × 16
vektor_query = embedding_semantik(QUERY)
skor_semantik = np.array([cosine(vektor_query, e) for e in E])
top5_semantik = ambil_top(skor_semantik)
print("Ulasan yang cocok (skor > 0) — TF-IDF:", int((skor_tfidf > 0).sum()),
      "| semantik (skor >= 0.7):", int((skor_semantik >= 0.7).sum()))

# 3) Matriks kemiripan antar kalimat
KALIMAT = [
    "Kurir telat mengantar paket",
    "Pengiriman lambat sekali",
    "Paket datang terlambat",
    "Barang rusak dan penyok",
    "Harganya terlalu mahal",
    "Pelayanan admin ramah",
]
matriks_tfidf = cosine_similarity(vectorizer.transform(KALIMAT))
matriks_semantik = cosine_similarity([embedding_semantik(k) for k in KALIMAT])


def gambar_heatmap(ax, matriks, judul):
    matriks = np.asarray(matriks, dtype=float)
    ax.imshow(matriks, vmin=0, vmax=1, cmap="Blues")
    ax.set_xticks(range(len(KALIMAT)))
    ax.set_xticklabels([str(i) for i in range(len(KALIMAT))])
    ax.set_yticks(range(len(KALIMAT)))
    ax.set_yticklabels([f"{i} {k}" for i, k in enumerate(KALIMAT)])
    for i in range(matriks.shape[0]):
        for j in range(matriks.shape[1]):
            ax.text(j, i, f"{matriks[i, j]:.2f}", ha="center", va="center", fontsize=8,
                    color="white" if matriks[i, j] > 0.6 else "black")
    ax.set_title(judul)
    ax.grid(False)


fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
gambar_heatmap(axes[0], matriks_tfidf, "TF-IDF (kata kunci)")
gambar_heatmap(axes[1], matriks_semantik, "Embedding semantik (makna)")

tampilkan(top5_tfidf, "Top-5 TF-IDF untuk 'pengiriman lambat'")
top5_semantik
```

## checker
```python
import numpy as _np
from sklearn.metrics.pairwise import cosine_similarity as _cs

wajib_variabel("cosine")


def _c(a, b):
    try:
        return float(cosine(a, b)), None
    except Exception as e:
        return None, f"cosine({a}, {b}) error: {type(e).__name__}: {e}"


_uji = [([1, 0], [0, 1], 0.0), ([1, 2, 3], [2, 4, 6], 1.0), ([3, 4], [4, 3], 0.96), ([1, 2], [-1, -2], -1.0),
        ([0.2, 0.9, 0.1], [0.3, 0.5, 0.7], float(_cs([[0.2, 0.9, 0.1]], [[0.3, 0.5, 0.7]])[0, 0]))]
_salah = []
for _a, _b, _target in _uji:
    _h, _e = _c(_a, _b)
    if _h is None or abs(_h - _target) > 1e-6:
        _salah.append(_e or f"cosine({_a}, {_b}) = {_h}, seharusnya {round(_target, 4)}")
check("`cosine(a, b)` menghitung cosine similarity dengan benar", not _salah, "; ".join(_salah[:2]))
_h0, _e0 = _c([0, 0, 0], [1, 2, 3])
check("`cosine` dengan vektor nol mengembalikan 0.0 (bukan error/nan)", _h0 == 0.0,
      _e0 or f"Hasilnya {_h0}. Cek dulu: jika norm salah satu vektor = 0, return 0.0.")

wajib_variabel("skor_tfidf")
bandingkan_variabel("skor_tfidf", label="`skor_tfidf` = kemiripan TF-IDF query dengan 160 ulasan")
bandingkan_variabel("top5_tfidf", label="`top5_tfidf` = 5 ulasan teratas versi TF-IDF")

wajib_variabel("skor_semantik")
try:
    _ss = _np.asarray(skor_semantik, dtype=float)
    if _ss.shape != (160,):
        _pesan_ss = f"Ukurannya {_ss.shape}, seharusnya 160 skor (satu per ulasan)."
    else:
        _pesan_ss = ("Ada skor nan. Sebagian ulasan punya vektor nol — pastikan cosine() "
                     "mengembalikan 0.0 untuk kasus itu.")
except (TypeError, ValueError):
    _ss = _np.full(0, _np.nan)
    _pesan_ss = "`skor_semantik` harus berisi angka: np.array([cosine(vektor_query, e) for e in E])."
check("`skor_semantik` berisi 160 skor tanpa nan", _ss.shape == (160,) and not _np.isnan(_ss).any(), _pesan_ss)
bandingkan_variabel("skor_semantik", label="`skor_semantik` = cosine(vektor_query, e) untuk setiap baris E")
bandingkan_variabel("top5_semantik", label="`top5_semantik` = 5 ulasan teratas versi embedding")

wajib_variabel("matriks_tfidf")
bandingkan_variabel("matriks_tfidf", toleransi=1e-4, label="`matriks_tfidf` = kemiripan TF-IDF 6 × 6 antar KALIMAT")
bandingkan_variabel("matriks_semantik", toleransi=1e-4, label="`matriks_semantik` = kemiripan embedding 6 × 6 antar KALIMAT")

_heat = [ax for g in grafik for ax in g["axes"] if ax.get("images", 0) > 0]
check("Ada dua heatmap (TF-IDF dan semantik)", len(_heat) >= 2,
      f"Baru ada {len(_heat)} heatmap. Buat fig, axes = plt.subplots(1, 2) lalu panggil gambar_heatmap untuk masing-masing.")
check("Setiap heatmap diberi judul", bool(_heat) and all(ax["title"] for ax in _heat),
      "Isi argumen judul pada gambar_heatmap(ax, matriks, judul).")
```

## hint-1
`np.dot(a, b)` adalah perkalian titik, `np.linalg.norm(a)` adalah panjang vektor. Hitung dulu penyebutnya; jika hasilnya 0, langsung `return 0.0`.

Untuk `skor_semantik`, bandingkan `vektor_query` dengan **setiap baris** matriks `E` memakai list comprehension, lalu bungkus dengan `np.array(...)`.

## hint-2
`cosine_similarity(A, B)` dari scikit-learn menghitung kemiripan **setiap baris A** dengan **setiap baris B** (hasilnya matriks). Untuk satu query: `cosine_similarity(vectorizer.transform([QUERY]), X_tfidf)` berukuran 1 × 160 — ambil baris pertamanya dengan `[0]`. Jika hanya diberi satu argumen, `cosine_similarity(A)` membandingkan semua baris A satu sama lain (matriks 6 × 6).

## hint-3
```python
def cosine(a, b):
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    panjang = np.linalg.norm(a) * np.linalg.norm(b)
    return 0.0 if panjang == 0 else float(np.dot(a, b) / panjang)

skor_tfidf = cosine_similarity(vectorizer.transform([QUERY]), X_tfidf)[0]
skor_semantik = np.array([cosine(vektor_query, e) for e in ...])

matriks_tfidf = cosine_similarity(vectorizer.transform(KALIMAT))
matriks_semantik = cosine_similarity([embedding_semantik(k) for k in ...])

fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
gambar_heatmap(axes[0], matriks_tfidf, "TF-IDF (kata kunci)")
gambar_heatmap(axes[1], ..., "Embedding semantik (makna)")
```

## pembahasan
- **TF-IDF tertipu kata yang sama.** Top-5 TF-IDF untuk *"pengiriman lambat"* hanya berisi **1** keluhan pengiriman lambat sungguhan (U143, *"Ongkos kirim mahal tapi pengirimannya lambat."* — itu pun cocok lewat kata *lambat*, karena *pengirimannya* ≠ *pengiriman*). Sisanya: keluhan CS yang *lambat* membalas (U061) dan **tiga ulasan "Pengiriman cepat, sehari langsung sampai."** — kebalikan dari yang dicari!
- **Embedding menangkap makna.** Kelima hasil teratasnya semuanya keterlambatan pengiriman: *"Pengiriman lama sekali, sudah seminggu baru sampai."* (skor 1,00), *"Status paket tidak bergerak berhari-hari."* dan *"Paket datang terlambat 4 hari dari estimasi."* (0,95) — padahal tidak satu pun memuat kata *lambat* (bagi TF-IDF, *terlambat* adalah kata yang berbeda).
- **Heatmap:** *"Kurir telat mengantar paket"* vs *"Pengiriman lambat sekali"* bernilai **0,00** di TF-IDF (tidak ada kata yang sama) tetapi **0,95** di embedding. Tiga kalimat pengiriman membentuk kotak terang hanya di heatmap semantik.
- **Keterbatasan simulasi:** `embedding_semantik` hanya kamus 16 konsep, sehingga 21 ulasan (mis. *"Oke lah."*, *"Barang sudah diterima."*) menjadi **vektor nol** — itulah alasan `cosine` wajib menangani pembagian dengan nol. Model embedding asli menghasilkan ratusan–ribuan dimensi dan memahami kalimat yang jauh lebih beragam.
- **Di dunia nyata:** teks diubah menjadi vektor lewat API atau model embedding (penyedia LLM maupun open-source seperti *sentence-transformers*), disimpan di *vector database* (mis. pgvector, Qdrant), lalu dicari dengan *nearest neighbor*. Banyak sistem memakai **hybrid search** — kata kunci untuk istilah persis (kode produk, nomor pesanan), embedding untuk makna. Langkah pencarian inilah yang menjadi "R" (*retrieval*) pada RAG di latihan berikutnya.
