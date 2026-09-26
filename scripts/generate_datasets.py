#!/usr/bin/env python3
"""
Generator dataset latihan (data sintetis, deterministik).

    python3 scripts/generate_datasets.py

Menghasilkan file CSV di public/datasets/. Hanya memakai pustaka standar Python,
jadi bisa dijalankan di laptop mana pun tanpa instalasi tambahan. Seed tetap,
sehingga hasilnya selalu sama — kunci jawaban latihan tidak berubah.

Semua nama perusahaan, pelanggan, dan produk FIKTIF.
"""

from __future__ import annotations

import csv
import datetime as dt
import math
import os
import random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "datasets")
os.makedirs(OUT, exist_ok=True)


def write_csv(name, header, rows):
    path = os.path.join(OUT, name)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow(["" if v is None else v for v in r])
    print(f"  ✓ {name:<22} {len(rows):>5} baris")


# ---------------------------------------------------------------------------
# 1) TokoKita — pelanggan, produk, penjualan (track Data Analyst)
# ---------------------------------------------------------------------------

def gen_tokokita():
    rnd = random.Random(2025)

    depan = ["Budi", "Siti", "Agus", "Dewi", "Rizky", "Ayu", "Andi", "Putri", "Dimas", "Nur", "Fajar", "Indah",
             "Hendra", "Rina", "Yoga", "Lestari", "Bayu", "Wulan", "Arif", "Maya", "Eko", "Sari", "Galih", "Tiara",
             "Reza", "Nanda", "Ilham", "Citra", "Joko", "Fitri", "Rudi", "Anisa", "Taufik", "Mega", "Hadi", "Laras",
             "Wahyu", "Dinda", "Irfan", "Kartika"]
    belakang = ["Santoso", "Rahmawati", "Pratama", "Lestari", "Saputra", "Wijaya", "Hidayat", "Kusuma", "Nugroho",
                "Permata", "Setiawan", "Handayani", "Siregar", "Utami", "Gunawan", "Maharani", "Firmansyah", "Anggraini",
                "Simanjuntak", "Wibowo", "Nasution", "Puspita", "Hakim", "Susanti"]
    kota_bobot = [("Jakarta", 30), ("Bandung", 14), ("Surabaya", 14), ("Yogyakarta", 11), ("Semarang", 9),
                  ("Medan", 9), ("Makassar", 7), ("Denpasar", 6)]

    def pilih(bobot):
        total = sum(b for _, b in bobot)
        x = rnd.uniform(0, total)
        acc = 0
        for v, b in bobot:
            acc += b
            if x <= acc:
                return v
        return bobot[-1][0]

    pelanggan = []
    used_names = set()
    for i in range(1, 121):
        while True:
            nama = f"{rnd.choice(depan)} {rnd.choice(belakang)}"
            if nama not in used_names:
                used_names.add(nama)
                break
        kota = pilih(kota_bobot)
        segmen = pilih([("Reguler", 55), ("Member", 33), ("VIP", 12)])
        usia = int(min(62, max(18, rnd.gauss(33, 9))))
        start = dt.date(2022, 1, 1)
        daftar = start + dt.timedelta(days=rnd.randint(0, 1400))
        if daftar > dt.date(2025, 11, 30):
            daftar = dt.date(2025, 11, 30) - dt.timedelta(days=rnd.randint(0, 60))
        pelanggan.append({"id": f"P{i:03d}", "nama": nama, "kota": kota, "segmen": segmen, "usia": usia,
                          "tanggal_daftar": daftar})

    # 10 pelanggan terakhir tidak pernah bertransaksi (untuk latihan LEFT JOIN)
    tidak_aktif = {p["id"] for p in pelanggan[-10:]}
    for p in pelanggan[-10:]:
        p["tanggal_daftar"] = dt.date(2025, 12, 1) + dt.timedelta(days=rnd.randint(0, 25))

    produk_def = [
        # kategori, nama, harga, berat_gram
        ("Elektronik", "Laptop 14 inci Core i5", 8_499_000, 1600),
        ("Elektronik", "Smartphone 128 GB", 3_299_000, 400),
        ("Elektronik", "Headset Bluetooth", 459_000, 250),
        ("Elektronik", "Mouse Nirkabel", 149_000, 150),
        ("Elektronik", "Power Bank 10.000 mAh", 229_000, 300),
        ("Elektronik", "Smartwatch Sport", 899_000, 200),
        ("Elektronik", "Speaker Portabel", 379_000, 700),
        ("Elektronik", "Monitor 24 inci", 1_899_000, 4200),
        ("Fashion", "Kemeja Batik Pria", 189_000, 300),
        ("Fashion", "Gamis Katun", 245_000, 450),
        ("Fashion", "Sepatu Lari", 529_000, 900),
        ("Fashion", "Jaket Hoodie", 199_000, 600),
        ("Fashion", "Kaos Polos Premium", 79_000, 200),
        ("Fashion", "Tas Ransel Kerja", 315_000, 800),
        ("Makanan & Minuman", "Kopi Arabika Gayo 250 g", 89_000, 280),
        ("Makanan & Minuman", "Teh Hijau Celup (isi 25)", 28_000, 120),
        ("Makanan & Minuman", "Madu Hutan 500 ml", 115_000, 700),
        ("Makanan & Minuman", "Kurma Premium 1 kg", 135_000, 1050),
        ("Makanan & Minuman", "Keripik Singkong Pedas", 22_000, 200),
        ("Makanan & Minuman", "Sambal Roa Botol", 45_000, 250),
        ("Rumah Tangga", "Rice Cooker 1,8 L", 459_000, 2800),
        ("Rumah Tangga", "Blender 2 L", 389_000, 2500),
        ("Rumah Tangga", "Setrika Uap", 275_000, 1400),
        ("Rumah Tangga", "Set Panci Anti Lengket", 649_000, 3500),
        ("Rumah Tangga", "Lampu LED Pintar", 99_000, 150),
        ("Rumah Tangga", "Dispenser Air", 729_000, 6000),
        ("Kesehatan & Kecantikan", "Serum Wajah Vitamin C", 159_000, 100),
        ("Kesehatan & Kecantikan", "Sunscreen SPF 50", 89_000, 80),
        ("Kesehatan & Kecantikan", "Sabun Herbal (isi 3)", 45_000, 300),
        ("Kesehatan & Kecantikan", "Masker Kain (isi 5)", 35_000, 100),
        ("Kesehatan & Kecantikan", "Vitamin C 1000 mg", 95_000, 150),
        ("Buku & Alat Tulis", "Buku Belajar Python", 139_000, 600),
        ("Buku & Alat Tulis", "Buku Tulis A5 (isi 10)", 42_000, 900),
        ("Buku & Alat Tulis", "Pulpen Gel (isi 12)", 36_000, 200),
        ("Buku & Alat Tulis", "Planner 2026", 85_000, 400),
        ("Buku & Alat Tulis", "Buku Statistik Terapan", 169_000, 700),
    ]
    produk = []
    for i, (kat, nama, harga, berat) in enumerate(produk_def, start=1):
        stok = rnd.choice([0, 3, 8, 12, 25, 40, 60, 85, 120, 150])
        if nama in ("Laptop 14 inci Core i5", "Monitor 24 inci"):
            stok = rnd.choice([4, 6, 9])
        produk.append({"id": f"PR{i:02d}", "nama": nama, "kategori": kat, "harga": harga, "berat": berat, "stok": stok})
    # pastikan ada produk dengan stok habis (untuk latihan agent)
    produk[12]["stok"] = 0  # Kaos Polos Premium
    produk[4]["stok"] = 42

    musim = {1: 0.95, 2: 0.85, 3: 1.55, 4: 1.2, 5: 0.95, 6: 1.05, 7: 1.1, 8: 1.0, 9: 0.95, 10: 1.0, 11: 1.35, 12: 1.65}
    kat_boost = {
        3: {"Fashion": 1.8, "Makanan & Minuman": 2.0},
        4: {"Fashion": 1.3, "Makanan & Minuman": 1.4},
        11: {"Elektronik": 1.8},
        12: {"Elektronik": 1.9, "Rumah Tangga": 1.4},
        7: {"Buku & Alat Tulis": 2.2},
        8: {"Buku & Alat Tulis": 1.6},
    }
    kat_base = {"Elektronik": 0.9, "Fashion": 1.4, "Makanan & Minuman": 1.6, "Rumah Tangga": 0.9,
                "Kesehatan & Kecantikan": 1.2, "Buku & Alat Tulis": 0.8}
    seg_w = {"Reguler": 1.0, "Member": 1.8, "VIP": 3.0}
    aktif = [p for p in pelanggan if p["id"] not in tidak_aktif]

    penjualan = []
    t_id = 1
    day = dt.date(2025, 1, 1)
    while day <= dt.date(2025, 12, 31):
        lam = 1.85 * musim[day.month] * (1.25 if day.weekday() >= 5 else 1.0)
        if (day.month, day.day) in ((11, 11), (12, 12), (10, 10), (9, 9)):
            lam *= 3.2
        if day.day in (25, 26, 27, 28):  # gajian
            lam *= 1.25
        n = 0
        # sampel Poisson
        L, k, p = math.exp(-lam), 0, 1.0
        while True:
            k += 1
            p *= rnd.random()
            if p <= L:
                break
        n = k - 1
        for _ in range(n):
            cust = rnd.choices(aktif, weights=[seg_w[c["segmen"]] for c in aktif])[0]
            if cust["tanggal_daftar"] > day:
                cust = rnd.choice([c for c in aktif if c["tanggal_daftar"] <= day])
            boost = kat_boost.get(day.month, {})
            weights = []
            for pr in produk:
                w = kat_base[pr["kategori"]] * boost.get(pr["kategori"], 1.0)
                if pr["harga"] > 2_000_000:
                    w *= 0.35
                elif pr["harga"] > 700_000:
                    w *= 0.6
                weights.append(w)
            pr = rnd.choices(produk, weights=weights)[0]
            if pr["kategori"] == "Makanan & Minuman":
                qty = rnd.choices([1, 2, 3, 4, 5], weights=[35, 28, 18, 10, 9])[0]
            elif pr["harga"] > 1_000_000:
                qty = rnd.choices([1, 2], weights=[92, 8])[0]
            else:
                qty = rnd.choices([1, 2, 3], weights=[62, 28, 10])[0]
            promo = day.month in (11, 12) or (day.month == 3)
            diskon = rnd.choices([0, 5, 10, 15], weights=([40, 20, 25, 15] if promo else [65, 15, 13, 7]))[0]
            total = round(qty * pr["harga"] * (100 - diskon) / 100)
            metode = rnd.choices(["E-Wallet", "Transfer Bank", "Kartu Kredit", "COD"], weights=[38, 30, 17, 15])[0]
            if metode == "COD" and total > 2_000_000:
                metode = "Transfer Bank"
            status = rnd.choices(["Selesai", "Dibatalkan", "Dikembalikan"], weights=[93, 5, 2])[0]
            penjualan.append([
                f"T{t_id:05d}", day.isoformat(), cust["id"], pr["id"], pr["nama"], pr["kategori"], cust["kota"],
                qty, pr["harga"], diskon, total, metode, status,
            ])
            t_id += 1
        day += dt.timedelta(days=1)

    write_csv("pelanggan.csv", ["id_pelanggan", "nama", "kota", "segmen", "usia", "tanggal_daftar"],
              [[p["id"], p["nama"], p["kota"], p["segmen"], p["usia"], p["tanggal_daftar"].isoformat()] for p in pelanggan])
    write_csv("produk.csv", ["id_produk", "nama_produk", "kategori", "harga_satuan", "berat_gram", "stok"],
              [[p["id"], p["nama"], p["kategori"], p["harga"], p["berat"], p["stok"]] for p in produk])
    write_csv("penjualan.csv", ["id_transaksi", "tanggal", "id_pelanggan", "id_produk", "nama_produk", "kategori",
                                "kota", "jumlah", "harga_satuan", "diskon_persen", "total_harga", "metode_bayar", "status"],
              penjualan)
    return pelanggan, produk, penjualan


