"""Convertit le tableur de préparation (Indonesie_base_voyage.xlsx) en src/data/base.json.

Usage : python3 scripts/import-base.py chemin/vers/Indonesie_base_voyage.xlsx

Le script ne garde que ce qui sert aux fiches du site et applique les règles de style :
apostrophes droites, pas de tirets longs, pas de renvois [Sxx], pas de formules de méthode.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

# Présentations réécrites à la main quand le texte du tableur parle de la méthode ou des sources plutôt que du lieu.
PRESENTATIONS = {
    "R04": "Deux secteurs de Kalimantan sont retenus : la forêt et les rivières de Tanjung Puting, et les îles de Derawan et Maratua. Le premier se découvre en bateau, avec des marches d'observation. Le second se prête aux sorties en mer. Leurs accès sont différents : ce sont deux séjours possibles, à comparer.",
    "R07": "À Raja Ampat, le choix du logement détermine une bonne partie du séjour : récif accessible à proximité, exposition au vent, transferts et confort. Un séjour dans une seule base et une succession d'îles ne demandent pas le même budget ni les mêmes traversées. Les homestays incluent souvent les repas, mais leur équipement varie.",
    "R10": "Sumba se découvre entre villages, tissage ikat, collines et littoral. L'ouest et les environs de Waingapu donnent accès à des sites différents. Les collines de Wairinding sont généralement dorées de juillet à octobre. Le parcours dépendra aussi du véhicule et des logements disponibles hors offres de luxe.",
    "R11": "Seuls Sumbawa Besar et l'île de Moyo sont documentés pour l'instant. La cascade de Mata Jitu et le littoral de Moyo y sont les principales possibilités. Les autres secteurs de l'île restent à étudier.",
    "E08": "Labuan Bajo est la base de départ pour les excursions dans le parc de Komodo. Elles associent observation des dragons, îles et panoramas. Une journée en mer et une croisière avec nuit à bord sont deux formules à comparer séparément.",
    "E09": "Ruteng permet de prolonger la découverte de Flores dans le Manggarai. Les villages et les paysages agricoles complètent les îles autour de Labuan Bajo. Le trajet par la route est long et fait partie du voyage.",
    "E10": "Wae Rebo est un village de montagne connu pour ses maisons coniques. L'accès comprend une approche routière et une marche. Le parcours et les conditions de nuit sur place sont à confirmer : le confort n'est pas celui d'un hôtel.",
    "E11": "À Jakarta, Kota Tua permet d'aborder l'histoire de Batavia et de visiter des musées. Glodok ajoute la découverte d'un autre quartier. Sur un séjour court, mieux vaut regrouper les visites par quartier.",
    "E15": "Pour faire une excursion sur le volcan Bromo, il faut dormir à Malang. L'excursion se fait souvent de nuit : départ vers minuit, retour en fin de matinée. Il faut prévoir du repos ensuite.",
    "E16": "Tumpak Sewu peut se découvrir depuis un point de vue ou par une descente vers la cascade. Le terrain de la descente est mouillé et glissant : elle n'est pas adaptée à tout le monde.",
    "E17": "Surabaya est une étape urbaine à l'est de Java, desservie par le train et l'avion. On y vient surtout pour la ville et sa cuisine. Les musées et quartiers à visiter restent à choisir.",
    "E18": "Tanjung Puting se rejoint depuis Pangkalan Bun puis Kumai. La navigation sur les rivières et les marches d'observation permettent d'aborder la forêt et ses orangs-outans. Pour une nuit à bord, vérifier les couchages, les sanitaires et les repas.",
    "E19": "Derawan et Maratua sont des bases insulaires pour découvrir les récifs et les habitats de tortues. On y accède par Berau, puis par la route et le bateau. Les excursions vers d'autres îles se chiffrent séparément, et l'accès à Kakaban est à confirmer.",
    "E21": "Tetebatu se découvre à pied entre rizières et abords du Rinjani. On y trouve aussi la cascade de Sarang Walet et des activités autour de la vie du village. Il est possible de composer une journée de marche sans prévoir une ascension du volcan.",
    "E24": "Banda Neira se visite pour les forts Belgica et Nassau et l'histoire de la muscade. On peut aussi y faire des sorties en mer. En août, l'accès et la navigation sont le premier point à résoudre avant de réserver un parcours serré.",
    "E26": "Morotai et les îles de Dodola offrent une possibilité de séjour littoral dans les Moluques du Nord, entre plages et sorties vers les îles. Les correspondances et les horaires pour août 2027 restent à établir.",
    "E30": "Manado donne accès à Bunaken par bateau. On y pratique le snorkeling sans certification de plongée. Le récif accessible, les sorties proposées et le niveau de nage attendu sont à préciser avec l'hébergement ou l'opérateur.",
    "E32": "Bukit Lawang se rejoint depuis Medan. Des sorties guidées permettent de découvrir la forêt sur une journée, sans nuit de trek. Une coopérative locale propose une sortie à la journée avec guide, permis et repas. Il reste à choisir un parcours adapté au terrain et à sa condition physique.",
    "E34": "Bukittinggi permet de découvrir les hauts plateaux de l'ouest de Sumatra et la culture minangkabau. Le canyon de Sianok et la ville en sont les principaux points d'intérêt. Cette étape se prépare depuis Padang et ne s'ajoute pas au nord de Sumatra comme un court détour.",
    "E36": "Waingapu donne accès à l'est de Sumba, aux paysages de Wairinding et au tissage ikat. Les collines changent d'aspect selon la saison. En août, elles sont plutôt dorées que vertes.",
    "E37": "Depuis Sumbawa Besar, une liaison en bateau permet de rejoindre Moyo. On y va pour la cascade de Mata Jitu et le littoral. L'organisation dépend du bateau, des déplacements sur l'île et du logement.",
    "E38": "Kupang est une arrivée possible à Timor occidental et un point de correspondance pour Alor. Une étape en ville permet de découvrir ce secteur avant la liaison suivante.",
}


def clean(value):
    if value is None:
        return ""
    text = str(value).strip()
    text = text.replace("’", "'").replace("‘", "'").replace("“", "« ").replace("”", " »")
    text = re.sub(r"\s*\[S\d+\]", "", text)
    # « Demi-journée — proposition », « Journée maximum — cible » : on garde la durée seule.
    text = re.sub(r"\s+—\s+(proposition|cible|format à comparer)\b", "", text)
    text = re.sub(r"\s+—\s+point de prise de vue", "", text)
    text = text.replace(" — ", " : ").replace("—", "-")
    text = text.replace("≠", "différent du").replace(" selon source", "").replace(" selon fiche", "").replace("  ", " ")
    return "" if text == "À documenter" else text


def number(value):
    if value is None or value == "":
        return None
    return int(value) if float(value) == int(value) else float(value)


def rows(sheet):
    it = sheet.iter_rows(values_only=True)
    header = None
    for row in it:  # l'en-tête est la première ligne qui commence par « ID … »
        if row[0] and str(row[0]).startswith("ID "):
            header = [clean(h) for h in row]
            break
    for row in it:
        if row[0] is None or not re.match(r"^[A-Z]\d+$", str(row[0])):
            continue
        yield dict(zip(header, row))


def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    photos = {}
    for r in rows(wb["Médias"]):
        photos[r["ID photo"]] = {
            "src": r["URL image"],
            "alt": clean(r["Texte alternatif"]),
            "author": clean(r["Auteur"]),
            "license": clean(r["Licence"]),
            "licenseUrl": r["Lien licence"],
            "page": r["Page source"],
        }

    regions = []
    slug_by_name = {}
    for r in rows(wb["Régions"]):
        slug_by_name[r["Région"]] = r["Slug site"]
        regions.append(
            {
                "id": r["Slug site"],
                "name": clean(r["Région"]),
                "themes": clean(r["Expériences documentées"]),
                "text": PRESENTATIONS.get(r["ID région"]) or clean(r["Présentation de la fiche"]),
                "august": clean(r["Août : état de connaissance"]),
                "access": clean(r["Accès"]),
                "transport": clean(r["Déplacements"]),
                "strengths": clean(r["Atouts documentés"]),
                "limits": clean(r["Contraintes / points à vérifier"]),
                "daysMin": number(r["Jours min proposés"]),
                "daysMax": number(r["Jours max proposés"]),
                "photo": photos.get(r["ID photo"]),
                "reviews": [],
            }
        )
    region_by_id = {r["id"]: r for r in regions}

    places = []
    place_by_code = {}
    for r in rows(wb["Étapes"]):
        place = {
            "id": r["Slug site"],
            "region": slug_by_name[r["Région"]],
            "name": clean(r["Étape"]),
            "themes": clean(r["Thèmes"]),
            "text": PRESENTATIONS.get(r["ID étape"]) or clean(r["Présentation de la fiche"]),
            "see": clean(r["À découvrir"]),
            "access": clean(r["Accès"]),
            "effort": clean(r["Effort"]),
            "daysMin": number(r["Jours min proposés"]),
            "daysMax": number(r["Jours max proposés"]),
            "note": clean(r["Limites / vérifications"]),
            "lat": round(float(r["Latitude repère"]), 4),
            "lon": round(float(r["Longitude repère"]), 4),
            "photo": photos.get(r["ID photo"]),
            "activities": [],
            "prices": [],
        }
        places.append(place)
        place_by_code[r["ID étape"]] = place

    for r in rows(wb["Activités"]):
        place_by_code[r["ID étape"]]["activities"].append(
            {
                "name": clean(r["Activité"]),
                "what": clean(r["Contenu"]),
                "duration": clean(r["Durée : source ou proposition"]),
                "level": clean(r["Accessibilité"]),
                "conditions": clean(r["Conditions"]),
            }
        )

    for r in rows(wb["Prix"]):
        if r["Montant source"] is None or not r["ID étape"]:
            continue
        place_by_code[r["ID étape"]]["prices"].append(
            {
                "label": clean(r["Prestation"]),
                "kind": clean(r["Poste"]),
                "amount": number(r["Montant source"]),
                "currency": r["Devise"],
                "unit": clean(r["Unité source"]),
                "includes": clean(r["Inclus"]),
                "excludes": clean(r["Exclus / inconnus"]),
            }
        )

    for r in rows(wb["Avis voyageurs"]):
        region_by_id[slug_by_name[r["Région"]]]["reviews"].append(
            {"zone": clean(r["Zone"]), "context": clean(r["Contexte / date"]), "liked": clean(r["Appréciation rapportée"]), "caveat": clean(r["Réserve / limite"])}
        )

    out = Path(__file__).resolve().parent.parent / "src" / "data" / "base.json"
    out.write_text(json.dumps({"regions": regions, "places": places}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(regions)} régions, {len(places)} étapes, {sum(len(p['activities']) for p in places)} activités → {out}")


if __name__ == "__main__":
    main(sys.argv[1])
