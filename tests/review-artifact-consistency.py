"""Check review metadata across the real store, ledger, workbook and test report.

Run from any directory: python3 tests/review-artifact-consistency.py
Optional --workbook PATH checks an exported copy against the same real records.
Uses only the Python standard library; it does not modify records or workbook bytes.
"""
import argparse
import datetime as dt
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
# Ledger approvalStatus -> the contact status it implies in data/store.js.
CONTACT_STATUS = {"draft": "draft", "approved": "reviewed", "rejected": "rejected"}


def read_sheet(archive, part, strings):
    result = {}
    for cell in ET.fromstring(archive.read(part)).findall(".//s:c", NS):
        value = cell.find("s:v", NS)
        if cell.get("t") == "s":
            text = strings[int(value.text)]
        elif cell.get("t") == "inlineStr":
            text = "".join(cell.find("s:is", NS).itertext())
        else:
            text = value.text if value is not None and value.text else ""
        result[cell.get("r")] = text
    return result


def date_value(value):
    if not value:
        return ""
    if re.match(r"^\d{4}-\d{2}-\d{2}", value):
        return value[:10]
    return (dt.date(1899, 12, 30) + dt.timedelta(days=int(float(value)))).isoformat()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workbook", type=Path, default=ROOT / "docs/testing/five-organization-review.xlsx")
    args = parser.parse_args()
    ledger = json.loads((ROOT / "docs/testing/five-organization-review.json").read_text())
    body = (ROOT / "data/store.js").read_text().split("window.TFS_STORE = ", 1)[1]
    store = json.loads(body.strip().removesuffix(";"))
    report = json.loads((ROOT / "docs/testing/five-organization-test-results.json").read_text())
    expected_date = ledger["reviewDate"]
    expected_due = ledger["reviewDue"]
    assert (dt.date.fromisoformat(expected_due) - dt.date.fromisoformat(expected_date)).days == 90
    with zipfile.ZipFile(args.workbook) as archive:
        strings = ["".join(item.itertext()) for item in ET.fromstring(archive.read("xl/sharedStrings.xml"))] if "xl/sharedStrings.xml" in archive.namelist() else []
        sheet = read_sheet(archive, "xl/worksheets/sheet1.xml", strings)
        results = read_sheet(archive, "xl/worksheets/sheet2.xml", strings)
    rows = []
    for index, row in enumerate(ledger["organizations"], 2):
        org = next(item for item in store["orgs"] if item["id"] == row["id"])
        assert sheet.get(f"A{index}") == row["name"]
        assert date_value(sheet.get(f"K{index}", "")) == expected_date, f'{row["name"]}: stale workbook date'
        assert sheet.get(f"L{index}", "") == (ledger["reviewer"] or ""), f'{row["name"]}: reviewer mismatch'
        assert date_value(sheet.get(f"N{index}", "")) == expected_due, f'{row["name"]}: stale workbook expiry'
        assert sheet.get(f"O{index}", "").lower() == ledger["approvalStatus"]
        for record in org["contacts"]:
            assert record["checkedOn"] == expected_date and record["reviewDue"] == expected_due
            # RELEASE.md: the workbook says Approved while the contact says "reviewed".
            assert record["reviewedBy"] == ledger["reviewer"] and record["status"] == CONTACT_STATUS[ledger["approvalStatus"]]
        assert org["sourceReview"]["date"] == expected_date
        assert org["sourceReview"]["reviewDue"] == expected_due
        assert org["sourceReview"]["reviewer"] == ledger["reviewer"]
        assert sheet.get(f"I{index}") == row["neverAsks"]
        assert sheet.get(f"J{index}") == row["securitySource"]
        if row["id"] == "amazon":
            assert not row["phones"] and not org["officialPhones"]
            assert all(not sheet.get(f"{col}{index}", "") for col in "EFG")
        rows.append({"organization": row["name"], "K": expected_date, "L": sheet.get(f"L{index}", ""), "N": expected_due, "O": sheet[f"O{index}"]})
    expired = (dt.date.fromisoformat(expected_due) + dt.timedelta(days=1)).isoformat()
    assert expired + " is expired" in sheet.get("A13", ""), "stale expiry explanation"
    assert report["referenceDate"] == expected_date and report["expiresAfter"] == expected_due
    for index, outcome in enumerate(report["rows"], 2):
        assert results.get(f"A{index}") == outcome["organization"]
        assert results.get(f"B{index}") == outcome["state"]
        assert results.get(f"C{index}") == outcome["assessment"]
        assert date_value(results.get(f"G{index}", "")) == expected_date, "stale eligibility date"
    print(json.dumps({"passed": True, "workbook": str(args.workbook), "organizations": rows, "expiryNote": expired + " is expired", "eligibilityRows": len(report["rows"])}, indent=2))


if __name__ == "__main__":
    main()
