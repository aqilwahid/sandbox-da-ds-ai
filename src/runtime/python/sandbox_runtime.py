"""
sandbox_runtime.py — "otak" sandbox yang berjalan DI DALAM Pyodide.

Dipakai oleh dua tempat dengan kode yang sama persis:
  1. Web Worker di browser peserta  (src/runtime/python.worker.ts)
  2. Test harness Node              (scripts/test-content.ts)

Semua fungsi publik menerima string biasa dan mengembalikan string JSON,
supaya lapisan JavaScript tidak perlu mengurus konversi objek Python.
"""

from __future__ import annotations

import ast
import base64
import builtins
import datetime as _dt
import decimal
import difflib
import io
import json
import math
import os
import re
import sys
import time
import traceback
import warnings

WORKDIR = "/home/pyodide"
MAX_TABLE_ROWS = 500          # baris maksimum yang dikirim ke UI per tabel
MAX_DISPLAYS = 20             # jumlah tampilan (tabel/teks) maksimum per eksekusi
MAX_STREAM_CHARS = 200_000    # batas output konsol yang di-stream ke UI
MAX_CAPTURE_CHARS = 1_000_000 # batas output yang disimpan untuk penilaian
USER_FILENAME = "<kode>"

_state: dict = {
    "ns": None,              # namespace hasil run Python terakhir
    "code": "",              # kode peserta terakhir
    "stdout": "",            # output konsol terakhir (untuk penilaian)
    "displays": [],          # tampilan yang dikumpulkan saat run
    "figures_meta": [],      # metadata grafik matplotlib run terakhir
    "sql_results": [],       # hasil SQL (lengkap) run terakhir
    "sql_con": None,         # koneksi DuckDB run terakhir
    "datasets": {},          # nama -> nama file
    "solution_cache": {},    # kode solusi -> namespace / hasil
    "emit": None,            # fungsi streaming ke JS (opsional)
    "pandas_ready": False,
}


# ---------------------------------------------------------------------------
# Utilitas umum
# ---------------------------------------------------------------------------

def _dumps(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, default=_json_default, allow_nan=False)


def _json_default(o):
    try:
        return _to_jsonable(o)
    except Exception:
        return str(o)


def _is_nan(v) -> bool:
    try:
        return isinstance(v, float) and math.isnan(v)
    except Exception:
        return False


def _to_jsonable(v):
    """Ubah satu nilai sel menjadi nilai yang aman untuk JSON."""
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, int):
        # Hindari angka raksasa yang tidak bisa diwakili JS dengan tepat
        return v if abs(v) < 2**53 else str(v)
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    if isinstance(v, str):
        return v
    if isinstance(v, decimal.Decimal):
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(v, (_dt.datetime,)):
        if v.hour == v.minute == v.second == v.microsecond == 0:
            return v.date().isoformat()
        return v.isoformat(sep=" ", timespec="seconds")
    if isinstance(v, (_dt.date, _dt.time)):
        return v.isoformat()
    if isinstance(v, _dt.timedelta):
        return str(v)
    if isinstance(v, (bytes, bytearray)):
        return v.hex()
    # numpy / pandas scalar
    mod = type(v).__module__
    if mod.startswith("numpy"):
        try:
            import numpy as np
            if isinstance(v, np.bool_):
                return bool(v)
            if isinstance(v, np.integer):
                return _to_jsonable(int(v))
            if isinstance(v, np.floating):
                return _to_jsonable(float(v))
            if isinstance(v, np.datetime64):
                return str(v)
            if isinstance(v, np.ndarray):
                return [_to_jsonable(x) for x in v.tolist()]
        except Exception:
            pass
    if mod.startswith("pandas"):
        try:
            import pandas as pd
            if v is pd.NaT or (hasattr(pd, "isna") and pd.isna(v)):
                return None
            if isinstance(v, pd.Timestamp):
                return _to_jsonable(v.to_pydatetime())
            if isinstance(v, pd.Timedelta):
                return str(v)
            if isinstance(v, pd.Period):
                return str(v)
            if isinstance(v, pd.Interval):
                return str(v)
        except Exception:
            pass
    if isinstance(v, (list, tuple)):
        return [_to_jsonable(x) for x in v]
    if isinstance(v, dict):
        return {str(k): _to_jsonable(x) for k, x in v.items()}
    return str(v)


def _short_repr(obj, limit: int = 90) -> str:
    try:
        r = repr(obj)
    except Exception:
        r = f"<{type(obj).__name__}>"
    r = " ".join(r.split())
    return r if len(r) <= limit else r[: limit - 1] + "…"


def _fmt_int(n: int) -> str:
    return f"{n:,}".replace(",", ".")


# ---------------------------------------------------------------------------
# Streaming stdout/stderr (tee): tampil real-time + disimpan untuk penilaian
# ---------------------------------------------------------------------------

class _TeeStream(io.TextIOBase):
    def __init__(self, kind: str, sink: list):
        self.kind = kind
        self.sink = sink            # list[str] bersama untuk stdout+stderr
        self.pending = []
        self.pending_len = 0
        self.streamed = 0
        self.captured = 0
        self.last_flush = time.perf_counter()
        self.truncated = False

    def writable(self):
        return True

    def write(self, s):
        if not s:
            return 0
        if not isinstance(s, str):
            s = str(s)
        if self.captured < MAX_CAPTURE_CHARS:
            self.sink.append(s if self.kind == "stdout" else "")
            self.captured += len(s)
        if self.streamed < MAX_STREAM_CHARS:
            self.pending.append(s)
            self.pending_len += len(s)
            now = time.perf_counter()
            if self.pending_len > 2048 or (now - self.last_flush) > 0.05:
                self.flush()
        elif not self.truncated:
            self.truncated = True
            _emit(self.kind, "\n… (output terlalu panjang, sisanya tidak ditampilkan)\n")
        return len(s)

    def flush(self):
        if not self.pending:
            return
        text = "".join(self.pending)
        self.pending = []
        self.pending_len = 0
        self.last_flush = time.perf_counter()
        room = MAX_STREAM_CHARS - self.streamed
        if room <= 0:
            return
        text = text[:room]
        self.streamed += len(text)
        _emit(self.kind, text)


def _emit(kind: str, text: str):
    fn = _state.get("emit")
    if fn is None:
        return
    try:
        fn(kind, text)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Setup lingkungan
# ---------------------------------------------------------------------------

_MPLRC = """
backend: agg
figure.figsize: 7.2, 4.2
figure.dpi: 100
figure.facecolor: white
figure.autolayout: True
savefig.dpi: 110
savefig.facecolor: white
axes.facecolor: white
axes.edgecolor: c3c2b7
axes.linewidth: 0.8
axes.spines.top: False
axes.spines.right: False
axes.grid: True
axes.axisbelow: True
grid.color: e8e7e1
grid.linewidth: 0.8
axes.titlesize: 13
axes.titleweight: 600
axes.titlelocation: left
axes.titlepad: 10
axes.labelsize: 11
axes.labelcolor: 52514e
xtick.color: 52514e
ytick.color: 52514e
xtick.labelsize: 9.5
ytick.labelsize: 9.5
font.size: 10.5
axes.prop_cycle: cycler('color', ['2a78d6', 'eb6834', '1baf7a', 'eda100', 'e87ba4', '008300', '4a3aa7', 'e34948'])
lines.linewidth: 2
lines.markersize: 6
patch.linewidth: 0
legend.frameon: False
legend.fontsize: 9.5
image.cmap: Blues
"""


def setup(config_json: str = "{}") -> str:
    """Dipanggil sekali setelah Pyodide dimuat."""
    cfg = json.loads(config_json or "{}")
    try:
        os.makedirs(WORKDIR, exist_ok=True)
        os.chdir(WORKDIR)
    except Exception:
        pass
    mpl_dir = os.path.join(WORKDIR, ".config", "matplotlib")
    os.makedirs(mpl_dir, exist_ok=True)
    with open(os.path.join(mpl_dir, "matplotlibrc"), "w") as f:
        f.write(_MPLRC)
    os.environ["MPLCONFIGDIR"] = mpl_dir
    os.environ.setdefault("MPLBACKEND", "agg")

    warnings.filterwarnings("ignore", message=".*non-interactive.*")
    warnings.filterwarnings("ignore", message=".*FigureCanvasAgg.*")
    warnings.filterwarnings("ignore", category=DeprecationWarning)
    warnings.filterwarnings("ignore", category=PendingDeprecationWarning)
    try:
        warnings.filterwarnings("ignore", module="matplotlib")
    except Exception:
        pass

    if cfg.get("emit") is not None:
        _state["emit"] = cfg["emit"]
    return _dumps({"ok": True, "python": sys.version.split()[0], "cwd": os.getcwd()})


def set_emitter(fn) -> None:
    _state["emit"] = fn


def register_dataset(name: str, filename: str) -> None:
    _state["datasets"][name] = filename


def list_datasets() -> list:
    return sorted(_state["datasets"].keys())


def _ensure_pandas_options():
    if _state["pandas_ready"] or "pandas" not in sys.modules:
        return
    try:
        import pandas as pd
        pd.set_option("display.width", 120)
        pd.set_option("display.max_columns", 30)
        pd.set_option("display.max_colwidth", 40)
        pd.set_option("display.precision", 4)
        _state["pandas_ready"] = True
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Warmup: impor modul yang dipakai latihan lebih awal agar Run pertama cepat
# ---------------------------------------------------------------------------

