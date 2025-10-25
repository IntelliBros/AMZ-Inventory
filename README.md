# Amazon FBA Inventory & Cost Management System

A comprehensive web application for managing Amazon FBA private label inventory and calculating cost of goods with dynamic pricing based on purchase orders and shipping invoices.

## Features

### Inventory Tracking
- Track inventory across 4 locations:
  - **Amazon Warehouse**: Units currently at Amazon fulfillment centers
  - **En Route**: Units being shipped to Amazon
  - **Storage**: Units in your own storage facility
  - **In Production**: Units currently being manufactured

### Dynamic Cost Calculation
- Product costs update with each purchase order
- Shipping costs allocated per unit based on shipping invoices
- Real-time inventory value calculations
- Historical cost tracking per inventory batch

### Purchase Order Management
- Create and manage purchase orders
- Multiple line items per PO
- Track PO status (Pending, In Production, Shipped, Received, Cancelled)
- Automatic total calculations for product costs
- Shipping tracked separately through Shipping Invoices

### Product Management
- Manage product catalog with:
  - SKU, Name, Description
  - ASIN and FNSKU tracking
  - Current unit cost (reference only)
  - Historical costs tracked through inventory batches

### Dashboard
- Real-time inventory value breakdown by location
- Total inventory value across all locations
- Visual representation of inventory distribution
- Key metrics and statistics

## Tech Stack

- **Frontend**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd AMZ-Inventory
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new Supabase project at https://supabase.com
   - Copy the SQL from `supabase-schema.sql` and run it in the Supabase SQL Editor
   - Get your project URL and anon key from Project Settings > API

4. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Run the development server:
```bash
npm run dev
```

6. Open http://localhost:3000 in your browser

## Database Schema

### Products
- Core product information
- Current cost and shipping cost
- ASIN/FNSKU tracking

### Inventory Locations
- Quantity by location type
- Unit cost and shipping cost per batch
- Links to purchase orders

### Purchase Orders
- PO header with supplier and dates
- Status tracking
- Total costs calculation

### PO Line Items
- Product quantities and costs per PO
- Individual line item totals

### Shipping Invoices
- Shipping invoice details
- Carrier and tracking information
- Total shipping costs

### Shipping Line Items
- Product quantities per shipping invoice
- Unit shipping cost allocation

## Usage Guide

### 1. Add Products
- Navigate to "Products"
- Click "Add Product"
- Enter SKU, name, and description
- Optionally add ASIN/FNSKU
- Enter reference costs (used as defaults)

### 2. Create Purchase Orders
- Navigate to "Purchase Orders"
- Click "Create Purchase Order"
- Enter PO number, supplier, and dates
- Add line items with products and quantities
- System auto-fills current product costs
- No shipping costs on PO (tracked separately)
- Save to create PO

### 3. Create Shipping Invoices
- Navigate to "Shipping"
- Click "Add Shipping Invoice"
- Link to a PO (optional)
- Enter carrier, tracking, and shipping date
- Add line items with products and quantities
- **Split shipments**: You can create multiple shipping invoices for one PO
  - Example: Ship 3 units in one shipment, 2 units in another
- Enter actual shipping costs per unit or total
- Save to create shipping invoice

### 4. Track Inventory
- Navigate to "Inventory"
- Click "Add Inventory"
- Select product and location type
- Enter quantity and costs
- Costs can differ from reference costs
- Link to PO if applicable
- Shipping costs from shipping invoices

### 5. View Dashboard
- See real-time inventory values
- View breakdown by location
- Monitor total inventory value
- Track key metrics

## Cost Calculation Logic

The system uses a batch-based costing approach:

1. **Product Current Cost**: The default/current cost for a product
2. **Inventory Batch Cost**: Each inventory batch can have its own cost (from specific PO)
3. **Unit Total Cost**: Product Cost + Shipping Cost per unit
4. **Location Value**: Sum of (Quantity × Unit Total Cost) for all batches in that location
5. **Total Inventory Value**: Sum of all location values

This allows for:
- Accurate COGS tracking
- Historical cost analysis
- Different costs for different batches
- Weighted average cost calculations

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Secure authentication with Supabase Auth
- Environment variables for sensitive data

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Deploy to Other Platforms

The app is a standard Next.js application and can be deployed to:
- Netlify
- Railway
- AWS Amplify
- Self-hosted with Node.js

## Future Enhancements

- CSV import/export for bulk operations
- Advanced reporting and analytics
- Amazon API integration for automated inventory sync
- Multi-currency support
- Profit margin calculations
- Low inventory alerts
- Forecasting and reorder suggestions

## License

MIT

## Support

For issues and questions, please open an issue in the GitHub repository.
