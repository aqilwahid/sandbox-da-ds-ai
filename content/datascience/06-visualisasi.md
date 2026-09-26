---
id: ds-06-visualisasi
track: datascience
title: Visualisasi — Grafik yang Menjawab Pertanyaan
level: menengah
estimatedMinutes: 18
language: python
datasets: [properti]
concepts: [matplotlib, histogram, scatter plot, bar chart, judul & label sumbu]
prerequisites: [ds-05-groupby]
---

## instruksi
Tabel angka bagus untuk detail, tetapi grafik membuat pola terlihat dalam sekejap. Kuncinya: **mulai dari pertanyaannya**, lalu pilih jenis grafik yang paling cocok untuk menjawabnya.

```visual
jenis: pilih-grafik
judul: Pertanyaan apa yang ingin dijawab?
sorot: [histogram, scatter, batang]
```

| Pertanyaan bisnis | Grafik | matplotlib |
|---|---|---|
| Bagaimana **sebaran** harga rumah? Di kisaran berapa kebanyakan rumah? | Histogram | `ax.hist(x, bins=20)` |
| Apakah rumah yang lebih luas selalu lebih mahal? (**hubungan** dua angka) | Scatter | `ax.scatter(x, y)` |
| Lokasi mana yang termahal? (**perbandingan** antar-kategori) | Batang, diurutkan | `ax.barh(label, nilai)` |
| Bagaimana **tren** omzet dari bulan ke bulan? | Garis | `ax.plot(x, y)` |

Pola dasar matplotlib: buat kanvas (`fig`) dan area gambar (`ax`), gambar datanya, lalu **selalu** beri judul dan label sumbu — pembaca grafikmu belum tentu tahu isi kolom `harga_juta`.

```visual
jenis: anatomi
judul: Anatomi satu grafik
bahasa: python
bagian:
  - teks: "fig, ax = plt.subplots()"
    label: Kanvas baru (fig) dengan satu area gambar (ax)
  - teks: "ax.hist(df_bersih[\"harga_juta\"], bins=20)"
    label: Gambar datanya — di sini histogram dengan 20 kelompok harga
  - teks: "ax.set_title(\"Sebaran harga rumah di Jabodetabek\")"
    label: Judul — sebaiknya menjawab pertanyaan
  - teks: "ax.set_xlabel(\"Harga (juta Rp)\")"
    label: Label sumbu X, lengkap dengan satuan
  - teks: "ax.set_ylabel(\"Jumlah rumah\")"
    label: Label sumbu Y
```

> **Tips:** grafik ditampilkan otomatis setelah kode selesai — tidak perlu `plt.show()`. Setiap `plt.subplots()` membuat grafik baru. Ingin tiga grafik berdampingan? `fig, axes = plt.subplots(1, 3, figsize=(15, 4))` lalu gambar di `axes[0]`, `axes[1]`, `axes[2]`.

### Kasus
Tim marketing menyiapkan artikel **"Panduan Harga Rumah Jabodetabek"** untuk pembaca awam. Mereka butuh tiga grafik: (1) sebaran harga rumah, (2) hubungan luas bangunan dengan harga, dan (3) perbandingan harga tipikal di setiap lokasi.

### Tugas
Kode awal sudah menyiapkan `df_bersih` dan satu histogram yang belum lengkap.
1. **Histogram** `harga_juta` dengan 20 *bins*.
2. **Scatter plot** dengan `luas_bangunan_m2` di sumbu X dan `harga_juta` di sumbu Y.
3. Hitung **median harga per lokasi** sebagai Series bernama `median_per_lokasi`, urutkan dari kecil ke besar (`.sort_values()`), lalu gambar sebagai **bar chart horizontal** (`ax.barh`) — lokasi termahal otomatis berada di paling atas.
4. **Setiap** grafik wajib punya judul (`set_title`) serta label sumbu X dan Y (`set_xlabel`, `set_ylabel`).

## starter
```python
import pandas as pd
import matplotlib.pyplot as plt

# Pembersihan dari latihan sebelumnya
df = pd.read_csv("properti.csv")
df_bersih = df.drop_duplicates()
df_bersih["garasi"] = df_bersih["garasi"].fillna(0).astype(int)
df_bersih = df_bersih.dropna(subset=["harga_juta"])

# Grafik 1 (belum lengkap): histogram harga — belum ada judul & label sumbu
fig, ax = plt.subplots()
ax.hist(df_bersih["harga_juta"], bins=20)

# TODO 2: scatter luas_bangunan_m2 vs harga_juta

# TODO 3: median_per_lokasi + bar chart horizontal
median_per_lokasi = None
```

