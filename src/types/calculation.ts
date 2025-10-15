export interface Calculation {
  id: string;
  user_id: string;
  product_name: string;
  unit_cost: number;
  fixed_expenses_percentage: number;
  taxes_percentage: number;
  commission_percentage: number | null;
  desired_margin_percentage: number;
  calculated_selling_price: number | null;
  calculated_net_margin: number | null;
  calculated_net_profit: number | null;
  created_at: string;
  updated_at: string;
}

export interface CalculationFormData {
  product_name: string;
  unit_cost: number | string; // Usar string para input, converter para number
  fixed_expenses_percentage: number | string;
  taxes_percentage: number | string;
  commission_percentage: number | string;
  desired_margin_percentage: number | string;
}

export interface PriceComposition {
  name: string;
  value: number;
  percentage: number;
  color: string;
}