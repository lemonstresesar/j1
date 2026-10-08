import fs from 'fs';
import path from 'path';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

interface MetaData {
  title: string;
  description: string;
  image: string;
  url: string;
}

export async function fetchItemMeta(type: 'produit' | 'pack', id: string, origin: string): Promise<MetaData> {
  const defaultMeta: MetaData = {
    title: 'For him and her - Boutique de Mode Douala',
    description: 'Vêtements, chaussures, parfums, sacs et accessoires pour hommes et femmes à Douala. Commande WhatsApp facile et livraison rapide.',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    url: `${origin}/${type}/${id}`,
  };

  try {
    const collection = type === 'produit' ? 'products' : 'packs';
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/${collection}/${id}?key=${firebaseConfig.apiKey}`;
    
    const response = await fetch(firestoreUrl, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return defaultMeta;
    
    const data = await response.json();
    const fields = data.fields;
    if (!fields) return defaultMeta;

    const name = fields.name?.stringValue || (type === 'produit' ? 'Article For him and her' : 'Pack For him and her');
    const price = fields.price?.integerValue || fields.price?.doubleValue || 0;
    const discountPrice = fields.discountPrice?.integerValue || fields.discountPrice?.doubleValue;
    const description = fields.description?.stringValue || 'Disponible chez For him and her Douala. Commandez directement sur WhatsApp.';
    
    let image = defaultMeta.image;
    if (type === 'produit' && fields.photos?.arrayValue?.values?.length) {
      image = fields.photos.arrayValue.values[0]?.stringValue || defaultMeta.image;
    } else if (type === 'pack' && fields.photo?.stringValue) {
      image = fields.photo.stringValue;
    }

    const priceText = discountPrice ? `${Number(discountPrice).toLocaleString('fr-FR')} FCFA (Promo)` : `${Number(price).toLocaleString('fr-FR')} FCFA`;

    return {
      title: `${name} - ${priceText} | For him and her`,
      description: `${description.substring(0, 160)}... Livrable à Douala.`,
      image,
      url: `${origin}/${type}/${id}`,
    };
  } catch (err) {
    console.error('Error fetching OG metadata from Firestore REST:', err);
    return defaultMeta;
  }
}

export function injectMetaIntoHtml(html: string, meta: MetaData): string {
  let modified = html;
  
  // Replace title
  modified = modified.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  
  // Replace or inject og:title
  if (modified.includes('property="og:title"')) {
    modified = modified.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeHtml(meta.title)}" />`);
  } else {
    modified = modified.replace('</head>', `<meta property="og:title" content="${escapeHtml(meta.title)}" />\n</head>`);
  }

  // Replace or inject og:description
  if (modified.includes('property="og:description"')) {
    modified = modified.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeHtml(meta.description)}" />`);
  } else {
    modified = modified.replace('</head>', `<meta property="og:description" content="${escapeHtml(meta.description)}" />\n</head>`);
  }

  // Replace meta name="description"
  modified = modified.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtml(meta.description)}" />`);

  // Replace or inject og:image
  if (modified.includes('property="og:image"')) {
    modified = modified.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${escapeHtml(meta.image)}" />`);
  } else {
    modified = modified.replace('</head>', `<meta property="og:image" content="${escapeHtml(meta.image)}" />\n</head>`);
  }

  // In case of og:url
  if (modified.includes('property="og:url"')) {
    modified = modified.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${escapeHtml(meta.url)}" />`);
  } else {
    modified = modified.replace('</head>', `<meta property="og:url" content="${escapeHtml(meta.url)}" />\n</head>`);
  }

  return modified;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