## solusi
```python
import pandas as pd
import matplotlib.pyplot as plt

# Pembersihan dari latihan sebelumnya
df = pd.read_csv("properti.csv")
df_bersih = df.drop_duplicates()
df_bersih["garasi"] = df_bersih["garasi"].fillna(0).astype(int)
df_bersih = df_bersih.dropna(subset=["harga_juta"])

# 1) Sebaran → histogram (+ garis rata-rata & median sebagai pembanding)
fig, ax = plt.subplots()
ax.hist(df_bersih["harga_juta"], bins=20, edgecolor="white")
ax.axvline(df_bersih["harga_juta"].mean(), color="black", linestyle="--", label="Rata-rata")
ax.axvline(df_bersih["harga_juta"].median(), color="black", linestyle=":", label="Median")
ax.set_title("Sebaran harga rumah di Jabodetabek")
ax.set_xlabel("Harga (juta Rp)")
ax.set_ylabel("Jumlah rumah")
ax.legend()

# 2) Hubungan dua angka → scatter
fig, ax = plt.subplots()
ax.scatter(df_bersih["luas_bangunan_m2"], df_bersih["harga_juta"], alpha=0.7)
ax.set_title("Makin luas makin mahal — tapi sebarannya lebar")
ax.set_xlabel("Luas bangunan (m²)")
ax.set_ylabel("Harga (juta Rp)")

# 3) Perbandingan kategori → bar horizontal yang diurutkan
median_per_lokasi = df_bersih.groupby("lokasi")["harga_juta"].median().sort_values()
fig, ax = plt.subplots()
ax.barh(median_per_lokasi.index, median_per_lokasi.values)
ax.set_title("Median harga rumah per lokasi")
ax.set_xlabel("Median harga (juta Rp)")
ax.set_ylabel("Lokasi")
```

## checker
```python
import re
import pandas as pd

def _terisi(teks):
    # Judul/label placeholder seperti "..." dianggap belum diisi
    return bool(re.sub(r"[\s._\-]", "", teks or ""))


# Kumpulkan semua area gambar (ax) yang berisi data, dari semua grafik
sumbu = []
for fig in grafik:
    judul_fig = (fig.get("title") or "").strip()
    pakai_judul_fig = len(fig["axes"]) == 1 and judul_fig and not re.fullmatch(r"Grafik \d+", judul_fig)
    for ax in fig["axes"]:
        if ax["bars"] or ax["collections"] or ax["lines"] or ax["images"]:
            judul = (ax["title"] or "").strip() or (judul_fig if pakai_judul_fig else "")
            sumbu.append(dict(ax, judul=judul))

check("Ada minimal 3 grafik", len(sumbu) >= 3,
      f"Baru ada {len(sumbu)} grafik berisi data. Buat histogram, scatter plot, dan bar chart.")
check("Ada histogram dan bar chart (grafik batang)", sum(1 for ax in sumbu if ax["bars"] > 0) >= 2,
      "Gambar histogram dengan ax.hist(...) dan bar chart dengan ax.barh(...).")
check("Histogram memakai 20 bins", any(ax["bars"] == 20 for ax in sumbu),
      "Tambahkan bins=20: ax.hist(df_bersih[\"harga_juta\"], bins=20).")
check("Ada scatter plot luas bangunan vs harga",
      any(ax["collections"] > 0 or (ax["lines"] > 0 and ax["bars"] == 0) for ax in sumbu),
      "Gambar titik-titiknya dengan ax.scatter(x, y).")
n_lokasi = len(nilai_solusi("median_per_lokasi"))
check(f"Bar chart menampilkan semua {n_lokasi} lokasi", any(ax["bars"] == n_lokasi for ax in sumbu),
      "Buat satu batang untuk setiap lokasi: ax.barh(median_per_lokasi.index, median_per_lokasi.values).")
tanpa_judul = [str(i + 1) for i, ax in enumerate(sumbu) if not _terisi(ax["judul"])]
check("Setiap grafik punya judul", bool(sumbu) and not tanpa_judul,
      f"Grafik ke-{', '.join(tanpa_judul)} belum punya judul yang bermakna. Tambahkan ax.set_title(\"Judul grafik\").")
tanpa_label = [str(i + 1) for i, ax in enumerate(sumbu)
               if not (_terisi(ax["xlabel"]) and _terisi(ax["ylabel"]))]
check("Setiap grafik punya label sumbu X dan Y", bool(sumbu) and not tanpa_label,
      f"Label grafik ke-{', '.join(tanpa_label)} belum lengkap. Isi ax.set_xlabel(...) dan ax.set_ylabel(...) "
      "dengan teks yang bermakna, lengkap dengan satuannya, mis. \"Harga (juta Rp)\".")

wajib_variabel("median_per_lokasi", pd.Series,
               label="median_per_lokasi berupa Series (satu pasang kurung siku: groupby(\"lokasi\")[\"harga_juta\"])")
ref = nilai_solusi("median_per_lokasi")
check("Index median_per_lokasi berisi nama lokasi",
      set(map(str, median_per_lokasi.index)) == set(map(str, ref.index)),
      "Buat dengan df_bersih.groupby(\"lokasi\")[\"harga_juta\"].median().")
rata = nilai_solusi("df_bersih").groupby("lokasi")["harga_juta"].mean()
nilai_mu = sorted(pd.to_numeric(median_per_lokasi, errors="coerce").tolist())
if len(nilai_mu) == len(rata) and all(abs(a - b) < 1e-6 for a, b in zip(nilai_mu, sorted(rata.tolist()))):
    check("median_per_lokasi memakai median, bukan rata-rata", False,
          "Ganti .mean() dengan .median() — median lebih tahan terhadap segelintir rumah super mahal.")
bandingkan_variabel("median_per_lokasi", urut=False, label="median_per_lokasi = median harga_juta per lokasi")
check("median_per_lokasi sudah diurutkan",
      median_per_lokasi.is_monotonic_increasing or median_per_lokasi.is_monotonic_decreasing,
      "Tambahkan .sort_values() agar batang tersusun dari yang terkecil ke yang terbesar.")
```

