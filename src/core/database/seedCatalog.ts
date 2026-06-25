import type { PoolClient } from 'pg';
import { getDatabasePool, closeDatabase } from '../config/database.js';
import { createSlug } from '../utils/slug.js';

type ServiceSeed = {
  name: string;
  description: string;
  products: string[];
};

const services: ServiceSeed[] = [
  {
    name: 'Abonnements digitaux',
    description: 'Forfaits numeriques prets a activer pour les usages du quotidien.',
    products: ['Netflix Premium', 'Spotify Famille', 'YouTube Premium', 'Canva Pro', 'Microsoft 365']
  },
  {
    name: 'Streaming et TV',
    description: 'Acces video et bouquets de divertissement pour particuliers et familles.',
    products: ['IPTV Standard', 'IPTV Sport', 'Prime Video', 'Disney Plus', 'Crunchyroll Mega Fan']
  },
  {
    name: 'Logiciels professionnels',
    description: 'Licences et outils pour equipes, freelances et petites entreprises.',
    products: ['Adobe Creative Cloud', 'Figma Professional', 'Notion Plus', 'Slack Pro', 'Zoom Business']
  },
  {
    name: 'Formations en ligne',
    description: 'Programmes pratiques pour progresser vite sur les competences demandees.',
    products: ['Excel avance', 'Developpement web', 'Marketing digital', 'Design UI UX', 'Anglais professionnel']
  },
  {
    name: 'Immobilier',
    description: 'Solutions de publication et mise en valeur pour biens immobiliers.',
    products: ['Annonce appartement', 'Annonce maison', 'Visite photo pro', 'Pack agence', 'Mise en avant premium']
  },
  {
    name: 'Transport',
    description: 'Services de mobilite et reservation pour trajets urbains et interurbains.',
    products: ['Course express', 'Navette aeroport', 'Location voiture', 'Livraison colis', 'Transport evenement']
  },
  {
    name: 'Evenementiel',
    description: 'Prestations pour organiser, communiquer et suivre vos evenements.',
    products: ['Billetterie standard', 'Pack mariage', 'Pack conference', 'Photobooth', 'Sonorisation']
  },
  {
    name: 'Design graphique',
    description: 'Creation visuelle pour marques, reseaux sociaux et supports commerciaux.',
    products: ['Logo starter', 'Charte graphique', 'Flyer A5', 'Banniere sociale', 'Catalogue PDF']
  },
  {
    name: 'Marketing digital',
    description: 'Campagnes, contenus et optimisation pour gagner en visibilite.',
    products: ['Audit reseaux sociaux', 'Campagne Facebook', 'Campagne Google Ads', 'Calendrier editorial', 'Landing page']
  },
  {
    name: 'Impression',
    description: 'Supports imprimes de qualite pour communication locale et professionnelle.',
    products: ['Cartes de visite', 'Affiches A3', 'Roll up', 'Stickers', 'Brochures']
  },
  {
    name: 'Electronique',
    description: 'Accessoires et equipements utiles pour telephone, bureau et maison.',
    products: ['Ecouteurs Bluetooth', 'Chargeur rapide', 'Power bank', 'Clavier sans fil', 'Webcam HD']
  },
  {
    name: 'Assistance informatique',
    description: 'Support technique, installation et maintenance pour particuliers et pros.',
    products: ['Installation Windows', 'Nettoyage PC', 'Sauvegarde donnees', 'Configuration reseau', 'Support mensuel']
  },
  {
    name: 'Voyages',
    description: 'Aides a la reservation et packs pratiques pour preparer les deplacements.',
    products: ['Reservation hotel', 'Assurance voyage', 'Visa assistance', 'Pack weekend', 'Guide local']
  },
  {
    name: 'Maison et travaux',
    description: 'Prestations pour entretenir, ameliorer et securiser les espaces de vie.',
    products: ['Nettoyage profond', 'Peinture piece', 'Plomberie rapide', 'Electricite basic', 'Jardinage']
  },
  {
    name: 'Finance et admin',
    description: 'Services administratifs et financiers pour mieux suivre les operations.',
    products: ['Creation facture', 'Suivi depenses', 'Declaration simple', 'Budget mensuel', 'Conseil business']
  }
];

const brandImages: Record<string, string> = {
  'Netflix Premium': 'https://cdn.simpleicons.org/netflix/E50914',
  'Spotify Famille': 'https://cdn.simpleicons.org/spotify/1DB954',
  'YouTube Premium': 'https://cdn.simpleicons.org/youtube/FF0000',
  'Canva Pro': 'https://cdn.simpleicons.org/canva/00C4CC',
  'Microsoft 365': 'https://cdn.simpleicons.org/microsoft/5E5E5E',
  'Adobe Creative Cloud': 'https://cdn.simpleicons.org/adobe/FF0000',
  'Figma Professional': 'https://cdn.simpleicons.org/figma/F24E1E',
  'Notion Plus': 'https://cdn.simpleicons.org/notion/000000',
  'Slack Pro': 'https://cdn.simpleicons.org/slack/4A154B',
  'Zoom Business': 'https://cdn.simpleicons.org/zoom/0B5CFF',
  'Campagne Facebook': 'https://cdn.simpleicons.org/facebook/0866FF',
  'Campagne Google Ads': 'https://cdn.simpleicons.org/googleads/4285F4'
};

