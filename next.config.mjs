/** @type {import('next').NextConfig} */
const nextConfig = {
  appDir: true,
  experimental: {
    serverActions: true
  },
  i18n: {
    locales: ["zh", "en"],
    defaultLocale: "zh"
  }
};

export default nextConfig;

