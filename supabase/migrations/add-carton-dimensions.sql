-- Add carton dimension fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS carton_length_cm DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS carton_width_cm DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS carton_height_cm DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS carton_weight_kg DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS units_per_carton INTEGER;

COMMENT ON COLUMN products.carton_length_cm IS 'Carton length in centimeters';
COMMENT ON COLUMN products.carton_width_cm IS 'Carton width in centimeters';
COMMENT ON COLUMN products.carton_height_cm IS 'Carton height in centimeters';
COMMENT ON COLUMN products.carton_weight_kg IS 'Carton gross weight in kilograms';
COMMENT ON COLUMN products.units_per_carton IS 'Number of units per shipping carton';
