"""
simulasi_llm — "LLM tiruan" untuk belajar konsep aplikasi LLM TANPA API key.

PENTING: modul ini BUKAN model bahasa sungguhan. Perilakunya dibuat (dengan aturan
sederhana yang deterministik) agar meniru pola yang sering terlihat pada LLM asli:

  • teks dipecah menjadi token (sub-kata), bukan kata utuh
  • model memilih token berikutnya dari distribusi peluang (dipengaruhi temperature)
  • kualitas jawaban sangat bergantung pada prompt (peran, format, label, contoh)
  • tanpa konteks dokumen, model bisa "berhalusinasi"; dengan konteks (RAG) jawabannya membumi
  • agent memutuskan kapan memanggil alat (tool calling) lalu menyusun jawaban

Dengan begitu konsep bisa dicoba, diukur, dan divisualisasikan langsung di browser.
"""

from __future__ import annotations

import csv
import difflib
import json
import math
import os
import random
import re

__all__ = [
    "tokenisasi", "id_token", "hitung_token", "kandidat_token_berikutnya", "softmax",
    "LLMTiruan", "embedding_semantik", "DIMENSI_KONSEP", "estimasi_biaya",
]

# ---------------------------------------------------------------------------
# 1) Tokenizer tiruan (greedy longest-match, mirip WordPiece/BPE sederhana)
# ---------------------------------------------------------------------------

_HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else "."


def _load_vocab():
    for path in (os.path.join(_HERE, "token_vocab.json"), "/home/pyodide/token_vocab.json", "token_vocab.json"):
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)["vocab"]
        except Exception:
            continue
    return ["yang", "dan", "di", "ke", "an", "kan", "nya", "me", "ber", "ter"]


VOCAB: list = _load_vocab()
_VOCAB_INDEX = {w: i for i, w in enumerate(VOCAB)}
_MAX_PIECE = max(len(w) for w in VOCAB)
_LETTERS = "A-Za-zÀ-ɏ"
_TOKEN_RE = re.compile(r"(\s*)([0-9]+|[" + _LETTERS + r"]+|[^\s0-9" + _LETTERS + r"])")


def _split_word(word: str) -> list:
    low = word.lower()
    pieces, i = [], 0
    while i < len(word):
        take = 1
        for L in range(min(_MAX_PIECE, len(word) - i), 0, -1):
            if low[i:i + L] in _VOCAB_INDEX:
                take = L
                break
        pieces.append(word[i:i + take])
        i += take
    return pieces


def tokenisasi(teks: str) -> list:
    """Pecah teks menjadi token. Spasi di depan kata ikut menempel pada token pertama (seperti GPT)."""
    teks = str(teks)
    tokens = []
    pos = 0
    for m in _TOKEN_RE.finditer(teks):
        space, word = m.group(1), m.group(2)
        pos = m.end()
        if "\n" in space:
            nl = space.count("\n")
            tokens.extend(["\n"] * nl)
            space = space.split("\n")[-1]
        if word.isdigit():
            chunks = [word[i:i + 3] for i in range(0, len(word), 3)]
        elif re.match(r"[" + _LETTERS + r"]", word):
            chunks = _split_word(word)
        else:
            chunks = [word]
        chunks[0] = space + chunks[0]
        tokens.extend(chunks)
    tail = teks[pos:]
    if tail:
        tokens.extend(["\n"] * tail.count("\n"))
        rest = tail.replace("\n", "")
        if rest:
            tokens.append(rest)
    return tokens


def id_token(teks: str) -> list:
    """ID angka setiap token — yang sebenarnya "dilihat" model."""
    ids = []
    for t in tokenisasi(teks):
        key = t.strip().lower()
        if key in _VOCAB_INDEX:
            ids.append(_VOCAB_INDEX[key] + (0 if t == t.strip() else 1000))
        else:
            ids.append(5000 + sum(ord(c) for c in key) % 1000)
    return ids


def hitung_token(teks: str) -> int:
    return len(tokenisasi(teks))


