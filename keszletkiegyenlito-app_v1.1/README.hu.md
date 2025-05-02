# Next.js Készletkiegyenlítő Alkalmazás (v1.1)

Ez az alkalmazás lehetővé teszi a felhasználók számára, hogy havi CSV készletfájlokat töltsenek fel hat különböző raktárhoz, megjelenítsék az elméleti és tényleges készletek közötti különbségeket, kiemeljék az anomáliákat, és egy beépített modul segítségével készletátvezetéseket hajtsanak végre, amelyeket egy Supabase PostgreSQL adatbázisban naplóznak.

## Tartalomjegyzék

1.  [Előfeltételek](#1-előfeltételek)
2.  [Supabase Beállítása](#2-supabase-beállítása)
3.  [Projekt Beállítása](#3-projekt-beállítása)
4.  [Futtatás Helyben](#4-futtatás-helyben)
5.  [Telepítés (Vercel)](#5-telepítés-vercel)
6.  [Használat](#6-használat)
7.  [CSV Formátum](#7-csv-formátum)
8.  [Adatbázis Séma](#8-adatbázis-séma)

## 1. Előfeltételek

-   **Node.js:** LTS verzió (pl. 20.x vagy újabb).
-   **pnpm:** Csomagkezelő. Telepítés: `npm install -g pnpm`.
-   **Git:** Verziókezelő.
-   **Supabase Fiók:** Szükséges egy ingyenes vagy fizetős Supabase fiók az adatbázis hosztolásához.

## 2. Supabase Beállítása

1.  **Projekt Létrehozása:**
    *   Jelentkezzen be a [Supabase](https://supabase.com/) fiókjába.
    *   Hozzon létre egy új projektet ("New project"). Válasszon egy nevet és egy régiót.
    *   Generáljon egy biztonságos adatbázis jelszót, és mentse el.
2.  **API Kulcsok Lekérése:**
    *   A projekt létrehozása után navigáljon a "Project Settings" (fogaskerék ikon) > "API" menüpontba.
    *   Jegyezze fel a következőket:
        *   `Project URL` (ez lesz a `NEXT_PUBLIC_SUPABASE_URL`)
        *   `anon` `public` kulcs (ez lesz a `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
    *   *Megjegyzés:* A `service_role` kulcsra ebben az egyszerűsített verzióban nincs szükség, mivel a biztonsági szabályok (RLS) ki vannak kapcsolva, és a műveleteket a kliens oldali `anon` kulccsal végezzük. Ha később bekapcsolja az RLS-t, szüksége lehet a `service_role` kulcsra a szerveroldali műveletekhez (pl. API útvonalakon).
3.  **Adatbázis Séma Alkalmazása:**
    *   Navigáljon a "SQL Editor" menüpontba (bal oldali menü).
    *   Kattintson a "New query" gombra.
    *   Másolja be a `migrations/0001_initial_schema.sql` fájl teljes tartalmát a szerkesztőbe.
    *   Kattintson a "RUN" gombra a táblák, típusok és indexek létrehozásához.

## 3. Projekt Beállítása

1.  **Klónozza a Tárolót:**
    ```bash
    git clone <a-projekt-git-repo-url-ja>
    cd keszletkiegyenlito-app
    ```
2.  **Telepítse a Függőségeket:**
    ```bash
    pnpm install
    ```
3.  **Környezeti Változók Beállítása:**
    *   Hozzon létre egy `.env.local` nevű fájlt a projekt gyökérkönyvtárában.
    *   Adja hozzá a Supabase API kulcsokat:
        ```dotenv
        NEXT_PUBLIC_SUPABASE_URL=IDE_MASOLJA_A_SUPABASE_PROJEKT_URL-T
        NEXT_PUBLIC_SUPABASE_ANON_KEY=IDE_MASOLJA_A_SUPABASE_ANON_PUBLIC_KULCSOT
        ```
    *   Cserélje le a helyőrzőket a 2. lépésben feljegyzett értékekre.

## 4. Futtatás Helyben

Indítsa el a Next.js fejlesztői szervert:

```bash
pnpm dev
```

Nyissa meg a böngészőjében a `http://localhost:3000` címet.

## 5. Telepítés (Vercel)

A projektet egyszerűen telepítheti a Vercel platformra:

1.  **Push a Git Tárolóba:** Győződjön meg róla, hogy a kód fel van töltve egy Git tárolóba (pl. GitHub, GitLab, Bitbucket).
2.  **Importálás Vercelen:**
    *   Jelentkezzen be a [Vercel](https://vercel.com/) fiókjába.
    *   Kattintson az "Add New..." > "Project" gombra.
    *   Válassza ki a Git tárolót, ahol a projekt található.
    *   A Vercel automatikusan felismeri, hogy ez egy Next.js projekt.
3.  **Környezeti Változók Beállítása:**
    *   A projekt beállításainál ("Settings" > "Environment Variables") adja hozzá ugyanazokat a `NEXT_PUBLIC_SUPABASE_URL` és `NEXT_PUBLIC_SUPABASE_ANON_KEY` változókat, amelyeket a `.env.local` fájlban is használt.
4.  **Telepítés:** Kattintson a "Deploy" gombra. A Vercel buildeli és telepíti az alkalmazást, majd ad egy publikus URL-t.

## 6. Használat

1.  **Hónap Kiválasztása:** Válassza ki azt a hónapot, amelyre a készletadatokat fel szeretné tölteni vagy megtekinteni.
2.  **CSV Feltöltés:**
    *   Kattintson a "Tallózás" (vagy hasonló) gombra a "CSV Fájlok (6 db)" szekcióban.
    *   Válassza ki **pontosan hat** CSV fájlt, minden raktárhoz egyet. A fájlok feldolgozása a specifikált raktársorrendben történik: Központi raktár, Ital raktár, Galopp, Ügető, Mázsa, Mobil1. Győződjön meg róla, hogy a fájlokat ebben a sorrendben választja ki, vagy a fájlnevek alapján azonosíthatóak legyenek (ez utóbbi funkció jelenleg nincs implementálva).
    *   Kattintson a "Feltöltés és Feldolgozás" gombra.
    *   A rendszer feldolgozza a fájlokat, beszúrja az adatokat a Supabase adatbázisba (felülírva az adott hónap korábbi adatait), és frissíti a készlet táblázatot.
3.  **Készletek Megtekintése:**
    *   A "Készletek listázása" táblázat mutatja az összes terméket és azok készletadatait raktáranként a kiválasztott hónapra.
    *   Minden cella három sort tartalmaz: `E:` (Elméleti), `T:` (Tényleges), `K:` (Különbség).
    *   A pirossal kiemelt cellák anomáliát jeleznek (negatív elméleti készlet, vagy a különbség meghaladja a megengedett 10%-os eltérést).
4.  **Manuális Átadás:**
    *   A "Manuális átadás" űrlapon válassza ki a kiindulási raktárat ("Honnan"), a célraktárat ("Hová"), a terméket és az átvezetni kívánt mennyiséget.
    *   Kattintson az "Átvezetés Indítása" gombra.
    *   A rendszer naplózza az átvezetést a `transfers` táblában, és **frissíti az érintett termék elméleti készletét** a kiindulási és célraktárban az aktuálisan megjelenített hónapra vonatkozóan a `stock_snapshots` táblában. Ez a frissítés élőben megjelenik a táblázatban.

## 7. CSV Formátum

Az alkalmazás a következő CSV formátumot várja el (minden raktárfájlra):

-   **Elválasztó:** Pontosvessző (`;`).
-   **Kódolás:** UTF-8 (ajánlott).
-   **Adatkezdés:** A tényleges készletadatok a **3. sortól** kezdődnek.
-   **Oszlopok:**
    *   `A` oszlop (index 0): Termék neve (`product_name`)
    *   `D` oszlop (index 3): Elméleti készlet (`theoretical`) - Egész számként kell értelmezni.
    *   `E` oszlop (index 4): Tényleges készlet (`actual`) - Egész számként kell értelmezni.
-   Minden más oszlop és sor figyelmen kívül lesz hagyva.
-   A számokban az ezres elválasztókat (pl. szóköz) a rendszer megpróbálja eltávolítani, de a tizedesvessző hibát okozhat, mivel egész számokat várunk.

## 8. Adatbázis Séma

Az alkalmazás a következő Supabase/PostgreSQL táblákat használja:

-   `warehouse_enum`: Egyedi típus a hat raktár nevének tárolására.
-   `products`: Termékek tárolása (`id`, `name`).
-   `stock_snapshots`: Havi készletadatok tárolása (`id`, `product_id`, `warehouse`, `theoretical`, `actual`, `month`).
    -   `theoretical` >= 0 kényszer.
    -   Index a `(product_id, warehouse, month)` oszlopokon a gyorsabb lekérdezésekhez.
-   `transfers`: Manuális átvezetések naplózása (`id`, `ts`, `from_wh`, `to_wh`, `product_id`, `qty`, `user`).
    -   `qty` > 0 kényszer.

A részletes SQL séma a `migrations/0001_initial_schema.sql` fájlban található.

