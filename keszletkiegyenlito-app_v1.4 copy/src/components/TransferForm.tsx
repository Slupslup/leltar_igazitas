// src/components/TransferForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useStore, Warehouse, Product } from "@/lib/store";

const TransferForm: React.FC = () => {
  const {
    products,
    warehouses,
    executeTransfer,
    isLoading,
    error,
    setError,
    fetchProducts,
  } = useStore();

  const [fromWarehouse, setFromWarehouse] = useState<Warehouse | "">("");
  const [toWarehouse, setToWarehouse] = useState<Warehouse | "">("");
  const [selectedProduct, setSelectedProduct] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">("");

  // Fetch products if not already loaded (e.g., on direct navigation or refresh)
  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [products, fetchProducts]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null); // Clear previous errors

    if (
      !fromWarehouse ||
      !toWarehouse ||
      !selectedProduct ||
      quantity === "" ||
      quantity <= 0
    ) {
      setError(
        "Minden mező kitöltése kötelező, és a mennyiségnek pozitívnak kell lennie (0-nál nagyobb)."
      );
      return;
    }

    if (fromWarehouse === toWarehouse) {
      setError("A kiindulási és cél raktár nem lehet ugyanaz.");
      return;
    }

    // Optional: Check if source warehouse has enough theoretical stock (requires fetching specific stock item)
    // This adds complexity, might be better handled server-side or skipped based on requirements.

    try {
      await executeTransfer({
        from_wh: fromWarehouse,
        to_wh: toWarehouse,
        product_id: selectedProduct,
        qty: quantity,
      });
      // Reset form on successful transfer
      setFromWarehouse("");
      setToWarehouse("");
      setSelectedProduct("");
      setQuantity("");
    } catch (err: any) {
      // Error is already set within executeTransfer
      console.error("Transfer failed in component:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="p-3 text-sm text-red-700 bg-red-100 rounded-lg"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        {/* From Warehouse */}
        <div>
          <label
            htmlFor="from-warehouse"
            className="block mb-1 text-sm font-medium text-gray-900"
          >
            Honnan:
          </label>
          <select
            id="from-warehouse"
            value={fromWarehouse}
            onChange={(e) => setFromWarehouse(e.target.value as Warehouse | "")}
            required
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            <option value="">Válasszon raktárat...</option>
            {warehouses.map((wh) => (
              <option key={wh} value={wh}>
                {wh}
              </option>
            ))}
          </select>
        </div>

        {/* To Warehouse */}
        <div>
          <label
            htmlFor="to-warehouse"
            className="block mb-1 text-sm font-medium text-gray-900"
          >
            Hová:
          </label>
          <select
            id="to-warehouse"
            value={toWarehouse}
            onChange={(e) => setToWarehouse(e.target.value as Warehouse | "")}
            required
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            <option value="">Válasszon raktárat...</option>
            {warehouses.map((wh) => (
              <option key={wh} value={wh}>
                {wh}
              </option>
            ))}
          </select>
        </div>

        {/* Product */}
        <div className="lg:col-span-2">
          <label
            htmlFor="product-select"
            className="block mb-1 text-sm font-medium text-gray-900"
          >
            Termék:
          </label>
          <select
            id="product-select"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(Number(e.target.value))}
            required
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            <option value="">Válasszon terméket...</option>
            {products
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label
            htmlFor="quantity"
            className="block mb-1 text-sm font-medium text-gray-900"
          >
            Mennyiség:
          </label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) =>
              setQuantity(e.target.value === "" ? "" : Number(e.target.value))
            }
            required
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 disabled:opacity-50 disabled:cursor-wait"
        >
          {isLoading ? "Átvezetés..." : "Átvezetés Indítása"}
        </button>
      </div>
    </form>
  );
};

export default TransferForm;
