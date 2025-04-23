import React from "react";

const Footer = () => {
  return (
    <footer className="mt-auto w-full text-center font-[var(--font-jetbrains-mono)] text-sm text-gray-400">
      © {new Date().getFullYear()} Leakr. All rights reserved.
    </footer>
  );
};

export default Footer;
