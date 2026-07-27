/**
 * Helper utility to export any array of records into a clean downloadable CSV file
 * Compatible with Microsoft Excel, Google Sheets, and Apple Numbers.
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: { key: keyof T; label: string }[]
): void {
  if (!data || data.length === 0) return;

  const cols = headers || (Object.keys(data[0]) as (keyof T)[]).map((k) => ({ key: k, label: String(k) }));
  
  const headerRow = cols.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(',');

  const bodyRows = data.map((item) =>
    cols
      .map((c) => {
        const val = item[c.key];
        if (val === null || val === undefined) return '""';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\n'); // Add BOM for Excel UTF-8 recognition
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
