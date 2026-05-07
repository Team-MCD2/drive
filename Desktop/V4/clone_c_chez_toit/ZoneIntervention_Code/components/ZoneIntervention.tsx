'use client';
import React from 'react';
import Link from 'next/link';

const zones = [
  { name: 'Toulouse', slug: 'toulouse' },
  { name: 'Blagnac', slug: 'blagnac' },
  { name: 'Colomiers', slug: 'colomiers' },
  { name: 'Tournefeuille', slug: 'tournefeuille' },
  { name: 'Muret', slug: 'muret' },
  { name: 'Balma', slug: 'balma' },
  { name: "L’Union", slug: 'l-union' },
  { name: 'Ramonville-Saint-Agne', slug: 'ramonville-saint-agne' },
  { name: 'Cugnaux', slug: 'cugnaux' },
  { name: 'Plaisance-du-Touch', slug: 'plaisance-du-touch' },
  { name: 'Castanet-Tolosan', slug: 'castanet-tolosan' },
  { name: 'Saint-Orens-de-Gameville', slug: 'saint-orens-de-gameville' },
];

function LocationIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"
        fill="#EA559D"
      />
    </svg>
  );
}

export default function ZoneIntervention() {
  return (
    <section className="relative py-24 bg-darker overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #EA559D 1px, transparent 0)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="container-custom relative z-10">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <svg fill="none" height="8" viewBox="0 0 21 8" width="21">
              <path d="M7 0H13L6 8H0L7 0Z" fill="#EA559D" />
              <path d="M13 0H7L15 8H21L13 0Z" fill="#EA559D" opacity="0.6" />
            </svg>
          </div>

          <h2 className="mb-6 text-3xl font-bold">Notre zone d'intervention</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Nous intervenons rapidement dans toute la zone 
            pour vos urgences et travaux de toiture.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {zones.map((zone) => (
            <Link
              key={zone.slug}
              href={`/zone/${zone.slug}`}
              className="flex items-center gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-[#EA559D] hover:bg-[#EA559D]/5 hover:-translate-y-1 transition-all group"
            >
              <LocationIcon />
              <span className="font-semibold text-white group-hover:text-[#EA559D] transition-colors">
                {zone.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
