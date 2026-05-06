export interface Zone {
  name: string;
  slug: string;
  /** Texte localise specifique (optionnel). */
  blurb?: string;
}

export const zones: Zone[] = [
  { name: 'Toulouse', slug: 'toulouse' },
  { name: 'Blagnac', slug: 'blagnac' },
  { name: 'Colomiers', slug: 'colomiers' },
  { name: 'Tournefeuille', slug: 'tournefeuille' },
  { name: 'Muret', slug: 'muret' },
  { name: 'Balma', slug: 'balma' },
  { name: 'L’Union', slug: 'l-union' },
  { name: 'Ramonville-Saint-Agne', slug: 'ramonville-saint-agne' },
  { name: 'Cugnaux', slug: 'cugnaux' },
  { name: 'Plaisance-du-Touch', slug: 'plaisance-du-touch' },
  { name: 'Castanet-Tolosan', slug: 'castanet-tolosan' },
  { name: 'Saint-Orens-de-Gameville', slug: 'saint-orens-de-gameville' },
];
