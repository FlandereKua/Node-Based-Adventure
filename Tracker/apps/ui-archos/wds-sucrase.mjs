import { transform } from 'sucrase';

export function sucraseMiddleware() {
  return async (ctx, next) => {
    await next();
    if (!ctx.response.is('text/javascript') && !/\.(ts|tsx)$/.test(ctx.path)) return;
    if (!ctx.body) return;
    if (ctx.path.endsWith('.ts') || ctx.path.endsWith('.tsx')) {
      const code = ctx.body.toString();
      const result = transform(code, { transforms: ['typescript', 'jsx'] });
      ctx.body = result.code;
      ctx.set('Content-Type', 'application/javascript');
    }
  };
}
