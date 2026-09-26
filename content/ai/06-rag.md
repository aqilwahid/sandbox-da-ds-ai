---
id: ai-06-rag
track: ai
title: Mini RAG — Menjawab dari Dokumen Kebijakan, Bukan Mengarang
level: lanjut
estimatedMinutes: 25
language: python
datasets: [kebijakan]
concepts: [RAG, retrieval, grounding, halusinasi, sitasi sumber, TF-IDF]
prerequisites: [ai-05-embedding]
---

## instruksi
LLM hanya "tahu" isi data latihnya — ia **tidak tahu** kebijakan internal TokoKita. Jika tetap ditanya, LLM sering **berhalusinasi**: jawabannya lancar dan meyakinkan, tetapi **salah**. Untuk layanan pelanggan, ini berbahaya: LLM bisa menjanjikan hal yang tidak pernah berlaku.

**RAG** (*Retrieval-Augmented Generation*) mengatasinya dengan tiga langkah: **cari** dokumen yang relevan, **sisipkan** ke prompt sebagai konteks, lalu minta LLM menjawab **hanya dari konteks** sambil menyebut sumbernya.

```visual
jenis: alur
judul: Alur RAG (Retrieval-Augmented Generation)
langkah:
  - judul: Pertanyaan pelanggan
    isi: '"Berapa lama refund ke e-wallet diproses?"'
  - judul: Retrieval
    isi: Cari 3 dokumen kebijakan paling mirip dengan pertanyaan (TF-IDF + cosine similarity).
  - judul: Susun prompt
    isi: "Aturan + konteks (satu dokumen per baris: [K02] ..., [K03] ..., [K08] ...) + Pertanyaan: ..."
  - judul: LLM menjawab
    isi: "Hanya dari konteks, disertai sumber, mis. [K02]."
  - judul: Kirim ke pelanggan
    isi: "Jika jawabannya tidak ada di konteks: jawab tidak tahu atau teruskan ke agen manusia."
```

Bentuk prompt yang dikenali `LLMTiruan` (dan praktik yang baik untuk LLM asli):

```visual
jenis: anatomi
judul: Anatomi prompt RAG
bahasa: teks
bagian:
  - teks: "Jawab hanya berdasarkan konteks di bawah. Jika jawabannya tidak ada di konteks, katakan tidak tahu."
    label: "Aturan grounding — mencegah LLM mengarang"
  - teks: "Sertakan sumber berupa ID dokumen, misalnya [K01]."
    label: "Minta sitasi — jawaban bisa dicek"
  - teks: "[K02] Pengembalian dana (refund): Setelah retur disetujui, dana dikembalikan ..."
    label: "Konteks — satu dokumen per baris, diawali [ID]"
  - teks: "Pertanyaan: Berapa lama refund ke e-wallet diproses?"
    label: "Pertanyaan — di bagian akhir"
```

> **Catatan simulasi:** `LLMTiruan` meniru perilaku umum LLM: tanpa konteks ia menjawab asal yakin (halusinasi); dengan baris konteks `[Kxx]` ia menjawab dari kalimat yang paling relevan; dan jika ada aturan "hanya berdasarkan konteks / katakan tidak tahu", ia menolak pertanyaan yang tidak ada jawabannya.

### Kasus
TokoKita ingin memasang chatbot CS yang menjawab pertanyaan pelanggan tentang kebijakan toko. Basis pengetahuannya adalah 15 dokumen di `kebijakan.csv` (retur, refund, ongkir, pembayaran, garansi, dll.). Buktikan bahwa RAG membuat jawaban **akurat, bersumber, dan jujur** saat informasinya tidak tersedia.

### Tugas
1. Indeks TF-IDF (`vectorizer`, `X_dok`) sudah dibuat dari `judul + isi`. Lengkapi `cari_dokumen(pertanyaan, k=3)` yang mengembalikan DataFrame **k dokumen teratas** dengan kolom `id_dok`, `judul`, `isi`, `skor`:
   - `skor` = `cosine_similarity(vectorizer.transform([pertanyaan]), X_dok)[0]`, dibulatkan **4 desimal**,
   - urutkan dari skor terbesar (jika seri, `id_dok` A–Z), ambil `k` baris, lalu `reset_index(drop=True)`.
