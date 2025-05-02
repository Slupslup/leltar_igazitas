// cypress/e2e/upload_transfer_flow.cy.ts

// Note: This is a basic placeholder E2E test.
// Running it requires a fully configured environment (Supabase connection, running app).
// It also assumes mock CSV files exist in cypress/fixtures/

describe("Upload and Transfer Flow", () => {
  const testMonth = "2024-05"; // Example month
  const productName = "Teszt Termék"; // Example product name used in fixtures
  const initialTheoreticalKozponti = 100;
  const initialActualKozponti = 95;
  const initialTheoreticalItal = 50;
  const initialActualItal = 50;
  const transferQty = 10;

  beforeEach(() => {
    // TODO: Add commands to reset database state before each test if necessary
    // cy.task("db:reset"); 
    cy.visit("/");
  });

  it("should allow uploading CSVs, display data, perform transfer, and update grid", () => {
    // 1. Select Month
    cy.get("#month-select").should("exist").type(testMonth);

    // 2. Upload Fixture CSVs
    // Assuming 6 fixture files named warehouse1.csv, warehouse2.csv, ... in cypress/fixtures
    // This requires the files to exist and match the expected format.
    const fixtureFiles = [
      "warehouse1.csv",
      "warehouse2.csv",
      "warehouse3.csv",
      "warehouse4.csv",
      "warehouse5.csv",
      "warehouse6.csv",
    ];
    cy.get("#csv-upload").selectFile(
      fixtureFiles.map(f => `cypress/fixtures/${f}`), 
      { force: true } // May be needed depending on input styling
    );
    cy.contains("button", "Feltöltés és Feldolgozás").should("not.be.disabled").click();

    // 3. Verify Data in Grid (wait for loading to finish)
    cy.contains("Adatok betöltése...").should("not.exist");
    cy.contains("td", productName).should("exist");
    // Check initial state for Központi raktár
    cy.contains("td", productName)
      .parent("tr")
      .within(() => {
        cy.get("td").eq(1) // Assuming Központi is the first warehouse column
          .should("contain.text", `E: ${initialActualKozponti}`)
          .and("contain.text", `T: ${initialTheoreticalKozponti}`)
          .and("contain.text", `K: ${initialActualKozponti - initialTheoreticalKozponti}`);
        // Check initial state for Ital raktár
        cy.get("td").eq(2) // Assuming Ital is the second warehouse column
          .should("contain.text", `E: ${initialActualItal}`)
          .and("contain.text", `T: ${initialTheoreticalItal}`)
          .and("contain.text", `K: ${initialActualItal - initialTheoreticalItal}`);
      });

    // 4. Perform Transfer
    cy.get("#from-warehouse").select("Központi raktár");
    cy.get("#to-warehouse").select("Ital raktár");
    cy.get("#product-select").select(productName);
    cy.get("#quantity").type(transferQty.toString());
    cy.contains("button", "Átvezetés Indítása").click();

    // 5. Verify Grid Update (wait for loading)
    cy.contains("Átvezetés...").should("not.exist");
    cy.contains("Adatok betöltése...").should("not.exist"); // Wait for refetch

    const expectedTheoreticalKozponti = initialTheoreticalKozponti - transferQty;
    const expectedTheoreticalItal = initialTheoreticalItal + transferQty;

    cy.contains("td", productName)
      .parent("tr")
      .within(() => {
        // Check updated state for Központi raktár
        cy.get("td").eq(1)
          .should("contain.text", `E: ${initialActualKozponti}`) // Actual remains same
          .and("contain.text", `T: ${expectedTheoreticalKozponti}`) // Theoretical updated
          .and("contain.text", `K: ${initialActualKozponti - expectedTheoreticalKozponti}`);
        // Check updated state for Ital raktár
        cy.get("td").eq(2)
          .should("contain.text", `E: ${initialActualItal}`) // Actual remains same
          .and("contain.text", `T: ${expectedTheoreticalItal}`) // Theoretical updated
          .and("contain.text", `K: ${initialActualItal - expectedTheoreticalItal}`);
      });
  });
});

// Helper function to create basic CSV fixture content
function createCsvFixtureContent(productName: string, theoretical: number, actual: number): string {
  return `Fejléc1;Fejléc2;Fejléc3;Fejléc4;Fejléc5\nFejlécSor2;Info;Info;Info;Info\n${productName};DB;0;${theoretical};${actual};0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0`;
}

// Example: Create fixture files (run this logic separately or adapt)
// Need to write these files to cypress/fixtures/
// const fs = require('fs');
// const path = require('path');
// const fixturesDir = path.join(__dirname, '../fixtures');
// if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir);
// fs.writeFileSync(path.join(fixturesDir, 'warehouse1.csv'), createCsvFixtureContent('Teszt Termék', 100, 95));
// fs.writeFileSync(path.join(fixturesDir, 'warehouse2.csv'), createCsvFixtureContent('Teszt Termék', 50, 50));
// fs.writeFileSync(path.join(fixturesDir, 'warehouse3.csv'), createCsvFixtureContent('Teszt Termék', 10, 10));
// fs.writeFileSync(path.join(fixturesDir, 'warehouse4.csv'), createCsvFixtureContent('Teszt Termék', 20, 20));
// fs.writeFileSync(path.join(fixturesDir, 'warehouse5.csv'), createCsvFixtureContent('Teszt Termék', 30, 30));
// fs.writeFileSync(path.join(fixturesDir, 'warehouse6.csv'), createCsvFixtureContent('Teszt Termék', 40, 40));