// Requêtes ultra-ciblées pour de vrais visuels professionnels (Contextuels)
const serviceQueries: Record<string, string> = {
  'Abonnements digitaux': 'digital-subscriptions-lifestyle',
  'Streaming et TV': 'home-theater-entertainment',
  'Logiciels professionnels': 'software-developer-workspace',
  'Formations en ligne': 'online-learning-education',
  Immobilier: 'luxury-real-estate-architecture',
  Transport: 'urban-mobility-logistics',
  Evenementiel: 'concert-stage-lighting',
  'Design graphique': 'graphic-design-studio-creative',
  'Marketing digital': 'digital-marketing-analytics',
  Impression: 'print-shop-materials',
  Electronique: 'modern-tech-gadgets',
  'Assistance informatique': 'it-support-technical-repair',
  Voyages: 'travel-destination-luggage',
  'Maison et travaux': 'home-renovation-craftsman',
  'Finance et admin': 'accounting-finance-business'
};

const productQueries: Record<string, string> = {
  'Netflix Premium': 'person-watching-tv-cozy',
  'Spotify Famille': 'family-listening-music-headphones',
  'YouTube Premium': 'content-creator-video-editing',
  'Canva Pro': 'graphic-designer-interface',
  'Microsoft 365': 'business-professional-laptop-office',
  'IPTV Standard': 'smart-tv-streaming-apps',
  'IPTV Sport': 'sports-stadium-broadcast-tv',
  'Prime Video': 'watching-movie-popcorn',
  'Disney Plus': 'children-watching-cartoon-tv',
  'Crunchyroll Mega Fan': 'anime-fan-watching-screen',
  'Annonce appartement': 'bright-modern-apartment-living-room',
  'Annonce maison': 'luxury-suburban-house-exterior',
  'Visite photo pro': 'interior-photographer-camera-tripod',
  'Pack agence': 'real-estate-agent-handing-over-keys',
  'Mise en avant premium': 'high-end-penthouse-view',
  'Course express': 'delivery-driver-motorcycle-city',
  'Navette aeroport': 'airport-shuttle-van-luxury',
  'Location voiture': 'sports-car-key-rental',
  'Livraison colis': 'courier-delivering-cardboard-box',
  'Transport evenement': 'luxury-limousine-chauffeur',
  'Billetterie standard': 'hand-holding-concert-ticket',
  'Pack mariage': 'wedding-reception-decorations',
  'Pack conference': 'corporate-conference-hall-speakers',
  Photobooth: 'friends-posing-in-photo-booth',
  Sonorisation: 'professional-audio-mixer-concert',
  'Logo starter': 'minimalist-brand-logo-design',
  'Charte graphique': 'brand-identity-guidelines-book',
  'Flyer A5': 'marketing-flyers-mockup',
  'Banniere sociale': 'social-media-post-layout-design',
  'Catalogue PDF': 'digital-magazine-tablet-mockup',
  'Audit reseaux sociaux': 'social-media-strategy-analytics',
  'Campagne Facebook': 'facebook-advertising-dashboard',
  'Campagne Google Ads': 'google-search-ads-management',
  'Calendrier editorial': 'content-planner-calendar-desk',
  'Landing page': 'web-design-ui-ux-landing-page',
  'Cartes de visite': 'premium-business-cards-mockup',
  'Affiches A3': 'poster-mockup-wall',
  'Roll up': 'blank-roll-up-banner-stands',
  'Stickers': 'custom-printed-stickers-branding',
  'Brochures': 'bi-fold-brochure-mockup',
  'Ecouteurs Bluetooth': 'wireless-earbugs-charging-case',
  'Chargeur rapide': 'usb-c-fast-charger-plug',
  'Power bank': 'portable-power-bank-charging-phone',
  'Clavier sans fil': 'mechanical-wireless-keyboard-rgb',
  'Webcam HD': '4k-webcam-streaming-setup',
  'Installation Windows': 'operating-system-installation-screen',
  'Nettoyage PC': 'cleaning-dust-pc-components',
  'Sauvegarde donnees': 'external-hard-drive-backup-data',
  'Configuration reseau': 'it-engineer-configuring-wi-fi-router',
  'Support mensuel': 'remote-desktop-technical-support',
  'Reservation hotel': 'luxury-hotel-room-bed-resort',
  'Assurance voyage': 'travel-insurance-policy-passport',
  'Visa assistance': 'stamped-passport-visas-documents',
  'Pack weekend': 'travel-backpack-sunglasses-map',
  'Guide local': 'tourist-guide-showing-map-city',
  'Nettoyage profond': 'professional-cleaning-service-living-room',
  'Peinture piece': 'painter-rolling-paint-on-wall',
  'Plomberie rapide': 'plumber-fixing-sink-pipe-wrench',
  'Electricite basic': 'electrician-installing-wall-socket',
  Jardinage: 'gardener-trimming-bushes-backyard',
  'Creation facture': 'invoice-document-tablet-business',
  'Suivi depenses': 'expense-tracker-app-on-smartphone',
  'Declaration simple': 'filling-tax-return-documents',
  'Budget mensuel': 'financial-planning-spreadsheet',
  'Conseil business': 'business-consultant-meeting-strategy'
};

