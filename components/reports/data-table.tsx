/** Tampilan tabel pendamping grafik: nilai tetap terjangkau tanpa hover maupun warna. */
export function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted underline-offset-2 hover:underline">Lihat sebagai tabel</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border text-muted">
              {head.map((h, i) => (
                <th key={h} scope="col" className={`py-1.5 pr-4 font-medium ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])} className="border-b border-border last:border-b-0">
                {row.map((cell, i) => (
                  <td key={i} className={`py-1.5 pr-4 ${i > 0 ? "text-right tabular-nums" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
