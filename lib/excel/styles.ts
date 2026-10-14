import type { Worksheet } from "exceljs";

export function styleHeaderRow(sheet: Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F2A43" }, // dark navy
  };
  header.alignment = { vertical: "middle" };
  header.commit();
}

export function autoFitColumns(sheet: Worksheet, minWidth = 10, maxWidth = 50) {
  sheet.columns.forEach((column) => {
    let max = minWidth;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const length = cell.value ? String(cell.value).length : 0;
      if (length > max) max = Math.min(length + 2, maxWidth);
    });
    column.width = max;
  });
}
