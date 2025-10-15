import React from 'react';

const SolluxLogo: React.FC = () => {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="w-16 h-16 bg-sollux-red rounded-2xl flex items-center justify-center mr-4 shadow-lg">
        <span className="text-white font-bold text-4xl">S</span>
      </div>
      <div>
        <h1 className="text-4xl font-bold text-foreground">SOLLUX</h1>
        <p className="text-lg text-muted-foreground">Business Platform</p>
      </div>
    </div>
  );
};

export default SolluxLogo;