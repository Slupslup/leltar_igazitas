// src/lib/store.ts
import { create } from "zustand";
import { supabase } from "./supabaseClient";

// Define types based on the database schema
export type Warehouse =
  | "Központi raktár"
  | "Ital raktár"
  | "Galopp"
  | "Ügető"
  | "Mázsa"
  | "Mobil1";

export interface Product {
  id: number;
  name: string;
}

export interface StockData {
  productId: number;
  productName: string;
  warehouseData: {
    [key in Warehouse]?: {
      theoretical: number;
      actual: number;
      difference: number;
      highlight: boolean;
    };
  };
}

export interface TransferLog {
  id?: number;
  ts?: string;
  from_wh: Warehouse;
  to_wh: Warehouse;
  product_id: number;
  qty: number;
  user: string; // Hardcoded for now
}

interface AppState {
  products: Product[];
  stockData: StockData[];
  warehouses: Warehouse[];
  isLoading: boolean;
  error: string | null;
  selectedMonth: string; // e.g., '2024-05'
  fetchProducts: () => Promise<Product[]>;
  processCsvData: (files: FileList, month: string) => Promise<void>;
  fetchStockData: (month: string) => Promise<void>;
  executeTransfer: (
    transfer: Omit<TransferLog, "id" | "ts" | "user">
  ) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedMonth: (month: string) => void;
}

const WAREHOUSES: Warehouse[] = [
  "Központi raktár",
  "Ital raktár",
  "Galopp",
  "Ügető",
  "Mázsa",
  "Mobil1",
];

// Helper function to calculate difference (actual - theoretical) and highlight
const calculateDifferenceAndHighlight = (
  theoretical: number,
  actual: number
) => {
  const difference = actual - theoretical; // Correct calculation: actual - theoretical
  // Highlight if theoretical is negative OR difference is > 10% of the larger absolute value
  const highlight =
    theoretical < 0 ||
    Math.abs(difference) >
      0.1 * Math.max(Math.abs(theoretical), Math.abs(actual));
  return { difference, highlight };
};

export const useStore = create<AppState>((set, get) => ({
  products: [],
  stockData: [],
  warehouses: WAREHOUSES,
  isLoading: false,
  error: null,
  selectedMonth: new Date().toISOString().slice(0, 7), // Default to current month YYYY-MM

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),

  fetchProducts: async () => {
    // setLoading(true); // Loading state might be handled by the caller if needed
    // setError(null);
    try {
      console.log("Fetching products from database...");
      const { data, error } = await supabase
        .from("products")
        .select("id, name");
      if (error) throw error;
      const products = data || [];
      console.log(`Fetched ${products.length} products.`);
      set({ products: products }); // Update state
      return products; // Return fetched products
    } catch (error: any) {
      // Type assertion to any
      console.error("Error fetching products:", error);
      set({ error: `Hiba a termékek lekérésekor: ${error.message}` });
      return []; // Return empty array on error
    } finally {
      // setLoading(false); // Let caller manage loading state if needed
    }
  },

  // Placeholder for CSV processing - will be implemented with API route
  processCsvData: async (files, month) => {
    set({ isLoading: true, error: null });
    console.log("CSV feldolgozás indítása:", files, month);
    // This function will primarily call the API route
    // Example: POST /api/stock with files and month
    // After successful processing, call fetchStockData(month)
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    set({ isLoading: false });
    // TODO: Implement actual API call and data refresh
    get().fetchStockData(month);
  },

  fetchStockData: async (month) => {
    set({ isLoading: true, error: null });
    try {
      // Fetch products first if not already loaded
      if (get().products.length === 0) {
        await get().fetchProducts();
      }
      const products = get().products;
      const productMap = new Map(products.map((p) => [p.id, p.name]));

      const monthStart = `${month}-01`;
      // Fetch all snapshots for the month in batches of 1000
      let allSnapshots: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let keepFetching = true;
      while (keepFetching) {
        const { data: batch, error } = await supabase
          .from("stock_snapshots")
          .select("product_id, warehouse, theoretical, actual")
          .eq("month", monthStart)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (batch && batch.length > 0) {
          allSnapshots = allSnapshots.concat(batch);
          from += pageSize;
          if (batch.length < pageSize) {
            keepFetching = false;
          }
        } else {
          keepFetching = false;
        }
      }
      console.log("[DEBUG] All fetched snapshots for", monthStart, allSnapshots); // DEBUG
      const snapshots = allSnapshots;

      // Process snapshots into the desired StockData structure
      const processedData: { [productId: number]: StockData } = {};

      for (const p of products) {
        processedData[p.id] = {
          productId: p.id,
          productName: p.name,
          warehouseData: {},
        };
      }

      for (const snap of snapshots || []) {
        // DEBUG: Log each snapshot, and highlight Mázsa
        if (snap.warehouse === "Mázsa") {
          console.log("[DEBUG] Processing Mázsa snapshot:", snap);
        } else {
          console.log("[DEBUG] Processing snapshot:", snap);
        }
        const productEntry = processedData[snap.product_id];
        if (productEntry) {
          const warehouseKey = snap.warehouse as Warehouse; // Explicitly cast
          if (WAREHOUSES.includes(warehouseKey)) {
            // Check if the key is valid
            console.log(
              `[DEBUG] Assigning to warehouseData[${warehouseKey}] for product ${snap.product_id}`
            );
            const { difference, highlight } = calculateDifferenceAndHighlight(
              snap.theoretical,
              snap.actual
            );
            productEntry.warehouseData[warehouseKey] = {
              // Use the validated key
              theoretical: snap.theoretical,
              actual: snap.actual,
              difference,
              highlight,
            };
          } else {
            console.warn(
              `[DEBUG] Snapshot found for product ${snap.product_id} with invalid warehouse key: ${snap.warehouse}`
            );
          }
        } else {
          console.warn(
            `[DEBUG] Snapshot found for unknown product ID: ${snap.product_id}`
          );
        }
      }
      console.log("[DEBUG] Final processedData before setting state:", processedData); // DEBUG

      set({ stockData: Object.values(processedData) });
    } catch (error: any) {
      // Type assertion to any
      set({ error: `Hiba a készletadatok lekérésekor: ${error.message}` });
    } finally {
      set({ isLoading: false });
    }
  },

  // Placeholder for transfer execution - will be implemented with API route
  executeTransfer: async (transfer) => {
    set({ isLoading: true, error: null });
    console.log("Átvezetés végrehajtása:", transfer);
    // This function will call the API route POST /api/transfers
    // On success, update the local state optimistically or refetch
    try {
      const { data: transferResult, error: transferError } = await supabase
        .from("transfers")
        .insert([{ ...transfer, user: "admin" }]) // Hardcoded user for now
        .select();

      if (transferError) throw transferError;

      // Optimistic update or refetch
      // For simplicity, let's refetch the data for the current month
      await get().fetchStockData(get().selectedMonth);
    } catch (error: any) {
      // Type assertion to any
      set({ error: `Hiba az átvezetés során: ${error.message}` });
    } finally {
      set({ isLoading: false });
    }
  },
}));
