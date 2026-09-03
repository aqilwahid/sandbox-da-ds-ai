# Panduan Penulisan Konten Latihan Data Science (Pyodide Runtime)

Dokumen ini berisi pedoman teknis dan batasan pustaka untuk penulis konten latihan modul **Data Science** pada platform Hands-On Sandbox.

---

## 1. Batasan Library & Dukungan Ekosistem

Runtime berjalan 100% di browser peserta menggunakan **Pyodide (WebAssembly)** di dalam Web Worker terisolasi.

### ✅ Pustaka yang TERSEDIA & Didukung Penuh:
- **NumPy** (`numpy`)
- **Pandas** (`pandas`)
- **SciPy** (`scipy`)
- **Matplotlib** (`matplotlib`) — auto backend `AGG`
- **Scikit-Learn** (`scikit-learn`)
- **Statsmodels** (`statsmodels`)
- **SymPy** (`sympy`)
- **NetworkX** (`networkx`)

### ❌ Pustaka & Fitur yang TIDAK TERSEDIA (Jangan Dipakai di Konten):
- **Deep Learning Heavy**: PyTorch, TensorFlow, Keras (terlalu berat untuk in-browser WASM client).
- **External Boosting C++ Binaries**: XGBoost, LightGBM, CatBoost.
- **Concurrency / OS**: `multiprocessing`, `threading`, subprocesses.
- **Koneksi Jaringan Langsung**: Raw TCP socket, koneksi langsung ke server database sungguhan (PostgreSQL/MySQL).

> [!TIP]
> **Alternatif Gradient Boosting**:
> Jika latihan membutuhkan model Gradient Boosting, gunakan **`HistGradientBoostingClassifier`** atau **`HistGradientBoostingRegressor`** dari `sklearn.ensemble`. Pustaka ini 100% native di scikit-learn, cepat, dan bekerja sempurna di Pyodide WASM.

---

## 2. Fitur Visualisasi Matplotlib (Auto-Capture)

1. Backend Matplotlib diatur secara otomatis ke **`AGG`** di dalam worker.
2. Platform dilengkapi fitur **Auto-Capture Figures**: Semua figure Matplotlib yang dibuat peserta (`plt.plot`, `sns`, `df.plot`) akan otomatis diekstrak menjadi gambar PNG dan ditampilkan di panel output.
3. Peserta **tidak wajib** memanggil `plt.show()`.

---

## 3. Grader Helper Functions (Pemeriksa Kuis)

Saat menulis section `## checker`, gunakan helper bawaan berikut untuk memberikan feedback error yang ramah dan membantu pemula:

### 1. `assert_columns(df, required_columns)`
Memeriksa keberadaan kolom pada DataFrame dengan fuzzy match saran jika ada salah ketik / typo.
```python
assert_columns(df, ["harga_bersih", "kategori"])
```

### 2. `assert_shape(df, rows=None, cols=None)`
Memeriksa dimensi baris dan/atau kolom DataFrame.
```python
assert_shape(df_clean, rows=40, cols=8)
```

### 3. `assert_no_nulls(df, cols=None)`
Memastikan tidak ada nilai NaN/Null pada kolom tertentu atau seluruh DataFrame.
```python
assert_no_nulls(df_clean, ["luas_tanah_m2", "harga_juta"])
```

### 4. `assert_close(actual, expected, tol=1e-5)`
Membandingkan nilai angka atau float dengan toleransi kesalahan desimal.
```python
assert_close(mean_harga, 1850.5, tol=1e-2)
```

### 5. `assert_metric_above(value, threshold, metric_name)`
Memeriksa apakah performa model (misal: R2-score, Akurasi, F1) melewati ambang batas tertentu.
```python
assert_metric_above(akurasi_test, 0.80, "Akurasi Model")
```

### 6. `report(passed: bool, message: str)`
Mengirim hasil penilaian ke sistem UI platform.
```python
report(True, "Selamat! Data berhasil dibersihkan dan model dilatih dengan baik.")
```
