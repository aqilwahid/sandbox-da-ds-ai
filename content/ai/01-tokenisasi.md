---
id: ai-01-tokenisasi
track: ai
title: Token — Cara LLM "Membaca" Teks & Menghitung Biaya
level: pemula
estimatedMinutes: 15
language: python
datasets: [ulasan]
concepts: [token, tokenisasi, sub-kata, rasio token per kata, estimasi biaya API]
prerequisites: []
---

## instruksi
LLM (*Large Language Model*) seperti ChatGPT, Claude, atau Gemini **tidak membaca kata utuh**. Sebelum diproses, teks dipotong menjadi **token** — potongan sub-kata:

- kata yang umum biasanya **1 token** (`" paket"`, `" telat"`),
- kata yang jarang, asing, atau berimbuhan **dipecah** menjadi beberapa potongan (`" diperbaiki"` → `" di"` + `"per"` + `"baik"` + `"i"`),
- tanda baca dan angka juga jadi token sendiri, dan **spasi di depan kata ikut menempel** pada token.

Setiap token lalu diubah menjadi **ID angka** — deretan angka inilah yang sebenarnya "dilihat" model. Coba ketik kalimatmu sendiri di bawah:

```visual
jenis: tokenisasi
judul: Satu ulasan dipecah menjadi token
teks: "Kurir telat dan paketnya penyok. Tolong diperbaiki."
keterangan: Kata tidak selalu sama dengan token. Perhatikan "paketnya" dan "diperbaiki".
```

Mengapa token penting untuk aplikasi LLM?
1. **Biaya** API dihitung per token — token input (prompt) *dan* token output (jawaban), biasanya output lebih mahal.
2. **Batas panjang** (*context window*) diukur dalam token, bukan kata.
3. **Kecepatan**: makin banyak token yang harus ditulis model, makin lama jawabannya.

> **Catatan simulasi:** semua latihan track AI memakai modul `simulasi_llm` — **LLM tiruan** yang berjalan di browser tanpa API key dan tanpa biaya. Tokenizer-nya kecil (±500 potongan) sehingga angkanya berbeda dengan tokenizer model asli, tetapi prinsipnya sama.

### Kasus
Tim Customer Service (CS) TokoKita ingin memakai LLM untuk membaca **160 ulasan** pelanggan secara otomatis. Sebelum mengajukan anggaran ke manajer, mereka perlu tahu: berapa token yang akan dikirim ke LLM, dan berapa perkiraan biayanya?

### Tugas
1. Simpan hasil `tokenisasi(contoh)` ke variabel `token_contoh` (`contoh` = ulasan U025, sudah disiapkan).
2. Kolom `jumlah_kata` sudah dibuat. Tambahkan kolom `jumlah_token` = `hitung_token(teks)` untuk setiap ulasan (petunjuk: `.apply(hitung_token)`).
3. Hitung `total_token` (jumlah semua token) dan `rasio_token_per_kata` = `total_token` ÷ total kata, **dibulatkan 2 desimal**.
4. Simpan **teks** ulasan dengan token terbanyak ke `ulasan_terpanjang` (petunjuk: `idxmax()`).
5. Setiap ulasan akan dikirim bersama `INSTRUKSI`, dan LLM membalas sepanjang `TOKEN_JAWABAN` token. Hitung:
   - `token_input` = `len(df)` × token `INSTRUKSI` + `total_token`
   - `token_output` = `len(df)` × `TOKEN_JAWABAN`
   - `biaya` = `estimasi_biaya(token_input, token_output)` (Rupiah, tarif fiktif Rp15/1.000 token input & Rp60/1.000 token output)
6. Buat **scatter plot** `jumlah_kata` (sumbu x) vs `jumlah_token` (sumbu y) lengkap dengan judul.

## starter
```python
import pandas as pd
import matplotlib.pyplot as plt
from simulasi_llm import tokenisasi, hitung_token, estimasi_biaya

df = pd.read_csv("ulasan.csv")

# 1) Bagaimana LLM "membaca" satu ulasan?
contoh = df.loc[df["id_ulasan"] == "U025", "teks_ulasan"].iloc[0]
token_contoh = []                      # TODO: tokenisasi(contoh)
print("Teks :", contoh)
print("Token:", token_contoh)

# 2) Kata vs token untuk setiap ulasan
df["jumlah_kata"] = df["teks_ulasan"].apply(lambda t: len(t.split()))
df["jumlah_token"] = 0                 # TODO: hitung_token untuk setiap teks

# 3) Ringkasan
total_token = 0                        # TODO
rasio_token_per_kata = 0               # TODO: total_token / total kata, 2 desimal

# 4) Ulasan dengan token terbanyak
ulasan_terpanjang = ""                 # TODO

# 5) Estimasi biaya memproses semua ulasan
INSTRUKSI = ("Kamu adalah analis CS TokoKita. Tentukan sentimen ulasan berikut: "
             "positif, negatif, atau netral. Balas hanya dengan JSON.")
TOKEN_JAWABAN = hitung_token('{"sentimen": "negatif"}')   # perkiraan panjang satu jawaban
print("Token instruksi:", hitung_token(INSTRUKSI), "| token per jawaban:", TOKEN_JAWABAN)

token_input = 0                        # TODO
token_output = 0                       # TODO
biaya = 0                              # TODO: estimasi_biaya(token_input, token_output)

# 6) TODO: scatter plot jumlah_kata vs jumlah_token (beri judul)

df[["id_ulasan", "teks_ulasan", "jumlah_kata", "jumlah_token"]].head(10)
```

