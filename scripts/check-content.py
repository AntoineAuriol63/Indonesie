"""Contrôle d'un fichier de contenu des fiches : format, longueurs, tics d'écriture, photos.

Usage : python3 scripts/check-content.py src/data/content/java.json
"""
import json
import re
import sys
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request

TYPES = {"Culture", "Nature", "Mer", "Randonnée", "Ville", "Cuisine", "Faune", "Détente"}
BANNED = [
    "permet de", "permettent de", "offre ", "offrent ", "se découvre", "se prête", "constitue", "incontournable", "niché", "joyau",
    "véritable", "authentique", "immersion", "dépaysement", "couper le souffle", "riche patrimoine", "tradition et modernité",
    "invite à", "ravira", "que vous soyez", "pas seulement", "ne pas manquer", "base urbaine", "point de chute", "à vérifier",
    "à confirmer", "à qualifier", "selon les sources", "source consultée", "il convient", "il est important", "en somme", "en conclusion",
]
BAD_CHARS = {"’": "apostrophe courbe", "‘": "apostrophe courbe", "—": "tiret long", "–": "tiret demi-cadratin", "**": "gras", "“": "guillemets anglais", "”": "guillemets anglais", "!": "point d'exclamation"}
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
FREE = re.compile(r"^(CC BY|CC0|Public domain|PD|Attribution|CC-BY|No restrictions|GFDL|FAL|Copyrighted free use|OGL|KOGL|GODL)", re.I)

errors = []
warnings = []


def words(text):
    return len(re.findall(r"\w+", text))


def check_text(where, text):
    if not isinstance(text, str) or not text.strip():
        errors.append(f"{where} : texte vide")
        return
    low = text.lower()
    for b in BANNED:
        if b in low:
            errors.append(f"{where} : formule interdite « {b.strip()} »")
    for c, name in BAD_CHARS.items():
        if c in text:
            errors.append(f"{where} : {name}")
    if EMOJI.search(text):
        errors.append(f"{where} : emoji")


def commons_info(files):
    info = {}
    for i in range(0, len(files), 40):
        chunk = files[i : i + 40]
        url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(
            {"action": "query", "titles": "|".join("File:" + f for f in chunk), "prop": "imageinfo", "iiprop": "size|extmetadata", "iiextmetadatafilter": "LicenseShortName", "format": "json"}
        )
        req = urllib.request.Request(url, headers={"User-Agent": "content-check/1.0"})
        data = None
        for attempt in range(8):  # Commons limite le débit : on réessaie en espaçant
            try:
                data = json.load(urllib.request.urlopen(req, timeout=40))
                break
            except urllib.error.HTTPError as e:
                if e.code != 429:
                    raise
                time.sleep(10 * (attempt + 1))
        if data is None:
            print("Commons refuse les requêtes pour l'instant (trop de requêtes) : relance le contrôle dans une minute.")
            sys.exit(2)
        norm = {n["to"]: n["from"] for n in data["query"].get("normalized", [])}
        for page in data["query"]["pages"].values():
            title = norm.get(page["title"], page["title"])[5:]
            info[title] = page
            info[page["title"][5:]] = page
    return info


