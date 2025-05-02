// export_transfers.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify/sync'; // Using sync version for simplicity in script
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase URL or Anon Key not found in .env.local. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function exportTransferLog() {
  console.log('Fetching transfer log from Supabase...');
  try {
    const { data, error } = await supabase
      .from('transfers')
      .select('id, ts, from_wh, to_wh, product_id, qty, user')
      .order('ts', { ascending: false }); // Get latest first

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('No transfer records found to export.');
      // Create an empty CSV with headers
      const csvHeaders = ['id', 'ts', 'from_wh', 'to_wh', 'product_id', 'qty', 'user'];
      const csvContent = stringify([csvHeaders]);
      const filePath = path.resolve(process.cwd(), 'transfer_log_export.csv');
      fs.writeFileSync(filePath, csvContent);
      console.log(`Empty transfer log exported to ${filePath}`);
      return filePath;
    }

    console.log(`Fetched ${data.length} transfer records.`);

    // Define CSV columns (ensure order matches select)
    const columns = [
      { key: 'id', header: 'ID' },
      { key: 'ts', header: 'Timestamp' },
      { key: 'from_wh', header: 'From_Warehouse' },
      { key: 'to_wh', header: 'To_Warehouse' },
      { key: 'product_id', header: 'Product_ID' },
      { key: 'qty', header: 'Quantity' },
      { key: 'user', header: 'User' },
    ];

    // Generate CSV content
    const csvContent = stringify(data, { header: true, columns: columns.map(c => c.key) });

    // Define file path
    const filePath = path.resolve(process.cwd(), 'transfer_log_export.csv');

    // Write CSV file
    fs.writeFileSync(filePath, csvContent);
    console.log(`Transfer log successfully exported to ${filePath}`);
    return filePath;

  } catch (err) {
    console.error('Error exporting transfer log:', err);
    process.exit(1);
  }
}

// Execute the export and then zip the result
exportTransferLog().then(csvFilePath => {
  if (csvFilePath) {
    const zipFilePath = path.resolve(process.cwd(), 'transfer_log_export.zip');
    const csvFileName = path.basename(csvFilePath);
    // Use shell command to zip the file
    const { execSync } = require('child_process');
    try {
      // Ensure zip command is available (it should be in the sandbox)
      execSync(`zip -j ${zipFilePath} ${csvFilePath}`, { stdio: 'inherit' });
      console.log(`CSV file successfully zipped to ${zipFilePath}`);
      // Optional: remove the original CSV after zipping
      // fs.unlinkSync(csvFilePath);
    } catch (zipError) {
      console.error(`Error zipping the file: ${zipError}`);
      process.exit(1);
    }
  }
}).catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});

