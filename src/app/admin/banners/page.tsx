import React from 'react';
import { connection } from 'next/server';
import { bannerRepository } from '@/features/banners/infrastructure/firestore-banner.repository';
import { AdminBannersView } from '@/features/banners/components/admin-banners-view';

export const metadata = {
  title: 'إدارة الإعلانات والبنرات | لوحة الإدارة',
  description: 'إدارة ورفع صور البنرات الإعلانية لشريط الصفحة الرئيسية في متجر الحبيشي',
};

export const instant = false;

export default async function AdminBannersPage() {
  await connection();
  const banners = await bannerRepository.findAll(false);

  return <AdminBannersView initialBanners={banners} />;
}