# ---------------------------------------------------------------------------
# 2) Properti Jabodetabek (track Data Science — regresi & cleaning)
# ---------------------------------------------------------------------------

def gen_properti():
    rnd = random.Random(314)
    lokasi = {
        # base harga (juta/m2 bangunan), jarak rata-rata ke pusat (km)
        "Jakarta Selatan": (21.0, 9), "Jakarta Pusat": (24.0, 4), "Jakarta Barat": (15.5, 12),
        "Jakarta Timur": (12.5, 14), "Jakarta Utara": (14.0, 13), "Tangerang Selatan": (11.5, 22),
        "Tangerang": (8.5, 27), "Depok": (8.0, 26), "Bekasi": (7.8, 25), "Bogor": (6.8, 45),
    }
    bobot = {"Jakarta Selatan": 14, "Jakarta Pusat": 6, "Jakarta Barat": 10, "Jakarta Timur": 12, "Jakarta Utara": 7,
             "Tangerang Selatan": 13, "Tangerang": 10, "Depok": 11, "Bekasi": 11, "Bogor": 8}
    names = list(bobot.keys())
    rows = []
    for i in range(1, 181):
        lok = rnd.choices(names, weights=[bobot[n] for n in names])[0]
        base, jarak0 = lokasi[lok]
        kt = rnd.choices([1, 2, 3, 4, 5], weights=[6, 30, 38, 19, 7])[0]
        lb = int(max(30, rnd.gauss(28 + kt * 30, 14)))
        lt = int(max(lb * 0.7, rnd.gauss(lb * 1.25 + 15, 25)))
        lt = max(45, lt)
        km = max(1, min(kt, int(round(kt * rnd.uniform(0.55, 1.0)))))
        garasi = rnd.choices([0, 1, 2, 3], weights=[18, 50, 26, 6])[0] if kt >= 2 else rnd.choice([0, 0, 1])
        tahun = rnd.randint(1994, 2025)
        jarak = round(max(1.5, rnd.gauss(jarak0, jarak0 * 0.25)), 1)
        sert = rnd.choices(["SHM", "HGB", "Girik"], weights=[68, 27, 5])[0]
        usia = 2026 - tahun
        harga = (lb * base * 0.62 + lt * base * 0.58) * (1 - 0.0065 * usia) * (1 - 0.004 * (jarak - jarak0))
        harga *= 1 + 0.05 * garasi
        harga *= {"SHM": 1.04, "HGB": 0.97, "Girik": 0.82}[sert]
        harga *= rnd.uniform(0.88, 1.12)
        harga = int(round(harga / 5.0) * 5)
        rows.append([f"R{i:03d}", lok, kt, km, lt, lb, garasi, tahun, jarak, sert, harga])

    # nilai kosong (missing values) — realistis: garasi tidak diisi, harga belum diketahui
    for idx in rnd.sample(range(len(rows)), 14):
        rows[idx][6] = None
    for idx in rnd.sample(range(len(rows)), 5):
        rows[idx][10] = None
    # baris duplikat (input data dobel)
    for idx in (17, 64, 120):
        rows.append(list(rows[idx]))
    rows_sorted = rows[:180] + rows[180:]
    write_csv("properti.csv", ["id_properti", "lokasi", "kamar_tidur", "kamar_mandi", "luas_tanah_m2",
                               "luas_bangunan_m2", "garasi", "tahun_dibangun", "jarak_pusat_kota_km",
                               "sertifikat", "harga_juta"], rows_sorted)