def estimasi_biaya(jumlah_token_input: int, jumlah_token_output: int = 0,
                   harga_input_per_1k: float = 15.0, harga_output_per_1k: float = 60.0) -> float:
    """Biaya (Rupiah) dengan tarif fiktif per 1.000 token."""
    return round(jumlah_token_input / 1000 * harga_input_per_1k + jumlah_token_output / 1000 * harga_output_per_1k, 2)


# ---------------------------------------------------------------------------
# 2) Prediksi token berikutnya
# ---------------------------------------------------------------------------

_NEXT = {
    "pengiriman paket ini sangat": [("cepat", 3.2), ("lambat", 2.6), ("aman", 1.8), ("rapi", 1.1), ("mahal", 0.6), ("biru", -1.4)],
    "saya ingin membeli": [("laptop", 2.4), ("baju", 2.1), ("kopi", 1.9), ("hadiah", 1.5), ("rumah", 0.7), ("bintang", -1.2)],
    "ibu kota indonesia adalah": [("Jakarta", 4.1), ("Nusantara", 3.3), ("Bandung", 0.4), ("Surabaya", 0.2), ("Medan", 0.0), ("Paris", -2.2)],
    "terima kasih atas": [("pesanannya", 3.0), ("kepercayaannya", 2.7), ("ulasannya", 2.2), ("waktunya", 1.8), ("hujannya", -1.0), ("kursinya", -1.5)],
}


def kandidat_token_berikutnya(konteks: str) -> list:
    """Daftar (token, logit) kandidat token berikutnya. Logit makin besar = makin mungkin."""
    key = " ".join(str(konteks).lower().split())
    for k, v in _NEXT.items():
        if key.endswith(k):
            return list(v)
    rnd = random.Random(sum(map(ord, key)))
    kata = ["yang", "dan", "sangat", "untuk", "barang", "cepat", "bagus", "dengan", "tidak", "sudah"]
    rnd.shuffle(kata)
    return [(w, round(3.0 - i * 0.7 + rnd.uniform(-0.2, 0.2), 2)) for i, w in enumerate(kata[:6])]


def softmax(logits, temperature: float = 1.0) -> list:
    """Referensi softmax dengan temperature (dipakai visual & pemeriksa)."""
    t = max(float(temperature), 1e-6)
    zs = [float(z) / t for z in logits]
    m = max(zs)
    ex = [math.exp(z - m) for z in zs]
    s = sum(ex)
    return [e / s for e in ex]


# ---------------------------------------------------------------------------
# 3) Embedding "semantik" tiruan (bag of concepts) — untuk membandingkan dengan TF-IDF
# ---------------------------------------------------------------------------

DIMENSI_KONSEP = [
    "pengiriman", "lambat", "cepat", "rusak", "kualitas_baik", "harga", "mahal", "murah",
    "layanan", "kecewa", "puas", "pengembalian", "pembayaran", "elektronik", "makanan", "pakaian",
]

