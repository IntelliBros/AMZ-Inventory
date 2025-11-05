import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Use service role key to bypass RLS for inventory operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export interface ConsumedInventory {
  id: string
  location_type: 'fba' | 'receiving'
  quantity: number
  unit_cost: number
  unit_shipping_cost: number
  created_at: string
}

interface RemovalResult {
  success: boolean
  consumed: ConsumedInventory[]
  remainingNeeded: number
  error?: string
}

/**
 * Remove inventory from FBA and Receiving using FIFO (First In, First Out)
 * Used when recording sales that consume inventory
 */
export async function removeSalesFromInventory(
  productId: string,
  quantityToRemove: number,
  teamId: string,
  periodStart: string,
  periodEnd: string
): Promise<RemovalResult> {
  const consumed: ConsumedInventory[] = []
  let remaining = quantityToRemove

  try {
    // First, try to consume from FBA inventory (FIFO - oldest first)
    const { data: fbaInventory, error: fbaError } = await supabaseAdmin
      .from('inventory_locations')
      .select('*')
      .eq('product_id', productId)
      .eq('location_type', 'fba')
      .order('created_at', { ascending: true })

    if (fbaError) {
      throw new Error(`Failed to fetch FBA inventory: ${fbaError.message}`)
    }

    // Verify product belongs to team before allowing removal
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('team_id')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      throw new Error('Product not found')
    }

    if (product.team_id !== teamId) {
      throw new Error('Product does not belong to team')
    }

    // Consume FBA inventory first (FIFO)
    if (fbaInventory && fbaInventory.length > 0) {
      for (const inv of fbaInventory) {
        if (remaining <= 0) break

        const availableQty = inv.quantity
        const toConsume = Math.min(availableQty, remaining)

        // Track what we consumed
        consumed.push({
          id: inv.id,
          location_type: 'fba',
          quantity: toConsume,
          unit_cost: inv.unit_cost || 0,
          unit_shipping_cost: inv.unit_shipping_cost || 0,
          created_at: inv.created_at
        })

        if (availableQty <= remaining) {
          // Fully consume this inventory record
          const { error: deleteError } = await supabaseAdmin
            .from('inventory_locations')
            .delete()
            .eq('id', inv.id)

          if (deleteError) {
            throw new Error(`Failed to delete FBA inventory: ${deleteError.message}`)
          }

          remaining -= availableQty
        } else {
          // Partially consume this inventory record
          const { error: updateError } = await supabaseAdmin
            .from('inventory_locations')
            .update({ quantity: availableQty - remaining })
            .eq('id', inv.id)

          if (updateError) {
            throw new Error(`Failed to update FBA inventory: ${updateError.message}`)
          }

          remaining = 0
        }
      }
    }

    // If still need more, consume from Receiving inventory (FIFO)
    if (remaining > 0) {
      const { data: receivingInventory, error: receivingError } = await supabaseAdmin
        .from('inventory_locations')
        .select('*')
        .eq('product_id', productId)
        .eq('location_type', 'receiving')
        .order('created_at', { ascending: true })

      if (receivingError) {
        throw new Error(`Failed to fetch Receiving inventory: ${receivingError.message}`)
      }

      if (receivingInventory && receivingInventory.length > 0) {
        for (const inv of receivingInventory) {
          if (remaining <= 0) break

          const availableQty = inv.quantity
          const toConsume = Math.min(availableQty, remaining)

          // Track what we consumed
          consumed.push({
            id: inv.id,
            location_type: 'receiving',
            quantity: toConsume,
            unit_cost: inv.unit_cost || 0,
            unit_shipping_cost: inv.unit_shipping_cost || 0,
            created_at: inv.created_at
          })

          if (availableQty <= remaining) {
            // Fully consume this inventory record
            const { error: deleteError } = await supabaseAdmin
              .from('inventory_locations')
              .delete()
              .eq('id', inv.id)

            if (deleteError) {
              throw new Error(`Failed to delete Receiving inventory: ${deleteError.message}`)
            }

            remaining -= availableQty
          } else {
            // Partially consume this inventory record
            const { error: updateError } = await supabaseAdmin
              .from('inventory_locations')
              .update({ quantity: availableQty - remaining })
              .eq('id', inv.id)

            if (updateError) {
              throw new Error(`Failed to update Receiving inventory: ${updateError.message}`)
            }

            remaining = 0
          }
        }
      }
    }

    // Create inventory history record for the sale
    if (consumed.length > 0) {
      const totalConsumed = consumed.reduce((sum, inv) => sum + inv.quantity, 0)
      const { error: historyError } = await supabaseAdmin
        .from('inventory_locations')
        .insert({
          product_id: productId,
          location_type: 'fba', // Record as FBA movement
          quantity: -totalConsumed, // Negative to show removal
          unit_cost: consumed[0].unit_cost,
          unit_shipping_cost: consumed[0].unit_shipping_cost,
          po_id: null,
          notes: `Sold: ${totalConsumed} units (Sales period ${periodStart} to ${periodEnd})`
        })

      if (historyError) {
        console.error('Failed to create inventory history:', historyError)
        // Don't throw - history is for tracking only
      }
    }

    return {
      success: remaining === 0,
      consumed,
      remainingNeeded: remaining,
      error: remaining > 0 ? `Insufficient inventory. Still need ${remaining} more units.` : undefined
    }
  } catch (error: any) {
    return {
      success: false,
      consumed,
      remainingNeeded: remaining,
      error: error.message || 'Failed to remove inventory'
    }
  }
}

