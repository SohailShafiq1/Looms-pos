interface Window { loom: { auth: { status: () => Promise<{ initialized: boolean }>; signup: (input: unknown) => Promise<{ success: boolean }>; login: (input: unknown) => Promise<{ user: { id: number; email: string; fullName: string; role: string }; shop: { shopName: string; currency: string } }>; }; dashboard: { summary: () => Promise<{ products: number; units: number; customers: number; outOfStock: number; lowStock: number; todaySales: number; todayBills: number }>; }; }; }

declare module '*.css';