_KONSEP = {
    "pengiriman": ["kirim", "pengiriman", "kurir", "paket", "ekspedisi", "resi", "sampai", "datang", "ongkir", "antar", "diantar", "alamat"],
    "lambat": ["lambat", "lama", "telat", "terlambat", "tertunda", "molor", "berhari", "seminggu", "belum", "tidak bergerak"],
    "cepat": ["cepat", "kilat", "sehari", "instan", "segera", "langsung"],
    "rusak": ["rusak", "penyok", "cacat", "pecah", "goresan", "bocor", "luntur", "sobek", "mati"],
    "kualitas_baik": ["bagus", "original", "awet", "berfungsi", "kokoh", "mantap", "rapi", "sesuai", "melebihi"],
    "harga": ["harga", "diskon", "promo", "voucher", "biaya", "tarif"],
    "mahal": ["mahal", "kemahalan", "naik", "tidak sebanding", "boros"],
    "murah": ["murah", "hemat", "terjangkau", "worth", "bersahabat", "sebanding"],
    "layanan": ["cs", "admin", "layanan", "pelayanan", "respon", "responsif", "chat", "ramah", "komplain", "dijawab"],
    "kecewa": ["kecewa", "buruk", "jelek", "tidak akan", "menyesal", "diabaikan", "dipersulit", "sepihak"],
    "puas": ["puas", "suka", "senang", "recommended", "terima kasih", "mantap", "worth"],
    "pengembalian": ["retur", "refund", "pengembalian", "dikembalikan", "kembalikan", "tukar"],
    "pembayaran": ["bayar", "pembayaran", "transfer", "cod", "cicilan", "kartu", "e-wallet", "ewallet"],
    "elektronik": ["laptop", "smartphone", "headset", "mouse", "baterai", "power bank", "monitor", "speaker", "smartwatch"],
    "makanan": ["kopi", "teh", "madu", "kurma", "keripik", "sambal", "rasa", "hambar", "kedaluwarsa"],
    "pakaian": ["kemeja", "batik", "gamis", "kaos", "jaket", "sepatu", "bahan", "ukuran", "warna"],
}


def embedding_semantik(teks: str) -> list:
    """Vektor konsep (panjang = len(DIMENSI_KONSEP)), dinormalisasi panjang 1."""
    low = " " + " ".join(re.findall(r"[a-z0-9\-]+", str(teks).lower())) + " "
    vec = []
    for dim in DIMENSI_KONSEP:
        score = 0.0
        for kw in _KONSEP[dim]:
            if f" {kw}" in low:
                score += 1.0
        vec.append(score)
    norm = math.sqrt(sum(v * v for v in vec))
    return [round(v / norm, 6) if norm else 0.0 for v in vec]


# ---------------------------------------------------------------------------
# 4) LLM tiruan
# ---------------------------------------------------------------------------

_NEG_LEMAH = ["rusak", "terlambat", "telat", "kecewa", "cacat", "lambat", "penyok", "mahal", "salah", "tidak", "lama"]
_POS_LEMAH = ["bagus", "mantap", "cepat", "suka", "recommended", "rapi", "ramah", "original", "worth", "sesuai"]

_NEG_KUAT = _NEG_LEMAH + [
    "lama sekali", "tidak bergerak", "salah", "mahal", "kemahalan", "tipis", "tidak sesuai", "luntur", "goresan",
    "cepat habis", "hambar", "bocor", "belum dijawab", "tidak ramah", "diabaikan", "dipersulit", "belum masuk",
    "sepihak", "palsu", "tidak sebanding", "naik terus", "tidak akan", "mengecewakan", "baru dipakai",
]
_POS_KUAT = _POS_LEMAH + ["oke", "melebihi ekspektasi", "berfungsi dengan baik", "responsif", "aman", "terima kasih",
                          "pasti belanja lagi", "sehari langsung"]
_NETRAL = ["sudah diterima", "belum dicoba", "biasa saja", "lumayan", "cukup", "standar", "tidak terlalu"]

_ASPEK = [
    ("Layanan", ["cs ", "admin", "komplain", "retur", "refund", "dibatalkan", "pelayanan", "chat", "diabaikan"]),
    ("Harga", ["harga", "mahal", "diskon", "sebanding", "kemahalan"]),
    ("Pengiriman", ["pengiriman", "kirim", "kurir", "paket", "sampai", "datang", "resi", "alamat", "kardus", "ongkos", "packing"]),
    ("Kualitas Produk", ["kualitas", "bahan", "rusak", "luntur", "cacat", "baterai", "ukuran", "rasa", "kemasan",
                         "goresan", "dipakai", "original", "berfungsi", "barang bagus", "deskripsi"]),
]

_STOP = set("""yang dan di ke dari ini itu untuk dengan tidak ada saya aku kamu kami kita akan sudah bisa juga lebih
sangat atau karena jika kalau pada dalam oleh seperti hanya apa apakah berapa bagaimana kapan dimana mana siapa
tokokita toko berapa lama yang adalah ya mohon tolong""".split())


