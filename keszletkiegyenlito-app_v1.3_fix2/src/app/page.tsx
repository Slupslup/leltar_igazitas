// src/app/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Draggable from "react-draggable"; // <-- Import Draggable
import { useStore } from "@/lib/store";
import CsvUpload from "@/components/CsvUpload";
import InventoryGrid from "@/components/InventoryGrid";
import TransferForm from "@/components/TransferForm";

export default function Home() {
  const {
    isLoading,
    error,
    selectedMonth,
    setSelectedMonth,
    fetchStockData,
    fetchProducts,
  } = useStore();

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
        <div className="flex flex-col md:flex-row md:items-end gap-4">
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
          <CsvUpload />
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="w-full max-w-6xl mb-8 p-6 bg-white rounded-lg shadow overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          1️⃣ Készletek listázása ({selectedMonth}){" "}
          <a
            href="#transfer-module"
            className="ml-4 text-sm text-blue-600 hover:underline"
          >
            (Ugrás az átvezetéshez)
          </a>
        </h2>
        <InventoryGrid />
      </div>

      {/* Draggable Manual Transfer */}
      <Draggable handle=".drag-handle">
        <div className="absolute top-40 right-10 z-50 bg-white shadow-xl rounded-lg border border-gray-300 w-96 cursor-default">
          {" "}
          {/* Adjusted position, added shadow, border, width */}
          <div className="drag-handle cursor-move bg-gray-100 p-2 rounded-t-lg border-b border-gray-200 text-center">
            <h2 className="text-lg font-semibold text-gray-700">
              {" "}
              {/* Adjusted heading size */}
              2️⃣ Manuális átadás (Mozgatható)
            </h2>
          </div>
          <div className="p-4">
            {" "}
            {/* Padding for the form content */}
            <TransferForm />
          </div>
        </div>
      </Draggable>
    </main>
  );
}
