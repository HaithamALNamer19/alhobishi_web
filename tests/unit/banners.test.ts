import { describe, it, expect } from 'vitest';
import { createBannerSchema, updateBannerSchema } from '@/features/banners/domain/banner';

describe('Banners Feature Unit Tests', () => {
  it('validates a valid banner creation payload', () => {
    const input = {
      title: 'عروض الصيف الكبرى للألعاب',
      subtitle: 'خصومات تصل إلى 30% على الألعاب والإكسسوارات',
      imageUrl: '/uploads/banners/summer-sale.jpg',
      linkUrl: '/products',
      badgeText: 'عرض خاص',
      sortOrder: 1,
      isActive: true,
    };

    const parsed = createBannerSchema.parse(input);
    expect(parsed.title).toBe(input.title);
    expect(parsed.imageUrl).toBe(input.imageUrl);
    expect(parsed.isActive).toBe(true);
    expect(parsed.sortOrder).toBe(1);
  });

  it('fails when title or imageUrl is missing', () => {
    expect(() => createBannerSchema.parse({ imageUrl: '/img.jpg' })).toThrow();
    expect(() => createBannerSchema.parse({ title: 'إعلان' })).toThrow();
  });

  it('validates banner update schema requiring id', () => {
    expect(() => updateBannerSchema.parse({ title: 'تعديل' })).toThrow();

    const validUpdate = updateBannerSchema.parse({
      id: 'banner-123',
      title: 'عنوان معدل',
      isActive: false,
    });
    expect(validUpdate.id).toBe('banner-123');
    expect(validUpdate.title).toBe('عنوان معدل');
    expect(validUpdate.isActive).toBe(false);
  });
});

