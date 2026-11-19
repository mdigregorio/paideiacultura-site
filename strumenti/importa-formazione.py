#!/usr/bin/env python3
"""Importa i due fogli della formazione senza modificare o eseguire l'Excel.

Usa soltanto la libreria standard Python. Le note di lavoro rimangono nel
rapporto facoltativo, che va salvato fuori dalla cartella pubblica del sito.
"""

import argparse
import collections
import datetime as dt
import json
from pathlib import Path, PurePosixPath
import re
import xml.etree.ElementTree as ET
import zipfile


NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
SITE = Path(__file__).resolve().parent.parent


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def key(value):
    return clean(value).casefold()


def text_nodes(element):
    if element is None:
        return ""
    return "".join(node.text or "" for node in element.findall(".//m:t", NS))


def read_xlsx(source):
    """Read cached cell data; formulas, macros and external links are not run."""
    with zipfile.ZipFile(source) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = [text_nodes(item) for item in ET.fromstring(
                archive.read("xl/sharedStrings.xml")).findall("m:si", NS)]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        properties = workbook.find("m:workbookPr", NS)
        date1904 = properties is not None and properties.get("date1904") in {"1", "true"}
        relationships = {
            item.get("Id"): item.get("Target")
            for item in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        }
        sheets = {}
        for sheet in workbook.find("m:sheets", NS):
            target = relationships[sheet.get("{" + REL_NS + "}id")]
            member = target.lstrip("/") if target.startswith("/") else str(PurePosixPath("xl") / target)
            document = ET.fromstring(archive.read(member))
            rows = []
            for row in document.findall("m:sheetData/m:row", NS):
                cells = {}
                for cell in row.findall("m:c", NS):
                    value = cell.find("m:v", NS)
                    if cell.get("t") == "inlineStr":
                        value = text_nodes(cell.find("m:is", NS))
                    elif value is not None:
                        value = strings[int(value.text)] if cell.get("t") == "s" else value.text
                    else:
                        continue
                    if value is not None and str(value).strip():
                        cells[re.sub(r"\d", "", cell.get("r"))] = str(value)
                if cells:
                    rows.append((int(row.get("r")), cells))
            if not rows:
                continue
            headers = {column: key(value) for column, value in rows[0][1].items()}
            sheets[key(sheet.get("name"))] = [
                {"_riga": number, **{headers[column]: value for column, value in cells.items() if column in headers}}
                for number, cells in rows[1:]
            ]
        return sheets, date1904


def read_date(value, date1904):
    if not clean(value):
        return None
    value = clean(value)
    try:
        serial = float(value)
        origin = dt.date(1904, 1, 1) if date1904 else dt.date(1899, 12, 30)
        return origin + dt.timedelta(days=int(serial))
    except ValueError:
        pass
    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return dt.datetime.strptime(value, pattern).date()
        except ValueError:
            pass
    raise ValueError("Data non riconosciuta: " + value)


def note_state(note):
    note = key(note)
    if note.startswith("corso annullato") or note in {"annullata", "annullato"}:
        return "annullato"
    if "annullat" in note or "si è tenuta?" in note or "si e tenuta?" in note:
        return "da-verificare"
    return "registrato"


def iso(value):
    return value.isoformat() if value else None


