---
id: ai-04-output-json
track: ai
title: Output Terstruktur — Membaca JSON dari LLM dengan Aman
level: menengah
estimatedMinutes: 20
language: python
datasets: [ulasan]
concepts: [structured output, json.loads, try/except, validasi skema, regex]
prerequisites: [ai-03-prompt-terstruktur]
---

## instruksi
Walaupun prompt sudah meminta JSON, jawaban LLM tetaplah **teks**. Di dunia nyata kita sering menerima:

- JSON yang dibungkus basa-basi dan pagar kode (```` ```json ... ``` ````),
- JSON rusak: kutip tunggal, koma berlebih, atau terpotong di tengah,
- JSON yang *valid* tetapi **isinya salah**: label di luar daftar, kunci wajib hilang, huruf besar/spasi berlebih.

Aplikasi yang baik **tidak pernah mempercayai output LLM begitu saja**. Setiap jawaban melewati pipeline berikut sebelum masuk ke dashboard:

```visual
jenis: alur
judul: Pipeline membaca output LLM dengan aman
langkah:
  - judul: Jawaban mentah
    isi: "Teks dari LLM: bisa berisi basa-basi, pagar kode json, kutip tunggal, koma berlebih, atau terpotong."
  - judul: Ambil bagian JSON
    isi: "Cari teks dari kurung kurawal pertama sampai terakhir. Tidak ketemu → error: tidak ada JSON."
  - judul: Parse
    isi: "json.loads di dalam try/except. Gagal → error: JSON tidak valid — program tidak crash."
  - judul: Cek kunci wajib
    isi: "Kunci sentimen dan aspek harus ada. Kurang → error: kunci hilang."
  - judul: Normalisasi & cek label
    isi: "strip() dan lower(), lalu label harus positif, negatif, atau netral. Di luar itu → error: label tidak valid."
  - judul: Keputusan
    isi: "Valid → masuk dashboard. Tidak valid → minta ulang ke LLM (retry) atau cek manual."
```

Ingat bedanya: **JSON valid ≠ data valid**. `json.loads('{"sentimen": "sangat negatif"}')` berhasil, tetapi labelnya tidak boleh masuk dashboard.

### Kasus
Pipeline dashboard sentimen TokoKita yang lama memanggil `json.loads(jawaban)` secara langsung — dan **crash** begitu bertemu jawaban yang berantakan. Kamu diminta membuat parser yang tidak pernah crash dan selalu menjelaskan *mengapa* sebuah jawaban ditolak.

### Tugas
1. Lengkapi fungsi `parse_jawaban(teks)` yang **selalu** mengembalikan dict dengan kunci `valid`, `sentimen`, `aspek`, `error`:
   1. Ambil potongan `{...}` dengan `re.search(r"\{.*\}", teks, re.DOTALL)`. Jika tidak ketemu → `error = "tidak ada JSON"`.
   2. Ubah dengan `json.loads(...)` di dalam `try/except json.JSONDecodeError`. Jika gagal → `error = "JSON tidak valid"`.
   3. Semua kunci di `KUNCI_WAJIB` harus ada. Jika tidak → `error = "kunci hilang"`.
   4. Normalisasi sentimen dengan `str(...).strip().lower()`. Jika tidak ada di `LABEL_VALID` → `error = "label tidak valid"`.
   5. Jika lolos semua: `valid = True`, isi `sentimen` (yang sudah dinormalisasi) dan `aspek`, `error = None`.

   Untuk jawaban yang ditolak, biarkan `sentimen` dan `aspek` bernilai `None`.
2. Buat `hasil_parse` = DataFrame dari `parse_jawaban(j)` untuk setiap jawaban di `jawaban_llm` (kolom: `valid`, `sentimen`, `aspek`, `error`), lalu `jumlah_valid` = banyaknya jawaban yang valid.
3. Buat `ringkasan_error` = dict `{jenis error: jumlah}` untuk jawaban yang ditolak (petunjuk: `value_counts().to_dict()`).
4. Uji pada batch nyata: `jawaban_batch` berisi 160 jawaban LLM dari prompt yang **lupa** menulis "hanya JSON". `valid_naif` (berhasil dengan `json.loads` polos) sudah dihitung. Hitung `valid_robust` = banyaknya jawaban batch yang **valid** menurut `parse_jawaban`.

