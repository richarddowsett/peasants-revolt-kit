import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
      },
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/server.ts',
        'src/config/container.ts',
        'src/adapters/inbound/http/router.ts',
        'src/adapters/outbound/db/FirebaseAdminConfig.ts',
        'src/domain/ports/**',
        'src/domain/models/**',
        'src/domain/entities/Cart.ts',
        'src/domain/entities/FeatureFlag.ts',
        'src/domain/entities/Order.ts',
        'src/domain/entities/Product.ts',
        'src/adapters/db/**',
        'src/adapters/auth/**',
        'src/adapters/storage/**',
        'src/adapters/payment/**',
      ],
    },
  },
});
