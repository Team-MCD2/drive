import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamicParams = false;

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

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return zones.map((zone) => ({
    slug: zone.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const zone = zones.find((z) => z.slug === slug);
  const cityName = zone ? zone.name : 'Toulouse et alentours';

  return {
    title: `Toiture, Zinguerie, Démoussage et Nettoyage à ${cityName}`,
    description: `Découvrez nos services d’artisan couvreur à ${cityName}. Intervention rapide pour nettoyage, réparation, toiture, façade et zinguerie. Devis gratuit sous 24h.`,
  };
}

export default async function ZonePage({ params }: PageProps) {
  const { slug } = await params;
  const zone = zones.find((z) => z.slug === slug) ?? zones[0]!;

  const benefits = [
    "Intervention très rapide en cas d’urgence",
    'Devis 100% gratuit sous 24h',
    'Matériaux professionnels de haute qualité',
    'Équipe expérimentée',
    'Propreté du chantier garantie',
  ];

  return (
    <div className="bg-[#020617] text-slate-300 min-h-screen">
      {/* HERO */}
      <section className="relative pt-40 pb-24 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#020617] via-[#1E293B]/20 to-[#020617]">
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #EA559D 1px, transparent 0)', backgroundSize: '40px 40px' }}>
        </div>
        
        <div className="max-w-[1200px] mx-auto px-4 relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <svg fill="none" height="8" viewBox="0 0 21 8" width="21">
              <path d="M7 0H13L6 8H0L7 0Z" fill="#EA559D" />
            </svg>
          </div>
          <span className="text-[#EA559D] font-bold uppercase tracking-widest text-sm mb-4 block">Zone d'intervention</span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Toiture & Nettoyage à <span className="text-[#EA559D]">{zone.name}</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Intervention rapide et professionnelle pour tous vos travaux d'extérieur dans votre commune.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-24 bg-[#0F172A]">
        <div className="max-w-[1200px] mx-auto px-4 grid md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Votre artisan de proximité à {zone.name}</h2>
            <div className="space-y-6 text-slate-400 leading-relaxed">
              <p>
                Vous résidez à <strong className="text-white">{zone.name}</strong> ou dans les environs 
                et vous recherchez un professionnel fiable pour l'entretien de votre maison ? 
                Nous sommes votre partenaire de confiance.
              </p>
              <p>
                La toiture et la façade sont les premiers remparts de votre habitation. Avec le climat local, 
                mousses et salissures s'accumulent rapidement. Nous intervenons rapidement à 
                <strong className="text-white"> {zone.name}</strong> pour le démoussage, le nettoyage haute pression 
                et les travaux de zinguerie.
              </p>
              <p>
                En cas d'urgence — fuites ou tuiles cassées — notre réactivité nous permet d'être sur place 
                dans les plus brefs délais pour sécuriser votre couverture.
              </p>
            </div>
          </div>

          <div className="bg-[#1E293B] p-10 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#EA559D]/5 blur-3xl"></div>
            <h3 className="text-2xl font-bold mb-8 text-white relative z-10">Nos engagements</h3>
            <ul className="space-y-4 relative z-10">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-4 bg-[#020617]/50 p-4 rounded-xl border border-slate-800/50">
                  <span className="w-8 h-8 bg-[#EA559D] rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">✓</span>
                  <span className="font-medium text-white">{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-12 text-center">
              <Link href="/contact" className="inline-block w-full py-4 px-8 bg-[#EA559D] hover:bg-[#EA559D]/90 text-white font-bold rounded-full transition-all">
                Demander un devis gratuit à {zone.name}
              </Link>
              <p className="mt-4 text-xs text-slate-500">Réponse rapide garantie !</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