## starter
```python
import json
import re
import pandas as pd
from simulasi_llm import LLMTiruan

LABEL_VALID = ["positif", "negatif", "netral"]
KUNCI_WAJIB = ["sentimen", "aspek"]

# 12 jawaban LLM yang terkumpul dari berbagai versi prompt/model
jawaban_llm = [
    '{"sentimen": "negatif", "aspek": "Pengiriman"}',
    'Tentu! Berikut hasil analisisnya:\n```json\n{"sentimen": "positif", "aspek": "Kualitas Produk"}\n```\nSemoga membantu.',
    '```json\n{"sentimen": "netral", "aspek": "Umum"}\n```',
    "{'sentimen': 'negatif', 'aspek': 'Layanan'}",
    '{"sentimen": "Negatif", "aspek": "Harga"}',
    '{"sentimen": "sangat negatif", "aspek": "Pengiriman"}',
    '{"aspek": "Pengiriman"}',
    'Sentimen: positif',
    '{"sentimen": "positif", "aspek": "Pengiriman",}',
    'Hasil: {"sentimen": "negatif", "aspek": "Kualitas Produk"} (yakin 90%)',
    '{"sentimen": " positif ", "aspek": "Layanan", "alasan": "admin ramah"}',
    '{"sentimen": "negatif", "aspek": "Pengiriman"',
]


def coba_json_polos(teks):
    """Cara naif: langsung json.loads. True jika berhasil di-parse."""
    try:
        json.loads(teks)
        return True
    except json.JSONDecodeError:
        return False


def parse_jawaban(teks):
    hasil = {"valid": False, "sentimen": None, "aspek": None, "error": None}
    # TODO 1) ambil potongan {...}; jika tidak ada -> "tidak ada JSON"
    # TODO 2) json.loads di dalam try/except json.JSONDecodeError -> "JSON tidak valid"
    # TODO 3) semua KUNCI_WAJIB harus ada -> "kunci hilang"
    # TODO 4) sentimen: str(...).strip().lower(), harus ada di LABEL_VALID -> "label tidak valid"
    # TODO 5) lolos semua -> valid=True, isi sentimen & aspek
    hasil["error"] = "belum dicek"
    return hasil


tabel = pd.DataFrame({"jawaban": jawaban_llm,
                      "json_loads_polos": [coba_json_polos(j) for j in jawaban_llm]})
print("Berhasil dengan json.loads polos:", int(tabel["json_loads_polos"].sum()), "dari", len(tabel))

hasil_parse = pd.DataFrame([parse_jawaban(j) for j in jawaban_llm])
jumlah_valid = 0          # TODO
ringkasan_error = {}      # TODO: {jenis_error: jumlah}

# Batch nyata: 160 jawaban dari prompt yang lupa menulis "hanya JSON"
df = pd.read_csv("ulasan.csv")
llm = LLMTiruan()


def prompt_santai(ulasan):
    return ("Klasifikasikan sentimen ulasan ini (positif, negatif, atau netral) beserta aspeknya "
            f'dalam format JSON.\nUlasan: "{ulasan}"')


jawaban_batch = [llm.jawab(prompt_santai(t)) for t in df["teks_ulasan"]]
print("Contoh jawaban batch:", repr(jawaban_batch[0]))
valid_naif = sum(coba_json_polos(j) for j in jawaban_batch)
valid_robust = 0          # TODO: jumlah jawaban_batch yang valid menurut parse_jawaban
print("Batch valid — naif:", valid_naif, "| robust:", valid_robust)

tabel
```

