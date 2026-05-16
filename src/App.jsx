import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage.jsx";
import Politiquedeconfidentialite from "./pages/politique-de-confidentialite.jsx";
import Mentionslegales from "./pages/mentions-legales.jsx";
import Services from "./pages/services.jsx";
import Mecaniqueadomicile from "./pages/mecanique-a-domicile.jsx";
import Contact from "./pages/contact.jsx";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/politique-de-confidentialite" element={<Politiquedeconfidentialite />} />
      <Route path="/politique-de-confidentialite/" element={<Politiquedeconfidentialite />} />
      <Route path="/mentions-legales" element={<Mentionslegales />} />
      <Route path="/mentions-legales/" element={<Mentionslegales />} />
      <Route path="/services" element={<Services />} />
      <Route path="/services/" element={<Services />} />
      <Route path="/mecanique-a-domicile" element={<Mecaniqueadomicile />} />
      <Route path="/mecanique-a-domicile/" element={<Mecaniqueadomicile />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/contact/" element={<Contact />} />
      </Routes>
    </BrowserRouter>
  );
}
