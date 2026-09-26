---
id: ai-02-temperature
track: ai
title: Prediksi Token Berikutnya — Softmax & Temperature
level: menengah
estimatedMinutes: 20
language: python
datasets: []
concepts: [next-token prediction, logit, softmax, temperature, sampling]
prerequisites: [ai-01-tokenisasi]
---

## instruksi
LLM menulis jawaban **satu token demi satu token**. Di setiap langkah, model memberi **skor mentah (logit)** untuk setiap kandidat token berikutnya. Skor itu diubah menjadi **peluang** dengan fungsi **softmax**, lalu satu token **diambil secara acak** sesuai peluangnya (*sampling*). Token terpilih ditempel ke teks, dan proses diulang.

**Temperature** (T) mengatur seberapa "berani" model saat mengambil token:

```
peluang(token_i) = exp(logit_i / T) / Σ exp(logit_j / T)
```

- **T kecil** (mis. 0,2) → distribusi *tajam*: token teratas hampir selalu terpilih → jawaban konsisten.
- **T = 1** → peluang asli model.
- **T besar** (mis. 1,5) → distribusi *datar*: token yang aneh pun ikut kebagian peluang → jawaban bervariasi, tetapi berisiko ngawur.

Geser temperature dan tekan tombol sampling untuk merasakan efeknya:

```visual
jenis: temperature
judul: Melanjutkan kalimat "Pengiriman paket ini sangat ..."
konteks: "Pengiriman paket ini sangat"
kandidat: [[cepat, 3.2], [lambat, 2.6], [aman, 1.8], [rapi, 1.1], [mahal, 0.6], [biru, -1.4]]
keterangan: Logit dari kandidat_token_berikutnya() di simulasi_llm (LLM tiruan).
```

### Kasus
Tim CS TokoKita akan memakai LLM untuk menulis balasan otomatis ke pelanggan. Sebelum memilih setelan `temperature`, mereka ingin melihat sendiri: seberapa sering model memilih kata yang wajar, dan seberapa sering kata yang salah arti atau tidak masuk akal?

### Tugas
1. Lengkapi fungsi `softmax(logits, temperature=1.0)` yang mengembalikan **list peluang** (jumlahnya 1):
   1. bagi setiap logit dengan `temperature`,
   2. kurangi setiap nilai dengan **nilai maksimumnya** (agar `math.exp` tidak *overflow* untuk logit besar),
   3. hitung `math.exp` setiap nilai, lalu bagi masing-masing dengan totalnya.

   Tulis sendiri — **jangan** mengimpor `softmax` dari `simulasi_llm`.
2. Starter sudah menyusun DataFrame `distribusi` (kolom `token`, `T=0.2`, `T=1.0`, `T=1.5`) memakai `softmax` buatanmu. Setelah `softmax` selesai, jalankan dan bandingkan ketiga kolomnya. Jangan membulatkan isinya (`.round(3)` di baris terakhir hanya untuk tampilan).
3. Untuk setiap temperature di `SUHU`, ambil 100 sampel dengan `ambil_sampel(token, peluang, n=100)` (sudah disediakan, seed tetap). Buat DataFrame `frekuensi` dengan kolom `token`, `T=0.2`, `T=1.0`, `T=1.5` berisi **berapa kali** setiap token muncul (petunjuk: `sampel.count(tok)`).
4. Buat **grafik batang** yang membandingkan peluang di ketiga temperature (mis. `distribusi.plot.bar(x="token")`) dan beri judul.

## starter
```python
import math
import random
import pandas as pd
import matplotlib.pyplot as plt
from simulasi_llm import kandidat_token_berikutnya

KONTEKS = "Pengiriman paket ini sangat"
kandidat = kandidat_token_berikutnya(KONTEKS)
token = [t for t, _ in kandidat]
logit = [z for _, z in kandidat]
print("Kandidat (token, logit):", kandidat)


def softmax(logits, temperature=1.0):
    # TODO 1) bagi setiap logit dengan temperature
    # TODO 2) kurangi dengan nilai maksimum
    # TODO 3) exp setiap nilai, lalu bagi dengan totalnya
    return [1 / len(logits)] * len(logits)      # sementara: semua token peluangnya sama


def ambil_sampel(token, peluang, n=100, seed=42):
    """Ambil n token secara acak sesuai peluangnya (seed tetap agar hasil bisa diulang)."""
    rng = random.Random(seed)
    return rng.choices(token, weights=peluang, k=n)


SUHU = [0.2, 1.0, 1.5]

distribusi = pd.DataFrame({"token": token})
for T in SUHU:
    distribusi[f"T={T}"] = softmax(logit, T)

# TODO 3) hitung frekuensi 100 sampel untuk setiap temperature
frekuensi = pd.DataFrame({"token": token})

# TODO 4) grafik batang distribusi peluang (beri judul)

for T in SUHU:
    print(f"T={T}:", [KONTEKS + " " + t for t in ambil_sampel(token, softmax(logit, T), n=3)])
distribusi.round(3)
```