2. Lengkapi `buat_prompt_rag(pertanyaan, dokumen)` yang menyusun prompt dengan urutan:
   - aturan: **jawab hanya berdasarkan konteks**, **jika jawabannya tidak ada di konteks katakan tidak tahu**, dan **sertakan sumber** (ID dokumen);
   - baris `Konteks:` lalu **satu baris per dokumen** dengan format persis `[K02] Judul: isi`;
   - baris terakhir `Pertanyaan: <pertanyaan>`.
3. `jawab_rag(pertanyaan)` sudah disediakan (menggabungkan langkah 1 & 2). Buat DataFrame `perbandingan` untuk setiap pertanyaan di `PERTANYAAN` dengan kolom:
   - `pertanyaan`,
   - `dokumen_teratas` — `id_dok` peringkat pertama dari `cari_dokumen`,
   - `tanpa_konteks` — `llm.jawab(pertanyaan)` (langsung, tanpa RAG),
   - `dengan_rag` — `jawab_rag(pertanyaan)`.

   Pertanyaan terakhir sengaja **tidak ada jawabannya** di dokumen mana pun.

## starter
```python
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from simulasi_llm import LLMTiruan

kb = pd.read_csv("kebijakan.csv")
kb["teks"] = kb["judul"] + ". " + kb["isi"]
vectorizer = TfidfVectorizer()
X_dok = vectorizer.fit_transform(kb["teks"])        # indeks: 15 dokumen × kosakata
llm = LLMTiruan()

PERTANYAAN = [
    "Berapa lama refund ke e-wallet diproses?",
    "Berapa minimal belanja agar member dapat gratis ongkir?",
    "Apakah bisa bayar COD untuk pengiriman instan?",
    "Berapa lama garansi produk elektronik?",
    "Bisakah paket dikirim ke luar negeri?",       # tidak ada di dokumen mana pun
]

# Tanpa RAG: langsung bertanya ke LLM
for q in PERTANYAAN[:2]:
    print("Pertanyaan :", q)
    print("LLM        :", llm.jawab(q))


def cari_dokumen(pertanyaan, k=3):
    # TODO 1) skor = cosine_similarity(vectorizer.transform([pertanyaan]), X_dok)[0]
    # TODO 2) salin kolom id_dok, judul, isi + kolom skor (4 desimal)
    # TODO 3) urutkan menurun (seri: id_dok), ambil k teratas, reset_index(drop=True)
    return kb[["id_dok", "judul", "isi"]].head(k)


def buat_prompt_rag(pertanyaan, dokumen):
    # TODO: aturan + "Konteks:" + satu baris "[K02] Judul: isi" per dokumen + "Pertanyaan: ..."
    return f"Pertanyaan: {pertanyaan}"


def jawab_rag(pertanyaan):
    return llm.jawab(buat_prompt_rag(pertanyaan, cari_dokumen(pertanyaan)))


perbandingan = pd.DataFrame()     # TODO: kolom pertanyaan, dokumen_teratas, tanpa_konteks, dengan_rag

print("\n--- Prompt RAG untuk pertanyaan pertama ---")
print(buat_prompt_rag(PERTANYAAN[0], cari_dokumen(PERTANYAAN[0])))
cari_dokumen(PERTANYAAN[0])
```

