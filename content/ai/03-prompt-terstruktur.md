---
id: ai-03-prompt-terstruktur
track: ai
title: Prompt Terstruktur — Peran, Label, Format & Contoh (Few-shot)
level: menengah
estimatedMinutes: 20
language: python
datasets: [ulasan]
concepts: [prompt engineering, peran, format JSON, few-shot, evaluasi akurasi]
prerequisites: [ai-02-temperature]
---

## instruksi
Prompt adalah **spesifikasi kerja** untuk LLM. Prompt yang samar ("Apa sentimen ulasan ini?") menghasilkan jawaban bebas yang enak dibaca manusia, tetapi **tidak bisa diproses program** dan labelnya tidak konsisten. Prompt yang baik punya komponen yang jelas:

```visual
jenis: anatomi
judul: Anatomi prompt klasifikasi yang baik
bahasa: teks
bagian:
  - teks: "Kamu adalah analis layanan pelanggan TokoKita."
    label: "1. Peran — siapa model ini dan untuk siapa ia bekerja"
  - teks: "Tugas: klasifikasikan sentimen ulasan pelanggan."
    label: "2. Tugas — apa yang harus dikerjakan"
  - teks: "Label yang diizinkan: positif, negatif, netral."
    label: "3. Label yang diizinkan — pilihan jawaban tertutup"
  - teks: 'Format: balas hanya JSON tanpa teks lain, contoh {"sentimen": "negatif"}.'
    label: "4. Format output — agar bisa dibaca program"
  - teks: 'Contoh: "Kurir telat, paket penyok." -> {"sentimen": "negatif"}'
    label: "5. Contoh berlabel (few-shot) — minimal 2"
  - teks: 'Ulasan: "Admin tidak ramah saat ditanya."'
    label: "6. Input — ditaruh di baris terakhir"
```

Bandingkan hasilnya untuk ulasan yang sama (jawaban asli dari `LLMTiruan`):

```visual
jenis: perbandingan
judul: Ulasan sama, prompt berbeda
bahasa: teks
kiri:
  judul: Prompt polos
  isi: |
    Apa sentimen ulasan ini?
    Ulasan: "Admin tidak ramah saat ditanya."

    Jawaban LLM:
    Menurut saya, ulasan ini bernada positif (pelanggan puas).
kanan:
  judul: Prompt terstruktur (few-shot)
  isi: |
    Kamu adalah analis layanan pelanggan TokoKita.
    Tugas: klasifikasikan sentimen ulasan pelanggan.
    Label yang diizinkan: positif, negatif, netral.
    Format: balas hanya JSON tanpa teks lain, contoh {"sentimen": "negatif"}.
    Contoh: "Barang sampai cepat dan rapi." -> {"sentimen": "positif"}
    Contoh: "Kurir telat, paket penyok." -> {"sentimen": "negatif"}
    Contoh: "Barang sudah diterima, belum dicoba." -> {"sentimen": "netral"}
    Ulasan: "Admin tidak ramah saat ditanya."

    Jawaban LLM:
    {"sentimen": "negatif"}
keterangan: Prompt polos salah label dan jawabannya tidak bisa dibaca program. Prompt terstruktur tepat dan berupa JSON.
```

> **Catatan simulasi:** `LLMTiruan` **meniru** pola LLM asli dengan aturan sederhana — label keluar persis hanya jika daftar label disebut, JSON "bersih" hanya jika diminta *hanya JSON*, dan contoh berlabel membuatnya lebih akurat.

### Kasus
Tim CS TokoKita ingin membuat **dashboard sentimen otomatis**. Agar bisa dipakai, jawaban LLM harus (1) **bisa dibaca program** (JSON) dan (2) **akurat**. Tim sudah melabeli 160 ulasan secara manual — itulah "kunci jawaban" untuk mengukur kualitas prompt. Fungsi `evaluasi(fungsi_prompt)` di starter mengirim setiap ulasan ke LLM, membaca JSON-nya, dan membandingkannya dengan label tim CS.

### Tugas
1. Jalankan starter. `prompt_awal` (prompt polos) sudah dievaluasi — lihat `akurasi_awal` dan contoh jawabannya.
2. Lengkapi fungsi `buat_prompt(ulasan)` agar memuat keenam komponen di atas:
   - peran dan tugas,
   - label yang diizinkan: `positif`, `negatif`, `netral`,
   - format: **balas hanya JSON tanpa teks lain**, dengan bentuk `{"sentimen": "..."}`,
   - **minimal 2 contoh berlabel** berpola `Contoh: "<teks>" -> {"sentimen": "<label>"}`,
   - input di **baris terakhir**: `Ulasan: "<teks ulasan>"` (pakai f-string).
