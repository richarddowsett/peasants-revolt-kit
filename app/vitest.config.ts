import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        statements: 80,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/app/layout.tsx',
        'src/domain/ports/**',
        'src/domain/models/Cart.ts',
        'src/domain/models/FeatureFlag.ts',
        'src/domain/models/Order.ts',
        'src/domain/models/Product.ts',
        'src/adapters/auth/**',
        'src/adapters/db/**',
        'src/adapters/storage/**',
        'src/domain/usecases/GetProductsUseCase.ts',
        'src/domain/usecases/GetUserOrdersUseCase.ts',
        'src/domain/usecases/ManageProductUseCase.ts',
        'src/domain/usecases/UpdateOrderStatusUseCase.ts',
        'src/app/admin/catalog/page.tsx',
        'src/lib/firebase.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
