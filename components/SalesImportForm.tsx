'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  sku: string
  name: string
  asin: string | null
}

interface CSVRow {
  sku?: string
  asin?: string
  units_sold: number
  revenue: number
  rowNumber: number
}

interface SalesImportFormProps {
  products: Product[]
}

export default function SalesImportForm({ products }: SalesImportFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setSuccess(null)

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const rows = parseCSV(text)
        setCsvData(rows)
        setShowPreview(true)
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file')
      }
    }
    reader.readAsText(file)
  }

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      throw new Error('CSV file is empty')
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())

    // Find column indexes
    const skuIndex = header.findIndex(h => h === 'sku')
    const asinIndex = header.findIndex(h => h === 'asin')
    const unitsSoldIndex = header.findIndex(h => h.includes('units') || h.includes('sold') || h.includes('quantity'))
    const revenueIndex = header.findIndex(h => h.includes('revenue') || h.includes('sales') || h.includes('total'))

    if (unitsSoldIndex === -1 || revenueIndex === -1) {
      throw new Error('CSV must have columns for units sold and revenue')
    }

    if (skuIndex === -1 && asinIndex === -1) {
      throw new Error('CSV must have either SKU or ASIN column')
    }

    // Parse data rows
    const rows: CSVRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(',').map(v => v.trim())

      const row: CSVRow = {
        units_sold: parseInt(values[unitsSoldIndex] || '0'),
        revenue: parseFloat(values[revenueIndex] || '0'),
        rowNumber: i + 1
      }

      if (skuIndex !== -1 && values[skuIndex]) {
        row.sku = values[skuIndex]
      }
      if (asinIndex !== -1 && values[asinIndex]) {
        row.asin = values[asinIndex]
      }

      // Validate the row has identifier and valid numbers
      if ((row.sku || row.asin) && !isNaN(row.units_sold) && !isNaN(row.revenue)) {
        rows.push(row)
      }
    }

    if (rows.length === 0) {
      throw new Error('No valid data rows found in CSV')
    }

    return rows
  }

  const handleImport = async () => {
    if (!periodStart || !periodEnd) {
      setError('Please select both start and end dates for the sales period')
      return
    }

    if (csvData.length === 0) {
      setError('Please upload a CSV file first')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/sales-snapshots/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          period_start: periodStart,
          period_end: periodEnd,
          rows: csvData.map(row => ({
            sku: row.sku,
            asin: row.asin,
            units_sold: row.units_sold,
            revenue: row.revenue
          }))
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import sales data')
      }

      // Show results
      if (result.errors.length > 0) {
        setError(`Imported ${result.created} snapshots with ${result.errors.length} errors. Check below for details.`)
      } else {
        setSuccess(`Successfully imported ${result.created} sales snapshots!`)
        // Clear form
        setCsvData([])
        setShowPreview(false)
        setPeriodStart('')
        setPeriodEnd('')

        // Redirect to sales page after a delay
        setTimeout(() => {
          router.push('/sales')
          router.refresh()
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import sales data')
    } finally {
      setLoading(false)
    }
  }

  const getProductInfo = (row: CSVRow) => {
    const product = products.find(p =>
      (row.sku && p.sku === row.sku) ||
      (row.asin && p.asin === row.asin)
    )
    return product ? `${product.name} (${product.sku})` : 'Unknown Product'
  }

  return (
    <div className="max-w-5xl">
      {/* Date Range Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-[#D5D9D9] p-6 mb-6">
        <h3 className="text-lg font-semibold text-[#0F1111] mb-4">Sales Period</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period Start Date *
            </label>
            <input
              type="date"
              required
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period End Date *
            </label>
            <input
              type="date"
              required
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* CSV Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-[#D5D9D9] p-6 mb-6">
        <h3 className="text-lg font-semibold text-[#0F1111] mb-4">Upload CSV File</h3>

        <div className="mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <p className="text-sm text-blue-800 font-medium mb-2">CSV Format Requirements:</p>
            <ul className="text-xs text-blue-700 space-y-1 ml-4">
              <li>• Must include columns: <strong>SKU</strong> or <strong>ASIN</strong>, <strong>Units Sold</strong>, <strong>Revenue</strong></li>
              <li>• First row should be headers</li>
              <li>• Products must already exist in your inventory</li>
              <li>• Example: <code className="bg-blue-100 px-1">SKU,Units Sold,Revenue</code></li>
            </ul>
          </div>

          <label className="block w-full">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#FF9900] transition-colors cursor-pointer">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-gray-600 mb-2">
                {csvData.length > 0 ? (
                  <span className="text-green-600 font-medium">✓ Loaded {csvData.length} rows</span>
                ) : (
                  <span>Click to upload or drag and drop CSV file</span>
                )}
              </p>
              <p className="text-xs text-gray-500">CSV files only</p>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Preview Table */}
      {showPreview && csvData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-[#D5D9D9] p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#0F1111] mb-4">Preview ({csvData.length} items)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU/ASIN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Units Sold</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {csvData.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.sku || row.asin}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getProductInfo(row)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.units_sold}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">${row.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {csvData.length > 10 && (
              <p className="text-sm text-gray-500 mt-3 text-center">
                ...and {csvData.length - 10} more items
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Import Button */}
      <div className="flex gap-4">
        <button
          onClick={handleImport}
          disabled={loading || csvData.length === 0 || !periodStart || !periodEnd}
          className="px-6 py-3 bg-[#FF9900] text-white rounded-md hover:bg-[#FA8900] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Importing...' : `Import ${csvData.length} Sales Records`}
        </button>

        {showPreview && (
          <button
            onClick={() => {
              setCsvData([])
              setShowPreview(false)
              setError(null)
              setSuccess(null)
            }}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