def main(path):
    data = json.load(open(path, encoding="utf-8"))
    base = json.load(open(Path(__file__).resolve().parent.parent / "src" / "data" / "base.json", encoding="utf-8"))
    place_ids = {p["id"] for p in base["places"]} | {"sanur"}
    region_ids = {r["id"] for r in base["regions"]}

    for rid, r in data.get("regions", {}).items():
        if rid not in region_ids:
            errors.append(f"région inconnue : {rid}")
        for key, lo, hi in (("intro", 45, 100), ("august", 6, 45), ("access", 6, 50)):
            check_text(f"région {rid}.{key}", r.get(key))
            n = words(r.get(key) or "")
            if not lo <= n <= hi:
                errors.append(f"région {rid}.{key} : {n} mots (attendu {lo} à {hi})")

    files = []
    for pid, p in data.get("places", {}).items():
        if pid not in place_ids:
            errors.append(f"étape inconnue : {pid}")
        intro = p.get("intro")
        if not isinstance(intro, list) or not 1 <= len(intro) <= 2:
            errors.append(f"{pid}.intro : tableau de 1 ou 2 paragraphes attendu")
            intro = []
        for i, para in enumerate(intro):
            check_text(f"{pid}.intro[{i}]", para)
        n = sum(words(x) for x in intro)
        if not 55 <= n <= 125:
            errors.append(f"{pid}.intro : {n} mots (attendu 60 à 110)")
        todo = p.get("todo") or []
        if len(todo) < 4:
            errors.append(f"{pid}.todo : {len(todo)} entrées (au moins 4)")
        for i, t in enumerate(todo):
            where = f"{pid}.todo[{i}]"
            check_text(where + ".name", t.get("name"))
            check_text(where + ".text", t.get("text"))
            if t.get("type") not in TYPES:
                errors.append(f"{where}.type : « {t.get('type')} » non autorisé")
            if not 14 <= words(t.get("text") or "") <= 60:
                errors.append(f"{where}.text : {words(t.get('text') or '')} mots (attendu 20 à 50)")
            if t.get("time"):
                check_text(where + ".time", t["time"])
            price = t.get("price")
            if price is not None:
                if not isinstance(price, dict) or not {"amount", "currency", "what"} <= set(price):
                    errors.append(f"{where}.price : format attendu {{amount, currency, what}}")
                else:
                    check_text(where + ".price.what", price["what"])
        check_text(f"{pid}.access", p.get("access"))
        for i, tip in enumerate(p.get("tips") or []):
            check_text(f"{pid}.tips[{i}]", tip)
        photos = p.get("photos") or []
        if not 4 <= len(photos) <= 6:
            errors.append(f"{pid}.photos : {len(photos)} photos (attendu 4 à 6)")
        for i, ph in enumerate(photos):
            where = f"{pid}.photos[{i}]"
            # Une photo vient soit de Wikimedia Commons (« file »), soit d'une autre source libre (« url » directe + « source »).
            if ph.get("url"):
                if not ph["url"].startswith("https://") or not ph.get("source"):
                    errors.append(f"{where} : une photo hors Commons demande une « url » en https et une « source » (site et licence)")
            else:
                for key in ("file", "author", "license", "licenseUrl"):
                    if not ph.get(key):
                        errors.append(f"{where}.{key} manquant")
            if not ph.get("caption"):
                errors.append(f"{where}.caption manquant")
            cap = ph.get("caption") or ""
            check_text(where + ".caption", cap)
            if not 2 <= words(cap) <= 9 or cap.endswith("."):
                errors.append(f"{where}.caption : 3 à 8 mots, sans point final (« {cap} »)")
            if ph.get("file", "").startswith("File:"):
                errors.append(f"{where}.file : retirer le préfixe File:")
            if not ph.get("url"):
                files.append((where, ph.get("file", "")))

    info = commons_info(sorted({f for _, f in files if f}))
    for where, f in files:
        page = info.get(f) or info.get(f.replace("_", " "))
        if not page or "imageinfo" not in page:
            errors.append(f"{where} : fichier introuvable sur Commons (« {f} »)")
            continue
        ii = page["imageinfo"][0]
        lic = ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value", "")
        if not FREE.match(lic):
            errors.append(f"{where} : licence non reconnue comme libre (« {lic} »)")
        if ii.get("width", 0) < 1000:
            warnings.append(f"{where} : image de {ii.get('width')} px de large")
        if ii.get("height", 0) > ii.get("width", 0) * 1.1:
            warnings.append(f"{where} : format portrait")

    for w in warnings:
        print("AVERTISSEMENT", w)
    for e in errors:
        print("ERREUR", e)
    print(f"{len(data.get('places', {}))} étapes, {len(data.get('regions', {}))} régions, {len(files)} photos : {len(errors)} erreur(s), {len(warnings)} avertissement(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main(sys.argv[1])
