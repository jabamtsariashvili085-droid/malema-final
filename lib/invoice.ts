// Invoice generator - creates printable invoices
import { settingsStore } from "@/lib/settings";
import type { Sale } from "@/lib/store";

export interface InvoiceData {
  sale: Sale;
  invoiceNumber: string;
  purchasePrice?: number;
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `INV-${year}${month}${day}-${random}`;
}

export function printInvoice(sale: Sale, purchasePrice?: number) {
  const invoiceNumber = generateInvoiceNumber();
  const settings = settingsStore.getSettings();
  const companyName = settings.companyName || "საწყობი";
  const currency = settings.currency || "₾";

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ინვოისი ${invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 32px;
          color: #1a1a2e;
          font-size: 14px;
          line-height: 1.5;
        }
        .invoice-container { max-width: 780px; margin: 0 auto; }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #2c3e7a;
          padding-bottom: 20px;
          margin-bottom: 28px;
        }
        .company-name { font-size: 22px; font-weight: 700; color: #2c3e7a; }
        .company-sub { font-size: 12px; color: #666; margin-top: 4px; }
        .invoice-title { text-align: right; }
        .invoice-title h1 { font-size: 28px; font-weight: 700; color: #2c3e7a; letter-spacing: 1px; }
        .invoice-number { font-size: 13px; color: #555; margin-top: 4px; }
        .invoice-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 28px;
        }
        .meta-section h3 {
          font-size: 11px;
          text-transform: uppercase;
          color: #888;
          letter-spacing: 1px;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .meta-section p { font-size: 14px; line-height: 1.7; }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 28px;
        }
        .items-table th {
          background: #2c3e7a;
          color: #fff;
          padding: 10px 14px;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .items-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        .items-table tr:nth-child(even) td { background: #f8f9fc; }
        .text-right { text-align: right; }
        .totals {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 32px;
        }
        .totals-table {
          width: 280px;
          border-collapse: collapse;
        }
        .totals-table td {
          padding: 8px 14px;
          font-size: 14px;
        }
        .totals-table .total-row td {
          border-top: 2px solid #2c3e7a;
          font-weight: 700;
          font-size: 16px;
          padding-top: 12px;
          color: #2c3e7a;
        }
        .totals-table .label { color: #666; }
        .footer {
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 20px;
          color: #888;
          font-size: 12px;
        }
        .footer p { margin-bottom: 4px; }
        .stamp-area {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          margin: 32px 0;
        }
        .stamp-box {
          border-top: 1px dashed #ccc;
          padding-top: 8px;
          text-align: center;
          font-size: 12px;
          color: #888;
        }
        @media print {
          body { padding: 16px; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <div>
            <div class="company-name">${companyName}</div>
            <div class="company-sub">საწყობის მართვის სისტემა</div>
          </div>
          <div class="invoice-title">
            <h1>ინვოისი</h1>
            <div class="invoice-number">${invoiceNumber}</div>
          </div>
        </div>

        <div class="invoice-meta">
          <div class="meta-section">
            <h3>ინვოისის დეტალები</h3>
            <p>
              <strong>ინვოისის ნომერი:</strong> ${invoiceNumber}<br>
              <strong>თარიღი:</strong> ${new Date(sale.createdAt).toLocaleDateString("ka-GE")}<br>
              <strong>გაცემის თარიღი:</strong> ${new Date().toLocaleDateString("ka-GE")}
            </p>
          </div>
          <div class="meta-section">
            <h3>მყიდველი</h3>
            <p>
              ${sale.client ? `<strong>${sale.client}</strong>` : "<em>მითითებული არ არის</em>"}
            </p>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>პროდუქცია</th>
              <th>კატეგორია</th>
              <th class="text-right">რაოდენობა</th>
              <th class="text-right">ფასი</th>
              <th class="text-right">ჯამი</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>${sale.productName}</td>
              <td>${sale.category || "-"}</td>
              <td class="text-right">${sale.quantity}</td>
              <td class="text-right">${sale.salePrice.toLocaleString()} ${currency}</td>
              <td class="text-right">${sale.totalAmount.toLocaleString()} ${currency}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <table class="totals-table">
            <tr>
              <td class="label">ქვეჯამი:</td>
              <td class="text-right">${sale.totalAmount.toLocaleString()} ${currency}</td>
            </tr>
            ${
              purchasePrice
                ? `
            <tr>
              <td class="label">თვითღირებულება:</td>
              <td class="text-right">${(purchasePrice * sale.quantity).toLocaleString()} ${currency}</td>
            </tr>
            <tr>
              <td class="label">მოგება:</td>
              <td class="text-right">${((sale.salePrice - purchasePrice) * sale.quantity).toLocaleString()} ${currency}</td>
            </tr>`
                : ""
            }
            <tr class="total-row">
              <td>ჯამი:</td>
              <td class="text-right">${sale.totalAmount.toLocaleString()} ${currency}</td>
            </tr>
          </table>
        </div>

        <div class="stamp-area">
          <div class="stamp-box">გამცემი / ხელმოწერა</div>
          <div class="stamp-box">მიმღები / ხელმოწერა</div>
        </div>

        <div class="footer">
          <p>${companyName} - საწყობის მართვის სისტემა</p>
          <p>ინვოისი გენერირებულია ავტომატურად: ${new Date().toLocaleString("ka-GE")}</p>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}