## solusi
```python
import math
import random
import pandas as pd
import matplotlib.pyplot as plt
from simulasi_llm import kandidat_token_berikutnya

KONTEKS = "Pengiriman paket ini sangat"
kandidat = kandidat_token_berikutnya(KONTEKS)
token = [t for t, _ in kandidat]
logit = [z for _, z in kandidat]
print("Kandidat (token, logit):", kandidat)


def softmax(logits, temperature=1.0):
    z = [x / temperature for x in logits]          # 1) bagi dengan temperature
    m = max(z)
    z = [x - m for x in z]                         # 2) kurangi nilai maksimum
    e = [math.exp(x) for x in z]                   # 3) exp ...
    total = sum(e)
    return [x / total for x in e]                  #    ... lalu normalisasi


def ambil_sampel(token, peluang, n=100, seed=42):
    """Ambil n token secara acak sesuai peluangnya (seed tetap agar hasil bisa diulang)."""
    rng = random.Random(seed)
    return rng.choices(token, weights=peluang, k=n)


SUHU = [0.2, 1.0, 1.5]

distribusi = pd.DataFrame({"token": token})
for T in SUHU:
    distribusi[f"T={T}"] = softmax(logit, T)

frekuensi = pd.DataFrame({"token": token})
for T in SUHU:
    sampel = ambil_sampel(token, softmax(logit, T), n=100)
    frekuensi[f"T={T}"] = [sampel.count(tok) for tok in token]
tampilkan(frekuensi, "Frekuensi 100 sampel per temperature")

ax = distribusi.plot.bar(x="token", rot=0)
ax.set_title("Peluang token berikutnya: 'Pengiriman paket ini sangat ...'")
ax.set_xlabel("Kandidat token")
ax.set_ylabel("Peluang")

for T in SUHU:
    print(f"T={T}:", [KONTEKS + " " + t for t in ambil_sampel(token, softmax(logit, T), n=3)])
distribusi.round(3)
```

## checker
```python
import re as _re
import simulasi_llm as _sim

wajib_variabel("softmax")
check("`softmax` adalah fungsi buatanmu sendiri (bukan impor dari simulasi_llm)",
      callable(softmax) and getattr(softmax, "__module__", "") != "simulasi_llm",
      "Hapus impor softmax dari simulasi_llm dan tulis fungsinya sendiri dengan def softmax(...).")


def _uji(logits, T):
    try:
        return [float(x) for x in softmax(logits, T)], None
    except Exception as e:
        return None, f"softmax({logits}, {T}) error: {type(e).__name__}: {e}"


def _cocok(a, b, tol=1e-6):
    return a is not None and len(a) == len(b) and all(abs(x - y) <= tol for x, y in zip(a, b))


def _bulat(xs):
    return None if xs is None else [round(x, 4) for x in xs]


for _logits, _T in [([2.0, 1.0, 0.1], 1.0), ([1, 2, 3], 0.5), ([3.2, 2.6, 1.8, 1.1], 1.5)]:
    _hasil, _err = _uji(_logits, _T)
    _ref = _sim.softmax(_logits, _T)
    check(f"softmax({_logits}, temperature={_T}) menghasilkan peluang yang benar", _cocok(_hasil, _ref),
          _err or f"Hasilmu {_bulat(_hasil)}, seharusnya {_bulat(_ref)}.")

_h, _e = _uji([5, 1, -2, 0.5], 0.7)
check("Jumlah semua peluang = 1", _h is not None and abs(sum(_h) - 1) < 1e-9,
      _e or f"Jumlahnya {sum(_h) if _h else None}. Bagi setiap exp(...) dengan totalnya.")
_dingin, _e1 = _uji([2.0, 1.0], 0.1)
_panas, _e2 = _uji([2.0, 1.0], 10)
check("Temperature berpengaruh: T kecil → tajam, T besar → datar",
      _dingin is not None and _panas is not None and _dingin[0] > 0.99 and _panas[0] < 0.53,
      _e1 or _e2 or "Pastikan setiap logit dibagi dengan temperature sebelum exp().")
_stabil, _e3 = _uji([1000, 999], 1.0)
check("Tetap stabil untuk logit besar (tidak overflow)", _cocok(_stabil, _sim.softmax([1000, 999], 1.0)),
      (f"{_e3}." if _e3 else "Hasilnya belum benar.") + " Kurangi dulu setiap nilai dengan max(...) sebelum math.exp().")

wajib_variabel("distribusi", "DataFrame")
cek_kolom(distribusi, ["token", "T=0.2", "T=1.0", "T=1.5"])
bandingkan_variabel("distribusi", toleransi=1e-4,
                    label="`distribusi` berisi peluang softmax untuk T=0.2, 1.0, dan 1.5")

wajib_variabel("frekuensi", "DataFrame")
cek_kolom(frekuensi, ["token", "T=0.2", "T=1.0", "T=1.5"])
def _total(kolom):
    try:
        return int(frekuensi[kolom].sum())
    except (KeyError, TypeError, ValueError):
        return None


check("Setiap temperature berisi total 100 sampel",
      all(_total(c) == 100 for c in ["T=0.2", "T=1.0", "T=1.5"]),
      "Ambil sampel dengan ambil_sampel(token, softmax(logit, T), n=100) lalu hitung dengan sampel.count(tok).")
bandingkan_variabel("frekuensi", label="`frekuensi` = jumlah kemunculan setiap token dari 100 sampel")

_batang = sum(ax["bars"] for g in grafik for ax in g["axes"])
check("Ada grafik batang untuk ketiga temperature (6 token × 3 = 18 batang)", _batang >= 18,
      f"Baru ada {_batang} batang. Coba distribusi.plot.bar(x='token').")
check("Grafik diberi judul",
      any(any(ax["title"] for ax in g["axes"]) or not _re.fullmatch(r"Grafik \d+", g.get("title", "")) for g in grafik),
      "Tambahkan ax.set_title(...) atau plt.title(...).")
```