def _import_lines(code: str) -> list:
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []
    lines = []
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            try:
                lines.append(ast.unparse(node))
            except Exception:
                pass
    return lines


def warmup(codes_json: str) -> str:
    codes = json.loads(codes_json or "[]")
    done, failed = [], []
    seen = set()
    for code in codes:
        for line in _import_lines(code or ""):
            if line in seen:
                continue
            seen.add(line)
            try:
                exec(line, {"__name__": "__warmup__"})
                done.append(line)
            except Exception as e:  # noqa: BLE001
                failed.append({"line": line, "error": f"{type(e).__name__}: {e}"})
    if "matplotlib" in sys.modules:
        try:
            import matplotlib.pyplot as plt  # noqa: F401  (membangun cache font)
            plt.close("all")
        except Exception:
            pass
    _ensure_pandas_options()
    return _dumps({"imported": done, "failed": failed})


# ---------------------------------------------------------------------------
# Tampilan (display) — tabel, teks, JSON, gambar
# ---------------------------------------------------------------------------

def _kind_from_dtype(dtype) -> str:
    s = str(dtype).lower()
    if s.startswith("bool"):
        return "bool"
    if s.startswith(("int", "uint", "float", "complex")) or s in ("int64", "float64") or "decimal" in s:
        return "number"
    if "datetime" in s or s.startswith("period") or s == "date":
        return "date"
    return "text"


def _kind_from_sql_type(t: str) -> str:
    s = str(t).upper()
    if s in ("BOOLEAN", "BOOL"):
        return "bool"
    if any(k in s for k in ("INT", "DOUBLE", "FLOAT", "DECIMAL", "NUMERIC", "REAL")):
        return "number"
    if any(k in s for k in ("DATE", "TIME")) and "INTERVAL" not in s:
        return "date"
    return "text"


def _kind_from_values(values) -> str:
    kinds = set()
    for v in values:
        if v is None or _is_nan(v):
            continue
        if isinstance(v, bool):
            kinds.add("bool")
        elif isinstance(v, (int, float, decimal.Decimal)):
            kinds.add("number")
        elif isinstance(v, (_dt.date, _dt.datetime)):
            kinds.add("date")
        else:
            mod = type(v).__module__
            if mod.startswith("numpy"):
                try:
                    import numpy as np
                    if isinstance(v, np.bool_):
                        kinds.add("bool")
                    elif isinstance(v, np.number):
                        kinds.add("number")
                    else:
                        kinds.add("text")
                except Exception:
                    kinds.add("text")
            else:
                kinds.add("text")
        if len(kinds) > 1:
            return "text"
    return kinds.pop() if kinds else "text"


def _df_to_table(df, title=None, max_rows=MAX_TABLE_ROWS) -> dict:
    import pandas as pd

    total = int(len(df))
    head = df.head(max_rows)
    index_cols: list = []
    idx = head.index
    show_index = not (isinstance(idx, pd.RangeIndex) and idx.start == 0 and idx.step == 1) or idx.name is not None
    if isinstance(idx, pd.MultiIndex):
        show_index = True
    if show_index:
        names = [n if n is not None else ("index" if i == 0 else f"index_{i}") for i, n in enumerate(idx.names)]
        index_cols = [str(n) for n in names]
        index_values = [list(t) if isinstance(t, tuple) else [t] for t in idx.tolist()]
    columns = []
    for c in head.columns:
        columns.append(" / ".join(map(str, c)) if isinstance(c, tuple) else str(c))
    kinds = [_kind_from_dtype(t) for t in head.dtypes]
    dtypes = [str(t) for t in head.dtypes]
    rows = []
    values = head.to_numpy(dtype=object).tolist() if len(head.columns) else [[] for _ in range(len(head))]
    for i, r in enumerate(values):
        cells = [_to_jsonable(v) for v in r]
        if show_index:
            cells = [_to_jsonable(v) for v in index_values[i]] + cells
        rows.append(cells)
    if show_index:
        idx_kinds = []
        for level in range(len(index_cols)):
            try:
                idx_kinds.append(_kind_from_dtype(idx.get_level_values(level).dtype))
            except Exception:
                idx_kinds.append("text")
        columns = index_cols + columns
        kinds = idx_kinds + kinds
        dtypes = ["index"] * len(index_cols) + dtypes
    return {
        "type": "table",
        "title": title,
        "columns": columns,
        "kinds": kinds,
        "dtypes": dtypes,
        "indexColumns": len(index_cols),
        "rows": rows,
        "totalRows": total,
        "truncated": total > len(rows),
        "source": "dataframe",
    }


def _records_to_table(columns, rows, kinds=None, title=None, source="python") -> dict:
    total = len(rows)
    shown = rows[:MAX_TABLE_ROWS]
    if kinds is None:
        kinds = [_kind_from_values([r[i] for r in shown[:200] if i < len(r)]) for i in range(len(columns))]
    return {
        "type": "table",
        "title": title,
        "columns": [str(c) for c in columns],
        "kinds": kinds,
        "dtypes": [k for k in kinds],
        "indexColumns": 0,
        "rows": [[_to_jsonable(v) for v in r] for r in shown],
        "totalRows": total,
        "truncated": total > len(shown),
        "source": source,
    }


def _to_display(obj, title=None):
    """Ubah objek Python menjadi item tampilan untuk UI (atau None)."""
    mod = type(obj).__module__
    if mod.startswith("pandas"):
        try:
            import pandas as pd
            if isinstance(obj, pd.DataFrame):
                return _df_to_table(obj, title)
            if isinstance(obj, pd.Series):
                name = obj.name if obj.name is not None else "nilai"
                return _df_to_table(obj.to_frame(name=str(name)), title)
            if isinstance(obj, pd.Index):
                return _df_to_table(pd.DataFrame({"index": list(obj)}), title)
        except Exception:
            pass
    if mod.startswith("numpy"):
        try:
            import numpy as np
            if isinstance(obj, np.ndarray):
                if obj.ndim == 1 and obj.size <= 5000:
                    return _records_to_table(["nilai"], [[v] for v in obj.tolist()], title=title, source="ndarray")
                if obj.ndim == 2 and obj.shape[0] <= 5000 and obj.shape[1] <= 60:
                    cols = [f"kolom_{i}" for i in range(obj.shape[1])]
                    return _records_to_table(cols, obj.tolist(), title=title, source="ndarray")
        except Exception:
            pass
    if mod.startswith("matplotlib"):
        # Figure/Axes akan ditangkap otomatis oleh _capture_figures
        return None
    if isinstance(obj, (list, tuple)) and obj and len(obj) <= 5000 and all(isinstance(x, dict) for x in obj):
        cols: list = []
        for d in obj:
            for k in d.keys():
                if k not in cols:
                    cols.append(k)
        rows = [[d.get(k) for k in cols] for d in obj]
        return _records_to_table(cols, rows, title=title)
    if isinstance(obj, (dict, list, tuple)):
        try:
            data = _to_jsonable(obj)
            text = json.dumps(data, ensure_ascii=False, indent=2, default=str)
            if len(text) <= 60_000:
                return {"type": "json", "title": title, "data": data, "repr": _short_repr(obj, 400)}
        except Exception:
            pass
    if isinstance(obj, str):
        return {"type": "text", "title": title, "text": obj if len(obj) <= 20000 else obj[:20000] + "…"}
    try:
        r = repr(obj)
    except Exception:
        r = f"<{type(obj).__name__}>"
    return {"type": "text", "title": title, "text": r if len(r) <= 20000 else r[:20000] + "…"}


def tampilkan(obj, judul: str | None = None):
    """Tampilkan objek (DataFrame, list, dict, dll.) di panel Hasil sebagai tabel/visual."""
    disp = _state["displays"]
    if len(disp) >= MAX_DISPLAYS:
        return None
    item = _to_display(obj, judul)
    if item is not None:
        disp.append(item)
    return None


# ---------------------------------------------------------------------------
# Grafik matplotlib
# ---------------------------------------------------------------------------

def _capture_figures() -> list:
    _state["figures_meta"] = []
    if "matplotlib.pyplot" not in sys.modules:
        return []
    import matplotlib.pyplot as plt

    images = []
    meta = []
    for num in plt.get_fignums():
        fig = plt.figure(num)
        info = {"axes": []}
        title_parts = []
        try:
            if fig._suptitle is not None and fig._suptitle.get_text():
                title_parts.append(fig._suptitle.get_text())
        except Exception:
            pass
        for ax in fig.get_axes():
            try:
                bars = sum(len(c) for c in ax.containers) if ax.containers else 0
                ax_info = {
                    "title": ax.get_title() or ax.get_title(loc="left") or ax.get_title(loc="right"),
                    "xlabel": ax.get_xlabel(),
                    "ylabel": ax.get_ylabel(),
                    "lines": len(ax.get_lines()),
                    "bars": bars,
                    "patches": len(ax.patches),
                    "collections": len(ax.collections),
                    "images": len(ax.images),
                    "legend": ax.get_legend() is not None,
                    "xticklabels": [t.get_text() for t in ax.get_xticklabels()][:50],
                    "yticklabels": [t.get_text() for t in ax.get_yticklabels()][:50],
                    "texts": len(ax.texts),
                    "text_values": [t.get_text() for t in ax.texts][:100],
                }
            except Exception:
                ax_info = {"title": "", "xlabel": "", "ylabel": "", "lines": 0, "bars": 0,
                           "patches": 0, "collections": 0, "images": 0, "legend": False, "xticklabels": [],
                           "yticklabels": [], "texts": 0, "text_values": []}
            info["axes"].append(ax_info)
            if ax_info["title"]:
                title_parts.append(ax_info["title"])
        buf = io.BytesIO()
        try:
            fig.savefig(buf, format="png")
            b64 = base64.b64encode(buf.getvalue()).decode("ascii")
            title = " · ".join(dict.fromkeys(title_parts)) or f"Grafik {len(images) + 1}"
            images.append({"type": "image", "title": title, "data": f"data:image/png;base64,{b64}"})
            info["title"] = title
            meta.append(info)
        except Exception as e:  # noqa: BLE001
            images.append({"type": "text", "title": "Grafik gagal dirender", "text": f"{type(e).__name__}: {e}"})
        finally:
            buf.close()
    plt.close("all")
    _state["figures_meta"] = meta
    return images


