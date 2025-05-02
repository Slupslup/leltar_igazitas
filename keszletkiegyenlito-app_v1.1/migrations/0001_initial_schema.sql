-- Keszletkiegyenlito App - Adatbazis Sema (Supabase/PostgreSQL)

-- 1. Raktar Enum Tipus Definicioja
CREATE TYPE warehouse_enum AS ENUM (
  'Központi raktár',
  'Ital raktár',
  'Galopp',
  'Ügető',
  'Mázsa',
  'Mobil1'
);

-- 2. Termekek Tabla
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- 3. Keszlet Pillanatkepek Tabla
CREATE TABLE stock_snapshots (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse warehouse_enum NOT NULL,
  theoretical INTEGER NOT NULL CHECK (theoretical >= 0), -- Constraint: Elmeleti keszlet nem lehet negativ
  actual INTEGER NOT NULL,
  month DATE NOT NULL -- A honap elso napja, pl. '2024-05-01'
);

-- 4. Index a Keszlet Pillanatkepek Tablahoz (Gyorsabb kereseshez)
CREATE INDEX idx_stock_snapshots_product_warehouse_month 
ON stock_snapshots (product_id, warehouse, month);

-- 5. Atvezetesi Naplo Tabla
CREATE TABLE transfers (
  id SERIAL PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL, -- Automatikus idobelyeg
  from_wh warehouse_enum NOT NULL,
  to_wh warehouse_enum NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL CHECK (qty > 0), -- Csak pozitiv mennyiseg atvezetese engedelyezett
  "user" TEXT -- A jovobeni authentikaciohoz (most hardkodolt)
);

-- Megjegyzes: A "user" oszlop neve idezojelek kozott van, mert foglalt szo lehet.

