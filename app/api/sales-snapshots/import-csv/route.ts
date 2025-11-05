import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { removeSalesFromInventory, checkInventoryAvailability } from '@/lib/fifo-inventory'

export const runtime = 'nodejs'

interface CSVRow {
  sku?: string
  asin?: string
  units_sold: number
  revenue: number
}

interface ImportResult {
  success: boolean
  created: number
  errors: Array<{ row: number; error: string; data?: any }>
  snapshots: any[]
}

// POST /api/sales-snapshots/import-csv - Bulk import sales from CSV
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    const currentUser = await getCurrentUser(token)

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get current team
    const cookieTeamId = cookieStore.get('current-team-id')?.value
    const currentTeamId = await getCurrentTeamId(cookieTeamId, currentUser.id)

    if (!currentTeamId) {
      return NextResponse.json(
        { error: 'No team selected' },
        { status: 400 }
      )
    }

    // Check write permissions
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to import sales snapshots' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      period_start,
      period_end,
      rows // Array of CSV rows: [{ sku/asin, units_sold, revenue }]
    } = body

    // Validate required fields
    if (!period_start || !period_end || !rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: 'Period dates and rows array are required' },
        { status: 400 }
      )
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No rows to import' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const result: ImportResult = {
      success: true,
      created: 0,
      errors: [],
      snapshots: []
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 1

      try {
        // Validate row data
        if (!row.sku && !row.asin) {
          result.errors.push({
            row: rowNumber,
            error: 'Either SKU or ASIN is required',
            data: row
          })
          continue
        }

        if (row.units_sold === undefined || row.revenue === undefined) {
          result.errors.push({
            row: rowNumber,
            error: 'Units sold and revenue are required',
            data: row
          })
          continue
        }

        const unitsSold = parseInt(row.units_sold.toString())
        const revenue = parseFloat(row.revenue.toString())

        if (isNaN(unitsSold) || isNaN(revenue)) {
          result.errors.push({
            row: rowNumber,
            error: 'Invalid units sold or revenue value',
            data: row
          })
          continue
        }

        if (unitsSold < 0 || revenue < 0) {
          result.errors.push({
            row: rowNumber,
            error: 'Units sold and revenue must be non-negative',
            data: row
          })
          continue
        }

        // Find product by SKU or ASIN
        let productQuery = supabase
          .from('products')
          .select('id, sku, name, asin, team_id')
          .eq('team_id', currentTeamId)

        if (row.sku) {
          productQuery = productQuery.eq('sku', row.sku)
        } else if (row.asin) {
          productQuery = productQuery.eq('asin', row.asin)
        }

        const { data: products, error: productError } = await productQuery

        if (productError || !products || products.length === 0) {
          result.errors.push({
            row: rowNumber,
            error: `Product not found with ${row.sku ? 'SKU: ' + row.sku : 'ASIN: ' + row.asin}`,
            data: row
          })
          continue
        }

        const product = products[0] as any

        // Check for duplicate snapshot
        const { data: existing } = await (supabase as any)
          .from('sales_snapshots')
          .select('id')
          .eq('team_id', currentTeamId)
          .eq('product_id', product.id)
          .eq('period_start', period_start)
          .eq('period_end', period_end)
          .single()

        if (existing) {
          result.errors.push({
            row: rowNumber,
            error: `Snapshot already exists for ${product.sku} in this period`,
            data: row
          })
          continue
        }

        // Check inventory availability
        const inventoryCheck = await checkInventoryAvailability(product.id, unitsSold, currentTeamId)

        if (!inventoryCheck.available) {
          result.errors.push({
            row: rowNumber,
            error: `Insufficient inventory for ${product.sku}. Available: ${inventoryCheck.totalQty}, Needed: ${unitsSold}`,
            data: row
          })
          continue
        }

        // Remove inventory using FIFO
        const removalResult = await removeSalesFromInventory(
          product.id,
          unitsSold,
          currentTeamId,
          period_start,
          period_end
        )

        if (!removalResult.success) {
          result.errors.push({
            row: rowNumber,
            error: removalResult.error || 'Failed to remove inventory',
            data: row
          })
          continue
        }

        // Create sales snapshot
        const snapshotData = {
          team_id: currentTeamId,
          product_id: product.id,
          period_start,
          period_end,
          units_sold: unitsSold,
          revenue,
          snapshot_date: new Date().toISOString().split('T')[0],
          notes: `Imported from CSV on ${new Date().toLocaleDateString()}`
        }

        const { data: snapshot, error: snapshotError } = await (supabase as any)
          .from('sales_snapshots')
          .insert(snapshotData)
          .select(`
            *,
            products (
              id,
              sku,
              name,
              asin
            )
          `)
          .single()

        if (snapshotError) {
          result.errors.push({
            row: rowNumber,
            error: `Failed to create snapshot: ${snapshotError.message}`,
            data: row
          })
          continue
        }

        result.created++
        result.snapshots.push(snapshot)
      } catch (error: any) {
        result.errors.push({
          row: rowNumber,
          error: error.message || 'Unexpected error',
          data: row
        })
      }
    }

    // Overall success if at least one was created and no critical errors
    result.success = result.created > 0

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in POST /api/sales-snapshots/import-csv:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import sales snapshots' },
      { status: 500 }
    )
  }
}