## solusi
```python
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from simulasi_llm import LLMTiruan, hitung_token

kb = pd.read_csv("kebijakan.csv")
kb["teks"] = kb["judul"] + ". " + kb["isi"]
vectorizer = TfidfVectorizer()
X_dok = vectorizer.fit_transform(kb["teks"])        # indeks: 15 dokumen × kosakata
llm = LLMTiruan()

PERTANYAAN = [
    "Berapa lama refund ke e-wallet diproses?",
    "Berapa minimal belanja agar member dapat gratis ongkir?",
    "Apakah bisa bayar COD untuk pengiriman instan?",
    "Berapa lama garansi produk elektronik?",
    "Bisakah paket dikirim ke luar negeri?",       # tidak ada di dokumen mana pun
]

# Tanpa RAG: langsung bertanya ke LLM
for q in PERTANYAAN[:2]:
    print("Pertanyaan :", q)
    print("LLM        :", llm.jawab(q))


def cari_dokumen(pertanyaan, k=3):
    skor = cosine_similarity(vectorizer.transform([pertanyaan]), X_dok)[0]
    hasil = kb[["id_dok", "judul", "isi"]].copy()
    hasil["skor"] = skor.round(4)
    hasil = hasil.sort_values(["skor", "id_dok"], ascending=[False, True])
    return hasil.head(k).reset_index(drop=True)


ATURAN = (
    "Kamu adalah asisten layanan pelanggan TokoKita.\n"
    "Jawab hanya berdasarkan konteks di bawah. Jika jawabannya tidak ada di konteks, katakan tidak tahu.\n"
    "Sertakan sumber berupa ID dokumen, misalnya [K01]."
)


def buat_prompt_rag(pertanyaan, dokumen):
    konteks = [f"[{r.id_dok}] {r.judul}: {r.isi}" for r in dokumen.itertuples()]
    return ATURAN + "\n\nKonteks:\n" + "\n".join(konteks) + f"\n\nPertanyaan: {pertanyaan}"


def jawab_rag(pertanyaan):
    return llm.jawab(buat_prompt_rag(pertanyaan, cari_dokumen(pertanyaan)))


baris = []
for q in PERTANYAAN:
    baris.append({
        "pertanyaan": q,
        "dokumen_teratas": cari_dokumen(q).loc[0, "id_dok"],
        "tanpa_konteks": llm.jawab(q),
        "dengan_rag": jawab_rag(q),
    })
perbandingan = pd.DataFrame(baris)

prompt_contoh = buat_prompt_rag(PERTANYAAN[0], cari_dokumen(PERTANYAAN[0]))
print("\n--- Prompt RAG untuk pertanyaan pertama ---")
print(prompt_contoh)
print("\nToken prompt (3 dokumen):", hitung_token(prompt_contoh),
      "| jika semua 15 dokumen dimasukkan:", hitung_token(buat_prompt_rag(PERTANYAAN[0], kb)))
perbandingan
```

