import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { Company } from '@/types/company';

interface CompanyCardProps {
  company: Company;
  onClick: (company: Company) => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company, onClick }) => {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200 flex flex-col items-center justify-center p-4"
      onClick={() => onClick(company)}
    >
      <CardHeader className="pb-2">
        <Building2 className="h-8 w-8 text-sollux-red" />
      </CardHeader>
      <CardContent className="text-center">
        <CardTitle className="text-lg font-semibold text-sollux-black">{company.name}</CardTitle>
      </CardContent>
    </Card>
  );
};

export default CompanyCard;