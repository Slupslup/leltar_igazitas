import React, { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { format } from "date-fns";

const TransferHistory: React.FC = () => {
  const {
    transfers,
    fetchTransfers,
    selectedMonth,
    products,
    isLoading,
    undoTransfer,
    fetchProducts,
    exportTransfers,
    importTransfers,
    error,
  } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [products.length, fetchProducts]);

  useEffect(() => {
    if (selectedMonth) {
      fetchTransfers(selectedMonth);
    }
  }, [selectedMonth, fetchTransfers]);

  const handleExport = async () => {
    const csv = await exportTransfers();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transfers_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importTransfers(file);
      e.target.value = "";
    }
  };

  return (
    <div className="w-full overflow-auto mb-8 bg-white border border-gray-200 shadow-md sm:rounded-lg">
      <h2 className="text-xl font-semibold mb-4 text-gray-700 p-6 pb-0 flex items-center justify-between">
        <span>3️⃣ Havi Átvezetések</span>
        <span className="flex gap-2">
          <button
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            onClick={handleExport}
            disabled={isLoading}
          >
            Export CSV
          </button>
          <button
            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            onClick={handleImport}
            disabled={isLoading}
          >
            Import CSV
          </button>
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </span>
      </h2>
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg mb-2" role="alert">
          {error}
        </div>
      )}
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-20">
          <tr>
            <th className="py-3 px-3 font-semibold border-b">Időpont</th>
            <th className="py-3 px-3 font-semibold border-b">Termék</th>
            <th className="py-3 px-3 font-semibold border-b">Honnan</th>
            <th className="py-3 px-3 font-semibold border-b">Hová</th>
            <th className="py-3 px-3 font-semibold border-b text-right">Mennyiség</th>
            <th className="py-3 px-3 font-semibold border-b">Műveletek</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((log) => (
            <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
              <td className="py-2 px-3 whitespace-nowrap">{log.ts ? format(new Date(log.ts), "yyyy.MM.dd") : "-"}</td>
              <td className="py-2 px-3">{products.find((p) => p.id === log.product_id)?.name || log.product_id}</td>
              <td className="py-2 px-3">{log.from_wh}</td>
              <td className="py-2 px-3">{log.to_wh}</td>
              <td className="py-2 px-3 text-right">{log.qty}</td>
              <td className="py-2 px-3">
                <button
                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  onClick={() => log.id && undoTransfer(log.id)}
                  disabled={isLoading}
                >
                  Visszavonás
                </button>
              </td>
            </tr>
          ))}
          {transfers.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted-foreground py-4">
                Nincsenek átvezetések ebben a hónapban.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TransferHistory; 