# ---------------------------------------------------------------------------
# Penjelajah variabel
# ---------------------------------------------------------------------------

_HIDDEN_NAMES = {"tampilkan", "display", "input", "__builtins__", "__name__", "__doc__"}


def _describe_value(name, v) -> dict | None:
    import types as _t

    if name.startswith("_") or name in _HIDDEN_NAMES:
        return None
    if isinstance(v, _t.ModuleType):
        return None
    mod = type(v).__module__
    d = {"name": name, "type": type(v).__name__, "kind": "other", "summary": "", "viewable": False}
    try:
        if mod.startswith("pandas"):
            import pandas as pd
            if isinstance(v, pd.DataFrame):
                d.update(kind="dataframe", summary=f"{_fmt_int(v.shape[0])} baris × {_fmt_int(v.shape[1])} kolom",
                         viewable=True, detail=", ".join(map(str, list(v.columns)[:8])) + ("…" if v.shape[1] > 8 else ""))
                return d
            if isinstance(v, pd.Series):
                d.update(kind="series", summary=f"{_fmt_int(len(v))} nilai · dtype {v.dtype}", viewable=True,
                         detail=str(v.name) if v.name is not None else "")
                return d
        if mod.startswith("numpy"):
            import numpy as np
            if isinstance(v, np.ndarray):
                d.update(kind="ndarray", summary=f"array {'×'.join(map(str, v.shape))} · {v.dtype}",
                         viewable=v.ndim in (1, 2))
                return d
            if isinstance(v, np.generic):
                d.update(kind="number", summary=_short_repr(v.item() if hasattr(v, 'item') else v))
                return d
        if mod.startswith("sklearn"):
            fitted = any(k.endswith("_") and not k.startswith("_") for k in getattr(v, "__dict__", {}))
            d.update(kind="model", summary=("sudah dilatih (fit)" if fitted else "belum dilatih") + f" · {_short_repr(v, 60)}")
            return d
        if mod.startswith("matplotlib"):
            d.update(kind="figure", summary="objek grafik matplotlib")
            return d
        if isinstance(v, bool):
            d.update(kind="bool", summary=str(v))
        elif isinstance(v, (int, float, complex, decimal.Decimal)):
            d.update(kind="number", summary=_short_repr(v))
        elif isinstance(v, str):
            d.update(kind="str", summary=_short_repr(v, 80) + (f" · {len(v)} karakter" if len(v) > 40 else ""))
        elif isinstance(v, (list, tuple, set, frozenset)):
            d.update(kind="list", summary=f"{len(v)} elemen · {_short_repr(v, 60)}", viewable=isinstance(v, (list, tuple)))
        elif isinstance(v, dict):
            d.update(kind="dict", summary=f"{len(v)} kunci · {_short_repr(v, 60)}", viewable=True)
        elif isinstance(v, (_t.FunctionType, _t.BuiltinFunctionType)):
            try:
                import inspect
                sig = str(inspect.signature(v))
            except Exception:
                sig = "(...)"
            d.update(kind="function", type="fungsi", summary=f"{name}{sig}")
        elif isinstance(v, type):
            d.update(kind="class", type="kelas", summary=f"class {v.__name__}")
        else:
            d.update(summary=_short_repr(v, 80))
    except Exception:
        d.update(summary=f"<{type(v).__name__}>")
    return d


def _describe_variables(ns: dict) -> list:
    out = []
    for name, v in list(ns.items()):
        if len(out) >= 60:
            break
        try:
            desc = _describe_value(name, v)
        except Exception:
            desc = None
        if desc:
            out.append(desc)
    return out


def get_variable(name: str) -> str:
    ns = _state.get("ns") or {}
    if name not in ns:
        return _dumps({"ok": False, "error": f"Variabel '{name}' tidak ditemukan (jalankan ulang kode)."})
    item = _to_display(ns[name], name)
    if item is None:
        item = {"type": "text", "title": name, "text": _short_repr(ns[name], 2000)}
    return _dumps({"ok": True, "item": item})


# ---------------------------------------------------------------------------
# Pesan error yang ramah pemula (Bahasa Indonesia)
# ---------------------------------------------------------------------------

_PY_ERRORS = {
    "NameError": ("Nama belum dikenal",
                  "Python tidak menemukan nama tersebut. Biasanya karena variabel/fungsi belum dibuat, "
                  "salah ketik (huruf besar-kecil dibedakan), atau lupa menjalankan baris yang membuatnya."),
    "SyntaxError": ("Penulisan kode belum sesuai aturan Python",
                    "Periksa tanda kurung/kutip yang belum ditutup, titik dua (:) setelah if/for/def, "
                    "atau operator yang tertinggal."),
    "IndentationError": ("Indentasi (spasi di awal baris) tidak tepat",
                         "Blok kode setelah if/for/def harus menjorok ke dalam dengan jumlah spasi yang konsisten (biasanya 4 spasi)."),
    "TabError": ("Campuran tab dan spasi",
                 "Gunakan salah satu saja untuk indentasi — sebaiknya 4 spasi."),
    "TypeError": ("Tipe data tidak cocok",
                  "Operasi atau fungsi menerima tipe data yang tidak sesuai, misalnya menjumlahkan teks dengan angka "
                  "atau memanggil fungsi dengan jumlah argumen yang salah."),
    "ValueError": ("Nilai tidak valid",
                   "Tipe datanya benar, tetapi nilainya tidak bisa diproses (misalnya mengubah 'abc' menjadi angka)."),
    "KeyError": ("Kunci/kolom tidak ditemukan",
                 "Nama kunci dictionary atau nama kolom DataFrame tidak ada. Cek ejaan dan huruf besar-kecilnya — "
                 "lihat daftar kolom di tab Data."),
    "IndexError": ("Indeks di luar jangkauan",
                   "Posisi yang diminta melebihi jumlah elemen. Ingat: indeks Python dimulai dari 0."),
    "AttributeError": ("Atribut/metode tidak ada",
                       "Objek tersebut tidak memiliki atribut atau metode dengan nama itu. Cek ejaan dan tipe objeknya."),
    "ZeroDivisionError": ("Pembagian dengan nol", "Ada pembagian dengan angka 0. Pastikan pembaginya tidak nol."),
    "ModuleNotFoundError": ("Library tidak tersedia",
                            "Library ini tidak tersedia di sandbox browser. Gunakan pandas, numpy, matplotlib, "
                            "scikit-learn, scipy, statsmodels, atau duckdb."),
    "ImportError": ("Gagal mengimpor", "Nama yang diimpor tidak ada di library tersebut. Cek ejaan nama fungsi/kelasnya."),
    "FileNotFoundError": ("File tidak ditemukan", "Nama file salah atau dataset belum tersedia. Lihat nama file di tab Data."),
    "UnboundLocalError": ("Variabel lokal dipakai sebelum diisi",
                          "Di dalam fungsi, variabel dipakai sebelum diberi nilai."),
    "RecursionError": ("Rekursi terlalu dalam", "Fungsi memanggil dirinya sendiri tanpa berhenti."),
    "MemoryError": ("Memori tidak cukup", "Data atau perhitungan terlalu besar untuk browser."),
    "OverflowError": ("Angka terlalu besar", "Hasil perhitungan melampaui batas angka yang bisa disimpan."),
    "AssertionError": ("Assertion gagal", "Pernyataan assert di kode bernilai False."),
    "KeyboardInterrupt": ("Eksekusi dihentikan", "Kode dihentikan (tombol Stop atau batas waktu). "
                          "Periksa apakah ada perulangan yang tidak pernah berhenti."),
    "EOFError": ("input() tidak didukung", "Sandbox tidak bisa menerima input keyboard. Tulis nilainya langsung di kode."),
}


def _translate_suggestion(msg: str) -> str:
    return re.sub(r"Did you mean:? ", "Mungkin maksudmu: ", msg)


def _user_frames(tb) -> list:
    frames = []
    for fs in traceback.extract_tb(tb):
        if fs.filename == USER_FILENAME:
            frames.append(fs)
    return frames


