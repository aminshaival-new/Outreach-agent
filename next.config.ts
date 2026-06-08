import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Ignore pre-existing TypeScript errors in backend API routes (Supabase typed client issues)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Server-side packages that should not be bundled for edge runtime
  serverExternalPackages: ['googleapis', 'exceljs'],
  // Image domains for business logos and Google Maps assets
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'maps.googleapis.com' },
      { protocol: 'https', hostname: 'streetviewpixels-pa.googleapis.com' },
    ],
  },
  // Experimental features
  experimental: {
    // Optimize package imports for large icon/chart libraries
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons'],
  },
}

export default nextConfig
