"use client";

import React, { useRef } from "react";
import { useStore, Warehouse } from "@/lib/store";
import Papa from "papaparse";
import { supabase } from "@/lib/supabaseClient";

const UnifiedCsvUpload: React.FC = () => {
  const {
    isLoading,
    selectedMonth,
    setLoading,
    setError,
    fetchStockData,
    fetchProducts,
    products,
  } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fixed column positions for each warehouse's theoretical and actual quantities
  const WAREHOUSE_COLUMNS: { [key in Warehouse]: { theoretical: number; actual: number } } = {
    "Ital raktár": { theoretical: 12, actual: 13 },     // ITALRAKTÁR starts at 13
    "Galopp": { theoretical: 22, actual: 23 },          // Galopp starts at 23
    "Mobil1": { theoretical: 32, actual: 33 },          // Mobil1 starts at 33
    "Központi raktár": { theoretical: 42, actual: 43 }, // Központi starts at 43
    "Ügető": { theoretical: 52, actual: 53 },           // Ügető starts at 53
    "Mázsa": { theoretical: 62, actual: 63 },           // Mázsa starts at 63
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    if (!selectedMonth) {
      setError("Kérjük, válasszon ki egy hónapot a feltöltéshez.");
      return;
    }

    setLoading(true);
    setError(null);

    const file = event.target.files[0];
    const monthStart = `${selectedMonth}-01`;
    let allNewProductNames = new Set<string>();

    try {
      // Ensure products are loaded
      let currentProducts = products;
      if (currentProducts.length === 0) {
        console.log("Product state is empty, fetching products...");
        currentProducts = await fetchProducts();
        console.log(`Fetched ${currentProducts.length} products directly.`);
      }

      const productMap = new Map(
        currentProducts.map((p) => [p.name.trim().toLowerCase(), p.id])
      );
      const existingProductNamesLower = new Set(
        currentProducts.map((p) => p.name.trim().toLowerCase())
      );

      // Parse the CSV file
      const stockData: { [key in Warehouse]?: any[] } = {};
      
      await new Promise<void>((resolve, reject) => {
        Papa.parse(file, {
          delimiter: ";", // Use semicolon as delimiter
          header: false,
          skipEmptyLines: "greedy", // Skip empty rows
          encoding: "UTF-8",
          complete: (results) => {
            try {
              const rows = results.data as string[][];
              if (rows.length < 2) {
                throw new Error("A CSV fájl nem tartalmaz elegendő sort.");
              }

              // Process each row starting from index 1 (skip header)
              for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                // Check if row has enough columns for the last warehouse (Mázsa)
                if (row.length < 64) {
                  continue; // Skip rows that don't have enough columns
                }

                const productNameRaw = row[0]?.trim(); // Product name is in the first column
                if (!productNameRaw) continue;

                // Process data for each warehouse
                Object.entries(WAREHOUSE_COLUMNS).forEach(([warehouse, columns]) => {
                  const theoreticalStr = row[columns.theoretical]?.trim();
                  const actualStr = row[columns.actual]?.trim();

                  if (!theoreticalStr || !actualStr) return;

                  // Parse values and handle potential formatting issues
                  const theoretical = parseFloat(theoreticalStr.replace(/\s/g, "").replace(",", "."));
                  const actual = parseFloat(actualStr.replace(/\s/g, "").replace(",", "."));

                  if (isNaN(theoretical) || isNaN(actual)) return;

                  // Collect new product names
                  const productNameLower = productNameRaw.toLowerCase();
                  if (!productMap.has(productNameLower) && !existingProductNamesLower.has(productNameLower)) {
                    allNewProductNames.add(productNameRaw);
                  }

                  // Store the data
                  if (!stockData[warehouse as Warehouse]) {
                    stockData[warehouse as Warehouse] = [];
                  }
                  stockData[warehouse as Warehouse]?.push({
                    productName: productNameRaw,
                    warehouse: warehouse as Warehouse,
                    theoretical,
                    actual,
                    month: monthStart,
                  });
                });
              }

              // After parsing all rows and filling stockData
              const missingWarehouses: string[] = [];
              Object.entries(WAREHOUSE_COLUMNS).forEach(([warehouse, _]) => {
                if (!stockData[warehouse as Warehouse] || stockData[warehouse as Warehouse]!.length === 0) {
                  missingWarehouses.push(warehouse);
                }
              });

              if (missingWarehouses.length > 0) {
                setError(
                  `Figyelem! A következő raktárakhoz nem töltött be adatot: ${missingWarehouses.join(", ")}. Ellenőrizze a CSV szerkezetét!`
                );
                setLoading(false);
                return;
              }

              resolve();
            } catch (error: any) {
              reject(error);
            }
          },
          error: (error: any) => {
            reject(new Error(`CSV elemzési hiba: ${error.message}`));
          },
        });
      });

      // Insert new products if any
      let finalProductMap = new Map(productMap);
      if (allNewProductNames.size > 0) {
        const newProductsToInsert = Array.from(allNewProductNames).map((name) => ({ name }));
        console.log("Inserting new products:", newProductsToInsert);
        const { data: insertedProducts, error: insertError } = await supabase
          .from("products")
          .insert(newProductsToInsert)
          .select("id, name");

        if (insertError) {
          if (insertError.code === "23505") {
            console.warn(
              "Product insertion conflict (23505), likely concurrent upload. Refetching products."
            );
            await fetchProducts();
            finalProductMap = new Map(
              useStore
                .getState()
                .products.map((p) => [p.name.trim().toLowerCase(), p.id])
            );
          } else {
            throw new Error(
              `Hiba az új termékek beszúrásakor: ${insertError.message}`
            );
          }
        } else if (insertedProducts) {
          insertedProducts.forEach((p) =>
            finalProductMap.set(p.name.trim().toLowerCase(), p.id)
          );
        }
      }

      // Prepare final stock data with product IDs
      const finalStockDataToInsert: any[] = [];
      Object.entries(stockData).forEach(([warehouse, items]) => {
        items.forEach((item) => {
          const productId = finalProductMap.get(
            item.productName.trim().toLowerCase()
          );
          if (productId) {
            finalStockDataToInsert.push({
              product_id: productId,
              warehouse: item.warehouse,
              theoretical: item.theoretical,
              actual: item.actual,
              month: item.month,
            });
          }
        });
      });

      if (finalStockDataToInsert.length === 0) {
        throw new Error(
          "Nem sikerült érvényes készletadatokat kinyerni a fájlból."
        );
      }

      // Delete existing data for the month and insert new data
      const { error: deleteError } = await supabase
        .from("stock_snapshots")
        .delete()
        .eq("month", monthStart);

      if (deleteError) {
        throw new Error(
          `Hiba a korábbi adatok törlésekor (${monthStart}): ${deleteError.message}`
        );
      }

      console.log("[DEBUG] monthStart value:", monthStart);

      const { data: snapshots, error: selectError } = await supabase
        .from("stock_snapshots")
        .select("product_id, warehouse, theoretical, actual")
        .eq("month", monthStart);

      console.log("[DEBUG] Raw snapshots:", snapshots);

      if (selectError) {
        throw new Error(
          `Hiba a készletadatok lekérésekor: ${selectError.message}`
        );
      }

      const { error: insertError } = await supabase
        .from("stock_snapshots")
        .insert(finalStockDataToInsert);

      if (insertError) {
        throw new Error(
          `Hiba az új készletadatok beszúrásakor: ${insertError.message}`
        );
      }

      // Reset form and refresh data
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await fetchStockData(selectedMonth);

    } catch (error: any) {
      console.error("Upload process failed:", error);
      setError(error.message || "Ismeretlen hiba történt a feltöltés során.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="unified-csv-upload"
          className="block mb-1 text-sm font-medium text-gray-900"
        >
          Egységes CSV Fájl Feltöltése:
        </label>
        <input
          ref={fileInputRef}
          type="file"
          id="unified-csv-upload"
          accept=".csv"
          onChange={handleUpload}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-xs text-gray-500">
          Válassza ki az egységes CSV fájlt az összes raktár adataival.
        </p>
      </div>
    </div>
  );
};

export default UnifiedCsvUpload; 