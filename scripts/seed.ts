try {
  (process as any).loadEnvFile?.('.env.local');
} catch {}

import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Collections } from '../src/infrastructure/firebase/collections';
import { normalizeArabic, buildSearchKeywords } from '../src/core/text/arabic-normalize';
import { generateVariantId, computeStockState } from '../src/features/products/domain/variant';
import { Role } from '../src/core/auth/roles';
import { usernameToEmail } from '../src/features/auth/domain/username';

// Initialize Admin for script
if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'alhobishi-ecommerce';
  const serviceKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const isEmulated = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);

  if (isEmulated) {
    initializeApp({ projectId });
  } else if (serviceKey) {
    initializeApp({
      credential: cert(JSON.parse(serviceKey)),
      projectId,
    });
  } else {
    try {
      const fs = require('fs');
      const path = require('path');
      const saPath = path.resolve(process.cwd(), 'service-account.json');
      if (fs.existsSync(saPath)) {
        initializeApp({
          credential: cert(saPath),
          projectId,
        });
      } else {
        initializeApp({
          credential: applicationDefault(),
          projectId,
        });
      }
    } catch {
      initializeApp({ projectId });
    }
  }
}

const db = getFirestore();
const auth = getAuth();

async function main() {
  console.log('--- بدء زرع البيانات الأولية للمتجر (Seeding) ---');

  // 1. Categories
  const categoriesData = [
    {
      id: 'cat-toys',
      name: 'الألعاب والترفيه',
      slug: 'toys',
      description: 'ألعاب تعليمية، تركيب، وألعاب أطفال متنوعة لجميع الأعمار.',
      image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=500&q=80',
      sortOrder: 1,
    },
    {
      id: 'cat-home',
      name: 'الأواني المنزلية',
      slug: 'home',
      description: 'أطقم قدور، أواني طهي، ومستلزمات المطبخ والمنزل العصرية.',
      image: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=500&q=80',
      sortOrder: 2,
    },
    {
      id: 'cat-accessories',
      name: 'الإكسسوارات',
      slug: 'accessories',
      description: 'ساعات يد، حقائب، وإكسسوارات رجالية ونسائية أنيقة.',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
      sortOrder: 3,
    },
    {
      id: 'cat-tools',
      name: 'الأدوات والمعدات',
      slug: 'tools',
      description: 'أطقم مفكات، دريلات، ومعدات صيانة منزلية واحترافية.',
      image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=500&q=80',
      sortOrder: 4,
    },
  ];

  for (const cat of categoriesData) {
    await db.collection(Collections.CATEGORIES).doc(cat.id).set({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      sortOrder: cat.sortOrder,
      isActive: true,
      productCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`✓ تم إنشاء القسم: ${cat.name}`);
  }

  // 2. Sample Products with Multi-Variants and Dual Pricing
  const productsData = [
    {
      id: 'prod-tefal-cookware',
      categoryId: 'cat-home',
      name: 'طقم قدور تيفال جرانيت 7 قطع غير لاصق',
      slug: 'tefal-granite-cookware-7pcs',
      shortDescription: 'طقم طهي عالي الجودة متين ومقاوم للالتصاق ومناسب لجميع الاستخدامات المنزلية.',
      description: 'طقم قدور جرانيت فاخر مكون من 3 قدور بأحجام مختلفة ومقلاة مع أغطية حرارية زجاجية متينة. مقاوم للالتصاق وسهل التنظيف وموفر للطاقة.',
      images: [
        'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800&q=80',
      ],
      retailPrice: 45000, // YER
      wholesalePrice: 36000, // YER
      isFeatured: true,
      options: [
        {
          key: 'color',
          label: 'اللون',
          displayType: 'button',
          values: [
            { id: 'black', label: 'جرانيت أسود' },
            { id: 'grey', label: 'رمادي رخامي' },
          ],
        },
      ],
      variants: [
        {
          optionValues: { color: 'black' },
          label: 'جرانيت أسود',
          sku: 'TEF-GRN-BLK',
          stockQty: 15,
        },
        {
          optionValues: { color: 'grey' },
          label: 'رمادي رخامي',
          sku: 'TEF-GRN-GRY',
          stockQty: 8,
        },
      ],
    },
    {
      id: 'prod-smart-watch',
      categoryId: 'cat-accessories',
      name: 'ساعة يد ذكية رياضية مقاومة للماء مع شاشة AMOLED',
      slug: 'smart-watch-amoled-waterproof',
      shortDescription: 'تدعم استقبال المكالمات ومراقبة نبضات القلب والأنشطة الرياضية وبطارية تدوم 7 أيام.',
      description: 'ساعة ذكية متطورة مزودة بحساسات دقيقة لمراقبة اللياقة البدنية والقلب والنوم، متوافقة مع جميع الهواتف الذكية.',
      images: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
      ],
      retailPrice: 22000,
      wholesalePrice: 17500,
      isFeatured: true,
      options: [
        {
          key: 'color',
          label: 'اللون',
          displayType: 'button',
          values: [
            { id: 'black', label: 'أسود مطفي' },
            { id: 'silver', label: 'فضي أنيق' },
          ],
        },
      ],
      variants: [
        {
          optionValues: { color: 'black' },
          label: 'أسود مطفي',
          sku: 'SW-AM-BLK',
          stockQty: 20,
        },
        {
          optionValues: { color: 'silver' },
          label: 'فضي أنيق',
          sku: 'SW-AM-SLV',
          stockQty: 12,
        },
      ],
    },
    {
      id: 'prod-lego-robot',
      categoryId: 'cat-toys',
      name: 'لعبة تركيب روبوت ميكانيكي تعليمي 500 قطعة',
      slug: 'lego-robot-building-kit-500pcs',
      shortDescription: 'تنمي مهارات الهندسة والتركيب للأطفال من عمر 8 سنوات فما فوق.',
      description: 'مجموعة تركيب ممتعة وتفاعلية قابلة للتحويل إلى عدة أشكال مختلفة مع دليل تركيب ملون وواضح.',
      images: [
        'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800&q=80',
      ],
      retailPrice: 16000,
      wholesalePrice: 12500,
      isFeatured: true,
      options: [],
      variants: [
        {
          optionValues: {},
          label: 'الافتراضي',
          sku: 'ROB-500-KIT',
          stockQty: 25,
        },
      ],
    },
    {
      id: 'prod-toolkit-32pcs',
      categoryId: 'cat-tools',
      name: 'حقيبة أدوات ومفكات صيانة متكاملة 32 قطعة',
      slug: 'professional-toolkit-32pcs',
      shortDescription: 'حقيبة صيانة منزلية قوية مصنوعة من الكروم فاناديوم المقاوم للصدأ.',
      description: 'تشمل جميع مقاسات المفكات والمفاتيح ومفتاح الشد ومتر القياس داخل حقيبة متينة وسهلة الحمل.',
      images: [
        'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&q=80',
      ],
      retailPrice: 14000,
      wholesalePrice: 10500,
      isFeatured: false,
      options: [],
      variants: [
        {
          optionValues: {},
          label: 'الافتراضي',
          sku: 'TOOL-32-SET',
          stockQty: 30,
        },
      ],
    },
  ];

  for (const p of productsData) {
    const prodRef = db.collection(Collections.PRODUCTS).doc(p.id);
    const searchKeywords = buildSearchKeywords([p.name, p.shortDescription, p.description]);

    const availableOptionKeys: string[] = [];
    for (const v of p.variants) {
      if (v.stockQty > 0) {
        for (const [k, val] of Object.entries(v.optionValues)) {
          availableOptionKeys.push(`${k}:${val}`);
        }
      }
    }

    await prodRef.set({
      name: p.name,
      nameNormalized: normalizeArabic(p.name),
      slug: p.slug,
      shortDescription: p.shortDescription,
      description: p.description,
      categoryId: p.categoryId,
      images: p.images,
      sku: p.variants[0]?.sku || null,
      barcode: null,
      status: 'active',
      isVisible: true,
      isFeatured: p.isFeatured,
      featuredOrder: null,
      retailPrice: p.retailPrice,
      retailPriceRange: { min: p.retailPrice, max: p.retailPrice },
      compareAtPrice: null,
      options: p.options,
      hasVariants: p.options.length > 0,
      inStock: true,
      availableOptionKeys,
      searchKeywords,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Variants subcollection
    for (const v of p.variants) {
      const vId = generateVariantId(v.optionValues);
      const vRef = prodRef.collection(Collections.VARIANTS).doc(vId);

      await vRef.set({
        id: vId,
        productId: p.id,
        optionValues: v.optionValues,
        label: v.label,
        sku: v.sku,
        barcode: null,
        retailPriceOverride: null,
        images: null,
        stockQty: v.stockQty,
        reservedQty: 0,
        availableQty: v.stockQty,
        lowStockThreshold: 5,
        stockState: computeStockState(v.stockQty, 5),
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Protected Wholesale Pricing
    await db.collection(Collections.PRODUCT_PRICING).doc(p.id).set({
      productId: p.id,
      wholesalePrice: p.wholesalePrice,
      variantWholesalePrices: {},
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'seed-script',
    });

    // Increment category product count
    await db
      .collection(Collections.CATEGORIES)
      .doc(p.categoryId)
      .update({ productCount: FieldValue.increment(1) });

    console.log(`✓ تم إنشاء المنتج: ${p.name}`);
  }

  // 3. Create Default Accounts (Admin & Trader)
  const usersToSeed = [
    {
      username: 'admin',
      displayName: 'مدير المتجر',
      phone: '+967770000001',
      role: Role.ADMIN,
      password: 'AdminPassword123!',
    },
    {
      username: 'trader_ali',
      displayName: 'التاجر علي السقاف',
      phone: '+967771234567',
      role: Role.WHOLESALE,
      password: 'TraderPassword123!',
    },
    {
      username: 'staff_prep',
      displayName: 'أحمد التجهيز (موظف المستودع)',
      phone: '+967770000002',
      role: Role.STAFF,
      password: 'StaffPassword123!',
    },
    {
      username: 'salem_customer',
      displayName: 'سالم أحمد (عميل عادي)',
      phone: '+967779876543',
      role: Role.CUSTOMER,
      password: 'CustomerPassword123!',
    },
  ];

  for (const u of usersToSeed) {
    const email = usernameToEmail(u.username);
    try {
      let authUser;
      try {
        authUser = await auth.getUserByEmail(email);
      } catch {
        authUser = await auth.createUser({
          email,
          password: u.password,
          displayName: u.displayName,
        });
      }

      await auth.setCustomUserClaims(authUser.uid, { role: u.role });

      await db.collection(Collections.USERNAMES).doc(u.username).set({
        uid: authUser.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      await db.collection(Collections.USERS).doc(authUser.uid).set({
        uid: authUser.uid,
        username: u.username,
        displayName: u.displayName,
        displayNameNormalized: normalizeArabic(u.displayName),
        phone: u.phone,
        email,
        role: u.role,
        status: 'active',
        searchKeywords: buildSearchKeywords([u.displayName, u.username], [u.phone]),
        account: {
          balance: 0,
          totalDebit: 0,
          totalCredit: 0,
          lastSeq: 0,
          lastTransactionAt: null,
        },
        stats: { ordersCount: 0, openOrdersCount: 0 },
        wholesaleSince: u.role === Role.WHOLESALE ? FieldValue.serverTimestamp() : null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(`✓ تم إنشاء الحساب: @${u.username} (${u.role}) - كلمة المرور: ${u.password}`);
    } catch (e: any) {
      console.warn(`! الحساب ${u.username} مسجل مسبقًا أو حدث تنبيه: ${e.message}`);
    }
  }

  console.log('--- اكتمل زرع البيانات بنجاح! ---');
}

main().catch(console.error);

