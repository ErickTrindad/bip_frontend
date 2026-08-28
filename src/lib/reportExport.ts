/**
 * Utilitários para exportação de dados (CSV e Impressão/PDF)
 */

export function exportToCsv<T extends object>(
  filename: string,
  rows: T[],
  columns: { header: string; key: keyof T | ((row: T) => unknown) }[]
) {
  if (!rows || rows.length === 0) {
    alert('Nenhum dado disponível para exportação.');
    return;
  }

  const separator = ';';
  const headerRow = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(separator);

  const dataRows = rows.map((row) => {
    return columns
      .map((col) => {
        let value: unknown = typeof col.key === 'function' ? col.key(row) : (row as Record<string, unknown>)[col.key as string];
        if (value === null || value === undefined) {
          value = '';
        } else if (typeof value === 'number') {
          value = value.toString().replace('.', ',');
        } else {
          value = `"${String(value).replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(separator);
  });

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printReport(title: string, contentHtml: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Por favor, permita pop-ups para imprimir o relatório.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>${title} - bip</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #171717;
            padding: 24px;
            font-size: 12px;
          }
          h1 { font-size: 20px; margin-bottom: 4px; color: #EA580C; }
          .subtitle { color: #737373; margin-bottom: 20px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #E5E5E5; padding: 6px 10px; text-align: left; }
          th { background-color: #F5F5F5; font-weight: 600; color: #404040; }
          tr:nth-child(even) { background-color: #FAFAFA; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="subtitle">Gerado em ${new Date().toLocaleString('pt-BR')} • bip Gestão Inteligente</div>
        ${contentHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
