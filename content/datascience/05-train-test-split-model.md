---
id: ds-05-model-training
track: datascience
title: Pembagian Data & Pelatihan Model Scikit-Learn
estimatedMinutes: 12
runtime: pyodide
packages: [pandas, scikit-learn]
datasets: [housing_sample.csv]
prerequisites: [ds-04-feature-engineering]
---

## instruksi
Saatnya membangun model Machine Learning prediktif! Anda akan membagi dataset menjadi subset pelatihan (*training*) dan pengujian (*testing*), lalu melatih model regresi menggunakan pustaka **Scikit-Learn**.

### Kasus Bisnis:
Kita ingin memprediksi harga rumah (`harga_juta`) berdasarkan fitur-fitur numerik seperti `luas_tanah_m2`, `luas_bangunan_m2`, `kamar_tidur`, `kamar_mandi`, `garasi`, dan `jarak_pusat_kota_km`.

### Tugas Anda:
1. Siapkan matriks fitur `X` yang berisi kolom: `['luas_tanah_m2', 'luas_bangunan_m2', 'kamar_tidur', 'kamar_mandi', 'garasi', 'jarak_pusat_kota_km']`.
2. Siapkan vektor target `y = df['harga_juta']`.
3. Bagi data menjadi `X_train, X_test, y_train, y_test` menggunakan `train_test_split(X, y, test_size=0.25, random_state=42)`.
4. Inisialisasi model regresi `model = LinearRegression()` (atau `HistGradientBoostingRegressor(random_state=42)`).
5. Latih model dengan `model.fit(X_train, y_train)`.
6. Lakukan prediksi pada data uji: `y_pred = model.predict(X_test)`.

## starter
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression

# 1. Muat dataset
df = pd.read_csv('housing_sample.csv')

features = ['luas_tanah_m2', 'luas_bangunan_m2', 'kamar_tidur', 'kamar_mandi', 'garasi', 'jarak_pusat_kota_km']
X = df[features]
y = df['harga_juta']

# 2. Train-test split (25% test size, random_state 42)
# X_train, X_test, y_train, y_test = ...

# 3. Inisialisasi dan latih model
# model = ...
# model.fit(...)

# 4. Prediksi data uji
# y_pred = ...

print("Pelatihan Model Selesai.")

## solusi
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression

df = pd.read_csv('housing_sample.csv')

features = ['luas_tanah_m2', 'luas_bangunan_m2', 'kamar_tidur', 'kamar_mandi', 'garasi', 'jarak_pusat_kota_km']
X = df[features]
y = df['harga_juta']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

model = LinearRegression()
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

print("Data Train:", X_train.shape)
print("Data Test:", X_test.shape)
print("Contoh 3 Prediksi Pertama:", y_pred[:3])

## checker
assert 'X_train' in locals() or 'X_train' in globals(), "Variabel 'X_train' belum dibuat."
assert 'X_test' in locals() or 'X_test' in globals(), "Variabel 'X_test' belum dibuat."
assert 'model' in locals() or 'model' in globals(), "Variabel 'model' belum didefinisikan."
assert 'y_pred' in locals() or 'y_pred' in globals(), "Variabel 'y_pred' belum didefinisikan."
assert len(y_pred) == len(X_test), "Panjang 'y_pred' harus sama dengan jumlah baris 'X_test'."
report(True, "Hebat! Model regresi Scikit-Learn berhasil dilatih dan menghasilkan prediksi.")

## hint-1
Gunakan fungsi `train_test_split(X, y, test_size=0.25, random_state=42)`.

## hint-2
Panggil metode `.fit(X_train, y_train)` pada objek model untuk melatih algoritma.

## hint-3
Gunakan `y_pred = model.predict(X_test)` untuk mendapatkan hasil prediksi dari data testing.