3. Dari `hasil_baru`, hitung `json_valid_baru` = proporsi jawaban yang berhasil dibaca (kolom `prediksi` tidak kosong → `.notna().mean()`) dan `akurasi_baru` = rata-rata kolom `benar`.
4. Target: `json_valid_baru` = **1.0** (100%) dan `akurasi_baru` **≥ 0.85**.

> **Tips:** tambahkan komponen **satu per satu** lalu jalankan ulang. Perhatikan komponen mana yang menaikkan `json_valid_baru`, dan mana yang menaikkan `akurasi_baru`.

## starter
```python
import json
import pandas as pd
from simulasi_llm import LLMTiruan

df = pd.read_csv("ulasan.csv")
llm = LLMTiruan()


def baca_label(jawaban):
    """Ambil label dari jawaban JSON. Jika jawabannya bukan JSON valid → None."""
    try:
        return json.loads(jawaban).get("sentimen")
    except Exception:
        return None


def evaluasi(fungsi_prompt):
    """Kirim setiap ulasan ke LLM dengan fungsi_prompt, lalu bandingkan dengan label tim CS."""
    baris = []
    for r in df.itertuples():
        jawaban = llm.jawab(fungsi_prompt(r.teks_ulasan))
        prediksi = baca_label(jawaban)
        baris.append({"id_ulasan": r.id_ulasan, "teks_ulasan": r.teks_ulasan, "sentimen": r.sentimen,
                      "jawaban": jawaban, "prediksi": prediksi, "benar": prediksi == r.sentimen})
    return pd.DataFrame(baris)


# Prompt awal (polos)
def prompt_awal(ulasan):
    return f'Apa sentimen ulasan ini?\nUlasan: "{ulasan}"'


hasil_awal = evaluasi(prompt_awal)
akurasi_awal = hasil_awal["benar"].mean()
print("Jawaban prompt awal :", hasil_awal.loc[0, "jawaban"])
print("Akurasi prompt awal :", akurasi_awal)


# TODO: lengkapi prompt terstruktur
def buat_prompt(ulasan):
    return (
        "Kamu adalah ...\n"               # TODO 1) peran
        "Tugas: ...\n"                     # TODO 2) tugas
        # TODO 3) label yang diizinkan
        # TODO 4) format output: hanya JSON
        # TODO 5) minimal 2 contoh berlabel (few-shot)
        f'Ulasan: "{ulasan}"'              # 6) input — tetap di baris terakhir
    )


hasil_baru = evaluasi(buat_prompt)
json_valid_baru = 0      # TODO: proporsi kolom prediksi yang tidak kosong
akurasi_baru = 0         # TODO: rata-rata kolom benar

print("\nPrompt baru:\n" + buat_prompt("Admin tidak ramah saat ditanya."))
print("Jawaban LLM:", llm.jawab(buat_prompt("Admin tidak ramah saat ditanya.")))
hasil_baru.head(10)
```

## solusi
```python
import json
import pandas as pd
from simulasi_llm import LLMTiruan

df = pd.read_csv("ulasan.csv")
llm = LLMTiruan()


def baca_label(jawaban):
    """Ambil label dari jawaban JSON. Jika jawabannya bukan JSON valid → None."""
    try:
        return json.loads(jawaban).get("sentimen")
    except Exception:
        return None


def evaluasi(fungsi_prompt):
    """Kirim setiap ulasan ke LLM dengan fungsi_prompt, lalu bandingkan dengan label tim CS."""
    baris = []
    for r in df.itertuples():
        jawaban = llm.jawab(fungsi_prompt(r.teks_ulasan))
        prediksi = baca_label(jawaban)
        baris.append({"id_ulasan": r.id_ulasan, "teks_ulasan": r.teks_ulasan, "sentimen": r.sentimen,
                      "jawaban": jawaban, "prediksi": prediksi, "benar": prediksi == r.sentimen})
    return pd.DataFrame(baris)


# Prompt awal (polos)
def prompt_awal(ulasan):
    return f'Apa sentimen ulasan ini?\nUlasan: "{ulasan}"'


hasil_awal = evaluasi(prompt_awal)
akurasi_awal = hasil_awal["benar"].mean()
print("Jawaban prompt awal :", hasil_awal.loc[0, "jawaban"])
print("Akurasi prompt awal :", akurasi_awal)


def buat_prompt(ulasan):
    return (
        "Kamu adalah analis layanan pelanggan TokoKita.\n"
        "Tugas: klasifikasikan sentimen ulasan pelanggan.\n"
        "Label yang diizinkan: positif, negatif, netral.\n"
        'Format: balas hanya JSON tanpa teks lain, contoh {"sentimen": "negatif"}.\n'
        'Contoh: "Barang sampai cepat dan rapi." -> {"sentimen": "positif"}\n'
        'Contoh: "Kurir telat, paket penyok." -> {"sentimen": "negatif"}\n'
        'Contoh: "Barang sudah diterima, belum dicoba." -> {"sentimen": "netral"}\n'
        f'Ulasan: "{ulasan}"'
    )


hasil_baru = evaluasi(buat_prompt)
json_valid_baru = hasil_baru["prediksi"].notna().mean()
akurasi_baru = hasil_baru["benar"].mean()

print("\nPrompt baru:\n" + buat_prompt("Admin tidak ramah saat ditanya."))
print("Jawaban LLM:", llm.jawab(buat_prompt("Admin tidak ramah saat ditanya.")))

ringkasan = pd.DataFrame({
    "prompt": ["awal (polos)", "terstruktur + few-shot"],
    "json_valid": [hasil_awal["prediksi"].notna().mean(), json_valid_baru],
    "akurasi": [akurasi_awal, akurasi_baru],
})
tampilkan(ringkasan, "Perbandingan kualitas prompt (160 ulasan)")
hasil_baru[~hasil_baru["benar"]]
```

