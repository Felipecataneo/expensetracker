

const nextConfig = {
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      './aws-exports': 'path/to/nonexistent/aws-exports', // Evita erro de importação de arquivo que não existe
    };

    // Necessário para o Amplify em Next.js com Webpack 5
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
