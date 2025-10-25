-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE location_type AS ENUM ('warehouse', 'en_route', 'storage', 'production');
CREATE TYPE po_status AS ENUM ('in_production', 'in_storage', 'partially_shipped', 'fully_shipped', 'cancelled');
CREATE TYPE shipment_status AS ENUM ('pending', 'in_transit', 'delivered');

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    UNIQUE(user_id, name)
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    asin TEXT,
    fnsku TEXT,
    current_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    current_shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    UNIQUE(user_id, sku)
);

-- Inventory locations table
CREATE TABLE inventory_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    location_type location_type NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    unit_shipping_cost DECIMAL(10, 2) NOT NULL,
    po_id UUID,
    notes TEXT
);

-- Purchase orders table
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    po_number TEXT NOT NULL,
    supplier TEXT NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status po_status NOT NULL DEFAULT 'in_production',
    total_product_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    UNIQUE(user_id, po_number)
);

-- PO line items table
CREATE TABLE po_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL,
    quantity_shipped INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL
);

-- Shipping invoices table (shipments)
CREATE TABLE shipping_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    invoice_number TEXT NOT NULL,
    shipping_date DATE NOT NULL,
    carrier TEXT NOT NULL,
    tracking_number TEXT,
    status shipment_status NOT NULL DEFAULT 'pending',
    total_shipping_cost DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    UNIQUE(user_id, invoice_number)
);

-- Shipment PO links (many-to-many relationship)
CREATE TABLE shipment_pos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    shipping_invoice_id UUID REFERENCES shipping_invoices(id) ON DELETE CASCADE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(shipping_invoice_id, po_id)
);

-- Shipping line items table
CREATE TABLE shipping_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    shipping_invoice_id UUID REFERENCES shipping_invoices(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    po_line_item_id UUID REFERENCES po_line_items(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_shipping_cost DECIMAL(10, 2) NOT NULL,
    total_shipping_cost DECIMAL(10, 2) NOT NULL
);

-- Warehouse inventory snapshots (weekly tracking)
CREATE TABLE warehouse_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    snapshot_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    UNIQUE(user_id, product_id, snapshot_date)
);

-- Sales tracking (calculated from warehouse snapshots)
CREATE TABLE sales_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    units_sold INTEGER NOT NULL,
    starting_inventory INTEGER NOT NULL,
    ending_inventory INTEGER NOT NULL,
    units_received INTEGER NOT NULL DEFAULT 0
);

-- Add foreign key for po_id in inventory_locations after purchase_orders is created
ALTER TABLE inventory_locations
ADD CONSTRAINT fk_inventory_locations_po
FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_inventory_locations_product_id ON inventory_locations(product_id);
CREATE INDEX idx_inventory_locations_location_type ON inventory_locations(location_type);
CREATE INDEX idx_purchase_orders_user_id ON purchase_orders(user_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_po_line_items_po_id ON po_line_items(po_id);
CREATE INDEX idx_po_line_items_product_id ON po_line_items(product_id);
CREATE INDEX idx_shipping_invoices_user_id ON shipping_invoices(user_id);
CREATE INDEX idx_shipping_invoices_po_id ON shipping_invoices(po_id);
CREATE INDEX idx_shipping_line_items_invoice_id ON shipping_line_items(shipping_invoice_id);
CREATE INDEX idx_shipping_line_items_product_id ON shipping_line_items(product_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_locations_updated_at BEFORE UPDATE ON inventory_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_invoices_updated_at BEFORE UPDATE ON shipping_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for suppliers
CREATE POLICY "Users can view their own suppliers" ON suppliers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suppliers" ON suppliers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers" ON suppliers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers" ON suppliers
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for products
CREATE POLICY "Users can view their own products" ON products
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" ON products
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON products
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON products
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for inventory_locations
CREATE POLICY "Users can view inventory for their products" ON inventory_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = inventory_locations.product_id
            AND products.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert inventory for their products" ON inventory_locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = inventory_locations.product_id
            AND products.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update inventory for their products" ON inventory_locations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = inventory_locations.product_id
            AND products.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete inventory for their products" ON inventory_locations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = inventory_locations.product_id
            AND products.user_id = auth.uid()
        )
    );

-- Create RLS policies for purchase_orders
CREATE POLICY "Users can view their own purchase orders" ON purchase_orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchase orders" ON purchase_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase orders" ON purchase_orders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchase orders" ON purchase_orders
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for po_line_items
CREATE POLICY "Users can view PO line items for their POs" ON po_line_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM purchase_orders
            WHERE purchase_orders.id = po_line_items.po_id
            AND purchase_orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert PO line items for their POs" ON po_line_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM purchase_orders
            WHERE purchase_orders.id = po_line_items.po_id
            AND purchase_orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update PO line items for their POs" ON po_line_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM purchase_orders
            WHERE purchase_orders.id = po_line_items.po_id
            AND purchase_orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete PO line items for their POs" ON po_line_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM purchase_orders
            WHERE purchase_orders.id = po_line_items.po_id
            AND purchase_orders.user_id = auth.uid()
        )
    );

-- Create RLS policies for shipping_invoices
CREATE POLICY "Users can view their own shipping invoices" ON shipping_invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shipping invoices" ON shipping_invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shipping invoices" ON shipping_invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shipping invoices" ON shipping_invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for shipping_line_items
CREATE POLICY "Users can view shipping line items for their invoices" ON shipping_line_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shipping_invoices
            WHERE shipping_invoices.id = shipping_line_items.shipping_invoice_id
            AND shipping_invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert shipping line items for their invoices" ON shipping_line_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shipping_invoices
            WHERE shipping_invoices.id = shipping_line_items.shipping_invoice_id
            AND shipping_invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update shipping line items for their invoices" ON shipping_line_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM shipping_invoices
            WHERE shipping_invoices.id = shipping_line_items.shipping_invoice_id
            AND shipping_invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete shipping line items for their invoices" ON shipping_line_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM shipping_invoices
            WHERE shipping_invoices.id = shipping_line_items.shipping_invoice_id
            AND shipping_invoices.user_id = auth.uid()
        )
    );