# ---------------------------------------------------------------------------
# 3) Churn member TokoKita (track Data Science — klasifikasi)
# ---------------------------------------------------------------------------

def gen_churn():
    rnd = random.Random(77)
    kota = ["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Semarang", "Medan", "Makassar", "Denpasar"]
    rows = []
    for i in range(1, 501):
        usia = int(min(65, max(18, rnd.gauss(34, 10))))
        lama = rnd.randint(1, 60)
        frek = round(max(0.0, rnd.gauss(3.2, 1.8)), 1)
        rata = int(max(40, rnd.gauss(320, 180)))
        keluhan = rnd.choices([0, 1, 2, 3, 4, 5], weights=[42, 26, 15, 9, 5, 3])[0]
        app = rnd.random() < 0.62
        kepuasan = max(1, min(5, int(round(rnd.gauss(3.7 - 0.35 * keluhan, 0.9)))))
        z = 1.35 - 0.045 * lama - 0.42 * frek + 0.5 * keluhan - 0.62 * (kepuasan - 3) - 0.75 * (1 if app else 0)
        z += rnd.gauss(0, 0.7)
        p = 1 / (1 + math.exp(-z))
        churn = 1 if rnd.random() < p else 0
        rows.append([f"M{i:04d}", usia, rnd.choice(kota), lama, frek, rata, keluhan,
                     "Ya" if app else "Tidak", kepuasan, churn])
    write_csv("churn_member.csv", ["id_member", "usia", "kota", "lama_member_bulan", "frekuensi_belanja_bulanan",
                                   "rata_belanja_ribu", "jumlah_keluhan", "pakai_aplikasi", "skor_kepuasan", "churn"], rows)


