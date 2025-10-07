import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} SOLLUX. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">v1.0.0</span>
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;