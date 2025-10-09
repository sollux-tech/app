import { Icon as LucideIcon } from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  label: string;
  to: string;
  icon: string;
  order: number;
}

export interface SidebarConfig {
  id: string;
  user_id: string;
  logo_url: string | null;
  nav_items: SidebarNavItem[];
}

export interface SidebarNavItemFormData {
  label: string;
  to: string;
  icon: string;
  order: number;
}

export interface IconMap {
  [key: string]: LucideIcon;
}