def _format_py_error(exc: BaseException, code: str) -> dict:
    etype = type(exc).__name__
    lines = code.splitlines()
    line = None
    col = None
    if isinstance(exc, SyntaxError) and (exc.filename in (USER_FILENAME, None, "<exec>", "<unknown>")):
        line = exc.lineno
        col = exc.offset
        message = exc.msg or str(exc)
    else:
        frames = _user_frames(exc.__traceback__)
        if frames:
            line = frames[-1].lineno
        message = str(exc)
        if etype == "KeyError":
            message = f"{message} tidak ditemukan"
    title, explanation = _PY_ERRORS.get(etype, ("Terjadi error", "Baca pesan error di bawah untuk mengetahui penyebabnya."))
    suggestion = None
    m = re.search(r"Did you mean:? '?([\w.]+)'?\??", str(exc))
    if m:
        suggestion = f"Mungkin maksudmu `{m.group(1)}`?"
    if etype == "ModuleNotFoundError":
        name = getattr(exc, "name", None) or ""
        if name:
            message = f"Library '{name}' tidak tersedia"
            if name in ("seaborn",):
                suggestion = "Gunakan matplotlib (import matplotlib.pyplot as plt) untuk membuat grafik."
            elif name in ("sklearn",):
                suggestion = None
    if etype == "KeyboardInterrupt":
        message = "Eksekusi dihentikan sebelum selesai."
    tb_lines = []
    if not isinstance(exc, SyntaxError):
        for fs in _user_frames(exc.__traceback__):
            src = lines[fs.lineno - 1].strip() if fs.lineno and fs.lineno - 1 < len(lines) else ""
            where = f" (di dalam {fs.name})" if fs.name not in ("<module>",) else ""
            tb_lines.append(f"Baris {fs.lineno}{where}: {src}")
    line_text = lines[line - 1] if line and 0 < line <= len(lines) else None
    return {
        "type": etype,
        "title": title,
        "message": _translate_suggestion(message),
        "explanation": explanation,
        "suggestion": suggestion,
        "line": line,
        "column": col,
        "lineText": line_text,
        "trace": tb_lines,
        "language": "python",
    }


# ---------------------------------------------------------------------------
# Eksekusi kode Python peserta
# ---------------------------------------------------------------------------

def _no_input(*_args, **_kwargs):
    raise EOFError("input() tidak didukung di sandbox. Isi nilainya langsung di kode, misalnya: nama = 'Budi'")


def _new_namespace() -> dict:
    return {
        "__name__": "__main__",
        "__builtins__": builtins,
        "tampilkan": tampilkan,
        "display": tampilkan,
        "input": _no_input,
    }


def _exec_user_code(code: str, ns: dict):
    """Jalankan kode; kembalikan nilai ekspresi terakhir (seperti Jupyter)."""
    try:
        from pyodide.code import eval_code  # type: ignore
        return eval_code(code, ns, return_mode="last_expr", quiet_trailing_semicolon=True, filename=USER_FILENAME)
    except ImportError:
        pass
    # Fallback (CPython biasa): eksekusi manual
    tree = ast.parse(code, filename=USER_FILENAME)
    last_expr = None
    if tree.body and isinstance(tree.body[-1], ast.Expr) and not code.rstrip().endswith(";"):
        last_expr = ast.Expression(tree.body.pop().value)
    exec(compile(tree, USER_FILENAME, "exec"), ns)
    if last_expr is not None:
        return eval(compile(last_expr, USER_FILENAME, "eval"), ns)
    return None


def run_python(code: str) -> str:
    t0 = time.perf_counter()
    ns = _new_namespace()
    _state["ns"] = ns
    _state["code"] = code
    _state["displays"] = []
    _ensure_pandas_options()
    sink: list = []
    out = _TeeStream("stdout", sink)
    err_stream = _TeeStream("stderr", [])
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = out, err_stream
    error = None
    last_value_display = None
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            value = _exec_user_code(code, ns)
        if value is not None:
            item = _to_display(value, None)
            if item is not None and len(_state["displays"]) < MAX_DISPLAYS:
                item["auto"] = True
                last_value_display = item
    except SystemExit:
        pass
    except BaseException as e:  # noqa: BLE001  (termasuk KeyboardInterrupt)
        error = _format_py_error(e, code)
    finally:
        try:
            out.flush()
            err_stream.flush()
        except Exception:
            pass
        sys.stdout, sys.stderr = old_out, old_err
    _ensure_pandas_options()
    displays = list(_state["displays"])
    if last_value_display is not None:
        displays.append(last_value_display)
    figures = []
    try:
        figures = _capture_figures()
    except Exception:
        figures = []
    stdout_text = "".join(sink)
    _state["stdout"] = stdout_text
    variables = _describe_variables(ns)
    return _dumps({
        "ok": error is None,
        "language": "python",
        "error": error,
        "displays": displays,
        "figures": figures,
        "variables": variables,
        "stdoutChars": len(stdout_text),
        "durationMs": round((time.perf_counter() - t0) * 1000),
    })


# ---------------------------------------------------------------------------
# SQL (DuckDB di dalam Pyodide)
# ---------------------------------------------------------------------------

class HasilSQL:
    """Hasil satu kueri SELECT. Dipakai di checker SQL sebagai `hasil` dan `kunci`."""

    def __init__(self, kolom, tipe, baris, kueri=""):
        self.kolom = list(kolom)
        self.tipe = list(tipe)
        self.baris = [tuple(r) for r in baris]
        self.kueri = kueri

    # alias Inggris
    @property
    def columns(self):
        return self.kolom

    @property
    def rows(self):
        return self.baris

    @property
    def jumlah_baris(self):
        return len(self.baris)

    def __len__(self):
        return len(self.baris)

    def kolom_ke(self, nama):
        low = [c.lower() for c in self.kolom]
        i = low.index(str(nama).lower())
        return [r[i] for r in self.baris]

    def sebagai_dict(self):
        return [dict(zip(self.kolom, r)) for r in self.baris]

    def df(self):
        import pandas as pd
        return pd.DataFrame(self.baris, columns=self.kolom)

    def __repr__(self):
        return f"HasilSQL({len(self.baris)} baris × {len(self.kolom)} kolom: {', '.join(self.kolom)})"


def _strip_sql_comments(sql: str) -> str:
    out = []
    i, n = 0, len(sql)
    while i < n:
        ch = sql[i]
        if sql.startswith("--", i):
            j = sql.find("\n", i)
            if j == -1:
                break
            i = j
            continue
        if sql.startswith("/*", i):
            j = sql.find("*/", i + 2)
            i = n if j == -1 else j + 2
            out.append(" ")
            continue
        if ch in ("'", '"'):
            q = ch
            j = i + 1
            while j < n:
                if sql[j] == q:
                    if j + 1 < n and sql[j + 1] == q:
                        j += 2
                        continue
                    break
                j += 1
            out.append(sql[i:j + 1])
            i = j + 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def _blank_strings(sql: str) -> str:
    return re.sub(r"'(?:[^']|'')*'", "''", sql)


def _split_statements(code: str) -> list:
    """Pisahkan kode SQL menjadi pernyataan beserta nomor baris awalnya."""
    stmts = []
    buf = []
    start_line = 1
    line = 1
    i, n = 0, len(code)
    in_str = None
    has_content = False
    while i < n:
        ch = code[i]
        if in_str:
            buf.append(ch)
            if ch == in_str:
                if i + 1 < n and code[i + 1] == in_str:
                    buf.append(code[i + 1])
                    i += 2
                    continue
                in_str = None
            if ch == "\n":
                line += 1
            i += 1
            continue
        if code.startswith("--", i):
            j = code.find("\n", i)
            if j == -1:
                j = n
            buf.append(code[i:j])
            i = j
            continue
        if code.startswith("/*", i):
            j = code.find("*/", i + 2)
            j = n if j == -1 else j + 2
            seg = code[i:j]
            line += seg.count("\n")
            buf.append(seg)
            i = j
            continue
        if ch in ("'", '"'):
            in_str = ch
            if not has_content:
                has_content = True
                start_line = line
            buf.append(ch)
            i += 1
            continue
        if ch == ";":
            text = "".join(buf)
            if _strip_sql_comments(text).strip():
                stmts.append({"sql": text.strip(), "line": start_line})
            buf = []
            has_content = False
            i += 1
            continue
        if ch == "\n":
            line += 1
        elif not ch.isspace() and not has_content:
            has_content = True
            start_line = line
        buf.append(ch)
        i += 1
    text = "".join(buf)
    if _strip_sql_comments(text).strip():
        stmts.append({"sql": text.strip(), "line": start_line})
    return stmts


def _first_code_line_offset(stmt_sql: str) -> int:
    """Berapa baris kosong/komentar di awal teks pernyataan (untuk koreksi nomor baris)."""
    offset = 0
    for ln in stmt_sql.splitlines():
        s = ln.strip()
        if not s or s.startswith("--"):
            offset += 1
            continue
        break
    return offset