def _stem(w: str) -> str:
    for suf in ("nya", "kan", "an", "lah"):
        if len(w) > 5 and w.endswith(suf):
            return w[: -len(suf)]
    return w


def _content_words(teks: str) -> set:
    words = re.findall(r"[a-z0-9]+", teks.lower())
    return {_stem(w) for w in words if w not in _STOP and len(w) > 2}


def _load_katalog():
    for path in ("/home/pyodide/produk.csv", "produk.csv"):
        try:
            with open(path, encoding="utf-8") as f:
                return list(csv.DictReader(f))
        except Exception:
            continue
    return []


_KOTA = ["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Semarang", "Medan", "Makassar", "Denpasar", "Palembang",
         "Balikpapan", "Pontianak", "Manado", "Jayapura", "Malang", "Solo", "Bogor", "Depok", "Bekasi", "Tangerang"]
_ALIAS_KOTA = {"jogja": "Yogyakarta", "jogjakarta": "Yogyakarta", "surakarta": "Solo", "bali": "Denpasar"}

_HALUSINASI = [
    (["refund", "dana", "uang kembali"], "Pengembalian dana biasanya diproses dalam 14 hari kerja."),
    (["retur", "kembalikan", "pengembalian barang"], "Barang bisa dikembalikan kapan saja selama masih ada struknya."),
    (["ongkir", "ongkos kirim", "gratis"], "Gratis ongkir berlaku untuk semua pesanan tanpa minimum belanja."),
    (["kirim", "pengiriman", "sampai"], "Semua pengiriman sampai dalam 1 hari ke seluruh Indonesia."),
    (["garansi"], "Semua produk bergaransi 3 tahun."),
    (["cicilan"], "Cicilan 0% bisa untuk semua metode pembayaran termasuk COD."),
    (["poin", "member"], "Setiap belanja Rp1.000 mendapat 1 poin."),
]


_LABEL_RE = re.compile(r"\b(positif|negatif|netral)\b")
# "balas hanya JSON", "hanya dengan (format) JSON", "JSON saja", "tanpa teks lain/penjelasan/basa-basi"
_JSON_KETAT = re.compile(r"hanya\b[^.\n]{0,30}?\bjson|json\b[^.\n]{0,15}?\bsaja|tanpa (?:teks|kalimat|kata|penjelasan|basa-basi)")


def _hitung_contoh(low: str) -> int:
    """Hitung contoh berlabel (few-shot) di prompt: baris contoh yang memuat satu label jawaban.

    Baris definisi label (memuat ketiga label), baris format, dan baris tanpa label tidak dihitung.
    """
    n = 0
    for ln in low.splitlines():
        labels = _LABEL_RE.findall(ln)
        if not labels or len(set(labels)) == 3:
            continue
        if re.search(r"format|diizinkan|pilihan|hanya boleh|salah satu", ln):
            continue
        if re.search(r"->|→|=>|contoh|example", ln) or re.match(r"\s*(sentimen|label|jawaban|output)\s*:", ln):
            n += len(labels)
    return n


