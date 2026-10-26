"""Minimal stdlib reader for the first sheet of an .xlsx file (CDC tables use shared strings, no formulas we need)."""
import re, zipfile
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def _col(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def rows(path):
    """Return the first sheet as a list of rows (lists of strings, '' for empty cells)."""
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    out = []
    for r in sheet.iter("{%s}row" % NS["m"]):
        cells = {}
        for c in r.findall("m:c", NS):
            v = c.find("m:v", NS)
            if c.get("t") == "inlineStr":
                text = "".join(t.text or "" for t in c.iter("{%s}t" % NS["m"]))
            elif v is None:
                text = ""
            elif c.get("t") == "s":
                text = shared[int(v.text)]
            else:
                text = v.text
            cells[_col(c.get("r"))] = text.strip()
        out.append([cells.get(i, "") for i in range(max(cells) + 1)] if cells else [])
    return out