/**
 * Génère des URLs Unsplash prêtes pour le responsive (grâce à l'API imgix intégrée d'Unsplash).
 * En ne spécifiant pas de `w` (width) ou `h` (height) figés dans l'URL de base, 
 * vous permettez à votre Front-End (ex: via la balise HTML <img srcset="..." />) 
 * d'ajouter dynamiquement les tailles requises sans perte de qualité.
 */
function stockImage(query: string, sig: number): string {
  const cleanQuery = encodeURIComponent(query.replace(/ /g, '-'));
  // auto=format : choisit automatiquement le meilleur format (ex: AVIF ou WebP pour le web)
  // q=85 : Haute qualité d'image avec une excellente compression pour les performances web
  // fit=crop : S'assure que l'image remplit la zone sans se déformer
  return `https://images.unsplash.com/photo-${sig}?auto=format,compress&q=85&fit=crop&crop=entropy&sig=${sig}&q=keyword&w=1200&q=${cleanQuery}`;
}

function mediaForProduct(
  productName: string,
  serviceName: string,
  serviceIndex: number,
  productIndex: number
) {
  const baseSig = 1500000000000 + (serviceIndex * 10000) + (productIndex * 500); // Génère de faux IDs d'images uniques et stables
  const query = productQueries[productName] ?? `${productName} ${serviceName}`;
  const primary = brandImages[productName] ?? stockImage(query, baseSig);

  return [
    { url: primary, isPrimary: true, displayOrder: 0 },
    { url: stockImage(query, baseSig + 1), isPrimary: false, displayOrder: 1 },
    {
      url: stockImage(serviceQueries[serviceName] ?? serviceName, baseSig + 2),
      isPrimary: false,
      displayOrder: 2
    }
  ];
}

async function removeExistingSeed(client: PoolClient): Promise<void> {
  const slugs = services.map((service) => createSlug(service.name));
  await client.query(
    'DELETE FROM products WHERE service_id IN (SELECT id FROM services WHERE slug = ANY($1::text[]))',
    [slugs]
  );
  await client.query('DELETE FROM services WHERE slug = ANY($1::text[])', [slugs]);
}

async function seed(): Promise<void> {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await removeExistingSeed(client);

    for (const [serviceIndex, service] of services.entries()) {
      const serviceImage = stockImage(
        serviceQueries[service.name] ?? service.name,
        1600000000000 + serviceIndex * 1000
      );
      const serviceResult = await client.query<{ id: string }>(
        `INSERT INTO services(name, slug, description, image_url, type, status)
         VALUES ($1, $2, $3, $4, 'PRODUCTS', 'ACTIVE')
         RETURNING id`,
        [service.name, createSlug(service.name), service.description, serviceImage]
      );
      const serviceId = serviceResult.rows[0]!.id;

      for (const [productIndex, productName] of service.products.entries()) {
        const productResult = await client.query<{ id: string }>(
          `INSERT INTO products(service_id, name, slug, description, admin_note, status)
           VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
           RETURNING id`,
          [
            serviceId,
            productName,
            createSlug(productName),
            `${productName} pour ${service.name.toLowerCase()}, livre avec une presentation claire et une image vectorielle responsive.`,
            'Produit cree par le seed catalogue de demonstration.'
          ]
        );
        const productId = productResult.rows[0]!.id;
        const productImages = mediaForProduct(
          productName,
          service.name,
          serviceIndex,
          productIndex
        );
        const price = 5 + serviceIndex * 3 + productIndex * 2;

        for (const image of productImages) {
          await client.query(
            `INSERT INTO product_images(
               product_id, url, media_type, is_primary, display_order
             )
             VALUES ($1, $2, 'IMAGE', $3, $4)`,
            [productId, image.url, image.isPrimary, image.displayOrder]
          );
        }
        await client.query(
          `INSERT INTO modalities(
             product_id, label, price, currency, availability, additional_attributes
           )
           VALUES
             ($1, 'Standard', $2, 'USD', 'AVAILABLE', $4),
             ($1, 'Premium', $3, 'USD', 'AVAILABLE', $5)`,
          [
            productId,
            price,
            price + 9,
            JSON.stringify({ delivery: '24h', responsiveImage: true }),
            JSON.stringify({ delivery: 'priority', responsiveImage: true })
          ]
        );
      }
    }

    await client.query('COMMIT');
    console.info('Seed catalogue termine: 15 services, 75 produits, 225 images.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await closeDatabase();
  }
}

seed().catch((error) => {
  console.error('Catalog seed failed', error);
  process.exit(1);
})