// src/components/InventoryGrid.tsx
"use client";

import React from "react";
import { useStore, StockData, Warehouse } from "@/lib/store";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

const columnHelper = createColumnHelper<StockData>();

const InventoryGrid: React.FC = () => {
  const { stockData, warehouses, isLoading } = useStore();

  const columns = React.useMemo(
    () => [
      columnHelper.accessor("productName", {
        header: () => <span className="text-left">Termék Név</span>,
        cell: (info) => (
          <div className="font-medium text-gray-900 py-2 px-3 text-left whitespace-nowrap">
            {info.getValue()}
          </div>
        ),
        footer: (info) => info.column.id,
        size: 250, // Adjust size as needed
      }),
      ...warehouses.map((wh: Warehouse) =>
        columnHelper.accessor((row) => row.warehouseData[wh], {
          id: wh,
          header: () => <span className="text-center block">{wh}</span>,
          cell: (info) => {
            const data = info.getValue();
            if (!data) {
              return (
                <div className="py-2 px-3 text-center text-gray-400">-</div>
              );
            }
            const cellClass = data.highlight ? "text-red-600" : "text-gray-700";
            return (
              <div
                className={`${cellClass} py-2 px-3 text-xs text-center leading-tight`}
              >
                <div>E: {Number(data.theoretical).toLocaleString('hu-HU', { maximumFractionDigits: 2 })}</div>
                <div>T: {Number(data.actual).toLocaleString('hu-HU', { maximumFractionDigits: 2 })}</div>
                <div className="font-semibold">K: {Number(data.difference).toLocaleString('hu-HU', { maximumFractionDigits: 2 })}</div>
              </div>
            );
          },
          footer: (info) => info.column.id,
          size: 100, // Adjust size for warehouse columns
        })
      ),
    ],
    [warehouses]
  );

  const table = useReactTable({
    data: stockData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange", // Enable column resizing
  });

  if (isLoading && stockData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        Készletadatok betöltése...
      </div>
    );
  }

  if (!isLoading && stockData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        Nincsenek megjeleníthető készletadatok a kiválasztott hónapra. Kérjük,
        töltsön fel CSV fájlokat.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto relative shadow-md sm:rounded-lg border border-gray-200 max-h-[60vh] overflow-y-auto">
      <table
        className="w-full text-sm text-left text-gray-500"
        style={{ minWidth: table.getTotalSize() }} // Ensure table respects column sizes
      >
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="py-3 px-3 font-semibold tracking-wider border-b border-r border-gray-200 last:border-r-0 relative sticky top-0 z-30 bg-gray-50"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  {/* Column Resizer */}
                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={`absolute top-0 right-0 h-full w-1 cursor-col-resize select-none touch-none ${
                        header.column.getIsResizing()
                          ? "bg-blue-500"
                          : "bg-gray-300 hover:bg-blue-400"
                      }`}
                      style={{ transform: `translateX(50%)` }}
                    />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="bg-white border-b hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="border-r border-gray-200 last:border-r-0 align-top"
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryGrid;