## checker
```python
import pandas as _pd
from simulasi_llm import LLMTiruan as _LLM

wajib_variabel("cari_dokumen")
_d = cari_dokumen("Bagaimana cara menukar poin member?")
_is_df = isinstance(_d, _pd.DataFrame)
check("`cari_dokumen` mengembalikan DataFrame berisi 3 dokumen (k=3)", _is_df and len(_d) == 3,
      f"Hasilnya {type(_d).__name__} dengan {len(_d) if hasattr(_d, '__len__') else '?'} baris.")
cek_kolom(_d, ["id_dok", "judul", "isi", "skor"])
check("Hasil diurutkan dari skor terbesar",
      _is_df and "skor" in _d.columns and list(_d["skor"]) == sorted(_d["skor"], reverse=True),
      "Gunakan sort_values([...], ascending=[False, True]).")


def _teratas(q):
    try:
        return str(cari_dokumen(q).iloc[0]["id_dok"])
    except Exception as e:
        return f"error {type(e).__name__}"


def _jumlah(q, k):
    try:
        return len(cari_dokumen(q, k=k))
    except Exception:
        return None


_harapan = {"Bagaimana cara menukar poin member?": "K12", "Jam berapa live chat buka?": "K14",
            "Berapa tenor cicilan 0%?": "K09", "Kapan nomor resi muncul?": "K06"}
_dapat = {q: _teratas(q) for q in _harapan}
check("Retrieval menemukan dokumen yang tepat untuk pertanyaan lain",
      _dapat == _harapan, f"Dokumen teratas: {_dapat}, seharusnya {_harapan}.")
check("Parameter k bekerja (k=5 → 5 dokumen)", _jumlah("refund", 5) == 5,
      "Ambil .head(k), bukan .head(3).")

wajib_variabel("buat_prompt_rag")
_q = "Kapan nomor resi muncul?"
_docs = cari_dokumen(_q)
try:
    _p = str(buat_prompt_rag(_q, _docs))
except Exception as _e:
    raise AssertionError(f"buat_prompt_rag(pertanyaan, cari_dokumen(pertanyaan)) error: {type(_e).__name__}: {_e}")
_baris = [b.strip() for b in _p.splitlines() if b.strip()]
check("Setiap dokumen konteks ditulis di baris sendiri yang diawali [Kxx]",
      all(any(b.startswith(f"[{i}]") for b in _baris) for i in _docs["id_dok"]),
      "Tulis satu baris per dokumen: f\"[{r.id_dok}] {r.judul}: {r.isi}\".")
check("Baris terakhir berisi 'Pertanyaan: ...'",
      bool(_baris) and _baris[-1].startswith("Pertanyaan:") and _q in _baris[-1],
      f"Baris terakhir prompt saat ini: {(_baris[-1] if _baris else '')[:80]!r}")

_llm = _LLM()
_j1 = _llm.jawab(_p)
check("Jawaban RAG menyebut sumbernya ([K06])", "[K06]" in _j1,
      f"Jawaban: {_j1!r}. Tambahkan aturan 'Sertakan sumber berupa ID dokumen'.")
_q2 = "Siapa CEO TokoKita?"
_j2 = _llm.jawab(str(buat_prompt_rag(_q2, cari_dokumen(_q2))))
check("Pertanyaan di luar dokumen dijawab jujur 'tidak ada/tidak tahu' (tidak mengarang)",
      "tidak ada" in _j2.lower() or "tidak tahu" in _j2.lower(),
      f"Jawaban: {_j2!r}. Tambahkan aturan 'Jawab hanya berdasarkan konteks. Jika jawabannya tidak ada di konteks, katakan tidak tahu.'")
wajib_variabel("jawab_rag")
_j3 = str(jawab_rag("Apakah CS akan meminta kode OTP?"))
check("`jawab_rag` menjawab pertanyaan baru dari dokumen yang tepat ([K15])", "[K15]" in _j3 and "OTP" in _j3,
      f"Jawaban: {_j3!r}")

wajib_variabel("perbandingan", "DataFrame")
cek_kolom(perbandingan, ["pertanyaan", "dokumen_teratas", "tanpa_konteks", "dengan_rag"])
cek_ukuran(perbandingan, baris=5)
bandingkan_variabel("perbandingan", label="Isi `perbandingan` sesuai (5 pertanyaan, tanpa konteks vs RAG)")
```

## hint-1
Pola `cari_dokumen` sama dengan pencarian ulasan di latihan Embedding: hitung skor untuk **semua** dokumen, tempelkan sebagai kolom, urutkan, ambil teratas. Untuk prompt, susun list berisi baris-baris teks lalu gabungkan dengan `"\n".join(...)`.

## hint-2
Di dalam `cari_dokumen`, setelah `skor` dihitung:

```python
hasil = kb[["id_dok", "judul", "isi"]].copy()
hasil["skor"] = skor.round(4)
hasil = hasil.sort_values(["skor", "id_dok"], ascending=[False, True])
```

Baris konteks: `[f"[{r.id_dok}] {r.judul}: {r.isi}" for r in dokumen.itertuples()]`.