## solusi
```python
import json
import re
import pandas as pd
from simulasi_llm import LLMTiruan

LABEL_VALID = ["positif", "negatif", "netral"]
KUNCI_WAJIB = ["sentimen", "aspek"]

# 12 jawaban LLM yang terkumpul dari berbagai versi prompt/model
jawaban_llm = [
    '{"sentimen": "negatif", "aspek": "Pengiriman"}',
    'Tentu! Berikut hasil analisisnya:\n```json\n{"sentimen": "positif", "aspek": "Kualitas Produk"}\n```\nSemoga membantu.',
    '```json\n{"sentimen": "netral", "aspek": "Umum"}\n```',
    "{'sentimen': 'negatif', 'aspek': 'Layanan'}",
    '{"sentimen": "Negatif", "aspek": "Harga"}',
    '{"sentimen": "sangat negatif", "aspek": "Pengiriman"}',
    '{"aspek": "Pengiriman"}',
    'Sentimen: positif',
    '{"sentimen": "positif", "aspek": "Pengiriman",}',
    'Hasil: {"sentimen": "negatif", "aspek": "Kualitas Produk"} (yakin 90%)',
    '{"sentimen": " positif ", "aspek": "Layanan", "alasan": "admin ramah"}',
    '{"sentimen": "negatif", "aspek": "Pengiriman"',
]


def coba_json_polos(teks):
    """Cara naif: langsung json.loads. True jika berhasil di-parse."""
    try:
        json.loads(teks)
        return True
    except json.JSONDecodeError:
        return False


def parse_jawaban(teks):
    hasil = {"valid": False, "sentimen": None, "aspek": None, "error": None}
    cocok = re.search(r"\{.*\}", teks, re.DOTALL)          # 1) ambil {...}
    if cocok is None:
        hasil["error"] = "tidak ada JSON"
        return hasil
    try:                                                     # 2) parse
        data = json.loads(cocok.group(0))
    except json.JSONDecodeError:
        hasil["error"] = "JSON tidak valid"
        return hasil
    for kunci in KUNCI_WAJIB:                                # 3) kunci wajib
        if kunci not in data:
            hasil["error"] = "kunci hilang"
            return hasil
    label = str(data["sentimen"]).strip().lower()           # 4) normalisasi & cek label
    if label not in LABEL_VALID:
        hasil["error"] = "label tidak valid"
        return hasil
    hasil.update(valid=True, sentimen=label, aspek=data["aspek"])   # 5) lolos
    return hasil


tabel = pd.DataFrame({"jawaban": jawaban_llm,
                      "json_loads_polos": [coba_json_polos(j) for j in jawaban_llm]})
print("Berhasil dengan json.loads polos:", int(tabel["json_loads_polos"].sum()), "dari", len(tabel))

hasil_parse = pd.DataFrame([parse_jawaban(j) for j in jawaban_llm])
jumlah_valid = int(hasil_parse["valid"].sum())
ringkasan_error = hasil_parse["error"].value_counts().to_dict()
print("Valid:", jumlah_valid, "| ditolak:", ringkasan_error)

# Batch nyata: 160 jawaban dari prompt yang lupa menulis "hanya JSON"
df = pd.read_csv("ulasan.csv")
llm = LLMTiruan()


def prompt_santai(ulasan):
    return ("Klasifikasikan sentimen ulasan ini (positif, negatif, atau netral) beserta aspeknya "
            f'dalam format JSON.\nUlasan: "{ulasan}"')


jawaban_batch = [llm.jawab(prompt_santai(t)) for t in df["teks_ulasan"]]
print("Contoh jawaban batch:", repr(jawaban_batch[0]))
valid_naif = sum(coba_json_polos(j) for j in jawaban_batch)
valid_robust = sum(parse_jawaban(j)["valid"] for j in jawaban_batch)
print("Batch valid — naif:", valid_naif, "| robust:", valid_robust)

pd.concat([tabel, hasil_parse], axis=1)
```

