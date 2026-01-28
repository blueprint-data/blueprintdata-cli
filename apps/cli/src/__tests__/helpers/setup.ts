import { beforeAll, afterAll } from 'bun:test';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
});

afterAll(() => {
  delete process.env.NODE_ENV;
  delete process.env.LOG_LEVEL;
});