/**
 * Check if there's sufficient inventory to fulfill a sales order
 * Does not modify inventory, just checks availability
 */
export async function checkInventoryAvailability(
  productId: string,
  quantityNeeded: number,
  teamId: string
): Promise<{ available: boolean; fbaQty: number; receivingQty: number; totalQty: number }> {
  try {
    // Verify product belongs to team
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('team_id')
      .eq('id', productId)
      .single()

    if (productError || !product || product.team_id !== teamId) {
      return { available: false, fbaQty: 0, receivingQty: 0, totalQty: 0 }
    }

    // Get FBA inventory total
    const { data: fbaInventory, error: fbaError } = await supabaseAdmin
      .from('inventory_locations')
      .select('quantity')
      .eq('product_id', productId)
      .eq('location_type', 'fba')

    const fbaQty = fbaInventory?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0

    // Get Receiving inventory total
    const { data: receivingInventory, error: receivingError } = await supabaseAdmin
      .from('inventory_locations')
      .select('quantity')
      .eq('product_id', productId)
      .eq('location_type', 'receiving')

    const receivingQty = receivingInventory?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0

    const totalQty = fbaQty + receivingQty

    return {
      available: totalQty >= quantityNeeded,
      fbaQty,
      receivingQty,
      totalQty
    }
  } catch (error) {
    console.error('Error checking inventory availability:', error)
    return { available: false, fbaQty: 0, receivingQty: 0, totalQty: 0 }
  }
}

/**
 * Restore inventory when a sales snapshot is deleted
 * Recreates the consumed inventory records
 */
export async function restoreSalesInventory(
  productId: string,
  consumedInventory: ConsumedInventory[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Recreate each consumed inventory record
    for (const inv of consumedInventory) {
      const { error: insertError } = await supabaseAdmin
        .from('inventory_locations')
        .insert({
          product_id: productId,
          location_type: inv.location_type,
          quantity: inv.quantity,
          unit_cost: inv.unit_cost,
          unit_shipping_cost: inv.unit_shipping_cost,
          po_id: null,
          notes: `Restored from deleted sales snapshot (originally from ${inv.created_at})`
        })

      if (insertError) {
        throw new Error(`Failed to restore inventory: ${insertError.message}`)
      }
    }

    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to restore inventory'
    }
  }
}