# ---------------------------------------------------------------------------
# 4) Ulasan produk (track AI — tokenisasi, similarity, evaluasi)
# ---------------------------------------------------------------------------

def gen_ulasan(produk):
    rnd = random.Random(11)
    nama_produk = [p["nama"] for p in produk]
    frag = {
        ("negatif", "Pengiriman"): [
            "Paket datang terlambat {n} hari dari estimasi", "Kurir telat dan paketnya penyok",
            "Pengiriman lama sekali, sudah seminggu baru sampai", "Kardus rusak waktu diterima",
            "Status paket tidak bergerak berhari-hari", "Barang dikirim ke alamat yang salah",
            "Ongkos kirim mahal tapi pengirimannya lambat",
        ],
        ("negatif", "Kualitas Produk"): [
            "Kualitas bahannya tipis, tidak sesuai foto", "Baru dipakai dua hari sudah rusak",
            "Warnanya luntur setelah dicuci", "Barang cacat, ada goresan di bagian depan",
            "Baterainya cepat habis, mengecewakan", "Ukurannya tidak sesuai tabel ukuran",
            "Rasanya hambar dan kemasannya bocor",
        ],
        ("negatif", "Layanan"): [
            "CS lambat membalas chat, sudah {n} hari belum dijawab", "Admin tidak ramah saat ditanya",
            "Komplain saya diabaikan", "Pengajuan retur dipersulit",
            "Refund belum masuk padahal sudah lewat seminggu", "Pesanan dibatalkan sepihak tanpa penjelasan",
        ],
        ("negatif", "Harga"): [
            "Harganya kemahalan dibanding toko lain", "Diskonnya palsu, harga dinaikkan dulu",
            "Tidak sebanding dengan harganya", "Harga naik terus tiap minggu",
        ],
        ("positif", "Umum"): [
            ("Barang bagus dan sesuai deskripsi", "Kualitas Produk"), ("Mantap, kualitasnya melebihi ekspektasi", "Kualitas Produk"),
            ("Recommended seller, pasti belanja lagi", "Umum"), ("Produk original dan berfungsi dengan baik", "Kualitas Produk"),
            ("Suka banget, worth it", "Umum"), ("Pelayanan ramah dan responsif", "Layanan"),
            ("Pengiriman cepat, sehari langsung sampai", "Pengiriman"), ("Packing rapi dan aman", "Pengiriman"),
        ],
        ("netral", "Umum"): [
            ("Barang sudah diterima", "Umum"), ("Sesuai pesanan, belum dicoba", "Umum"),
            ("Pengiriman standar, barang biasa saja", "Pengiriman"), ("Lumayan untuk harga segini", "Harga"),
            ("Kualitas cukup, tidak terlalu istimewa", "Kualitas Produk"), ("Oke lah", "Umum"),
        ],
    }
    tambahan_pos = ["", " Terima kasih!", " Mantap.", "", " Sukses terus.", " Mantap."]
    tambahan_neg = ["", " Kecewa.", " Tolong diperbaiki.", " Tidak akan beli lagi.", " Mohon ditindaklanjuti.", ""]
    rows = []
    seen = set()
    rating_map = {"positif": [5, 5, 4], "netral": [3, 3, 4], "negatif": [1, 2, 1, 2]}
    plan = ([("negatif", "Pengiriman")] * 22 + [("negatif", "Kualitas Produk")] * 22 + [("negatif", "Layanan")] * 16 +
            [("negatif", "Harga")] * 10 + [("positif", "Umum")] * 60 + [("netral", "Umum")] * 30)
    rnd.shuffle(plan)
    i = 1
    for sent, aspek in plan:
        for _ in range(50):
            pick = rnd.choice(frag[(sent, aspek)])
            base, asp = (pick if isinstance(pick, tuple) else (pick, aspek))
            base = base.format(n=rnd.randint(2, 6))
            tail = rnd.choice(tambahan_pos if sent == "positif" else tambahan_neg if sent == "negatif" else ["", "", "."])
            teks = (base + "." if not base.endswith((".", "!")) else base) + tail if tail else base + "."
            teks = teks.replace("..", ".")
            if teks not in seen:
                seen.add(teks)
                break
        rows.append([f"U{i:03d}", rnd.choice(nama_produk), teks, rnd.choice(rating_map[sent]), sent, asp])
        i += 1
    write_csv("ulasan.csv", ["id_ulasan", "produk", "teks_ulasan", "rating", "sentimen", "aspek"], rows)


