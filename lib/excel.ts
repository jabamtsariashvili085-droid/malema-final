// Excel (CSV) import/export utility
// Uses CSV format which opens natively in Excel, Google Sheets, etc.

export interface ExcelColumn {
  header: string;
  key: string;
}

/**
 * Export data as CSV file that opens in Excel
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExcelColumn[],
  filename: string
) {
  // BOM for UTF-8 so Excel reads Georgian characters correctly
  const BOM = "\uFEFF";

  const headerRow = columns.map((col) => escapeCSV(col.header)).join(",");

  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        return escapeCSV(value != null ? String(value) : "");
      })
      .join(",")
  );

  const csvContent = BOM + [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Parse CSV file and return array of objects
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Remove BOM if present
  let headerLine = lines[0];
  if (headerLine.charCodeAt(0) === 0xfeff) {
    headerLine = headerLine.slice(1);
  }

  const headers = parseCSVLine(headerLine);
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === ""))
      continue;

    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header.trim()] = (values[idx] || "").trim();
    });
    results.push(obj);
  }

  return results;
}

/**
 * Read a file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("ფაილის წაკითხვა ვერ მოხერხდა"));
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * Generate a template CSV for importing products
 */
export function downloadImportTemplate() {
  const BOM = "\uFEFF";
  const headers = [
    "პროდუქციის სახელი",
    "კატეგორია",
    "შესყიდვის ფასი",
    "გაყიდვის ფასი",
    "რაოდენობა",
    "კლიენტი",
  ];
  const exampleRow = [
    "მაგალითი პროდუქტი",
    "ელექტრონიკა",
    "100",
    "150",
    "10",
    "მომწოდებელი",
  ];
  const csvContent =
    BOM + headers.join(",") + "\n" + exampleRow.join(",") + "\n";
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, "შესყიდვების_შაბლონი.csv");
}

// Helpers

function escapeCSV(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