_SQL_ERRORS = [
    (r"must appear in the GROUP BY clause", "Kolom belum ada di GROUP BY",
     "Saat memakai GROUP BY, setiap kolom di SELECT harus (1) ikut ditulis di GROUP BY, atau (2) dibungkus fungsi agregat "
     "seperti SUM(), COUNT(), AVG()."),
    (r"Referenced column .* not found|column .* does not exist|Column .* not found", "Kolom tidak ditemukan",
     "Nama kolom salah ketik atau tidak ada di tabel. Lihat daftar kolom di tab Data. "
     "Ingat: alias dari SELECT tidak bisa dipakai di WHERE."),
    (r"Table with name .* does not exist|Table .* does not exist", "Tabel tidak ditemukan",
     "Nama tabel salah ketik atau tidak tersedia di latihan ini. Lihat nama tabel di tab Data."),
    (r"syntax error at end of input", "Kueri belum lengkap",
     "Kueri berhenti di tengah jalan. Mungkin ada klausa yang belum dilengkapi (misalnya WHERE tanpa kondisi)."),
    (r"syntax error at or near", "Penulisan SQL keliru",
     "Ada kata kunci yang salah ketik, koma berlebih/kurang, atau urutan klausa keliru. "
     "Urutan yang benar: SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT."),
    (r"WHERE clause cannot contain aggregates|aggregate function calls cannot be nested|Aggregates cannot be present in a Group By",
     "Agregat di tempat yang salah",
     "Fungsi agregat (SUM, COUNT, AVG, ...) tidak boleh di WHERE. Untuk menyaring hasil agregat gunakan HAVING."),
    (r"Could not convert|Conversion Error|Could not cast", "Konversi tipe data gagal",
     "Nilai tidak bisa diubah ke tipe yang diminta. Cek apakah membandingkan teks dengan angka "
     "atau format tanggal sudah 'YYYY-MM-DD'."),
    (r"No function matches|No function matches the given name", "Fungsi tidak cocok",
     "Nama fungsi salah ketik atau tipe argumennya tidak sesuai (misalnya SUM pada kolom teks)."),
    (r"Ambiguous reference to column name", "Nama kolom ambigu",
     "Kolom dengan nama ini ada di lebih dari satu tabel. Tulis dengan awalan tabel/alias, misalnya p.id_pelanggan."),
    (r"Division by zero", "Pembagian dengan nol", "Ada pembagian dengan nol. Gunakan NULLIF(pembagi, 0)."),
    (r"Binder Error", "Kueri tidak bisa dipahami database", "Periksa nama kolom/tabel dan penggunaan fungsi."),
    (r"Parser Error", "Penulisan SQL keliru", "Periksa ejaan kata kunci, koma, dan tanda kurung."),
]


def _format_sql_error(exc: BaseException, stmt: dict | None, code: str) -> dict:
    raw = str(exc)
    etype = type(exc).__name__
    title, explanation = "Kueri gagal dijalankan", "Baca pesan error dari database di bawah."
    for pat, t, e in _SQL_ERRORS:
        if re.search(pat, raw, re.I):
            title, explanation = t, e
            break
    line = None
    m = re.search(r"LINE (\d+):", raw)
    if stmt is not None:
        base = stmt.get("line", 1)
        if m:
            line = base + int(m.group(1)) - 1
        else:
            line = base
    msg_first = raw.split("\n")[0]
    msg_first = re.sub(r"^(Parser|Binder|Catalog|Conversion|Invalid Input|Constraint|Syntax) Error: ", "", msg_first)
    suggestion = None
    m2 = re.search(r'Did you mean "([^"]+)"', raw)
    if m2:
        suggestion = f"Mungkin maksudmu `{m2.group(1)}`?"
    m3 = re.search(r'Candidate bindings: ([^\n]+)', raw)
    if m3 and not suggestion:
        cands = re.findall(r'"([^"]+)"', m3.group(1))
        if cands:
            suggestion = "Kolom yang mirip: " + ", ".join(f"`{c}`" for c in cands[:4])
    lines = code.splitlines()
    return {
        "type": etype,
        "title": title,
        "message": _translate_suggestion(msg_first),
        "explanation": explanation,
        "suggestion": suggestion,
        "line": line,
        "column": None,
        "lineText": lines[line - 1] if line and 0 < line <= len(lines) else None,
        "trace": [ln for ln in raw.split("\n")[1:] if ln.strip()][:6],
        "language": "sql",
    }


def _duck_base(tables: list):
    """Koneksi DuckDB berisi tabel dataset — dibuat sekali lalu dipakai ulang (cepat)."""
    import duckdb

    key = tuple(sorted(tables))
    cache = _state.setdefault("duck_cache", {})
    con = cache.get(key)
    if con is not None:
        return con
    con = duckdb.connect(database=":memory:")
    try:
        con.execute("SET threads TO 1")
    except Exception:
        pass
    for name in tables:
        fname = _state["datasets"].get(name, f"{name}.csv")
        path = fname if os.path.isabs(fname) else os.path.join(WORKDIR, fname)
        if not os.path.exists(path):
            continue
        safe = path.replace("'", "''")
        con.execute(f'CREATE TABLE "{name}" AS SELECT * FROM read_csv(\'{safe}\', header=true, auto_detect=true, sample_size=-1)')
    cache[key] = con
    return con


def _duck_connect(tables: list):
    """Koneksi baru yang terisolasi (untuk describe_tables)."""
    return _duck_base(tables)


def reset_sql_cache() -> None:
    for con in (_state.get("duck_cache") or {}).values():
        try:
            con.close()
        except Exception:
            pass
    _state["duck_cache"] = {}


def _sql_table_display(res: HasilSQL, title=None, statement_line=None) -> dict:
    kinds = [_kind_from_sql_type(t) for t in res.tipe]
    item = _records_to_table(res.kolom, res.baris, kinds=kinds, title=title, source="sql")
    item["dtypes"] = list(res.tipe)
    item["statementLine"] = statement_line
    return item


def _execute_sql(code: str, tables: list, con=None):
    """Jalankan semua pernyataan di dalam transaksi yang di-ROLLBACK di akhir,
    sehingga setiap Run mulai dari data asli (CREATE/UPDATE peserta tidak menumpuk).
    Kembalikan (con, results[HasilSQL], error, displays, jumlah_pernyataan)."""
    con = con or _duck_base(tables)
    stmts = _split_statements(code)
    results, displays, error = [], [], None
    try:
        con.execute("BEGIN TRANSACTION")
        in_tx = True
    except Exception:
        in_tx = False
    try:
        for idx, st in enumerate(stmts):
            try:
                cur = con.execute(st["sql"])
                desc = cur.description
                if desc:
                    cols = [d[0] for d in desc]
                    types = [str(d[1]) for d in desc]
                    rows = cur.fetchmany(100_000)
                    res = HasilSQL(cols, types, rows, st["sql"])
                    results.append(res)
                    title = f"Hasil kueri {len(results)}" if len(stmts) > 1 else "Hasil kueri"
                    displays.append(_sql_table_display(res, title, st["line"]))
                else:
                    displays.append({"type": "text", "title": None,
                                     "text": f"✓ Perintah ke-{idx + 1} berhasil dijalankan (tidak menghasilkan tabel)."})
            except Exception as e:  # noqa: BLE001
                error = _format_sql_error(e, st, code)
                break
    finally:
        if in_tx:
            try:
                con.execute("ROLLBACK")
            except Exception:
                # transaksi sudah ditutup oleh kode peserta (COMMIT/ROLLBACK) — buat ulang koneksi bila perlu
                pass
    return con, results, error, displays, len(stmts)


def run_sql(code: str, tables_json: str = "[]") -> str:
    t0 = time.perf_counter()
    tables = json.loads(tables_json or "[]")
    _state["code"] = code
    _state["sql_results"] = []
    _state["ns"] = {}
    error = None
    displays = []
    n_stmts = 0
    try:
        con, results, error, displays, n_stmts = _execute_sql(code, tables)
        _state["sql_con"] = con
        _state["sql_results"] = results
    except Exception as e:  # noqa: BLE001  (gagal memuat tabel, dsb.)
        error = _format_sql_error(e, None, code)
    if n_stmts == 0 and error is None:
        displays = [{"type": "text", "title": None,
                     "text": "Belum ada perintah SQL. Tulis kueri (misalnya SELECT * FROM nama_tabel) lalu tekan Jalankan."}]
    return _dumps({
        "ok": error is None,
        "language": "sql",
        "error": error,
        "displays": displays,
        "figures": [],
        "variables": [],
        "statements": n_stmts,
        "durationMs": round((time.perf_counter() - t0) * 1000),
    })


def describe_tables(tables_json: str) -> str:
    """Skema tabel (nama kolom + tipe DuckDB) untuk ditampilkan di tab Data."""
    tables = json.loads(tables_json or "[]")
    out = {}
    try:
        con = _duck_connect(tables)
        for t in tables:
            try:
                info = con.execute(f'DESCRIBE "{t}"').fetchall()
                cnt = con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
                out[t] = {"columns": [{"name": r[0], "type": r[1]} for r in info], "rows": int(cnt)}
            except Exception as e:  # noqa: BLE001
                out[t] = {"error": str(e)}
    except Exception as e:  # noqa: BLE001
        return _dumps({"ok": False, "error": str(e)})
    return _dumps({"ok": True, "tables": out})


# ---------------------------------------------------------------------------
# Penilaian (grader)
# ---------------------------------------------------------------------------

class _StopCheck(Exception):
    pass