## checker
```python
import pandas as _pd

wajib_variabel("parse_jawaban")

_KASUS = [
    ('{"sentimen": "NETRAL", "aspek": "Umum"}', True, "netral", None,
     "JSON bersih diterima & label dinormalisasi (NETRAL → netral)"),
    ('Oke, ini dia: {"sentimen": "positif", "aspek": "Harga"} Terima kasih.', True, "positif", None,
     "JSON di tengah kalimat tetap terbaca"),
    ('```json\n{"sentimen": "negatif", "aspek": "Layanan"}\n```', True, "negatif", None,
     "JSON di dalam pagar kode ```json tetap terbaca"),
    ('{"sentimen": "positif"}', False, None, "kunci hilang",
     "Kunci wajib hilang → error 'kunci hilang'"),
    ('{"sentimen": "marah", "aspek": "Layanan"}', False, None, "label tidak valid",
     "Label di luar daftar → error 'label tidak valid'"),
    ('maaf, saya tidak yakin', False, None, "tidak ada JSON",
     "Teks tanpa JSON → error 'tidak ada JSON'"),
    ('{sentimen: positif, aspek: Harga}', False, None, "JSON tidak valid",
     "JSON rusak ditangani tanpa crash → error 'JSON tidak valid'"),
]


def _norm(v):
    try:
        if _pd.isna(v):
            return None
    except (TypeError, ValueError):
        return v
    return v.item() if hasattr(v, "item") else v      # np.True_ -> True


for _teks, _valid, _sent, _err, _label in _KASUS:
    try:
        _h = parse_jawaban(_teks)
        _masalah = None
        if not isinstance(_h, dict) or not {"valid", "sentimen", "aspek", "error"} <= set(_h):
            _masalah = f"Hasilnya harus dict dengan kunci valid, sentimen, aspek, error. Didapat: {_h!r}"
        elif bool(_h["valid"]) != _valid or _norm(_h["sentimen"]) != _sent or _norm(_h["error"]) != _err:
            _masalah = (f"Untuk {_teks!r} hasilmu valid={_h['valid']!r}, sentimen={_h['sentimen']!r}, "
                        f"error={_h['error']!r}; seharusnya valid={_valid!r}, sentimen={_sent!r}, error={_err!r}.")
    except Exception as _e:
        _masalah = f"parse_jawaban({_teks!r}) crash: {type(_e).__name__}: {_e}. Tangkap error dengan try/except."
    check(_label, _masalah is None, _masalah)

wajib_variabel("hasil_parse", "DataFrame")
cek_kolom(hasil_parse, ["valid", "sentimen", "aspek", "error"])
_ref = nilai_solusi("hasil_parse")
_kolom = ["valid", "sentimen", "aspek", "error"]


def _beda_pertama():
    if any(c not in hasil_parse.columns for c in _kolom):
        return "Buat dengan pd.DataFrame([parse_jawaban(j) for j in jawaban_llm])."
    if len(hasil_parse) != len(_ref):
        return f"Jumlah baris {len(hasil_parse)}, seharusnya {len(_ref)} (satu baris per jawaban di jawaban_llm)."
    for i in range(len(_ref)):
        for c in _kolom:
            a, b = _norm(hasil_parse[c].iloc[i]), _norm(_ref[c].iloc[i])
            if a != b:
                catatan = " Untuk jawaban yang ditolak, sentimen dan aspek dibiarkan None." if b is None else ""
                return f"Jawaban ke-{i + 1}: kolom `{c}` bernilai {a!r}, seharusnya {b!r}.{catatan}"
    return None


_beda = _beda_pertama()
check("`hasil_parse` berisi hasil parse_jawaban untuk ke-12 jawaban", _beda is None, _beda)
bandingkan_variabel("jumlah_valid", label="`jumlah_valid` = banyaknya jawaban yang lolos validasi")
wajib_variabel("ringkasan_error", dict)
bandingkan_variabel("ringkasan_error", label="`ringkasan_error` = jumlah jawaban per jenis error")