## hint-1
Softmax hanya tiga langkah: (1) bagi setiap logit dengan `temperature`, (2) kurangi setiap hasilnya dengan nilai terbesar, (3) hitung `math.exp` setiap nilai lalu bagi dengan totalnya agar jumlahnya 1. *List comprehension* (`[... for x in logits]`) memudahkan setiap langkah.

Mengurangi nilai maksimum **tidak mengubah hasil** (pembilang dan penyebut sama-sama dikali `exp(-m)`), tetapi mencegah `math.exp(1000)` yang terlalu besar untuk komputer.

## hint-2
Awal fungsi `softmax`:

```python
z = [x / temperature for x in logits]
m = max(z)
e = [math.exp(x - m) for x in z]
```

Untuk frekuensi, ulangi pola `distribusi` di starter:

```python
frekuensi = pd.DataFrame({"token": token})
for T in SUHU:
    sampel = ambil_sampel(token, softmax(logit, T), n=100)
    frekuensi[f"T={T}"] = ...   # list jumlah kemunculan setiap token
```

## hint-3
```python
def softmax(logits, temperature=1.0):
    z = [x / temperature for x in logits]
    m = max(z)
    e = [math.exp(x - m) for x in z]
    total = ...
    return [... for x in e]

frekuensi = pd.DataFrame({"token": token})
for T in SUHU:
    sampel = ambil_sampel(token, softmax(logit, T), n=100)
    frekuensi[f"T={T}"] = [sampel.count(tok) for tok in ...]

ax = distribusi.plot.bar(x="token")
ax.set_title(...)
```

## pembahasan
- **T = 0,2**: peluang `cepat` **95,2%**, `lambat` 4,7%, sisanya hampir nol → dari 100 sampel: 94× `cepat`, 6× `lambat`. Jawaban nyaris selalu sama.
- **T = 1,0**: `cepat` 50%, `lambat` 27%, `aman` 12%, `rapi` 6%, `mahal` 4%, `biru` 0,5% → sampelnya 50/28/12/5/3/2.
- **T = 1,5**: distribusi makin datar (`cepat` 39%, `biru` naik ke 1,8%) → sampel 45/26/12/8/6/3. Kalimat *"Pengiriman paket ini sangat biru"* muncul **3 dari 100 kali**!
- Perhatikan juga risikonya bagi bisnis: di T = 1,0, hampir **3 dari 10** balasan menulis pengiriman "sangat **lambat**" — artinya berbalik! Temperature bukan sekadar "kreativitas", tetapi juga **risiko salah makna**.
- Dengan seed yang sama, angka acaknya sama; temperature hanya **membentuk ulang distribusi**. Itu sebabnya urutan sampel di T = 1,0 dan T = 1,5 mirip.
- **Di API LLM asli:** parameter `temperature` bekerja dengan prinsip yang sama (rentangnya berbeda per penyedia, mis. 0–1 atau 0–2), ditemani `top_p`/`top_k` yang memangkas kandidat berpeluang kecil. Aturan praktis: **temperature rendah (0–0,3)** untuk klasifikasi, ekstraksi data, dan jawaban berbasis kebijakan; **lebih tinggi (0,7–1)** untuk ide/konten kreatif seperti caption promosi. Temperature 0 praktis berarti selalu memilih token teratas (*greedy*), meski di layanan nyata hasilnya belum tentu 100% identik setiap kali.