class _Grader:
    def __init__(self, language: str, solution_code: str, tables: list):
        self.language = language
        self.solution_code = solution_code or ""
        self.tables = tables
        self.tests: list = []
        self.final_message = None
        self.final_passed = None
        self._solution_ns = None
        self._solution_results = None

    # ---- pencatatan
    def record(self, label, passed, detail=None):
        self.tests.append({"label": str(label), "passed": bool(passed), "detail": None if passed else (detail and str(detail))})
        return bool(passed)

    # ---- API umum
    def check(self, label, kondisi, pesan=None):
        try:
            ok = bool(kondisi)
        except Exception as e:  # noqa: BLE001  (mis. ValueError dari Series ambigu)
            ok = False
            pesan = pesan or f"Kondisi tidak bisa dievaluasi: {type(e).__name__}: {e}"
        return self.record(label, ok, pesan)

    def report(self, passed, message=""):
        self.final_passed = bool(passed)
        self.final_message = str(message) if message else None

    # ---- solusi referensi
    def solution_namespace(self):
        if self._solution_ns is None:
            key = ("py", self.solution_code)
            cached = _state["solution_cache"].get(key)
            if cached is not None:
                self._solution_ns = cached
            else:
                ns = _new_namespace()
                old_out, old_err = sys.stdout, sys.stderr
                sys.stdout, sys.stderr = io.StringIO(), io.StringIO()
                saved_displays = _state["displays"]
                _state["displays"] = []
                try:
                    _exec_user_code(self.solution_code, ns)
                finally:
                    sys.stdout, sys.stderr = old_out, old_err
                    _state["displays"] = saved_displays
                    if "matplotlib.pyplot" in sys.modules:
                        import matplotlib.pyplot as plt
                        plt.close("all")
                _state["solution_cache"][key] = ns
                self._solution_ns = ns
        return self._solution_ns

    def solution_results(self):
        if self._solution_results is None:
            key = ("sql", self.solution_code, tuple(self.tables))
            cached = _state["solution_cache"].get(key)
            if cached is None:
                con, results, error, _d, _n = _execute_sql(self.solution_code, self.tables)
                if error:
                    raise RuntimeError("Solusi referensi gagal dijalankan: " + error["message"])
                cached = results
                _state["solution_cache"][key] = cached
            self._solution_results = cached
        return self._solution_results


def _values_equal(a, b, tol) -> bool:
    if a is None or _is_nan(a):
        return b is None or _is_nan(b)
    if b is None or _is_nan(b):
        return False
    num = (int, float, decimal.Decimal)
    if isinstance(a, bool) or isinstance(b, bool):
        return bool(a) == bool(b) if (isinstance(a, bool) and isinstance(b, bool)) else a == b
    try:
        import numpy as np
        if isinstance(a, np.generic):
            a = a.item()
        if isinstance(b, np.generic):
            b = b.item()
    except Exception:
        pass
    if isinstance(a, num) and isinstance(b, num):
        fa, fb = float(a), float(b)
        return abs(fa - fb) <= max(tol, tol * max(abs(fa), abs(fb)))
    if isinstance(a, (_dt.date, _dt.datetime)) or isinstance(b, (_dt.date, _dt.datetime)):
        return str(_to_jsonable(a)) == str(_to_jsonable(b))
    if isinstance(a, str) and isinstance(b, str):
        return a.strip() == b.strip()
    return a == b


def _norm_key(v):
    if v is None or _is_nan(v):
        return (0, "")
    if isinstance(v, bool):
        return (1, str(v))
    if isinstance(v, (int, float, decimal.Decimal)):
        return (2, round(float(v), 4))
    try:
        import numpy as np
        if isinstance(v, np.generic):
            return _norm_key(v.item())
    except Exception:
        pass
    return (3, str(_to_jsonable(v)).strip())


def _rows_equal(r1, r2, tol) -> bool:
    return len(r1) == len(r2) and all(_values_equal(a, b, tol) for a, b in zip(r1, r2))


def _order_by_columns(sql: str) -> list | None:
    """Ambil kolom ORDER BY tingkat teratas dari kueri solusi (untuk menangani nilai seri)."""
    s = _blank_strings(_strip_sql_comments(sql))
    depth = 0
    pos = None
    for m in re.finditer(r"\(|\)|\border\s+by\b", s, re.I):
        tok = m.group(0)
        if tok == "(":
            depth += 1
        elif tok == ")":
            depth -= 1
        elif depth == 0:
            pos = m.end()
    if pos is None:
        return None
    rest = s[pos:]
    rest = re.split(r"\blimit\b|\boffset\b|;", rest, flags=re.I)[0]
    cols = []
    for part in rest.split(","):
        p = part.strip()
        p = re.sub(r"\s+(asc|desc)\b.*$", "", p, flags=re.I)
        p = re.sub(r"\s+nulls\s+(first|last)\s*$", "", p, flags=re.I).strip()
        p = p.strip('"')
        if "." in p:
            p = p.split(".")[-1].strip('"')
        cols.append(p)
    return cols


def _has_top_level_order_by(sql: str) -> bool:
    return _order_by_columns(sql) is not None


def _compare_sql(g: _Grader, user: HasilSQL | None, expected: HasilSQL, urut=None, toleransi=1e-6,
                 cek_nama_kolom=True, solution_sql="") -> bool:
    all_ok = True
    if user is None:
        g.record("Kueri menghasilkan tabel hasil", False,
                 "Belum ada tabel hasil. Pastikan kodenya berisi perintah SELECT dan dijalankan tanpa error.")
        return False
    g.record("Kueri menghasilkan tabel hasil", True)

    u_cols = [c.lower() for c in user.kolom]
    e_cols = [c.lower() for c in expected.kolom]
    col_map = None
    if cek_nama_kolom:
        missing = [c for c in expected.kolom if c.lower() not in u_cols]
        extra = [c for c in user.kolom if c.lower() not in e_cols]
        if not missing and not extra:
            g.record(f"Kolom hasil sesuai ({', '.join(expected.kolom)})", True)
            col_map = [u_cols.index(c) for c in e_cols]
        else:
            parts = []
            if missing:
                sug = []
                for mcol in missing:
                    close = difflib.get_close_matches(mcol.lower(), [c for c in u_cols if c not in e_cols], n=1, cutoff=0.75)
                    sug.append(f"`{mcol}`" + (f" (kamu menulis `{close[0]}` — cek nama/alias AS)" if close else ""))
                parts.append("Kolom yang belum ada: " + ", ".join(sug))
            if extra:
                parts.append("Kolom yang tidak diminta: " + ", ".join(f"`{c}`" for c in extra))
            g.record(f"Kolom hasil sesuai ({', '.join(expected.kolom)})", False, ". ".join(parts) + ".")
            all_ok = False
    else:
        if len(u_cols) == len(e_cols):
            g.record(f"Jumlah kolom sesuai ({len(e_cols)})", True)
            col_map = list(range(len(e_cols)))
        else:
            g.record(f"Jumlah kolom sesuai ({len(e_cols)})", False, f"Hasilmu punya {len(u_cols)} kolom.")
            all_ok = False

    n_u, n_e = len(user.baris), len(expected.baris)
    if n_u == n_e:
        g.record(f"Jumlah baris sesuai ({_fmt_int(n_e)})", True)
    else:
        hint = " Mungkin filter WHERE/HAVING terlalu longgar atau LIMIT belum dipakai." if n_u > n_e else \
               " Mungkin filter terlalu ketat atau JOIN membuang baris."
        g.record(f"Jumlah baris sesuai ({_fmt_int(n_e)})", False, f"Hasilmu {_fmt_int(n_u)} baris, seharusnya {_fmt_int(n_e)}.{hint}")
        all_ok = False

    if col_map is None or n_u != n_e:
        return False

    u_rows = [tuple(r[i] for i in col_map) for r in user.baris]
    e_rows = list(expected.baris)

    su = sorted(u_rows, key=lambda r: tuple(_norm_key(v) for v in r))
    se = sorted(e_rows, key=lambda r: tuple(_norm_key(v) for v in r))
    values_ok = all(_rows_equal(a, b, toleransi) for a, b in zip(su, se))
    if values_ok:
        g.record("Nilai data sesuai", True)
    else:
        detail = "Isi tabel belum sama dengan hasil yang diharapkan."
        for a, b in zip(su, se):
            if not _rows_equal(a, b, toleransi):
                for ci, (x, y) in enumerate(zip(a, b)):
                    if not _values_equal(x, y, toleransi):
                        detail += f" Contoh perbedaan di kolom `{expected.kolom[ci]}`: kamu {_short_repr(_to_jsonable(x), 40)}, seharusnya {_short_repr(_to_jsonable(y), 40)}."
                        break
                break
        g.record("Nilai data sesuai", False, detail + " Lihat tab Target untuk membandingkan.")
        return False

    if urut is None:
        urut = _has_top_level_order_by(solution_sql)
    if urut:
        order_ok = all(_rows_equal(a, b, toleransi) for a, b in zip(u_rows, e_rows))
        if not order_ok:
            keys = _order_by_columns(solution_sql) or []
            key_idx = [e_cols.index(k.lower()) for k in keys if k.lower() in e_cols]
            if key_idx and len(key_idx) == len(keys):
                # Toleransi untuk nilai seri: bandingkan per blok kunci yang sama
                def block_key(r):
                    return tuple(_norm_key(r[i]) for i in key_idx)
                order_ok = [block_key(r) for r in u_rows] == [block_key(r) for r in e_rows]
        if order_ok:
            g.record("Urutan baris sesuai", True)
        else:
            keys = _order_by_columns(solution_sql) or []
            g.record("Urutan baris sesuai", False,
                     "Isi sudah benar, tetapi urutannya belum. Periksa ORDER BY" + (f" ({', '.join(keys)})" if keys else "") +
                     " dan arah ASC/DESC.")
            return False
    return all_ok