## solusi
```python
import pandas as pd
import matplotlib.pyplot as plt
from simulasi_llm import tokenisasi, hitung_token, estimasi_biaya

df = pd.read_csv("ulasan.csv")

# 1) Bagaimana LLM "membaca" satu ulasan?
contoh = df.loc[df["id_ulasan"] == "U025", "teks_ulasan"].iloc[0]
token_contoh = tokenisasi(contoh)
print("Teks :", contoh)
print("Token:", token_contoh)

# 2) Kata vs token untuk setiap ulasan
df["jumlah_kata"] = df["teks_ulasan"].apply(lambda t: len(t.split()))
df["jumlah_token"] = df["teks_ulasan"].apply(hitung_token)

# 3) Ringkasan
total_token = int(df["jumlah_token"].sum())
rasio_token_per_kata = round(total_token / df["jumlah_kata"].sum(), 2)
print(f"{df['jumlah_kata'].sum()} kata -> {total_token} token (rasio {rasio_token_per_kata})")

# 4) Ulasan dengan token terbanyak
ulasan_terpanjang = df.loc[df["jumlah_token"].idxmax(), "teks_ulasan"]
print("Token terbanyak:", ulasan_terpanjang)

# 5) Estimasi biaya memproses semua ulasan
INSTRUKSI = ("Kamu adalah analis CS TokoKita. Tentukan sentimen ulasan berikut: "
             "positif, negatif, atau netral. Balas hanya dengan JSON.")
TOKEN_JAWABAN = hitung_token('{"sentimen": "negatif"}')   # perkiraan panjang satu jawaban
print("Token instruksi:", hitung_token(INSTRUKSI), "| token per jawaban:", TOKEN_JAWABAN)

token_input = len(df) * hitung_token(INSTRUKSI) + total_token
token_output = len(df) * TOKEN_JAWABAN
biaya = estimasi_biaya(token_input, token_output)
print(f"Input {token_input} token, output {token_output} token -> biaya Rp{biaya}")
print(f"Porsi instruksi dalam token input: {len(df) * hitung_token(INSTRUKSI) / token_input:.0%}")

# 6) Scatter plot kata vs token
fig, ax = plt.subplots()
ax.scatter(df["jumlah_kata"], df["jumlah_token"], alpha=0.5)
ax.plot([1, 12], [1, 12], "--", color="gray", label="1 kata = 1 token")
ax.set_title("Jumlah kata vs jumlah token per ulasan")
ax.set_xlabel("Jumlah kata")
ax.set_ylabel("Jumlah token")
ax.legend()

df[["id_ulasan", "teks_ulasan", "jumlah_kata", "jumlah_token"]].sort_values("jumlah_token", ascending=False).head(10)
```

