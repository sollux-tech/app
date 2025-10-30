import React from 'react';
import {
  HeartPulse, Fingerprint, Link as LinkIcon, Settings, Box, Users, Building2, ShieldCheck, Briefcase, UserCog, Newspaper, LayoutDashboard, Icon as LucideIcon, Home, BarChart2, ListChecks, ListTodo, Blocks, Scale, Target, Tag, ClipboardCheck, ClipboardList, MessageSquareText, Award, TrendingUp, ShoppingBag, Lightbulb, Ruler, Repeat, CheckCircle, Zap
} from 'lucide-react';
import { IconMap } from '@/types/sidebar';

export const iconMap: IconMap = {
  HeartPulse,
  Fingerprint,
  Link: LinkIcon,
  Settings,
  Box,
  Users,
  Building2,
  ShieldCheck,
  Briefcase,
  UserCog,
  Newspaper,
  LayoutDashboard,
  Home,
  BarChart2,
  ListChecks,
  ListTodo,
  Blocks,
  Scale,
  Target,
  Tag,
  ClipboardCheck,
  ClipboardList,
  MessageSquareText,
  Award,
  TrendingUp,
  ShoppingBag,
  Lightbulb,
  Ruler,
  Repeat,
  CheckCircle,
  Zap,
};

export const iconNames = Object.keys(iconMap).sort();

export const getIcon = (name: string): React.ElementType => {
  return iconMap[name] || Box; // Retorna Box como um ícone padrão
};