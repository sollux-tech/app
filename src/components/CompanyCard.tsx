import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Edit, Trash2 } from 'lucide-react';
import { Company } from '@/types/company';
import { Button } from '@/components/ui/button';

interface CompanyCardProps {
  company: Company;
  onEdit: (company: Company) => void;
  onDelete: (companyId: string) => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company, onEdit, onDelete }) => {
  return (
    <Card className="flex flex-col items-center justify-between p-4 bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2 flex flex-col items-center">
        <Building2 className="h-8 w-8 text-sollux-red mb-2" />
        <CardTitle className="text-lg font-semibold text-sollux-black text-center">{company.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation(); // Prevent card's default click
            onEdit(company);
          }}
          className="flex items-center gap-1 text-sollux-black border-sollux-gray hover:bg-gray-100 rounded-lg"
        >
          <Edit className="h-4 w-4" /> Editar
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation(); // Prevent card's default click
            onDelete(company.id);
          }}
          className="flex items-center gap-1 bg-sollux-red hover:bg-red-700 text-white rounded-lg"
        >
          <Trash2 className="h-4 w-4" /> Excluir
        </Button>
      </CardContent>
    </Card>
  );
};

export default CompanyCard;