const config = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://musio-app-production-fbf6.up.railway.app/api/:path*',
      },
    ];
  },
};

export default config;
