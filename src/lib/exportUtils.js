/**
 * Export utilities for Excel and PDF
 * Uses browser-native features - no extra dependencies needed
 */

/**
 * Export data to CSV (opens as Excel)
 */
export function exportToCSV(data, filename, columns) {
  if (!data || data.length === 0) return;

  const cols = columns || Object.keys(data[0]);
  const header = cols.map(c => (typeof c === 'object' ? c.label : c));
  const keys = cols.map(c => (typeof c === 'object' ? c.key : c));

  const rows = data.map(row =>
    keys.map(key => {
      const val = row[key];
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val).replace(/,/g, ';'); // escape commas
    })
  );

  const csvContent = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to HTML table (printer-friendly PDF via print dialog)
 */
export function exportToPDF(data, filename, columns, title) {
  if (!data || data.length === 0) return;

  const cols = columns || Object.keys(data[0]).map(k => ({ key: k, label: k }));
  const now = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });

  const headerRow = cols.map(c => `<th style="background:#2D5016;color:white;padding:8px 12px;text-align:left;font-size:11px;white-space:nowrap">${c.label}</th>`).join('');
  
  const bodyRows = data.map((row, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#f5f1e8';
    const cells = cols.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'boolean') val = val ? 'Ya' : 'Tidak';
      if (typeof val === 'object') val = JSON.stringify(val);
      return `<td style="padding:6px 12px;font-size:10px;border-bottom:1px solid #e5e1d8">${val}</td>`;
    }).join('');
    return `<tr style="background:${bg}">${cells}</tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title || filename}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    h1 { color: #2D5016; font-size: 16px; margin-bottom: 4px; }
    .meta { color: #6B7568; font-size: 11px; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>🐢 Duta Tortoise — ${title || filename}</h1>
  <p class="meta">Diekspor: ${now} · Total: ${data.length} data</p>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) alert('Pop-up diblokir. Izinkan pop-up untuk export PDF.');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}