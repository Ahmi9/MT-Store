import type { SupabaseClient } from '@supabase/supabase-js';

// Sample catalog the admin can import (and later remove) from
// Admin → Products. Products are identified by slug, so importing twice
// skips what already exists and "Remove" only touches these slugs.

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=1000&q=80&auto=format&fit=crop`;

interface DemoProduct {
  name: string;
  slug: string;
  category: string; // category slug
  price: number;
  original_price: number | null;
  stock: number;
  featured?: boolean;
  description: string;
  specs: Record<string, string>;
  images: string[];
  variants?: { attribute: string; values: string[]; stock: number[]; prices?: (number | null)[] };
  // [name, city, rating, text, days ago]
  reviews: [string, string, number, string, number][];
}

export const DEMO_CATEGORIES = [
  { name: 'Audio', slug: 'audio' },
  { name: 'Smart Watches', slug: 'smart-watches' },
  { name: 'Gaming', slug: 'gaming' },
  { name: 'Accessories', slug: 'accessories' },
];

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    name: 'Apple AirPods Max',
    slug: 'apple-airpods-max',
    category: 'audio',
    price: 154999,
    original_price: 174999,
    stock: 9,
    featured: true,
    description:
      'Apple’s over-ear headphones with high-fidelity audio, Active Noise Cancellation and Transparency mode. Knit-mesh canopy and memory-foam cushions keep them comfy for hours, and Personalised Spatial Audio with head tracking puts you in the middle of every song and movie.',
    specs: {
      Chip: 'Apple H1 (in each ear cup)',
      'Noise control': 'Active Noise Cancellation & Transparency',
      'Spatial Audio': 'Personalised, with dynamic head tracking',
      Battery: 'Up to 20 hours (ANC on)',
      Controls: 'Digital Crown + noise control button',
      Weight: '384.8 g',
      Warranty: '1 year brand warranty',
    },
    images: [img('1613040809024-b4ef7ba99bc3')],
    variants: { attribute: 'Color', values: ['Pink', 'Silver', 'Space Gray'], stock: [3, 3, 3] },
    reviews: [
      ['Ayesha Malik', 'Lahore', 5, 'Pink colour is even prettier in person 😍 Noise cancellation is unreal, I wear them in the metro every day.', 6],
      ['Hira Shahid', 'Karachi', 5, 'Expensive but worth every rupee. Sound is so clear and they came sealed with Apple warranty.', 19],
      ['Mahnoor Tariq', 'Islamabad', 4, 'Amazing sound and build. Slightly heavy for long study sessions but still my favourite.', 41],
    ],
  },
  {
    name: 'Apple AirPods Pro (2nd generation) USB-C',
    slug: 'apple-airpods-pro-2-usb-c',
    category: 'audio',
    price: 59999,
    original_price: 69999,
    stock: 18,
    featured: true,
    description:
      'Up to 2× more Active Noise Cancellation than the previous AirPods Pro, Adaptive Audio that blends ANC and Transparency as you move, and a MagSafe charging case with USB-C, a built-in speaker for Find My and a lanyard loop.',
    specs: {
      Chip: 'Apple H2',
      'Noise control': 'ANC, Adaptive Audio, Transparency',
      Battery: 'Up to 6 h listening (30 h with case)',
      Case: 'MagSafe, Qi & USB-C charging',
      'Dust & water resistance': 'IP54 (earbuds and case)',
      'Ear tips': 'XS, S, M, L included',
    },
    images: [img('1572569511254-d8f925fe2cbb'), img('1600294037681-c80b4cb5b434')],
    reviews: [
      ['Zainab Ahmed', 'Faisalabad', 5, 'The XS tips fit my small ears perfectly. Adaptive audio is so smart!', 3],
      ['Sana Iqbal', 'Multan', 5, 'Original product, checked serial on Apple website. Delivery in 2 days.', 12],
      ['Areeba Khan', 'Rawalpindi', 4, 'Great for calls and gym. Wish the case came in pink haha.', 27],
      ['Noor Fatima', 'Lahore', 5, 'Best gift I bought myself this year ✨', 55],
    ],
  },
  {
    name: 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones',
    slug: 'sony-wh-1000xm4',
    category: 'audio',
    price: 69999,
    original_price: 82999,
    stock: 14,
    featured: true,
    description:
      'Industry-leading noise cancellation with Sony’s HD Noise Cancelling Processor QN1, 30 hours of battery and quick charging (10 minutes for 5 hours). Speak-to-Chat pauses your music when you start talking, and multipoint pairing connects your phone and laptop at once.',
    specs: {
      Processor: 'HD Noise Cancelling Processor QN1',
      Battery: 'Up to 30 hours (ANC on)',
      'Quick charge': '10 min = 5 hours playback',
      Codecs: 'SBC, AAC, LDAC',
      Multipoint: 'Yes, 2 devices',
      Weight: '254 g',
    },
    images: [img('1546435770-a3e426bf472b'), img('1505740420928-5e560c06d30e')],
    variants: { attribute: 'Color', values: ['Black', 'Silver'], stock: [8, 6] },
    reviews: [
      ['Fatima Raza', 'Peshawar', 5, 'So comfortable, I forget I’m wearing them. Battery lasts my whole week of uni.', 9],
      ['Rimsha Ali', 'Hyderabad', 4, 'Noise cancelling is brilliant, app has lots of EQ options.', 33],
      ['Iqra Nadeem', 'Lahore', 5, 'Bought for online classes, the mic quality is very good too.', 70],
    ],
  },
  {
    name: 'Sony WF-1000XM4 Noise Cancelling Earbuds',
    slug: 'sony-wf-1000xm4',
    category: 'audio',
    price: 44999,
    original_price: 54999,
    stock: 11,
    description:
      'Sony’s Integrated Processor V1 brings premium noise cancellation to tiny true wireless earbuds. LDAC Hi-Res Audio Wireless, up to 8 hours per charge, IPX4 water resistance and noise-isolating foam tips for a snug fit.',
    specs: {
      Processor: 'Integrated Processor V1',
      Battery: 'Up to 8 h (24 h with case)',
      Codecs: 'SBC, AAC, LDAC',
      'Water resistance': 'IPX4',
      Charging: 'USB-C & Qi wireless',
    },
    images: [img('1631176093617-63490a3d785a'), img('1590658268037-6bf12165a8df')],
    reviews: [
      ['Maryam Javed', 'Karachi', 5, 'Bass is so rich! Fits snugly even while running.', 14],
      ['Kinza Saleem', 'Gujranwala', 4, 'Very good sound. The case is a bit big but fine.', 48],
    ],
  },
  {
    name: 'Apple Watch SE (2nd generation) GPS',
    slug: 'apple-watch-se-2-gps',
    category: 'smart-watches',
    price: 69999,
    original_price: 79999,
    stock: 12,
    featured: true,
    description:
      'Everything you need to stay active, healthy and connected — heart-rate notifications, Crash Detection, Fall Detection, sleep and cycle tracking, plus Apple Pay and notifications from your iPhone. Swim-proof and up to 18 hours of battery.',
    specs: {
      Chip: 'S8 SiP',
      Display: 'Retina LTPO OLED, up to 1000 nits',
      Health: 'Heart rate, sleep & cycle tracking',
      Safety: 'Crash Detection, Fall Detection, Emergency SOS',
      Battery: 'Up to 18 hours',
      'Water resistance': 'WR50 (swim-proof)',
      Compatibility: 'Requires iPhone',
    },
    images: [img('1546868871-7041f2a55e12'), img('1617043786394-f977fa12eddf')],
    variants: { attribute: 'Size', values: ['40mm', '44mm'], stock: [7, 5], prices: [69999, 76999] },
    reviews: [
      ['Laiba Hassan', 'Islamabad', 5, 'Cycle tracking and sleep tracking are so useful. Looks super classy.', 4],
      ['Aiman Qureshi', 'Quetta', 5, '40mm is perfect for my wrist. Packed beautifully!', 22],
      ['Esha Butt', 'Sialkot', 4, 'Battery lasts about a day and a half for me. Love it otherwise.', 63],
    ],
  },
  {
    name: 'Xiaomi Mi Smart Band 5',
    slug: 'xiaomi-mi-smart-band-5',
    category: 'smart-watches',
    price: 6999,
    original_price: 8999,
    stock: 40,
    description:
      'A bright 1.1" AMOLED display, 11 workout modes, 24/7 heart-rate and sleep tracking, women’s health tracking and up to 14 days of battery — with an easy magnetic charger.',
    specs: {
      Display: '1.1" AMOLED colour touchscreen',
      'Workout modes': '11',
      Sensors: 'Heart rate, sleep, stress',
      Battery: 'Up to 14 days',
      'Water resistance': '5 ATM',
      Charging: 'Magnetic charger',
    },
    images: [img('1575311373937-040b8e1fd5b6')],
    reviews: [
      ['Huma Shafiq', 'Lahore', 5, 'Light and cute, helps me hit 10k steps every day!', 8],
      ['Sadia Imran', 'Bahawalpur', 4, 'Great value for money. Strap could be softer.', 36],
      ['Anum Rafiq', 'Karachi', 3, 'Works fine but notifications sometimes come late.', 80],
    ],
  },
  {
    name: 'JBL Flip 5 Portable Waterproof Speaker',
    slug: 'jbl-flip-5',
    category: 'audio',
    price: 24999,
    original_price: 29999,
    stock: 16,
    featured: true,
    description:
      'Bold JBL Original Pro Sound from a racetrack-shaped driver, 12 hours of playtime and IPX7 waterproofing — so it survives the pool party. Connect 100+ PartyBoost speakers for an even bigger sound.',
    specs: {
      Output: '20 W',
      Battery: 'Up to 12 hours',
      'Water resistance': 'IPX7',
      Charging: 'USB-C',
      Pairing: 'PartyBoost',
      Weight: '540 g',
    },
    images: [img('1608043152269-423dbba4e7e1')],
    variants: { attribute: 'Color', values: ['Black', 'Pink', 'Blue'], stock: [6, 5, 5] },
    reviews: [
      ['Alishba Noor', 'Karachi', 5, 'So loud for its size! Our dholki playlist sounded amazing 🎶', 11],
      ['Mehwish Arif', 'Lahore', 5, 'Took it to the beach, survived a splash no problem.', 29],
    ],
  },
  {
    name: 'Keychron K2 Wireless Mechanical Keyboard',
    slug: 'keychron-k2',
    category: 'accessories',
    price: 21999,
    original_price: 25999,
    stock: 10,
    description:
      'A compact 75% layout (84 keys) mechanical keyboard that works with Mac and Windows over Bluetooth 5.1 or USB-C. Gateron switches, a 4000 mAh battery and keycaps for both operating systems in the box.',
    specs: {
      Layout: '75% (84 keys)',
      Connectivity: 'Bluetooth 5.1 (3 devices) + USB-C',
      Switches: 'Gateron G Pro',
      Battery: '4000 mAh',
      Compatibility: 'macOS & Windows',
      Backlight: 'White LED',
    },
    images: [img('1618384887929-16ec33fab9ef'), img('1587829741301-dc798b83add3')],
    variants: { attribute: 'Switch', values: ['Red (linear)', 'Brown (tactile)', 'Blue (clicky)'], stock: [4, 4, 2] },
    reviews: [
      ['Hafsa Zubair', 'Lahore', 5, 'Typing assignments has never felt this satisfying. Brown switches are perfect.', 16],
      ['Ammara Sheikh', 'Islamabad', 4, 'Beautiful keyboard, pairs with my iPad and laptop easily.', 52],
    ],
  },
  {
    name: 'Sony DualSense Wireless Controller (PS5)',
    slug: 'sony-dualsense-controller',
    category: 'gaming',
    price: 19999,
    original_price: 23999,
    stock: 15,
    description:
      'Feel every moment with haptic feedback and adaptive triggers, chat with the built-in microphone and charge over USB-C. Also works on PC over Bluetooth or cable.',
    specs: {
      Feedback: 'Haptic feedback & adaptive triggers',
      Audio: 'Built-in mic & speaker, 3.5 mm jack',
      Connectivity: 'Bluetooth & USB-C',
      Compatibility: 'PS5, PC, Mac, Android, iOS',
    },
    images: [img('1606144042614-b2417e99c4e3')],
    variants: { attribute: 'Color', values: ['White', 'Cosmic Red', 'Nova Pink'], stock: [6, 4, 5] },
    reviews: [
      ['Saba Anwar', 'Abbottabad', 5, 'Nova Pink is SO cute. Adaptive triggers make games feel real.', 7],
      ['Rabia Ijaz', 'Faisalabad', 5, 'Genuine Sony controller, works on my PC too.', 44],
    ],
  },
  {
    name: 'Meta Quest 2 VR Headset (128GB)',
    slug: 'meta-quest-2-128gb',
    category: 'gaming',
    price: 99999,
    original_price: 119999,
    stock: 6,
    featured: true,
    description:
      'An all-in-one VR headset — no PC or cables needed. Play games, work out, watch movies on a giant virtual screen and hang out with friends, all with a high-resolution display and fast Snapdragon XR2 processor.',
    specs: {
      Processor: 'Qualcomm Snapdragon XR2',
      Display: '1832 × 1920 per eye, up to 120 Hz',
      Memory: '6 GB RAM',
      Storage: '128 GB',
      Battery: '2–3 hours',
      'In the box': 'Headset, 2 Touch controllers, charger, glasses spacer',
    },
    images: [img('1622979135225-d2ba269cf1ac')],
    reviews: [
      ['Mehak Siddiqui', 'Lahore', 5, 'Beat Saber workouts are my new cardio 😂 Whole family loves it.', 10],
      ['Nimra Aslam', 'Karachi', 4, 'Mind-blowing experience. Battery could be longer.', 38],
      ['Sidra Javed', 'Multan', 5, 'Arrived well packed with both controllers. Highly recommend!', 75],
    ],
  },
];

export const DEMO_SLUGS = DEMO_PRODUCTS.map((p) => p.slug);

export async function importDemoProducts(db: SupabaseClient) {
  // 1. make sure the demo categories exist
  const { data: existingCats, error: catErr } = await db.from('categories').select('id, slug, display_order');
  if (catErr) throw new Error(catErr.message);
  const catId = new Map<string, string>((existingCats ?? []).map((c) => [c.slug, c.id]));
  let order = Math.max(0, ...(existingCats ?? []).map((c) => c.display_order ?? 0)) + 1;
  for (const c of DEMO_CATEGORIES) {
    if (catId.has(c.slug)) continue;
    const { data, error } = await db
      .from('categories')
      .insert({ name: c.name, slug: c.slug, parent_id: null, is_active: true, display_order: order++ })
      .select('id')
      .single();
    if (error) throw new Error(`Category ${c.name}: ${error.message}`);
    catId.set(c.slug, data.id);
  }

  // 2. insert only the products that aren't there yet
  const { data: existing, error: exErr } = await db.from('products').select('slug').in('slug', DEMO_SLUGS);
  if (exErr) throw new Error(exErr.message);
  const have = new Set((existing ?? []).map((p) => p.slug));
  const todo = DEMO_PRODUCTS.filter((p) => !have.has(p.slug));
  if (todo.length === 0) return { added: 0, skipped: have.size };

  const { data: inserted, error: insErr } = await db
    .from('products')
    .insert(
      todo.map((p) => ({
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        original_price: p.original_price,
        category_id: catId.get(p.category) ?? null,
        stock: p.variants ? p.variants.stock.reduce((a, b) => a + b, 0) : p.stock,
        is_active: true,
        is_featured: !!p.featured,
        specs: p.specs,
        images: p.images,
      }))
    )
    .select('id, slug');
  if (insErr) throw new Error(insErr.message);
  const productId = new Map<string, string>((inserted ?? []).map((p) => [p.slug, p.id]));

  // 3. variants (one attribute per demo product)
  for (const p of todo) {
    const id = productId.get(p.slug);
    if (!id || !p.variants) continue;
    const v = p.variants;
    const { data: attr, error: attrErr } = await db
      .from('product_attributes')
      .insert({ product_id: id, attribute_name: v.attribute, display_order: 0 })
      .select('id')
      .single();
    if (attrErr) throw new Error(`Options for ${p.name}: ${attrErr.message}`);
    const { error: valErr } = await db
      .from('product_attribute_values')
      .insert(v.values.map((value, i) => ({ attribute_id: attr.id, value, display_order: i })));
    if (valErr) throw new Error(`Options for ${p.name}: ${valErr.message}`);
    const { error: varErr } = await db.from('product_variants').insert(
      v.values.map((value, i) => ({
        product_id: id,
        variant_combination: { [v.attribute]: value },
        price: v.prices?.[i] ?? null,
        stock: v.stock[i],
        is_active: true,
      }))
    );
    if (varErr) throw new Error(`Variants for ${p.name}: ${varErr.message}`);
  }

  // 4. a few sample reviews so ratings show up
  const reviews = todo.flatMap((p) =>
    p.reviews.map(([customer_name, customer_city, rating, review_text, daysAgo]) => ({
      product_id: productId.get(p.slug),
      customer_name,
      customer_city,
      rating,
      review_text,
      is_approved: true,
      created_at: new Date(Date.now() - daysAgo * 864e5).toISOString(),
    }))
  );
  if (reviews.length) {
    const { error } = await db.from('product_reviews').insert(reviews);
    if (error) throw new Error(`Reviews: ${error.message}`);
  }

  return { added: todo.length, skipped: have.size };
}

export async function removeDemoProducts(db: SupabaseClient) {
  const { data: rows, error } = await db.from('products').select('id').in('slug', DEMO_SLUGS);
  if (error) throw new Error(error.message);
  const all = (rows ?? []).map((r) => r.id as string);
  if (all.length === 0) return { removed: 0, hidden: 0 };

  // Products that appear in orders can't be deleted (order history points
  // at them) — hide those instead and delete the rest.
  const { data: ordered } = await db.from('order_items').select('product_id').in('product_id', all);
  const keep = new Set((ordered ?? []).map((o) => o.product_id as string));
  const ids = all.filter((id) => !keep.has(id));

  if (keep.size) {
    const { error: hideErr } = await db.from('products').update({ is_active: false }).in('id', [...keep]);
    if (hideErr) throw new Error(hideErr.message);
  }

  if (ids.length) {
    const { data: attrs } = await db.from('product_attributes').select('id').in('product_id', ids);
    const attrIds = (attrs ?? []).map((a) => a.id);
    if (attrIds.length) await db.from('product_attribute_values').delete().in('attribute_id', attrIds);
    await db.from('product_variants').delete().in('product_id', ids);
    await db.from('product_attributes').delete().in('product_id', ids);
    await db.from('product_reviews').delete().in('product_id', ids);

    const { error: delErr } = await db.from('products').delete().in('id', ids);
    if (delErr) throw new Error(delErr.message);
  }

  // Categories are left alone: some (e.g. Powerbanks, Gadgets) may have
  // existed before the import. Empty ones can be removed from Categories.
  return { removed: ids.length, hidden: keep.size };
}