class LLMTiruan:
    """LLM tiruan untuk latihan. Panggil .jawab(prompt) seperti memanggil API LLM.

    Atribut statistik: jumlah_panggilan, total_token_input, total_token_output.
    """

    def __init__(self, nama: str = "LLM-Tiruan-1", seed: int = 42):
        self.nama = nama
        self.rng = random.Random(seed)
        self.jumlah_panggilan = 0
        self.total_token_input = 0
        self.total_token_output = 0
        self._katalog = None

    def __repr__(self):
        return f"LLMTiruan(nama={self.nama!r}, panggilan={self.jumlah_panggilan})"

    # ---------------- API utama
    def jawab(self, prompt: str, temperature: float = 0.0) -> str:
        prompt = str(prompt)
        self.jumlah_panggilan += 1
        self.total_token_input += hitung_token(prompt)
        low = prompt.lower()
        if re.search(r"^\s*\[k\d{2}\]", low, re.M):
            out = self._jawab_rag(prompt, low)
        elif ("sentimen" in low or "klasifikasi" in low) and self._ambil_ulasan(prompt):
            out = self._jawab_klasifikasi(prompt, low)
        else:
            out = self._jawab_umum(prompt, low)
        self.total_token_output += hitung_token(out)
        return out

    # ---------------- klasifikasi sentimen
    def klasifikasi_sentimen(self, teks: str, mode: str = "zero-shot") -> str:
        """Label sentimen langsung (tanpa prompt). mode: 'zero-shot' (lebih lemah) atau 'few-shot'."""
        return self._label(str(teks), kuat=(mode == "few-shot"))

    def _label(self, teks: str, kuat: bool) -> str:
        low = teks.lower()
        if kuat:
            neg = sum(1 for w in _NEG_KUAT if w in low)
            pos = sum(1 for w in _POS_KUAT if w in low)
            netral = sum(1 for w in _NETRAL if w in low)
            if "tidak sesuai" in low or "tidak ramah" in low:
                pos = max(0, pos - 1)
            if netral and neg == 0 and pos <= 1:
                return "netral"
            if neg > pos:
                return "negatif"
            if pos > neg:
                return "positif"
            return "netral"
        neg = sum(1 for w in _NEG_LEMAH if w in low)
        pos = sum(1 for w in _POS_LEMAH if w in low)
        if neg > pos:
            return "negatif"
        return "positif"  # bias: yang ragu dianggap positif

    def _aspek(self, teks: str) -> str:
        low = " " + teks.lower() + " "
        for nama, kws in _ASPEK:
            if any(k in low for k in kws):
                return nama
        return "Umum"

    def _ambil_ulasan(self, prompt: str) -> str | None:
        m = list(re.finditer(r"ulasan\s*:\s*\"?(.+?)\"?\s*$", prompt, re.I | re.M))
        if m:
            txt = m[-1].group(1).strip().strip('"')
            if len(txt) >= 3:
                return txt
        q = re.findall(r"\"([^\"\n]{5,})\"", prompt)
        return q[-1] if q else None

    def _jawab_klasifikasi(self, prompt: str, low: str) -> str:
        ulasan = self._ambil_ulasan(prompt) or ""
        labels_defined = all(w in low for w in ("positif", "negatif", "netral"))
        few_shot = labels_defined and _hitung_contoh(low) >= 2
        label = self._label(ulasan, kuat=few_shot)
        minta_json = "json" in low
        ketat = minta_json and bool(_JSON_KETAT.search(low))
        minta_aspek = "aspek" in low
        if not labels_defined:
            label = {"positif": "Positif (pelanggan puas)", "negatif": "Negatif, pelanggan kecewa",
                     "netral": "Biasa saja"}[label]
        if minta_json:
            obj = {"sentimen": label}
            if minta_aspek:
                obj["aspek"] = self._aspek(ulasan)
            body = json.dumps(obj, ensure_ascii=False)
            if ketat:
                return body
            return "Tentu! Berikut hasil analisisnya:\n```json\n" + body + "\n```\nSemoga membantu."
        teks = f"Menurut saya, ulasan ini bernada {label.lower()}."
        if minta_aspek:
            teks += f" Aspek yang dibahas: {self._aspek(ulasan)}."
        return teks

    # ---------------- RAG
    def _jawab_rag(self, prompt: str, low: str) -> str:
        docs = []
        for m in re.finditer(r"^\s*\[(K\d{2})\]\s*(.+)$", prompt, re.M | re.I):
            isi = m.group(2).strip()
            isi = re.sub(r"^[^.:\n]{3,50}:\s+", "", isi)  # buang "Judul: " di depan isi
            docs.append((m.group(1).upper(), isi))
        qm = list(re.finditer(r"pertanyaan\s*:\s*(.+)$", prompt, re.I | re.M))
        pertanyaan = qm[-1].group(1).strip() if qm else prompt.strip().splitlines()[-1]
        ketat = any(p in low for p in ("hanya berdasarkan konteks", "hanya dari konteks", "hanya menggunakan konteks",
                                       "hanya berdasarkan dokumen", "hanya dari dokumen", "tidak tahu",
                                       "jika tidak ada", "jika informasinya tidak ada", "jika jawabannya tidak ada"))
        kutip = any(p in low for p in ("sumber", "kutip", "sitasi", "rujukan", "[id"))
        qwords = _content_words(pertanyaan)
        best = (0.0, None, None)
        for did, isi in docs:
            for kal in re.split(r"(?<=[.!?])\s+", isi):
                kw = _content_words(kal)
                if not kw or not qwords:
                    continue
                overlap = len(qwords & kw)
                score = overlap / max(1, len(qwords)) + 0.01 * overlap
                if score > best[0]:
                    best = (score, did, kal)
        if best[1] is None or best[0] < 0.34:
            if ketat:
                return "Maaf, informasi tersebut tidak ada di dokumen yang diberikan."
            return self._halusinasi(pertanyaan)
        jawaban = best[2].strip()
        if kutip:
            jawaban += f" [{best[1]}]"
        return jawaban

    def _halusinasi(self, pertanyaan: str) -> str:
        low = pertanyaan.lower()
        for kws, ans in _HALUSINASI:
            if any(k in low for k in kws):
                return ans
        return "Tentu bisa! Hal tersebut umumnya berlaku untuk semua pelanggan."

    def _jawab_umum(self, prompt: str, low: str) -> str:
        if "?" in prompt:
            for kws, ans in _HALUSINASI:
                if any(k in low for k in kws):
                    return ans
        return ("Saya LLM tiruan untuk latihan. Beri saya tugas yang jelas: misalnya klasifikasi sentimen "
                "sebuah ulasan, atau jawab pertanyaan berdasarkan konteks dokumen [K01] ... .")

    # ---------------- Agent (tool calling)
    def _katalog_produk(self):
        if self._katalog is None:
            self._katalog = _load_katalog()
        return self._katalog

    def _cari_produk(self, pertanyaan: str):
        low = pertanyaan.lower()
        best, best_score = None, 0
        for row in self._katalog_produk():
            nama = row.get("nama_produk", "")
            if not nama:
                continue
            if nama.lower() in low:
                return nama
            words = [w for w in re.findall(r"[a-z0-9]+", nama.lower()) if len(w) > 2 and w not in ("isi",)]
            score = sum(1 for w in words if re.search(r"\b" + re.escape(w) + r"\b", low))
            if score > best_score:
                best, best_score = nama, score
        if best:
            return best
        m = re.search(r"stok\s+(?:produk\s+)?([\w\s.,]+?)(?:\?|$| dan )", pertanyaan, re.I)
        return m.group(1).strip() if m else None

    def _cari_kota(self, pertanyaan: str):
        low = pertanyaan.lower()
        for alias, kota in _ALIAS_KOTA.items():
            if re.search(r"\b" + alias + r"\b", low):
                return kota
        for kota in _KOTA:
            if re.search(r"\b" + kota.lower() + r"\b", low):
                return kota
        return None

    def _cari_berat(self, pertanyaan: str):
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*(kg|kilo(?:gram)?|gram|gr|g)\b", pertanyaan.lower())
        if not m:
            return None
        val = float(m.group(1).replace(",", "."))
        return int(round(val * 1000)) if m.group(2).startswith("k") else int(round(val))

    def rencana_alat(self, pertanyaan: str) -> list:
        """Daftar (nama_alat, argumen, alasan) yang dibutuhkan untuk menjawab pertanyaan."""
        low = pertanyaan.lower()
        found = []
        i = low.find("stok")
        if i >= 0:
            found.append((i, "cek_stok", {"nama_produk": self._cari_produk(pertanyaan)},
                          "Pengguna menanyakan ketersediaan stok produk."))
        for kw in ("ongkir", "ongkos kirim", "biaya kirim", "biaya pengiriman"):
            i = low.find(kw)
            if i >= 0:
                berat = self._cari_berat(pertanyaan)
                alasan = "Pengguna menanyakan ongkos kirim."
                if berat is None:
                    berat = 1000
                    alasan += " Berat tidak disebutkan, pakai asumsi 1 kg."
                found.append((i, "hitung_ongkir", {"kota": self._cari_kota(pertanyaan), "berat_gram": berat}, alasan))
                break
        m = re.search(r"\bt\d{5}\b", low)
        if m and ("status" in low or "pesanan" in low or "transaksi" in low):
            found.append((m.start(), "cek_status_pesanan", {"id_transaksi": m.group(0).upper()},
                          "Pengguna menanyakan status pesanan."))
        found.sort(key=lambda x: x[0])
        return [(nama, arg, alasan) for _, nama, arg, alasan in found]

    def langkah_agen(self, pertanyaan: str, riwayat: list, alat) -> dict:
        """Satu langkah agent. Kembalikan salah satu:
        {"aksi": "panggil_alat", "alat": nama, "argumen": {...}, "alasan": "..."}
        {"aksi": "jawab", "jawaban": "...", "alasan": "..."}
        """
        self.jumlah_panggilan += 1
        nama_alat = list(alat.keys()) if isinstance(alat, dict) else list(alat or [])
        rencana = self.rencana_alat(pertanyaan)
        if not rencana:
            return {"aksi": "jawab", "alasan": "Pertanyaan di luar kemampuan alat yang tersedia.",
                    "jawaban": "Maaf, saya hanya bisa membantu cek stok produk, ongkos kirim, dan status pesanan."}
        sudah = []
        for r in riwayat or []:
            try:
                sudah.append((r.get("alat"), json.dumps(r.get("argumen"), sort_keys=True, ensure_ascii=False)))
            except Exception:
                continue
        for nama, arg, alasan in rencana:
            if nama not in nama_alat:
                return {"aksi": "jawab", "alasan": f"Alat '{nama}' tidak terdaftar.",
                        "jawaban": f"Maaf, saya tidak punya alat '{nama}' untuk menjawab pertanyaan itu."}
            if (nama, json.dumps(arg, sort_keys=True, ensure_ascii=False)) not in sudah:
                return {"aksi": "panggil_alat", "alat": nama, "argumen": arg, "alasan": alasan}
        return {"aksi": "jawab", "alasan": "Semua informasi yang dibutuhkan sudah didapat dari alat.",
                "jawaban": self._susun_jawaban(riwayat)}

    def _susun_jawaban(self, riwayat: list) -> str:
        bagian = []
        for r in riwayat or []:
            h = r.get("hasil")
            if isinstance(h, str):
                try:
                    h = json.loads(h)
                except Exception:
                    bagian.append(h)
                    continue
            if not isinstance(h, dict):
                bagian.append(str(h))
                continue
            if "error" in h:
                bagian.append(f"Maaf, {h['error']}")
            elif "stok" in h:
                nama = h.get("nama_produk", "produk tersebut")
                stok = h["stok"]
                bagian.append(f"Stok {nama} sedang habis." if not stok else f"Stok {nama} saat ini {stok} unit.")
            elif "ongkir" in h:
                ongkir = f"{int(h['ongkir']):,}".replace(",", ".")
                bagian.append(f"Ongkos kirim ke {h.get('kota', '-')} untuk {h.get('berat_gram', '-')} gram adalah Rp{ongkir}.")
            elif "status" in h:
                prod = f" ({h['nama_produk']})" if h.get("nama_produk") else ""
                bagian.append(f"Pesanan {h.get('id_transaksi', '')}{prod} berstatus {h['status']}.")
            else:
                bagian.append(json.dumps(h, ensure_ascii=False))
        return " ".join(bagian) if bagian else "Maaf, saya belum mendapat informasi apa pun."