## hint-3
```python
ATURAN = ("Jawab hanya berdasarkan konteks di bawah. Jika jawabannya tidak ada di konteks, katakan tidak tahu.\n"
          "Sertakan sumber berupa ID dokumen, misalnya [K01].")

def buat_prompt_rag(pertanyaan, dokumen):
    konteks = [f"[{r.id_dok}] {r.judul}: {r.isi}" for r in dokumen.itertuples()]
    return ATURAN + "\n\nKonteks:\n" + "\n".join(konteks) + f"\n\nPertanyaan: {pertanyaan}"

baris = []
for q in PERTANYAAN:
    baris.append({"pertanyaan": q,
                  "dokumen_teratas": cari_dokumen(q).loc[0, "id_dok"],
                  "tanpa_konteks": ...,
                  "dengan_rag": ...})
perbandingan = pd.DataFrame(baris)
```

Jangan lupa: `cari_dokumen` diakhiri `return hasil.head(k).reset_index(drop=True)`.

## pembahasan
| Pertanyaan | Tanpa konteks (halusinasi) | Dengan RAG |
|---|---|---|
| Refund ke e-wallet? | "…diproses dalam 14 hari kerja." | "…paling lama 1x24 jam…" **[K02]** |
| Minimal belanja gratis ongkir member? | "…semua pesanan tanpa minimum belanja." | "…minimal Rp150.000 per transaksi." **[K04]** |
| COD untuk pengiriman instan? | "Semua pengiriman sampai dalam 1 hari…" | "…tidak tersedia untuk pengiriman instan." **[K08]** |
| Garansi elektronik? | "Semua produk bergaransi 3 tahun." | "…bergaransi resmi 1 tahun…" **[K10]** |
| Kirim ke luar negeri? | "Semua pengiriman sampai dalam 1 hari ke seluruh Indonesia." | "Maaf, informasi tersebut tidak ada di dokumen yang diberikan." |

- **Tanpa konteks**, semua jawaban terdengar meyakinkan tetapi **salah** — dan beberapa menjadi janji palsu kepada pelanggan (refund 14 hari, garansi 3 tahun). Inilah halusinasi.
- **Dengan RAG**, setiap jawaban mengutip kebijakan yang benar dan menyebut sumbernya, sehingga CS maupun pelanggan bisa mengeceknya.
- **Retrieval selalu mengembalikan sesuatu.** Untuk pertanyaan luar negeri, dokumen "teratas" tetap ada (K03, skornya rendah ±0,20) walau tidak menjawab. Yang menyelamatkan adalah **aturan "katakan tidak tahu"**. Coba hapus baris aturan grounding (*"Jawab hanya berdasarkan konteks ... katakan tidak tahu."*): dengan konteks yang sama, `LLMTiruan` kembali mengarang *"Semua pengiriman sampai dalam 1 hari ke seluruh Indonesia."* Di sistem nyata, tambahkan juga **ambang skor**: jika skor tertinggi terlalu kecil, langsung jawab "tidak tahu" atau teruskan ke agen manusia.
- **Mengapa tidak memasukkan semua dokumen saja?** Prompt dengan 3 dokumen ±330 token, sedangkan dengan 15 dokumen ±1.275 token — **hampir 4× lebih mahal** per pertanyaan. Basis pengetahuan nyata berisi ribuan dokumen yang tidak muat di *context window*, dan konteks yang terlalu panjang juga membuat model lebih mudah melewatkan informasi penting.
- **Keterbatasan simulasi:** `LLMTiruan` hanya memilih **kalimat** dengan kata paling banyak yang sama dengan pertanyaan. LLM asli merangkai jawaban dari beberapa bagian konteks — tetapi tetap bisa salah membaca, jadi RAG juga perlu dievaluasi (apakah dokumen yang benar terambil? apakah jawabannya setia pada konteks?).
- **Di dunia nyata:** dokumen panjang dipecah menjadi *chunk*, diindeks dengan embedding di *vector database* (sering digabung kata kunci/BM25 dan *re-ranking*); aturan ditaruh di *system prompt*, sedangkan konteks hasil retrieval disisipkan bersama pertanyaan. Keuntungan besar RAG: saat kebijakan berubah, cukup **perbarui dokumennya** — modelnya tidak perlu dilatih ulang.