## checker
```python
wajib_variabel("token_contoh", list)
bandingkan_variabel("token_contoh", label="`token_contoh` berisi hasil tokenisasi(contoh)")
check("Spasi di depan kata ikut menjadi bagian token (mis. ' telat')",
      " telat" in token_contoh,
      "Jangan membersihkan/strip token — simpan hasil tokenisasi(contoh) apa adanya.")

wajib_variabel("df", "DataFrame")
cek_kolom(df, ["jumlah_kata", "jumlah_token"])

def _token_per_ulasan(d):
    try:
        return {str(i): int(n) for i, n in zip(d["id_ulasan"], d["jumlah_token"])}
    except (KeyError, TypeError, ValueError):
        return None

def _angka(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None

_milikmu = _token_per_ulasan(df)
_pesan = "Isi kolom dengan df['teks_ulasan'].apply(hitung_token)."
if "jumlah_token" in df.columns and len(df) and isinstance(df["jumlah_token"].iloc[0], list):
    _pesan = "Kolomnya berisi list token. Pakai hitung_token (jumlah token), bukan tokenisasi."
check("Kolom `jumlah_token` = hitung_token(teks) untuk setiap ulasan",
      _milikmu is not None and _milikmu == _token_per_ulasan(nilai_solusi("df")), _pesan)

wajib_variabel("total_token")
bandingkan_variabel("total_token", label="`total_token` = jumlah seluruh token ulasan")
check("`total_token` konsisten dengan kolom `jumlah_token`",
      _milikmu is not None and _angka(total_token) == sum(_milikmu.values()),
      "Hitung dari kolomnya: df['jumlah_token'].sum().")
bandingkan_variabel("rasio_token_per_kata", toleransi=0.005,
                    label="`rasio_token_per_kata` = total token ÷ total kata (2 desimal)")
check("Satu kata rata-rata lebih dari satu token", (_angka(rasio_token_per_kata) or 0) > 1,
      "Rasio seharusnya > 1 (token ÷ kata, bukan kata ÷ token): kata sering dipecah menjadi beberapa token.")
bandingkan_variabel("ulasan_terpanjang", label="`ulasan_terpanjang` = teks ulasan dengan token terbanyak")

wajib_variabel("token_input")
bandingkan_variabel("token_input", label="`token_input` = token instruksi × jumlah ulasan + total token ulasan")
bandingkan_variabel("token_output", label="`token_output` = jumlah ulasan × TOKEN_JAWABAN")
bandingkan_variabel("biaya", toleransi=0.01, label="`biaya` dihitung dengan estimasi_biaya(token_input, token_output)")

_sebar = [ax for g in grafik for ax in g["axes"] if ax["collections"] > 0]
check("Ada scatter plot jumlah kata vs jumlah token", len(_sebar) > 0,
      "Gunakan plt.scatter(df['jumlah_kata'], df['jumlah_token']) atau ax.scatter(...).")
check("Grafik diberi judul", any(ax["title"] for ax in _sebar),
      "Tambahkan ax.set_title(...) atau plt.title(...).")
```

## hint-1
Semua alat sudah diimpor: `tokenisasi(teks)` mengembalikan **list token**, `hitung_token(teks)` mengembalikan **jumlahnya**. Untuk menghitung per baris DataFrame, pakai `.apply(...)` pada kolom `teks_ulasan`.

## hint-2
- Total: `df["jumlah_token"].sum()`; rasio: bagi dengan `df["jumlah_kata"].sum()` lalu `round(..., 2)`.
- `df["jumlah_token"].idxmax()` memberi **index** baris dengan token terbanyak → ambil teksnya dengan `df.loc[index, "teks_ulasan"]`.
- Instruksi ikut dikirim **di setiap panggilan**, jadi token instruksi dikalikan jumlah ulasan.

## hint-3
```python
token_contoh = tokenisasi(contoh)
df["jumlah_token"] = df["teks_ulasan"].apply(...)

total_token = int(df["jumlah_token"].sum())
rasio_token_per_kata = round(total_token / ..., 2)
ulasan_terpanjang = df.loc[df["jumlah_token"].idxmax(), ...]

token_input = len(df) * hitung_token(INSTRUKSI) + ...
token_output = len(df) * ...
biaya = estimasi_biaya(token_input, token_output)

fig, ax = plt.subplots()
ax.scatter(..., ...)
ax.set_title("Jumlah kata vs jumlah token")
```

## pembahasan
- **Kata ≠ token.** 160 ulasan berisi **924 kata** tetapi **1.957 token** — rata-rata **2,12 token per kata**. Di scatter plot semua titik berada **di atas** diagonal "1 kata = 1 token" (garis putus-putus di solusi).
- Ulasan dengan token terbanyak adalah U041 *"Recommended seller, pasti belanja lagi. Sukses terus."* — **24 token padahal hanya 7 kata**, karena kata asing seperti *Recommended* dipecah menjadi 6 potongan (`Re`, `co`, `m`, `men`, `de`, `d`). Sebaliknya, ulasan dengan kata terbanyak (11 kata: U064, U101, U135, U153) "hanya" 16–22 token. Panjang teks bagi LLM diukur dalam token, bukan kata.
- **Biaya:** `token_input` = 9.797 token (Rp146,96) dan `token_output` = 2.400 token (Rp144) → total **Rp290,96** (tarif fiktif). Perhatikan bahwa **80% token input adalah `INSTRUKSI` yang sama, diulang 160 kali!** Output juga 4× lebih mahal per token: jumlah tokennya 4× lebih sedikit, tetapi biayanya hampir sama dengan input. Cara berhemat di aplikasi nyata: instruksi ringkas, beberapa ulasan dalam satu panggilan (*batching*), *prompt caching*, dan membatasi panjang jawaban (`max_tokens`).
- **Di API LLM asli:** setiap respons menyertakan data pemakaian (mis. `usage.input_tokens` / `usage.output_tokens`) — catat angka itu untuk memantau biaya. Setiap model punya tokenizer sendiri; hitung token dengan tokenizer model yang dipakai. Kosakata tokenizer model asli berisi puluhan hingga ratusan ribu token sehingga rasionya jauh lebih kecil daripada simulasi ini, tetapi teks berbahasa Indonesia umumnya tetap butuh lebih banyak token per kata dibanding bahasa Inggris.
