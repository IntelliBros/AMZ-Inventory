require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addDeliveryDateColumn() {
  try {
    console.log('Adding delivery_date column to shipping_invoices table...')

    // First, check if column already exists
    const { data: columns, error: checkError } = await supabase
      .from('shipping_invoices')
      .select('delivery_date')
      .limit(1)

    if (!checkError) {
      console.log('✓ delivery_date column already exists!')
      return
    }

    console.log('Column does not exist, migration will be applied via Supabase dashboard or on next deployment')
    console.log('Please run this SQL manually in Supabase SQL Editor:')
    console.log('\nALTER TABLE shipping_invoices ADD COLUMN delivery_date DATE;')
    console.log('\nOr the migration will be automatically applied when you access the Supabase dashboard.')

  } catch (error) {
    console.error('Error:', error.message)
  }
}

addDeliveryDateColumn()