wajib_variabel("valid_robust")
bandingkan_variabel("valid_robust", label="`valid_robust` = jawaban batch yang valid menurut parse_jawaban")


def _angka(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


check("Parser tangguh menyelamatkan jauh lebih banyak jawaban daripada json.loads polos",
      (_angka(valid_robust) or 0) > (_angka(valid_naif) or 0),
      f"Saat ini valid_robust={valid_robust!r} dan valid_naif={valid_naif!r}. Hitung valid_robust dari "
      "parse_jawaban(j)['valid'] untuk setiap jawaban di jawaban_batch.")
```

## hint-1
Kerjakan berurutan dan **langsung `return hasil`** setiap kali menemukan masalah (pola *early return*). Dengan begitu, langkah berikutnya hanya berjalan untuk jawaban yang lolos langkah sebelumnya.

## hint-2
```python
cocok = re.search(r"\{.*\}", teks, re.DOTALL)   # re.DOTALL: titik juga cocok dengan baris baru
if cocok is None:
    hasil["error"] = "tidak ada JSON"
    return hasil
try:
    data = json.loads(cocok.group(0))
except json.JSONDecodeError:
    hasil["error"] = "JSON tidak valid"
    return hasil
```

## hint-3
```python
    for kunci in KUNCI_WAJIB:
        if kunci not in data:
            hasil["error"] = "kunci hilang"
            return hasil
    label = str(data["sentimen"]).strip().lower()
    if label not in LABEL_VALID:
        hasil["error"] = ...
        return hasil
    hasil.update(valid=True, sentimen=label, aspek=...)
    return hasil

# di luar fungsi:
jumlah_valid = int(hasil_parse["valid"].sum())
ringkasan_error = hasil_parse["error"].value_counts().to_dict()
valid_robust = sum(parse_jawaban(j)["valid"] for j in ...)
```

## pembahasan
- Dari 12 jawaban, `json.loads` polos berhasil mem-*parse* 5 — tetapi 2 di antaranya tetap tidak boleh dipakai (label *"sangat negatif"* dan kunci `sentimen` hilang), dan 2 lainnya baru benar setelah dinormalisasi (*"Negatif"*, *" positif "*). **JSON valid ≠ data valid.**
- Parser tangguh menerima **6 jawaban** (termasuk yang dibungkus basa-basi, pagar kode, atau berada di tengah kalimat) dan menolak 6 dengan alasan jelas: `JSON tidak valid` 2 (kutip tunggal, koma berlebih), `tidak ada JSON` 2 (teks biasa, JSON terpotong), `label tidak valid` 1, `kunci hilang` 1.
- Pada batch nyata, `json.loads` polos hanya berhasil **3 dari 160** jawaban, sedangkan `parse_jawaban` menyelamatkan **160 dari 160**. Menariknya, 3 jawaban yang lolos cara polos itu berasal dari ulasan berisi frasa *"tanpa penjelasan"* — isi ulasan ikut mengubah perilaku model. Inilah bibit **prompt injection**: data dari pengguna bisa "menyusup" menjadi instruksi.
- Format yang rapi belum menjamin jawaban benar: prompt santai ini tanpa contoh (zero-shot), jadi akurasi sentimennya tetap sekitar 66% seperti di latihan sebelumnya. Parser memperbaiki **bentuk**, prompt dan evaluasi memperbaiki **isi**.
- Apa yang dilakukan pada jawaban yang ditolak? Kirim ulang ke LLM beserta pesan errornya (*retry*, mis. "Jawabanmu bukan JSON valid, balas ulang hanya JSON"), gunakan nilai cadangan, atau teruskan ke manusia — dan **catat** jumlahnya untuk dipantau.
- **Di API LLM asli:** manfaatkan fitur *JSON mode* / *structured output* dengan JSON Schema, atau *tool calling* yang memaksa argumen berbentuk skema. Tetap validasi di sisi aplikasi (misalnya dengan Pydantic), karena aturan bisnis seperti "label harus salah satu dari tiga" tetap tanggung jawab kita.