# ---------------------------------------------------------------------------
# 5) Basis pengetahuan kebijakan TokoKita (track AI — mini RAG)
# ---------------------------------------------------------------------------

def gen_kebijakan():
    docs = [
        ("K01", "Pengembalian barang", "Retur",
         "Barang dapat dikembalikan paling lambat 7 hari setelah paket diterima. Barang harus dalam kondisi baru, "
         "lengkap dengan label dan kemasan asli. Pengajuan retur dilakukan melalui menu Pesanan Saya lalu pilih "
         "Ajukan Pengembalian dan unggah foto barang."),
        ("K02", "Pengembalian dana (refund)", "Retur",
         "Setelah retur disetujui, dana dikembalikan ke metode pembayaran awal. Refund ke e-wallet diproses "
         "paling lama 1x24 jam, sedangkan refund ke rekening bank atau kartu kredit memerlukan 3 sampai 5 hari kerja."),
        ("K03", "Estimasi waktu pengiriman", "Pengiriman",
         "Pengiriman reguler ke kota di Pulau Jawa memakan waktu 2 sampai 3 hari kerja. Pengiriman ke luar Pulau Jawa "
         "memakan waktu 4 sampai 7 hari kerja, tergantung lokasi dan cuaca."),
        ("K04", "Gratis ongkir", "Pengiriman",
         "Member dan VIP mendapat gratis ongkos kirim untuk belanja minimal Rp150.000 per transaksi. Pelanggan "
         "reguler mendapat gratis ongkir dengan minimal belanja Rp250.000. Gratis ongkir berlaku maksimal potongan Rp30.000."),
        ("K05", "Pengiriman instan", "Pengiriman",
         "Pengiriman instan (sampai di hari yang sama) tersedia untuk wilayah Jabodetabek. Pesanan harus dibayar "
         "sebelum pukul 12.00 WIB agar dikirim di hari yang sama."),
        ("K06", "Pelacakan paket", "Pengiriman",
         "Nomor resi muncul paling lambat 1x24 jam setelah pesanan dikemas. Status paket dapat dilacak di menu "
         "Pesanan Saya. Jika status tidak berubah lebih dari 3 hari, hubungi layanan pelanggan."),
        ("K07", "Pembatalan pesanan", "Pesanan",
         "Pesanan dapat dibatalkan tanpa biaya selama statusnya belum Dikemas. Pesanan yang sudah dikirim tidak "
         "dapat dibatalkan dan harus melalui proses retur setelah diterima."),
        ("K08", "Metode pembayaran", "Pembayaran",
         "TokoKita menerima transfer bank, e-wallet, kartu kredit, dan bayar di tempat (COD). Pembayaran COD hanya "
         "berlaku untuk transaksi maksimal Rp2.000.000 dan tidak tersedia untuk pengiriman instan."),
        ("K09", "Cicilan 0%", "Pembayaran",
         "Cicilan 0% tersedia untuk pembayaran kartu kredit dengan minimal transaksi Rp1.000.000, dengan tenor 3 atau "
         "6 bulan. Cicilan tidak dapat digabung dengan voucher diskon."),
        ("K10", "Garansi produk elektronik", "Produk",
         "Produk elektronik bergaransi resmi 1 tahun sejak tanggal pembelian. Klaim garansi dilakukan dengan membawa "
         "kartu garansi dan bukti pembelian ke service center resmi. Kerusakan karena jatuh atau terkena air tidak ditanggung."),
        ("K11", "Produk makanan dan minuman", "Produk",
         "Produk makanan dan minuman dikirim dengan tanggal kedaluwarsa minimal 3 bulan. Produk makanan tidak dapat "
         "dikembalikan kecuali diterima dalam kondisi rusak atau kemasan bocor, dengan bukti video unboxing."),
        ("K12", "Program poin member", "Member",
         "Member mendapat 1 poin untuk setiap belanja Rp10.000. Poin dapat ditukar menjadi potongan belanja dengan "
         "nilai 1 poin sama dengan Rp100. Poin kedaluwarsa 12 bulan setelah diperoleh. Member dengan belanja di atas "
         "Rp10.000.000 per tahun naik level menjadi VIP."),
        ("K13", "Voucher dan promo", "Promo",
         "Hanya satu voucher yang dapat dipakai dalam satu transaksi. Voucher tidak dapat diuangkan dan memiliki masa "
         "berlaku yang tertera di halaman voucher. Promo tanggal kembar seperti 11.11 dan 12.12 berlaku selama 24 jam."),
        ("K14", "Jam layanan pelanggan", "Layanan",
         "Layanan pelanggan melalui live chat tersedia setiap hari pukul 08.00 sampai 21.00 WIB. Pertanyaan melalui "
         "email cs@tokokita.example dijawab maksimal 2x24 jam pada hari kerja."),
        ("K15", "Keamanan akun", "Layanan",
         "TokoKita tidak pernah meminta kode OTP, PIN, atau kata sandi melalui telepon maupun chat. Jangan berikan kode "
         "OTP kepada siapa pun. Aktifkan verifikasi dua langkah di menu Pengaturan Akun."),
    ]
    write_csv("kebijakan.csv", ["id_dok", "judul", "kategori", "isi"], [list(d) for d in docs])


if __name__ == "__main__":
    print("Membuat dataset di", os.path.relpath(OUT))
    pel, prod, penj = gen_tokokita()
    gen_properti()
    gen_churn()
    gen_ulasan(prod)
    gen_kebijakan()
    print("Selesai.")
