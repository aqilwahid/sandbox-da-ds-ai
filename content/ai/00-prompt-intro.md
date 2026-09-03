---
id: ai-00-prompt
track: ai
title: Dasar Few-Shot Prompting & JSON Output
estimatedMinutes: 10
runtime: pyodide
packages: []
datasets: []
prerequisites: []
---

## instruksi
Selamat datang di modul **AI Engineering**! Latihan ini mengasah kemampuan Anda dalam merancang prompt terstruktur (Structured Prompting) untuk ekstraksi entitas dari ulasan produk ke dalam format JSON yang valid.

### Kasus Bisnis:
Aplikasi e-commerce membutuhkan sistem parsing otomatis untuk mengekstrak sentimen dan aspek keluhan dari pesan komplain pelanggan.

### Tugas Anda:
1. Lengkapi fungsi `buat_prompt_ekstraksi(teks_ulasan)`.
2. Format prompt harus menginstruksikan LLM untuk mengembalikan JSON dengan key:
   - `sentiment`: `'POSITIF'` | `'NEGATIF'` | `'NETRAL'`
   - `kategori_keluhan`: `'Pengiriman'` | `'Kualitas Produk'` | `'Layanan'` | `'Lainnya'`
   - `urgensi`: `'Tinggi'` | `'Sedang'` | `'Rendah'`

## starter
def buat_prompt_ekstraksi(teks_ulasan):
    # Rancang system prompt dan instruksi terstruktur
    prompt = f"""
    Ekstrak sentimen dari ulasan berikut:
    "{teks_ulasan}"
    """
    return prompt

contoh_ulasan = "Barang sampai dalam keadaan pecah dan kurir tidak sopan!"
print(buat_prompt_ekstraksi(contoh_ulasan))

## solusi
def buat_prompt_ekstraksi(teks_ulasan):
    return f"""
Anda adalah asisten AI ekstraksi entitas.
Analisis ulasan pelanggan di bawah dan kembalikan output HANYA dalam format JSON valid tanpa teks tambahan:

{{
  "sentiment": "POSITIF" | "NEGATIF" | "NETRAL",
  "kategori_keluhan": "Pengiriman" | "Kualitas Produk" | "Layanan" | "Lainnya",
  "urgensi": "Tinggi" | "Sedang" | "Rendah"
}}

Ulasan:
"{teks_ulasan}"
""".strip()

contoh_ulasan = "Barang sampai dalam keadaan pecah dan kurir tidak sopan!"
print(buat_prompt_ekstraksi(contoh_ulasan))

## checker
res = buat_prompt_ekstraksi("Contoh")
assert "sentiment" in res
assert "JSON" in res

## hint-1
Jelaskan aturan output JSON secara eksplisit di awal prompt.

## hint-2
Sertakan schema JSON dengan key `sentiment`, `kategori_keluhan`, dan `urgensi`.

## hint-3
Gunakan string template f-string Python yang menyertakan placeholder `teks_ulasan`.