## checker
```python
import json as _json
import pandas as _pd
from simulasi_llm import LLMTiruan as _LLM

wajib_variabel("buat_prompt")
_uji_teks = "Paketnya penyok dan kurirnya telat."
_p = buat_prompt(_uji_teks)
check("`buat_prompt(ulasan)` mengembalikan teks (str)", isinstance(_p, str),
      f"Hasilnya bertipe {type(_p).__name__}. Kembalikan string prompt dengan return.")
_p = str(_p)
check("Teks ulasan dimasukkan ke prompt lewat parameter (bukan ditulis manual)",
      _uji_teks in _p and "Stok habis, pesanan dibatalkan." in str(buat_prompt("Stok habis, pesanan dibatalkan.")),
      "Gunakan f-string di baris terakhir, mis. f'Ulasan: \"{ulasan}\"'.")
_low = _p.lower()
check("Prompt menyebut ketiga label: positif, negatif, netral",
      all(l in _low for l in ("positif", "negatif", "netral")),
      "Tulis daftar label yang diizinkan, mis. 'Label yang diizinkan: positif, negatif, netral.'")
check("Prompt meminta output JSON", "json" in _low, 'Minta format JSON dengan bentuk {"sentimen": "..."}.')

_llm = _LLM()


def _baca(jawaban):
    try:
        d = _json.loads(jawaban)
        return d.get("sentimen") if isinstance(d, dict) else None
    except Exception:
        return None


_j = _llm.jawab(_p)
check("Jawaban LLM langsung berupa JSON murni (tanpa basa-basi atau ```json)", _baca(_j) is not None,
      f"Jawaban LLM saat ini: {_j[:90]!r}. Tambahkan kalimat 'Balas hanya JSON tanpa teks lain.' "
      "(LLM tiruan ini mengenali frasa seperti 'hanya JSON', 'JSON saja', atau 'tanpa teks lain').")
_netral = _baca(_llm.jawab(buat_prompt("Paket sudah diterima, belum dicoba.")))
_negatif = _baca(_llm.jawab(buat_prompt("Admin tidak ramah saat ditanya.")))
if _netral is None or _negatif is None:
    _pesan_fs = "Jawaban LLM belum bisa dibaca sebagai JSON, jadi labelnya belum bisa dinilai. Perbaiki dulu format outputnya."
else:
    _pesan_fs = (f"Prediksi saat ini: ulasan netral → {_netral}, keluhan halus → {_negatif}. Tambahkan minimal 2 baris "
                 'Contoh: "..." -> {"sentimen": "..."} sebelum baris Ulasan (input tetap di baris terakhir).')
check("Contoh berlabel (few-shot) bekerja: ulasan netral & keluhan halus ikut dikenali",
      _netral == "netral" and _negatif == "negatif", _pesan_fs)

_df = _pd.read_csv("ulasan.csv")
_pred = [_baca(_llm.jawab(buat_prompt(t))) for t in _df["teks_ulasan"]]
_valid = sum(p is not None for p in _pred) / len(_pred)
_akurasi = sum(p == s for p, s in zip(_pred, _df["sentimen"])) / len(_df)
cek_minimal(_akurasi, 0.85, "Akurasi prompt terstruktur pada 160 ulasan (dihitung ulang pemeriksa)")

