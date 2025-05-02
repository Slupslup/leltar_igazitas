// src/components/CsvUpload.tsx
"use client";

import React, { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabaseClient';

const CsvUpload: React.FC = () => {
  const { selectedMonth, setLoading, setError, fetchStockData, warehouses } = useStore();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length !== 6) {
      setError("Kérjük, pontosan 6 CSV fájlt válasszon ki (minden raktárhoz egyet).");
      return;
    }
    if (!selectedMonth) {
      setError("Kérjük, válasszon ki egy hónapot a feltöltéshez.");
      return;
    }

    setLoading(true);
    setError(null);

    const monthStart = `${selectedMonth}-01`;
    let allStockData: any[] = [];
    let fileProcessingError = false;

    try {
      // Ensure products are loaded or fetch them
      let { data: products, error: productError } = await supabase.from('products').select('id, name');
      if (productError) throw new Error(`Hiba a termékek lekérésekor: ${productError.message}`);
      if (!products) products = [];
      const productMap = new Map(products.map(p => [p.name.trim().toLowerCase(), p.id]));
      let existingProductNames = new Set(products.map(p => p.name.trim().toLowerCase()));

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const warehouseName = warehouses[i]; // Assuming files are uploaded in the order of WAREHOUSES
        // TODO: Add a more robust way to map files to warehouses, maybe based on filename or a selection UI.

        await new Promise<void>((resolve, reject) => {
          Papa.parse(file, {
            header: false, // Data starts row 3, no reliable header
            skipEmptyLines: true,
            encoding: "UTF-8", // Assuming UTF-8, adjust if needed
            complete: async (results) => {
              try {
                const rows = results.data as string[][];
                if (rows.length < 3) {
                  console.warn(`Skipping ${file.name}: Not enough rows.`);
                  resolve(); // Skip this file
                  return;
                }

                const fileStockData: any[] = [];
                const newProductsToInsert: { name: string }[] = [];

                for (let j = 2; j < rows.length; j++) { // Start from row 3 (index 2)
                  const row = rows[j];
                  // Specification: Col A (0) = name, Col D (3) = theoretical, Col E (4) = actual
                  if (row.length < 5) {
                    console.warn(`Skipping row ${j + 1} in ${file.name}: Not enough columns.`);
                    continue;
                  }

                  const productNameRaw = row[0]?.trim();
                  const theoreticalStr = row[3]?.trim();
                  const actualStr = row[4]?.trim();

                  if (!productNameRaw || theoreticalStr === undefined || actualStr === undefined) {
                    console.warn(`Skipping row ${j + 1} in ${file.name}: Missing required data.`);
                    continue;
                  }

                  const theoretical = parseInt(theoreticalStr.replace(/\s/g, ''), 10);
                  const actual = parseInt(actualStr.replace(/\s/g, ''), 10);

                  if (isNaN(theoretical) || isNaN(actual)) {
                    console.warn(`Skipping row ${j + 1} in ${file.name}: Invalid number format for theoretical or actual.`);
                    continue;
                  }

                  const productNameLower = productNameRaw.toLowerCase();
                  let productId = productMap.get(productNameLower);

                  // If product doesn't exist, mark for insertion
                  if (!productId && !existingProductNames.has(productNameLower)) {
                    newProductsToInsert.push({ name: productNameRaw });
                    existingProductNames.add(productNameLower); // Add locally to prevent duplicate inserts from same batch
                  }

                  // We'll resolve product IDs after inserting new ones
                  fileStockData.push({
                    productName: productNameRaw, // Store original name for later ID lookup
                    warehouse: warehouseName,
                    theoretical: theoretical,
                    actual: actual,
                    month: monthStart,
                  });
                }

                // Insert new products if any
                if (newProductsToInsert.length > 0) {
                  const { data: insertedProducts, error: insertError } = await supabase
                    .from('products')
                    .insert(newProductsToInsert)
                    .select('id, name');
                  
                  if (insertError) throw new Error(`Hiba az új termékek beszúrásakor (${file.name}): ${insertError.message}`);
                  
                  // Update the productMap with newly inserted products
                  insertedProducts?.forEach(p => productMap.set(p.name.trim().toLowerCase(), p.id));
                }

                // Now assign product IDs to stock data
                fileStockData.forEach(item => {
                  item.product_id = productMap.get(item.productName.trim().toLowerCase());
                  delete item.productName; // Remove temporary name field
                });

                // Filter out items where product_id couldn't be resolved (shouldn't happen now)
                const validStockData = fileStockData.filter(item => item.product_id);
                allStockData.push(...validStockData);
                resolve();

              } catch (parseError: any) {
                console.error(`Error processing file ${file.name}:`, parseError);
                setError(`Hiba a(z) ${file.name} feldolgozása közben: ${parseError.message}`);
                fileProcessingError = true;
                reject(parseError);
              }
            },
            error: (error: any) => {
              console.error(`Error parsing file ${file.name}:`, error);
              setError(`Hiba a(z) ${file.name} CSV elemzése közben: ${error.message}`);
              fileProcessingError = true;
              reject(error);
            }
          });
        });

        if (fileProcessingError) break; // Stop processing if one file fails
      }

      if (fileProcessingError) {
        throw new Error("Hiba történt a fájlok feldolgozása során.");
      }

      // Clear previous data for the selected month before inserting new data
      const { error: deleteError } = await supabase
        .from('stock_snapshots')
        .delete()
        .eq('month', monthStart);

      if (deleteError) {
        throw new Error(`Hiba a korábbi adatok törlésekor: ${deleteError.message}`);
      }

      // Insert all collected data
      if (allStockData.length > 0) {
        const { error: insertAllError } = await supabase
          .from('stock_snapshots')
          .insert(allStockData);

        if (insertAllError) {
          throw new Error(`Hiba az új készletadatok beszúrásakor: ${insertAllError.message}`);
        }
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFiles(null);
      
      // Refresh data grid
      await fetchStockData(selectedMonth);

    } catch (error: any) {
      console.error("Upload process failed:", error);
      setError(error.message || "Ismeretlen hiba történt a feltöltés során.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
      <div className="flex-grow">
        <label htmlFor="csv-upload" className="block mb-2 text-sm font-medium text-gray-900">CSV Fájlok (6 db):</label>
        <input 
          ref={fileInputRef}
          type="file" 
          id="csv-upload" 
          multiple 
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-xs text-gray-500">Minden raktárhoz (Központi, Ital, Galopp, Ügető, Mázsa, Mobil1) töltsön fel egy fájlt.</p>
      </div>
      <button 
        onClick={handleUpload}
        disabled={!selectedFiles || selectedFiles.length !== 6}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        Feltöltés és Feldolgozás
      </button>
    </div>
  );
};

export default CsvUpload;