def convert(source):
    sheets, date1904 = read_xlsx(source)
    for name in ("scuole", "docenti e moduli"):
        if name not in sheets:
            raise ValueError("Foglio mancante: " + name)
    report = {"fonte": str(source), "correzioni": [], "date_omesse": [], "avvertenze": [], "note_redazionali": []}
    schools, modules = [], []
    grouped = collections.defaultdict(list)
    raw_dates = {}
    for row in sheets["scuole"]:
        number = row["_riga"]
        origin = clean(row.get("id"))
        if not origin:
            raise ValueError(f"scuole, riga {number}: identificativo mancante")
        year = int(float(row["anno"]))
        if origin == "Vietri2024" and year == 2004:
            origin = "Vietri2004"
            report["correzioni"].append({"foglio": "scuole", "riga": number, "campo": "id", "prima": "Vietri2024", "dopo": origin, "motivo": "Correzione indicata dall'associazione"})
        begin, end = read_date(row.get("inizio"), date1904), read_date(row.get("fine"), date1904)
        raw_dates[number] = (begin, end)
        # Nel file fornito sei registrazioni 1999–2004 hanno conservato il
        # giorno e il mese ma sono state memorizzate con l'anno 2026.
        if begin and end and begin.year == end.year == 2026 and 1999 <= year <= 2004:
            old = [iso(begin), iso(end)]
            begin, end = begin.replace(year=year), end.replace(year=year)
            report["correzioni"].append({"foglio": "scuole", "riga": number, "campo": "inizio/fine", "prima": old, "dopo": [iso(begin), iso(end)], "motivo": "Anno del campo anno; giorno e mese conservati"})
        uncertain_dates = bool((begin and begin.year != year) or (end and end.year != year) or (begin and end and end < begin))
        if uncertain_dates:
            report["date_omesse"].append({"foglio": "scuole", "riga": number, "inizio": iso(begin), "fine": iso(end), "anno": year})
            begin = end = None
        note = clean(row.get("note"))
        state = note_state(note)
        topic = None
        period = None
        multisite = note.casefold() == "edizione su due sedi"
        if state == "registrato" and note and not multisite:
            if re.match(r"^\d", note):
                period = note
            else:
                topic = note
        school = {
            "id": f"scuola-{number:03d}", "origine": origin,
            "anno": year, "luogo": clean(row.get("luogo")),
            "categoria": clean(row.get("categoria")),
            "edizione": int(float(row["edizione"])) if clean(row.get("edizione")) else None,
            "struttura": clean(row.get("struttura ospite")) or None,
            "argomento": topic, "stato": state,
            "inizio": iso(begin), "fine": iso(end), "moduli": [],
        }
        if period:
            school["periodo"] = period
        if multisite:
            school["sedi_multiple"] = True
        if uncertain_dates:
            school["date_da_verificare"] = True
        if state != "registrato":
            report["note_redazionali"].append({"foglio": "scuole", "riga": number, "nota": note, "stato": state})
        schools.append(school)
        grouped[origin].append((school, raw_dates[number]))

    for row in sheets["docenti e moduli"]:
        number = row["_riga"]
        origin = clean(row.get("scuola"))
        candidates = grouped.get(origin, [])
        begin, end = read_date(row.get("inizio"), date1904), read_date(row.get("fine"), date1904)
        if len(candidates) > 1:
            candidates = [candidate for candidate in candidates if candidate[1] == (begin, end)]
        if len(candidates) != 1:
            raise ValueError(f"docenti e moduli, riga {number}: collegamento alla scuola non univoco per {origin}")
        school = candidates[0][0]
        year = school["anno"]
        uncertain_dates = bool((begin and begin.year != year) or (end and end.year != year) or (begin and end and end < begin))
        if uncertain_dates:
            report["date_omesse"].append({"foglio": "docenti e moduli", "riga": number, "inizio": iso(begin), "fine": iso(end), "anno": year})
            begin = end = None
        note = clean(row.get("note"))
        state = note_state(note)
        if state == "registrato" and school["stato"] != "registrato":
            state = school["stato"]
        teachers = []
        for position in range(1, 4):
            teacher = {field: clean(row.get(f"docente {position} {field}")) for field in ("nome", "cognome", "affiliazione")}
            if teacher["nome"] or teacher["cognome"]:
                teachers.append(teacher)
                if not teacher["nome"] or not teacher["cognome"]:
                    report["avvertenze"].append({"foglio": "docenti e moduli", "riga": number, "tipo": "docente_con_nome_incompleto", "docente": teacher})
        title = clean(row.get("titolo")) or None
        if not title:
            report["avvertenze"].append({"foglio": "docenti e moduli", "riga": number, "tipo": "titolo_assente"})
        module = {
            "id": f"modulo-{number:03d}", "scuola": school["id"], "anno": year,
            "titolo": title, "opzione": clean(row.get("settimana/opzione")) or None,
            "docenti": teachers, "inizio": iso(begin), "fine": iso(end),
            "programma": str(row.get("programma", "")).strip() or None,
            "stato": state,
        }
        if uncertain_dates:
            module["date_da_verificare"] = True
        if note.casefold() == "extraprogramma":
            module["extraprogramma"] = True
        if note:
            report["note_redazionali"].append({"foglio": "docenti e moduli", "riga": number, "nota": note, "stato": state})
        school["moduli"].append(module["id"])
        modules.append(module)
    result = {"versione": 1, "scuole": schools, "moduli": modules}
    validate(result)
    report["riepilogo"] = {
        "scuole": len(schools), "moduli": len(modules),
        "correzioni": len(report["correzioni"]), "date_omesse": len(report["date_omesse"]),
        "stati_scuole": dict(collections.Counter(item["stato"] for item in schools)),
        "stati_moduli": dict(collections.Counter(item["stato"] for item in modules)),
        "chiavi_ripetute_conservate": {origin: len(items) for origin, items in grouped.items() if len(items) > 1},
        "programmi_estesi": sum(bool(item["programma"]) for item in modules),
    }
    return result, report


def validate(data):
    schools = {item["id"]: item for item in data["scuole"]}
    modules = {item["id"]: item for item in data["moduli"]}
    if len(schools) != len(data["scuole"]) or len(modules) != len(data["moduli"]):
        raise ValueError("Identificativi pubblici duplicati")
    linked = []
    for school in schools.values():
        for module_id in school["moduli"]:
            if module_id not in modules or modules[module_id]["scuola"] != school["id"]:
                raise ValueError("Collegamento scuola/modulo incoerente: " + module_id)
            linked.append(module_id)
    if len(linked) != len(modules) or set(linked) != set(modules):
        raise ValueError("Un modulo non è collegato esattamente a una scuola")
    for item in [*schools.values(), *modules.values()]:
        if item["stato"] not in {"registrato", "annullato", "da-verificare"}:
            raise ValueError("Stato sconosciuto")
        if item["inizio"] and item["fine"] and item["fine"] < item["inizio"]:
            raise ValueError("Intervallo di date invertito")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("excel", type=Path, help="Excel originale, che non viene modificato")
    parser.add_argument("--output", type=Path, default=SITE / "contenuti" / "catalogo-formazione.json")
    parser.add_argument("--report", type=Path, help="Rapporto privato, da salvare fuori dal repository pubblico")
    args = parser.parse_args()
    if args.output.suffix.casefold() != ".json":
        parser.error("Il file pubblico di destinazione deve avere estensione .json")
    if args.output.resolve() == args.excel.resolve():
        parser.error("La destinazione non può sovrascrivere l'Excel originale")
    if args.report and (args.report.suffix.casefold() != ".json" or args.report.resolve() in {args.excel.resolve(), args.output.resolve()}):
        parser.error("Usare un file .json distinto per il rapporto")
    if args.report and args.report.resolve().is_relative_to(SITE):
        parser.error("Il rapporto contiene note redazionali: salvarlo fuori dal repository del sito")
    data, report = convert(args.excel.resolve())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["riepilogo"], ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