def _make_grader_api(g: _Grader, language: str, user_code: str):
    api = {}

    def check(label, kondisi, pesan=None):
        return g.check(label, kondisi, pesan)

    def report(passed=True, message=""):
        g.report(passed, message)

    def wajib_variabel(nama, tipe=None, label=None):
        ns = _state.get("ns") or {}
        tname = None
        if tipe is not None:
            tname = tipe if isinstance(tipe, str) else getattr(tipe, "__name__", str(tipe))
        lbl = label or (f"Variabel `{nama}` sudah dibuat" + (f" ({tname})" if tname else ""))
        if nama not in ns:
            close = difflib.get_close_matches(nama, [k for k in ns.keys() if not k.startswith("_")], n=1, cutoff=0.6)
            g.record(lbl, False, f"Variabel `{nama}` belum ada." + (f" Kamu membuat `{close[0]}` — salah ketik?" if close else
                                                                  " Pastikan nama variabelnya persis sama dan barisnya tidak dikomentari."))
            raise _StopCheck()
        v = ns[nama]
        if v is None or (isinstance(v, str) and v.strip() in ("", "...", "TODO")) or v is Ellipsis:
            g.record(lbl, False, f"`{nama}` masih kosong ({_short_repr(v, 20)}) — lengkapi bagian TODO di kode.")
            raise _StopCheck()
        if tipe is not None:
            ok = (type(v).__name__ == tipe) if isinstance(tipe, str) else isinstance(v, tipe)
            if not ok:
                g.record(lbl, False, f"`{nama}` bertipe {type(v).__name__}, seharusnya {tname}.")
                raise _StopCheck()
        g.record(lbl, True)
        return v

    def cek_kolom(df, kolom, label=None):
        cols = [str(c) for c in getattr(df, "columns", [])]
        missing = [c for c in kolom if c not in cols]
        lbl = label or f"Kolom {', '.join(f'`{c}`' for c in kolom)} tersedia"
        if missing:
            parts = []
            for m in missing:
                close = difflib.get_close_matches(m, cols, n=1, cutoff=0.6)
                parts.append(f"`{m}`" + (f" (ada `{close[0]}` — salah ketik?)" if close else ""))
            return g.record(lbl, False, "Belum ada: " + ", ".join(parts) + ".")
        return g.record(lbl, True)

    def cek_ukuran(df, baris=None, kolom=None, label=None):
        shape = getattr(df, "shape", None)
        if shape is None:
            return g.record(label or "Ukuran data sesuai", False, "Objek tidak punya atribut shape.")
        ok = (baris is None or shape[0] == baris) and (kolom is None or (len(shape) > 1 and shape[1] == kolom))
        target = " × ".join(x for x in [f"{baris} baris" if baris is not None else "", f"{kolom} kolom" if kolom is not None else ""] if x)
        return g.record(label or f"Ukuran data sesuai ({target})", ok,
                        f"Ukuran saat ini {shape[0]} baris × {shape[1] if len(shape) > 1 else 1} kolom.")

    def cek_tanpa_kosong(df, kolom=None, label=None):
        cols = kolom if kolom is not None else list(df.columns)
        bad = []
        for c in cols:
            if c in df.columns:
                n = int(df[c].isna().sum())
                if n:
                    bad.append(f"`{c}` ({n} kosong)")
            else:
                bad.append(f"`{c}` (kolom tidak ada)")
        lbl = label or ("Tidak ada nilai kosong" + (f" di {', '.join(f'`{c}`' for c in cols)}" if kolom is not None else ""))
        return g.record(lbl, not bad, "Masih ada nilai kosong: " + ", ".join(bad) + ". Tangani dengan fillna() atau dropna().")

    def cek_mendekati(nilai, target, toleransi=1e-6, label=None):
        try:
            fv, ft = float(nilai), float(target)
            ok = abs(fv - ft) <= toleransi
            detail = f"Nilaimu {fv:,.4f}, seharusnya sekitar {ft:,.4f} (±{toleransi})."
        except Exception as e:  # noqa: BLE001
            ok, detail = False, f"Nilai tidak bisa dibandingkan: {e}"
        return g.record(label or f"Nilai sesuai (≈ {target})", ok, detail)

    def cek_minimal(nilai, batas, nama="Metrik", label=None):
        try:
            fv = float(nilai)
            ok = fv >= batas
            detail = f"{nama} = {fv:.4f}, belum mencapai target minimal {batas}."
        except Exception as e:  # noqa: BLE001
            ok, detail = False, f"{nama} tidak bisa dibaca: {e}"
        return g.record(label or f"{nama} ≥ {batas}", ok, detail)

    def cek_output(teks, label=None):
        out = _state.get("stdout", "")
        ok = str(teks).lower() in out.lower()
        return g.record(label or f"Output mencetak \"{teks}\"", ok, f"Teks \"{teks}\" belum muncul di output konsol. Gunakan print().")

    def cek_kode(pola, label=None, regex=False, pesan=None):
        src = user_code
        if language == "sql":
            src = _strip_sql_comments(src)
        else:
            src = "\n".join(ln.split("#", 1)[0] if "#" in ln and "'" not in ln and '"' not in ln else ln
                            for ln in src.splitlines())
        ok = bool(re.search(pola, src, re.I | re.S)) if regex else (str(pola).lower() in src.lower())
        return g.record(label or f"Kode menggunakan `{pola}`", ok, pesan or f"Kodenya belum memakai `{pola}`.")

    def nilai_solusi(nama):
        ns = g.solution_namespace()
        if nama not in ns:
            raise RuntimeError(f"Solusi referensi tidak punya variabel '{nama}'.")
        return ns[nama]

    def bandingkan_variabel(nama, label=None, toleransi=1e-6, urut=True, cek_index=False, cek_tipe=True):
        ns = _state.get("ns") or {}
        lbl = label or f"Isi `{nama}` sesuai hasil yang diharapkan"
        if nama not in ns:
            g.record(lbl, False, f"Variabel `{nama}` belum ada.")
            return False
        mine = ns[nama]
        ref = nilai_solusi(nama)
        ok, detail = _compare_values(mine, ref, toleransi, urut, cek_index, cek_tipe)
        return g.record(lbl, ok, detail)

    api.update(
        check=check, cek=check, report=report, lapor=report,
        wajib_variabel=wajib_variabel, cek_kolom=cek_kolom, cek_ukuran=cek_ukuran,
        cek_tanpa_kosong=cek_tanpa_kosong, cek_mendekati=cek_mendekati, cek_minimal=cek_minimal,
        cek_output=cek_output, cek_kode=cek_kode, nilai_solusi=nilai_solusi,
        bandingkan_variabel=bandingkan_variabel,
        output=_state.get("stdout", ""), kode=user_code, grafik=list(_state.get("figures_meta", [])),
        # Alias lama (kompatibel dengan konten versi awal)
        assert_columns=lambda df, cols: cek_kolom(df, cols) or (_ for _ in ()).throw(_StopCheck()),
        assert_shape=lambda df, rows=None, cols=None: cek_ukuran(df, rows, cols),
        assert_no_nulls=lambda df, cols=None: cek_tanpa_kosong(df, cols),
        assert_close=lambda actual, expected, tol=1e-5: cek_mendekati(actual, expected, tol),
        assert_metric_above=lambda value, threshold, name="Metrik": cek_minimal(value, threshold, name),
    )

    if language == "sql":
        results = list(_state.get("sql_results") or [])
        user_last = results[-1] if results else None

        def kunci_hasil():
            sol = g.solution_results()
            return sol[-1] if sol else None

        def bandingkan_hasil(urut=None, toleransi=1e-6, cek_nama_kolom=True):
            exp = kunci_hasil()
            if exp is None:
                raise RuntimeError("Solusi referensi tidak menghasilkan tabel.")
            last_stmt = _split_statements(g.solution_code)
            sol_sql = last_stmt[-1]["sql"] if last_stmt else g.solution_code
            return _compare_sql(g, user_last, exp, urut=urut, toleransi=toleransi,
                                cek_nama_kolom=cek_nama_kolom, solution_sql=sol_sql)

        api.update(hasil=user_last, semua_hasil=results, bandingkan_hasil=bandingkan_hasil,
                   kunci=_LazyKunci(kunci_hasil), con=_state.get("sql_con"))
    return api


class _LazyKunci:
    """Hasil solusi SQL; baru dihitung saat dipakai."""

    def __init__(self, fn):
        self._fn = fn
        self._v = None

    def _get(self):
        if self._v is None:
            self._v = self._fn()
        return self._v

    def __getattr__(self, item):
        return getattr(self._get(), item)

    def __len__(self):
        return len(self._get())


