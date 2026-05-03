describe('Production configuration', () => {
  test('requires JWT_SECRET in production', async () => {
    const previousEnv = process.env.NODE_ENV;
    const previousSecret = process.env.JWT_SECRET;

    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';

    await expect(import(new URL(`../src/config/index.js?production-check=${Date.now()}`, import.meta.url).href)).rejects.toThrow(
      'Missing required environment variable: JWT_SECRET'
    );

    process.env.NODE_ENV = previousEnv;

    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });
});
