// src/components/CsvUpload.tsx
"use client";

import React, { useState, useRef, useMemo } from "react";
import { useStore, Warehouse } from "@/lib/store";
import Papa from "papaparse";
import { supabase } from "@/lib/supabaseClient";

interface FileWithWarehouse {
  file: File;
  assignedWarehouse: Warehouse | "";
}

const CsvUpload: React.FC = () => {
  const {
    isLoading,
    selectedMonth,
    setLoading,
    setError,
    fetchStockData,
    warehouses,
    fetchProducts,
    products,
  } = useStore();
  const [selectedFiles, setSelectedFiles] = useState<FileWithWarehouse[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      // Limit to the number of warehouses
      const limitedFiles = files.slice(0, warehouses.length);
      setSelectedFiles(
        limitedFiles.map((file) => ({ file, assignedWarehouse: "" }))
      );
      setError(null); // Clear previous errors
      if (files.length > warehouses.length) {
        setError(
          `Figyelem: Több fájlt választott ki, mint ahány raktár (${warehouses.length} db) van. Csak az első ${warehouses.length} fájl lesz figyelembe véve.`
        );
      }
    }
  };

  const handleWarehouseAssignment = (
    index: number,
    warehouse: Warehouse | ""
  ) => {
    setSelectedFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      newFiles[index].assignedWarehouse = warehouse;
      return newFiles;
    });
  };

  const assignedWarehouses = useMemo(() => {
    return new Set(
      selectedFiles.map((f) => f.assignedWarehouse).filter((wh) => wh !== "")
    );
  }, [selectedFiles]);

  const handleUpload = async () => {
    // Validation
    if (selectedFiles.length !== warehouses.length) {
      setError(`Kérjük, pontosan ${warehouses.length} CSV fájlt válasszon ki.`);
      return;
    }
    if (!selectedMonth) {
      setError("Kérjük, válasszon ki egy hónapot a feltöltéshez.");
      return;
    }
    const unassignedFiles = selectedFiles.filter(
      (f) => f.assignedWarehouse === ""
    );
    if (unassignedFiles.length > 0) {
      setError("Minden fájlhoz hozzá kell rendelni egy raktárat.");
      return;
    }
    if (assignedWarehouses.size !== warehouses.length) {
      setError(
        "Minden raktárhoz pontosan egy fájlt kell hozzárendelni. Duplikált vagy hiányzó raktár hozzárendelés."
      );
      return;
    }

    setLoading(true);
    setError(null);

    const monthStart = `${selectedMonth}-01`;
    let allParsedData: { [key in Warehouse]?: any[] } = {};
    let allNewProductNames = new Set<string>();
    let fileProcessingError = false;

    // --- Step 1: Parse all files and collect new product names ---
    try {
      // Ensure products are loaded
      let currentProducts = products;
      if (currentProducts.length === 0) {
        console.log("Product state is empty, fetching products...");
        currentProducts = await fetchProducts(); // Use the returned products
        console.log(`Fetched ${currentProducts.length} products directly.`);
      }
      if (currentProducts.length === 0) {
        console.warn(
          "Product list is still empty after fetching. Cannot proceed with mapping."
        );
        // Optionally set an error state here
        // setError("Nem sikerült betölteni a terméklistát.");
        // return; // Or handle differently
      }
      console.log("Using products for mapping:", currentProducts);
      const productMap = new Map(
        currentProducts.map((p) => [p.name.trim().toLowerCase(), p.id])
      );
      const existingProductNamesLower = new Set(
        currentProducts.map((p) => p.name.trim().toLowerCase())
      );

      for (const fileWithWarehouse of selectedFiles) {
        const { file, assignedWarehouse } = fileWithWarehouse;
        if (!assignedWarehouse) continue; // Should not happen due to validation, but safety check

        const warehouseData: any[] = [];
        await new Promise<void>((resolve, reject) => {
          Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            encoding: "UTF-8",
            complete: (results) => {
              try {
                const rows = results.data as string[][];
                if (rows.length < 3) {
                  console.warn(`Skipping ${file.name}: Not enough rows.`);
                  resolve();
                  return;
                }

                for (let j = 2; j < rows.length; j++) {
                  const row = rows[j];
                  if (row.length < 5) continue; // Skip malformed rows

                  const productNameRaw = row[0]?.trim();
                  const theoreticalStr = row[2]?.trim(); // Column C (index 2)
                  const actualStr = row[3]?.trim(); // Column D (index 3)

                  if (
                    !productNameRaw ||
                    theoreticalStr === undefined ||
                    actualStr === undefined
                  )
                    continue;

                  const theoreticalRaw = parseInt(
                    theoreticalStr.replace(/\s/g, ""),
                    10
                  );
                  const actual = parseInt(actualStr.replace(/\s/g, ""), 10);

                  if (isNaN(theoreticalRaw) || isNaN(actual)) continue;

                  // Ensure theoretical is not negative (due to DB constraint)
                  const theoretical = Math.max(0, theoreticalRaw);
                  if (theoreticalRaw < 0) {
                    console.warn(
                      `Negatív elméleti érték (${theoreticalRaw}) található a(z) '${productNameRaw}' termékhez a(z) '${file.name}' fájlban. 0-ra állítva.`
                    );
                  }

                  // Collect new product names
                  const productNameLower = productNameRaw.toLowerCase();
                  if (
                    !productMap.has(productNameLower) &&
                    !existingProductNamesLower.has(productNameLower)
                  ) {
                    allNewProductNames.add(productNameRaw); // Store original casing
                  }

                  warehouseData.push({
                    productName: productNameRaw, // Keep original name for later ID lookup
                    warehouse: assignedWarehouse,
                    theoretical: theoretical,
                    actual: actual,
                    month: monthStart,
                  });
                }
                allParsedData[assignedWarehouse] = warehouseData;
                resolve();
              } catch (parseError: any) {
                console.error(
                  `Error processing file ${file.name}:`,
                  parseError
                );
                setError(
                  `Hiba a(z) ${file.name} feldolgozása közben: ${parseError.message}`
                );
                fileProcessingError = true;
                reject(parseError);
              }
            },
            error: (error: any) => {
              console.error(`Error parsing file ${file.name}:`, error);
              setError(
                `Hiba a(z) ${file.name} CSV elemzése közben: ${error.message}`
              );
              fileProcessingError = true;
              reject(error);
            },
          });
        });
        if (fileProcessingError) break;
      }

      if (fileProcessingError) {
        throw new Error("Hiba történt a fájlok elemzése során.");
      }

      // --- Step 2: Insert all new unique products ---
      let finalProductMap = new Map(productMap);
      if (allNewProductNames.size > 0) {
        const newProductsToInsert = Array.from(allNewProductNames).map(
          (name) => ({ name })
        );
        console.log("Inserting new products:", newProductsToInsert);
        const { data: insertedProducts, error: insertError } = await supabase
          .from("products")
          .insert(newProductsToInsert)
          .select("id, name");

        if (insertError) {
          // Handle potential duplicate insertion if multiple users upload concurrently
          // A more robust solution involves upsert or checking existence again
          if (insertError.code === "23505") {
            // Unique violation
            console.warn(
              "Product insertion conflict (23505), likely concurrent upload. Refetching products."
            );
            await fetchProducts(); // Refetch products to get IDs inserted by others
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
        } else {
          // Update map with newly inserted products
          insertedProducts?.forEach((p) =>
            finalProductMap.set(p.name.trim().toLowerCase(), p.id)
          );
          console.log(
            "Updated finalProductMap after insertion:",
            finalProductMap
          );
        }
      }

      // --- Step 3: Prepare final snapshot data with product IDs ---
      console.log(
        "Preparing final stock data. Using finalProductMap:",
        finalProductMap
      );
      const finalStockDataToInsert: any[] = [];
      for (const warehouse in allParsedData) {
        const warehouseItems = allParsedData[warehouse as Warehouse] || [];
        warehouseItems.forEach((item) => {
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
          } else {
            console.warn(
              `Could not find product ID for '${item.productName}' after insertion/update.`
            );
            // Optionally: Decide whether to skip this item or throw an error
          }
        });
      }

      if (
        finalStockDataToInsert.length === 0 &&
        Object.keys(allParsedData).length > 0
      ) {
        throw new Error(
          "Nem sikerült érvényes készletadatokat kinyerni a fájlokból a termékazonosítók hozzárendelése után."
        );
      }

      // --- Step 4: Delete old data and insert new data (within a 'conceptual' transaction) ---
      console.log(`Deleting existing data for month ${monthStart}...`);
      const { error: deleteError } = await supabase
        .from("stock_snapshots")
        .delete()
        .eq("month", monthStart);

      if (deleteError) {
        throw new Error(
          `Hiba a korábbi adatok törlésekor (${monthStart}): ${deleteError.message}`
        );
      }

      console.log(
        `Inserting ${finalStockDataToInsert.length} new stock records...`
      );
      if (finalStockDataToInsert.length > 0) {
        const { error: insertAllError } = await supabase
          .from("stock_snapshots")
          .insert(finalStockDataToInsert);

        if (insertAllError) {
          // Attempt to rollback or notify user about inconsistent state is difficult here
          throw new Error(
            `Hiba az új készletadatok beszúrásakor: ${insertAllError.message}. Az adatbázis inkonzisztens állapotba kerülhetett a(z) ${monthStart} hónapra.`
          );
        }
      }

      // --- Step 5: Success - Reset form and refresh grid ---
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFiles([]);
      await fetchStockData(selectedMonth);
      console.log("Upload process completed successfully.");
    } catch (error: any) {
      console.error("Upload process failed:", error);
      setError(error.message || "Ismeretlen hiba történt a feltöltés során.");
      // Do NOT delete data if parsing or insertion failed
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="csv-upload"
          className="block mb-1 text-sm font-medium text-gray-900"
        >
          CSV Fájlok kiválasztása:
        </label>
        <input
          ref={fileInputRef}
          type="file"
          id="csv-upload"
          multiple
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-xs text-gray-500">
          Válassza ki az összes feltölteni kívánt CSV fájlt (max.{" "}
          {warehouses.length} db).
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-3 border border-gray-200 p-4 rounded-lg">
          <h3 className="text-md font-semibold text-gray-800">
            Fájlok hozzárendelése raktárakhoz:
          </h3>
          {selectedFiles.map((fileWithWh, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4"
            >
              <span
                className="text-sm font-medium text-gray-700 truncate flex-1"
                title={fileWithWh.file.name}
              >
                {fileWithWh.file.name}
              </span>
              <select
                value={fileWithWh.assignedWarehouse}
                onChange={(e) =>
                  handleWarehouseAssignment(
                    index,
                    e.target.value as Warehouse | ""
                  )
                }
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-auto p-2"
              >
                <option value="">Válasszon raktárat...</option>
                {warehouses.map((wh) => (
                  <option
                    key={wh}
                    value={wh}
                    disabled={
                      assignedWarehouses.has(wh) &&
                      fileWithWh.assignedWarehouse !== wh
                    }
                  >
                    {wh}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleUpload}
          disabled={
            isLoading ||
            selectedFiles.length === 0 ||
            selectedFiles.length !== warehouses.length ||
            selectedFiles.some((f) => f.assignedWarehouse === "")
          }
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isLoading
            ? "Feldolgozás..."
            : `Feltöltés és Feldolgozás (${warehouses.length} fájl)`}
        </button>
      </div>
    </div>
  );
};

export default CsvUpload;
