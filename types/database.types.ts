export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      team_users: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'viewer' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer' | 'member'
          created_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          team_id: string
          name: string
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          team_id: string
          name: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          team_id?: string
          name?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
        }
      }
      products: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          team_id: string
          sku: string
          name: string
          description: string | null
          asin: string | null
          fnsku: string | null
          current_cost: number
          current_shipping_cost: number
          total_delivered: number
          carton_length_cm: number | null
          carton_width_cm: number | null
          carton_height_cm: number | null
          carton_weight_kg: number | null
          units_per_carton: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          team_id: string
          sku: string
          name: string
          description?: string | null
          asin?: string | null
          fnsku?: string | null
          current_cost: number
          current_shipping_cost: number
          total_delivered?: number
          carton_length_cm?: number | null
          carton_width_cm?: number | null
          carton_height_cm?: number | null
          carton_weight_kg?: number | null
          units_per_carton?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          team_id?: string
          sku?: string
          name?: string
          description?: string | null
          asin?: string | null
          fnsku?: string | null
          current_cost?: number
          current_shipping_cost?: number
          total_delivered?: number
          carton_length_cm?: number | null
          carton_width_cm?: number | null
          carton_height_cm?: number | null
          carton_weight_kg?: number | null
          units_per_carton?: number | null
        }
      }
      inventory_locations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          product_id: string
          location_type: 'warehouse' | 'en_route' | 'storage' | 'production'
          quantity: number
          unit_cost: number
          unit_shipping_cost: number
          po_id: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          product_id: string
          location_type: 'warehouse' | 'en_route' | 'storage' | 'production'
          quantity: number
          unit_cost: number
          unit_shipping_cost: number
          po_id?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          product_id?: string
          location_type?: 'warehouse' | 'en_route' | 'storage' | 'production'
          quantity?: number
          unit_cost?: number
          unit_shipping_cost?: number
          po_id?: string | null
          notes?: string | null
        }
      }
      purchase_orders: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          team_id: string
          po_number: string
          supplier: string
          order_date: string
          expected_delivery_date: string | null
          status: 'in_production' | 'in_storage' | 'partially_shipped' | 'fully_shipped' | 'cancelled' | 'complete'
          total_product_cost: number
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          team_id: string
          po_number: string
          supplier: string
          order_date: string
          expected_delivery_date?: string | null
          status?: 'in_production' | 'in_storage' | 'partially_shipped' | 'fully_shipped' | 'cancelled' | 'complete'
          total_product_cost: number
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          team_id?: string
          po_number?: string
          supplier?: string
          order_date?: string
          expected_delivery_date?: string | null
          status?: 'in_production' | 'in_storage' | 'partially_shipped' | 'fully_shipped' | 'cancelled' | 'complete'
          total_product_cost?: number
          notes?: string | null
        }
      }
      po_line_items: {
        Row: {
          id: string
          created_at: string
          po_id: string
          product_id: string
          quantity: number
          quantity_shipped: number
          unit_cost: number
          total_cost: number
        }
        Insert: {
          id?: string
          created_at?: string
          po_id: string
          product_id: string
          quantity: number
          quantity_shipped?: number
          unit_cost: number
          total_cost: number
        }
        Update: {
          id?: string
          created_at?: string
          po_id?: string
          product_id?: string
          quantity?: number
          quantity_shipped?: number
          unit_cost?: number
          total_cost?: number
        }
      }
      shipping_invoices: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          team_id: string
          invoice_number: string
          shipping_date: string
          carrier: string
          tracking_number: string | null
          status: 'pending' | 'in_transit' | 'delivered'
          total_shipping_cost: number
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          team_id: string
          invoice_number: string
          shipping_date: string
          carrier: string
          tracking_number?: string | null
          status?: 'pending' | 'in_transit' | 'delivered'
          total_shipping_cost: number
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          team_id?: string
          invoice_number?: string
          shipping_date?: string
          carrier?: string
          tracking_number?: string | null
          status?: 'pending' | 'in_transit' | 'delivered'
          total_shipping_cost?: number
          notes?: string | null
        }
      }
      shipment_pos: {
        Row: {
          id: string
          created_at: string
          shipping_invoice_id: string
          po_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          shipping_invoice_id: string
          po_id: string
        }
        Update: {
          id?: string
          created_at?: string
          shipping_invoice_id?: string
          po_id?: string
        }
      }
      shipping_line_items: {
        Row: {
          id: string
          created_at: string
          shipping_invoice_id: string
          product_id: string
          po_line_item_id: string | null
          quantity: number
          unit_shipping_cost: number
          total_shipping_cost: number
        }
        Insert: {
          id?: string
          created_at?: string
          shipping_invoice_id: string
          product_id: string
          po_line_item_id?: string | null
          quantity: number
          unit_shipping_cost: number
          total_shipping_cost: number
        }
        Update: {
          id?: string
          created_at?: string
          shipping_invoice_id?: string
          product_id?: string
          po_line_item_id?: string | null
          quantity?: number
          unit_shipping_cost?: number
          total_shipping_cost?: number
        }
      }
      warehouse_snapshots: {
        Row: {
          id: string
          created_at: string
          user_id: string
          team_id: string
          product_id: string
          snapshot_date: string
          quantity: number
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          team_id: string
          product_id: string
          snapshot_date: string
          quantity: number
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          team_id?: string
          product_id?: string
          snapshot_date?: string
          quantity?: number
          notes?: string | null
        }
      }
      sales_records: {
        Row: {
          id: string
          created_at: string
          user_id: string
          team_id: string
          product_id: string
          start_date: string
          end_date: string
          units_sold: number
          starting_inventory: number
          ending_inventory: number
          units_received: number
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          team_id: string
          product_id: string
          start_date: string
          end_date: string
          units_sold: number
          starting_inventory: number
          ending_inventory: number
          units_received?: number
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          team_id?: string
          product_id?: string
          start_date?: string
          end_date?: string
          units_sold?: number
          starting_inventory?: number
          ending_inventory?: number
          units_received?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_total_delivered: {
        Args: {
          p_product_id: string
          p_quantity: number
        }
        Returns: void
      }
    }
    Enums: {
      location_type: 'warehouse' | 'en_route' | 'in_storage' | 'in_production'
      po_status: 'in_production' | 'in_storage' | 'partially_shipped' | 'fully_shipped' | 'cancelled'
      shipment_status: 'pending' | 'in_transit' | 'delivered'
    }
  }
}
