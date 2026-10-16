import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, Columns3 } from 'lucide-react';
import { useState } from 'react';

interface Props<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading?: boolean;
  empty?: string;
  onRowClick?: (row: T) => void;
  /** Used for the accessible table name. */
  caption: string;
}

/** Sortable, column-togglable table with a sticky header and keyboard-activatable rows. */
export function DataTable<T>({ columns, data, loading, empty = 'Nothing here', onRowClick, caption }: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [menu, setMenu] = useState(false);
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-card border border-border bg-surface">
      <div className="flex justify-end border-b border-border p-2">
        <div className="relative">
          <button
            type="button"
            className="inline-flex min-h-[36px] items-center gap-2 rounded-pill px-3 text-sm hover:bg-surface-2"
            aria-expanded={menu}
            aria-haspopup="true"
            onClick={() => setMenu((v) => !v)}
          >
            <Columns3 className="h-4 w-4" aria-hidden /> Columns
          </button>
          {menu && (
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-card border border-border bg-surface p-2 shadow-lg">
              {table.getAllLeafColumns().map((c) => (
                <label key={c.id} className="flex min-h-[32px] items-center gap-2 text-sm">
                  <input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()} />
                  {typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="max-h-[70dvh] overflow-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-surface-2">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                      className="whitespace-nowrap p-3 font-medium"
                    >
                      {h.column.getCanSort() ? (
                        <button type="button" className="inline-flex items-center gap-1" onClick={h.column.getToggleSortingHandler()}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === 'asc' && <ArrowUp className="h-3 w-3" aria-hidden />}
                          {sorted === 'desc' && <ArrowDown className="h-3 w-3" aria-hidden />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-muted" colSpan={columns.length} aria-busy="true">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted" colSpan={columns.length}>
                  {empty}
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row.original)}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(row.original);
                  }
                }}
                className={`border-t border-border ${onRowClick ? 'cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2' : ''}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
