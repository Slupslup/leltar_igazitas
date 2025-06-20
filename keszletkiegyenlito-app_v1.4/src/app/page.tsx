// src/app/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import CsvUpload from "@/components/CsvUpload";
import UnifiedCsvUpload from "@/components/UnifiedCsvUpload";
import InventoryGrid from "@/components/InventoryGrid";
import TransferForm from "@/components/TransferForm";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const {
    isLoading,
    error,
    selectedMonth,
    setSelectedMonth,
    fetchStockData,
    fetchProducts,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'unified' | 'separate'>('unified');

  // Fetch initial data on mount
  useEffect(() => {
    fetchProducts(); // Fetch products once
  }, [fetchProducts]);

  useEffect(() => {
    if (selectedMonth) {
      fetchStockData(selectedMonth);
    }
  }, [selectedMonth, fetchStockData]);

  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(event.target.value);
  };

  // Get current month in YYYY-MM format for the input default
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
  };

  // Add a function to delete all stock data for the selected month
  const handleDeleteMonth = async () => {
    if (!selectedMonth) return;
    if (!window.confirm(`Biztosan törölni szeretné az összes készletadatot a(z) ${selectedMonth} hónapra?`)) return;
    const monthStart = `${selectedMonth}-01`;
    try {
      await supabase.from("stock_snapshots").delete().eq("month", monthStart);
      await fetchStockData(selectedMonth);
      alert(`A(z) ${selectedMonth} hónap összes készletadata törölve.`);
    } catch (err) {
      alert("Hiba történt a törlés során.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 md:p-8 lg:p-12 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Készletkiegyenlítő Alkalmazás
      </h1>

      {error && (
        <div
          className="w-full max-w-6xl p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg"
          role="alert"
        >
          <span className="font-medium">Hiba!</span> {error}
        </div>
      )}

      {isLoading && (
        <div
          className="w-full max-w-6xl p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg"
          role="status"
        >
          Adatok betöltése...
        </div>
      )}

      {/* Month Selector and Upload */}
      <div className="w-full max-w-6xl mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Hónap és Adatfeltöltés
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-4 items-center">
            <div className="flex-grow">
              <label
                htmlFor="month-select"
                className="block mb-2 text-sm font-medium text-gray-900"
              >
                Válasszon hónapot:
              </label>
              <input
                type="month"
                id="month-select"
                value={selectedMonth}
                onChange={handleMonthChange}
                max={getCurrentMonth()} // Prevent selecting future months
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              />
            </div>
            <button
              onClick={handleDeleteMonth}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Teszt: Hónap adatainak törlése
            </button>
          </div>

          {/* Upload Tabs */}
          <div className="mt-4">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('unified')}
                  className={`w-1/2 py-2 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'unified'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Egységes CSV Feltöltés
                </button>
                <button
                  onClick={() => setActiveTab('separate')}
                  className={`w-1/2 py-2 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'separate'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Külön CSV Feltöltés
                </button>
              </nav>
            </div>
            <div className="mt-4">
              {activeTab === 'unified' ? <UnifiedCsvUpload /> : <CsvUpload />}
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="w-full max-w-6xl mb-8 p-6 bg-white rounded-lg shadow overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          1️⃣ Készletek listázása ({selectedMonth})
        </h2>
        <InventoryGrid />
      </div>

      {/* Transfer Form */}
      <div className="w-full max-w-6xl mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          2️⃣ Készlet Átvezetés
        </h2>
        <TransferForm />
      </div>
    </main>
  );
}
