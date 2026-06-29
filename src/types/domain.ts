import type { Database } from "@/integrations/supabase/types";

export type Tool = Database["public"]["Tables"]["tools"]["Row"];
export type ToolInsert = Database["public"]["Tables"]["tools"]["Insert"];
export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type VehicleInsert = Database["public"]["Tables"]["vehicles"]["Insert"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ToolCheckout = Database["public"]["Tables"]["tool_checkouts"]["Row"];
export type ToolCheckoutInsert = Database["public"]["Tables"]["tool_checkouts"]["Insert"];
export type VehicleCheckout = Database["public"]["Tables"]["vehicle_checkouts"]["Row"];
export type VehicleCheckoutInsert = Database["public"]["Tables"]["vehicle_checkouts"]["Insert"];
export type ConstructionSite = Database["public"]["Tables"]["construction_sites"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type AssetTransfer = Database["public"]["Tables"]["asset_transfers"]["Row"];
export type SystemLog = Database["public"]["Tables"]["system_logs"]["Row"];