## hint-1
Setiap grafik baru dimulai dengan `fig, ax = plt.subplots()`. Setelah menggambar, tambahkan tiga baris: `ax.set_title(...)`, `ax.set_xlabel(...)`, `ax.set_ylabel(...)`.

## hint-2
Median per lokasi adalah `groupby` dengan satu kolom → hasilnya Series yang index-nya nama lokasi:

```python
median_per_lokasi = df_bersih.groupby("lokasi")["harga_juta"].median().sort_values()
ax.barh(median_per_lokasi.index, median_per_lokasi.values)
```

## hint-3
```python
fig, ax = plt.subplots()
ax.scatter(df_bersih["luas_bangunan_m2"], df_bersih["harga_juta"])
ax.set_title("...")
ax.set_xlabel("Luas bangunan (m²)")
ax.set_ylabel("Harga (juta Rp)")

median_per_lokasi = df_bersih.groupby("lokasi")["harga_juta"].median().sort_values()
fig, ax = plt.subplots()
ax.barh(median_per_lokasi.index, median_per_lokasi.values)
ax.set_title("...")
ax.set_xlabel("...")
ax.set_ylabel("...")
```

## pembahasan
- **Histogram:** hampir separuh rumah (81 dari 175) berharga 1.000–2.000 juta, lalu ada "ekor" panjang ke kanan sampai 5.350 juta. Garis rata-rata (1.793,6 juta) berada di kanan median (1.530 juta) — di solusi keduanya ditandai dengan `ax.axvline(...)`. Inilah bentuk *miring ke kanan* yang dulu kita temukan lewat angka di latihan DataFrame, sekarang terlihat dengan mata.
- **Scatter:** polanya naik, tetapi menyebar lebar (korelasi hanya 0,41). Rumah seluas 100–110 m² harganya mulai dari 770 juta (Depok) sampai 4.165 juta (Jakarta Selatan) — lebih dari 5×! Jika dihitung **per lokasi**, korelasi luas-harga jauh lebih kuat: dari 0,61 (Jakarta Utara) sampai 0,96 (Tangerang Selatan). Artinya luas memang penting, tetapi lokasi menentukan "level" harganya. Coba gambar titik per wilayah dengan warna berbeda: `for lokasi, g in df_bersih.groupby("lokasi"): ax.scatter(g["luas_bangunan_m2"], g["harga_juta"], label=lokasi)`, lalu `ax.legend()`.
- **Bar horizontal** dipilih karena nama lokasi yang panjang mudah dibaca, dan karena diurutkan, peringkatnya langsung terlihat. Tanpa `sort_values()`, batang tersusun menurut abjad dan pembaca harus mencari sendiri mana yang tertinggi.
- **Hindari pie chart** untuk 10 kategori: mata manusia sulit membandingkan besar sudut, apalagi yang ukurannya mirip.
- Judul terbaik **menyampaikan pesan**, bukan sekadar nama variabel. Bandingkan "Median harga per lokasi" dengan "Median harga rumah di Jakarta Pusat 4× lipat Bogor".
- Label sumbu selalu dengan **satuan** — "Harga (juta Rp)", bukan "harga_juta". Grafikmu akan dibaca orang yang tidak pernah melihat kodenya.
