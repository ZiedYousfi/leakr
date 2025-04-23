import React from 'react';

const Footer = () => {
  return (
    <footer className="absolute bottom-8 w-full text-center font-mono text-sm text-gray-400">
      © {new Date().getFullYear()} Leakr. All rights reserved.
    </footer>
  );
};

export default Footer;
