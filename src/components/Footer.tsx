import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-sollux-black text-sollux-white py-4 px-4 mt-8 text-center text-sm">
      <p>&copy; {new Date().getFullYear()} SOLLUX. Todos os direitos reservados.</p>
      <p className="mt-1">Desenvolvido com paixão e tecnologia.</p>
    </footer>
  );
};

export default Footer;