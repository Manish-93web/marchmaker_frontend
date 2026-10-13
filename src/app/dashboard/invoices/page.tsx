"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStoredUser } from "@/lib/api";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  billingName: string;
  billingEmail: string;
  baseAmountINR: number;
  cgstAmountINR: number;
  sgstAmountINR: number;
  totalAmountINR: number;
  sacCode: string;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.push("/login"); return; }
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    setLoading(true);
    try {
      const res = await api.payments.getInvoices();
      if (res.success) {
        setInvoices(res.data || []);
      } else {
        setError(res.message || "Could not load invoices.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint(inv: Invoice) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Invoice ${inv.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #1e293b; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          th { background: #f8fafc; font-weight: 600; }
          .total { font-weight: 700; font-size: 16px; }
          .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>TAX INVOICE</h1>
        <p class="label">Invoice No: ${inv.invoiceNumber}</p>
        <p class="label">Date: ${formatDate(inv.invoiceDate)}</p>
        <hr style="margin: 16px 0;" />
        <p><strong>Marchmaker Matchmaking Services Pvt. Ltd.</strong><br/>GST No: [GSTIN Pending]<br/>support@marchmaker.in</p>
        <p style="margin-top: 16px;"><strong>Bill To:</strong><br/>${inv.billingName}<br/>${inv.billingEmail}</p>
        <table>
          <thead>
            <tr><th>Description</th><th>SAC</th><th>Amount</th></tr>
          </thead>
          <tbody>
            <tr><td>Introduction Unlock — Matchmaking Service</td><td>${inv.sacCode}</td><td>${formatINR(inv.baseAmountINR)}</td></tr>
            <tr><td>CGST @ 9%</td><td></td><td>${formatINR(inv.cgstAmountINR)}</td></tr>
            <tr><td>SGST @ 9%</td><td></td><td>${formatINR(inv.sgstAmountINR)}</td></tr>
            <tr><td class="total">Total (Inclusive of GST)</td><td></td><td class="total">${formatINR(inv.totalAmountINR)}</td></tr>
          </tbody>
        </table>
        <div class="footer">
          <p>This is a computer-generated invoice. No signature required.</p>
          <p>Marchmaker Matchmaking Services — This invoice is subject to legal review before production use.</p>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Payments &amp; Invoices</h1>
          <p className="text-slate-500 mt-1">
            GST invoices for all introduction unlocks. ₹499 per introduction (inclusive of 18% GST).
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-24">
            <div className="animate-spin w-8 h-8 rounded-full border-4 border-rose-200 border-t-rose-600" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {!loading && !error && invoices.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <span className="text-4xl block mb-4">🧾</span>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No invoices yet</h2>
            <p className="text-slate-500 text-sm">
              Invoices will appear here after you unlock your first introduction.
            </p>
          </div>
        )}

        {!loading && invoices.length > 0 && (
          <div className="space-y-4">
            {invoices.map((inv) => (
              <div
                key={inv._id}
                className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-rose-600 text-lg">🧾</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{inv.invoiceNumber}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{formatDate(inv.invoiceDate)}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Base: {formatINR(inv.baseAmountINR)} + CGST {formatINR(inv.cgstAmountINR)} + SGST {formatINR(inv.sgstAmountINR)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:ml-auto">
                  <span className="text-lg font-bold text-slate-900">{formatINR(inv.totalAmountINR)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedInvoice(selectedInvoice?._id === inv._id ? null : inv)}
                      className="text-xs font-medium px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                    >
                      {selectedInvoice?._id === inv._id ? "Hide" : "Details"}
                    </button>
                    <button
                      onClick={() => handlePrint(inv)}
                      className="text-xs font-medium px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Print / PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {selectedInvoice && (
              <div className="bg-slate-900 text-white rounded-2xl p-8 mt-2">
                <h3 className="text-lg font-bold mb-1">TAX INVOICE</h3>
                <p className="text-slate-400 text-xs mb-6">Invoice No: {selectedInvoice.invoiceNumber} · {formatDate(selectedInvoice.invoiceDate)}</p>
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">From</p>
                    <p className="text-sm font-semibold">Marchmaker Matchmaking Services Pvt. Ltd.</p>
                    <p className="text-xs text-slate-400 mt-1">GST No: [GSTIN — Legal Review Pending]</p>
                    <p className="text-xs text-slate-400">support@marchmaker.in</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Bill To</p>
                    <p className="text-sm font-semibold">{selectedInvoice.billingName}</p>
                    <p className="text-xs text-slate-400 mt-1">{selectedInvoice.billingEmail}</p>
                  </div>
                </div>
                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 text-slate-400 font-normal">Description</th>
                      <th className="text-right py-2 text-slate-400 font-normal">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-800">
                      <td className="py-3">Introduction Unlock — Matchmaking Service (SAC: {selectedInvoice.sacCode})</td>
                      <td className="py-3 text-right">{formatINR(selectedInvoice.baseAmountINR)}</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-3 text-slate-400">CGST @ 9%</td>
                      <td className="py-3 text-right">{formatINR(selectedInvoice.cgstAmountINR)}</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-3 text-slate-400">SGST @ 9%</td>
                      <td className="py-3 text-right">{formatINR(selectedInvoice.sgstAmountINR)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-bold">Total (Inclusive of GST)</td>
                      <td className="py-3 text-right font-bold text-rose-400">{formatINR(selectedInvoice.totalAmountINR)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-slate-500 text-xs">
                  This is a computer-generated invoice. Tax calculations and GST invoice formats must be validated against applicable requirements before production use.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