wajib_variabel("hasil_baru", "DataFrame")
wajib_variabel("json_valid_baru")
cek_mendekati(json_valid_baru, _valid, 1e-9, label="`json_valid_baru` = proporsi jawaban yang bisa dibaca")
check("100% jawaban berupa JSON valid", _valid == 1.0, f"Baru {_valid:.0%} jawaban yang bisa dibaca.")
wajib_variabel("akurasi_baru")
cek_mendekati(akurasi_baru, _akurasi, 1e-9, label="`akurasi_baru` = rata-rata kolom `benar` di hasil_baru")


def _angka(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


check("Prompt baru lebih akurat daripada prompt awal",
      _angka(akurasi_baru) is not None and _angka(akurasi_baru) > (_angka(akurasi_awal) or 0),
      "Bandingkan akurasi_baru dengan akurasi_awal.")
```

## hint-1
Jalankan starter dan baca jawaban LLM untuk prompt barumu — `LLMTiruan` memberi petunjuk jika tugasnya belum jelas. Lalu tambahkan komponen satu per satu: **label** membuat label seragam, **"balas hanya JSON tanpa teks lain"** membuat jawaban bisa dibaca, dan **contoh berlabel** menaikkan akurasi.

## hint-2
Beberapa string yang ditulis berdampingan di dalam `( ... )` otomatis tersambung. Gunakan kutip tunggal untuk baris yang berisi kutip ganda:

```python
'Format: balas hanya JSON tanpa teks lain, contoh {"sentimen": "negatif"}.\n'
'Contoh: "Kurir telat, paket penyok." -> {"sentimen": "negatif"}\n'
```

Untuk metrik: `hasil_baru["prediksi"].notna().mean()` dan `hasil_baru["benar"].mean()`.

## hint-3
```python
def buat_prompt(ulasan):
    return (
        "Kamu adalah analis layanan pelanggan TokoKita.\n"
        "Tugas: klasifikasikan sentimen ulasan pelanggan.\n"
        "Label yang diizinkan: ...\n"
        'Format: balas hanya JSON tanpa teks lain, contoh {"sentimen": "negatif"}.\n'
        'Contoh: "Barang sampai cepat dan rapi." -> {"sentimen": "positif"}\n'
        'Contoh: "..." -> {"sentimen": "..."}\n'
        f'Ulasan: "{ulasan}"'
    )

hasil_baru = evaluasi(buat_prompt)
json_valid_baru = hasil_baru["prediksi"].notna().mean()
akurasi_baru = ...
```

## pembahasan
Hasil eksperimen pada 160 ulasan berlabel:

| Prompt | JSON valid | Akurasi |
|---|---|---|
| Polos ("Apa sentimen ulasan ini?") | 0 / 160 | 0% |
| + label yang diizinkan + "balas hanya JSON" | 160 / 160 | 66,25% (106 benar) |
| + contoh berlabel (few-shot) | 160 / 160 | **88,75%** (142 benar) |

- **Prompt polos** menjawab dengan kalimat bebas dan label karangan sendiri (*"...bernada positif (pelanggan puas)."*, *"...bernada negatif, pelanggan kecewa."*). Sebagian isinya mungkin benar, tetapi **program tidak bisa membacanya** → nilainya 0 untuk dashboard.
- **Label + "hanya JSON"** membuat semua jawaban bisa dibaca, tetapi tanpa contoh model masih bias: tidak pernah menjawab `netral` dan melewatkan keluhan halus seperti *"Admin tidak ramah saat ditanya."* (dianggap positif).
- **Contoh berlabel (few-shot)** memperlihatkan pola yang diinginkan, sehingga akurasi naik ke 88,75%. Sisa kesalahan ada pada ulasan netral yang ambigu (*"Oke lah."*, *"Kualitas cukup, tidak terlalu istimewa."*) — kita bedah di latihan **Evaluasi**.
- Tanpa kalimat "hanya JSON", LLM suka membungkus JSON dengan basa-basi dan pagar ```` ```json ```` — itu topik latihan berikutnya.
- **Keterbatasan simulasi:** di `LLMTiruan`, **peran** tidak mengubah akurasi. Di LLM asli, peran (biasanya di *system prompt*) membantu menetapkan domain, gaya bahasa, dan batasan jawaban.
- **Di API LLM asli:** taruh peran, aturan, dan format di *system prompt*, lalu kirim ulasan sebagai pesan *user*; contoh few-shot bisa berupa pasangan pesan contoh. Banyak API juga menyediakan *structured output* (JSON schema) dan cocok dipakai dengan temperature rendah. Yang terpenting: **prompt adalah kode** — setiap kali diubah, ukur ulang dengan *golden set* seperti yang kamu lakukan di sini.