def _compare_values(mine, ref, tol, ordered=True, check_index=False, check_type=True):
    """Bandingkan dua nilai Python/pandas/numpy. Kembalikan (ok, pesan)."""
    tm, tr = type(mine).__name__, type(ref).__name__
    mod_r = type(ref).__module__
    try:
        if mod_r.startswith("pandas"):
            import pandas as pd
            if isinstance(ref, pd.DataFrame):
                if not isinstance(mine, pd.DataFrame):
                    return False, f"Seharusnya DataFrame, tetapi bertipe {tm}."
                missing = [c for c in ref.columns if c not in mine.columns]
                if missing:
                    return False, f"Kolom belum ada: {', '.join(map(str, missing))}."
                extra = [c for c in mine.columns if c not in ref.columns]
                if extra:
                    return False, f"Ada kolom yang tidak diminta: {', '.join(map(str, extra))}."
                if len(mine) != len(ref):
                    return False, f"Jumlah baris {len(mine)}, seharusnya {len(ref)}."
                a = mine[list(ref.columns)]
                b = ref
                if not check_index:
                    a = a.reset_index(drop=True)
                    b = b.reset_index(drop=True)
                if not ordered:
                    a = a.sort_values(list(a.columns)).reset_index(drop=True)
                    b = b.sort_values(list(b.columns)).reset_index(drop=True)
                for c in b.columns:
                    for i, (x, y) in enumerate(zip(a[c].tolist(), b[c].tolist())):
                        if not _values_equal(x, y, tol):
                            where = f"baris ke-{i + 1}"
                            if ordered:
                                sorted_same = sorted(map(_norm_key, a[c].tolist())) == sorted(map(_norm_key, b[c].tolist()))
                                if sorted_same:
                                    return False, f"Isi kolom `{c}` sudah benar tetapi urutannya belum (cek sort_values)."
                            return False, f"Nilai kolom `{c}` {where}: {_short_repr(_to_jsonable(x), 30)}, seharusnya {_short_repr(_to_jsonable(y), 30)}."
                return True, None
            if isinstance(ref, pd.Series):
                if not isinstance(mine, pd.Series):
                    return False, f"Seharusnya Series, tetapi bertipe {tm}."
                if len(mine) != len(ref):
                    return False, f"Jumlah nilai {len(mine)}, seharusnya {len(ref)}."
                if check_index and not ordered:
                    mi, ri = sorted(map(str, mine.index)), sorted(map(str, ref.index))
                    if mi != ri:
                        missing = [k for k in ri if k not in mi][:5]
                        return False, "Label index belum sesuai" + (f" (belum ada: {', '.join(missing)})." if missing else ".")
                    m2 = mine.copy()
                    m2.index = m2.index.map(str)
                    r2 = ref.copy()
                    r2.index = r2.index.map(str)
                    for k in r2.index:
                        if not _values_equal(m2[k], r2[k], tol):
                            return False, f"Nilai untuk `{k}`: {_short_repr(_to_jsonable(m2[k]), 30)}, seharusnya {_short_repr(_to_jsonable(r2[k]), 30)}."
                    return True, None
                if check_index and list(map(str, mine.index)) != list(map(str, ref.index)):
                    return False, "Index/urutan belum sesuai."
                xs, ys = mine.tolist(), ref.tolist()
                if not ordered:
                    xs, ys = sorted(xs, key=_norm_key), sorted(ys, key=_norm_key)
                for i, (x, y) in enumerate(zip(xs, ys)):
                    if not _values_equal(x, y, tol):
                        return False, f"Nilai ke-{i + 1}: {_short_repr(_to_jsonable(x), 30)}, seharusnya {_short_repr(_to_jsonable(y), 30)}."
                return True, None
        if mod_r.startswith("numpy"):
            import numpy as np
            if isinstance(ref, np.ndarray):
                arr = np.asarray(mine)
                if arr.shape != ref.shape:
                    return False, f"Ukuran array {arr.shape}, seharusnya {ref.shape}."
                if np.issubdtype(ref.dtype, np.number):
                    ok = bool(np.allclose(arr.astype(float), ref.astype(float), atol=tol, rtol=tol, equal_nan=True))
                else:
                    ok = arr.tolist() == ref.tolist()
                return ok, None if ok else "Isi array belum sesuai."
            if isinstance(ref, np.generic):
                ref = ref.item()
        if isinstance(ref, bool):
            return (mine == ref), None if mine == ref else f"Nilainya {mine!r}, seharusnya {ref!r}."
        if isinstance(ref, (int, float, decimal.Decimal)):
            if isinstance(mine, str):
                return False, f"Seharusnya angka, tetapi berupa teks (str) {_short_repr(mine, 30)} — hapus tanda kutipnya."
            if tm in ("bool", "bool_"):
                return False, f"Seharusnya angka, tetapi bernilai {mine} (bool)."
            try:
                ok = _values_equal(float(mine), float(ref), tol)
            except Exception:
                return False, f"Seharusnya angka, tetapi bertipe {tm}."
            return ok, None if ok else f"Nilainya {_short_repr(mine, 30)}, seharusnya {_short_repr(ref, 30)}."
        if isinstance(ref, str):
            if not isinstance(mine, str):
                return False, f"Seharusnya teks (str), tetapi bertipe {tm}."
            ok = mine.strip() == ref.strip()
            return ok, None if ok else f"Teksnya belum sama. Seharusnya: {_short_repr(ref, 60)}"
        if isinstance(ref, dict):
            if not isinstance(mine, dict):
                return False, f"Seharusnya dictionary, tetapi bertipe {tm}."
            missing = [k for k in ref if k not in mine]
            if missing:
                return False, f"Kunci belum ada: {', '.join(map(repr, missing))}."
            extra = [k for k in mine if k not in ref]
            if extra:
                return False, f"Ada kunci yang tidak diminta: {', '.join(map(repr, extra))}."
            for k in ref:
                ok, d = _compare_values(mine[k], ref[k], tol, ordered, check_index, check_type)
                if not ok:
                    return False, f"Nilai untuk kunci {k!r} belum sesuai. " + (d or "")
            return True, None
        if isinstance(ref, (list, tuple)):
            if not isinstance(mine, (list, tuple)):
                return False, f"Seharusnya list, tetapi bertipe {tm}."
            if len(mine) != len(ref):
                return False, f"Jumlah elemen {len(mine)}, seharusnya {len(ref)}."
            xs, ys = list(mine), list(ref)
            if not ordered:
                xs, ys = sorted(xs, key=_norm_key), sorted(ys, key=_norm_key)
            for i, (x, y) in enumerate(zip(xs, ys)):
                ok, d = _compare_values(x, y, tol, ordered, check_index, check_type)
                if not ok:
                    return False, f"Elemen ke-{i + 1} belum sesuai. " + (d or "")
            return True, None
    except Exception as e:  # noqa: BLE001
        return False, f"Tidak bisa membandingkan ({type(e).__name__}: {e})."
    ok = mine == ref
    return bool(ok), None if ok else f"Nilainya {_short_repr(mine, 40)}, seharusnya {_short_repr(ref, 40)}."


def run_checker(checker_code: str, language: str, solution_code: str = "", tables_json: str = "[]") -> str:
    tables = json.loads(tables_json or "[]")
    g = _Grader(language, solution_code, tables)
    user_code = _state.get("code", "")
    api = _make_grader_api(g, language, user_code)
    if language == "sql":
        ns = dict(api)
        ns["__builtins__"] = builtins
        code_to_run = checker_code if (checker_code or "").strip() else "bandingkan_hasil()"
    else:
        ns = dict(_state.get("ns") or {})
        ns.update(api)
        code_to_run = checker_code or ""
    internal_error = None
    old_out = sys.stdout
    sys.stdout = io.StringIO()
    try:
        exec(compile(code_to_run, "<checker>", "exec"), ns)
    except _StopCheck:
        pass
    except AssertionError as e:
        msg = str(e) or "Salah satu kriteria belum terpenuhi."
        g.record(msg if len(msg) < 90 else "Kriteria tambahan", False, msg)
    except NameError as e:
        name = getattr(e, "name", None)
        if name:
            g.record(f"Variabel `{name}` tersedia", False,
                     f"`{name}` belum dibuat atau salah ketik. Pastikan nama variabel sama persis dengan instruksi.")
        else:
            g.record("Variabel yang dibutuhkan tersedia", False, str(e))
    except KeyError as e:
        g.record("Kolom/kunci yang dibutuhkan tersedia", False, f"Tidak ditemukan: {e}. Cek nama kolom/kunci.")
    except Exception as e:  # noqa: BLE001
        internal_error = f"{type(e).__name__}: {e}"
        g.record("Pemeriksaan dapat dijalankan", False,
                 f"Terjadi error saat memeriksa hasilmu ({type(e).__name__}: {e}). Pastikan variabel/hasil berbentuk sesuai instruksi.")
    finally:
        sys.stdout = old_out
    tests = g.tests
    if not tests and g.final_passed is None:
        passed = internal_error is None
        tests = [{"label": "Kode berjalan tanpa error", "passed": passed, "detail": internal_error}]
    else:
        passed = all(t["passed"] for t in tests) if tests else bool(g.final_passed)
        if g.final_passed is False:
            passed = False
    n_ok = sum(1 for t in tests if t["passed"])
    if passed:
        message = g.final_message or "Semua kriteria terpenuhi. Kerja bagus!"
    else:
        first_fail = next((t for t in tests if not t["passed"]), None)
        message = (g.final_message if g.final_passed is False and g.final_message else None) or \
                  (first_fail["detail"] or first_fail["label"] if first_fail else "Belum memenuhi kriteria.")
    return _dumps({
        "passed": bool(passed),
        "message": message,
        "tests": tests,
        "passedCount": n_ok,
        "totalCount": len(tests),
        "internalError": internal_error,
    })


def expected_output(language: str, solution_code: str, tables_json: str = "[]") -> str:
    """Tabel 'Target' — hasil yang diharapkan (tanpa membuka kode solusi)."""
    tables = json.loads(tables_json or "[]")
    if language != "sql":
        return _dumps({"ok": False, "error": "Target hanya untuk SQL"})
    g = _Grader("sql", solution_code, tables)
    try:
        res = g.solution_results()
    except Exception as e:  # noqa: BLE001
        return _dumps({"ok": False, "error": str(e)})
    if not res:
        return _dumps({"ok": False, "error": "Solusi tidak menghasilkan tabel"})
    item = _sql_table_display(res[-1], "Target hasil")
    return _dumps({"ok": True, "item": item})


def clear_solution_cache() -> None:
    _state["solution_cache"] = {}
