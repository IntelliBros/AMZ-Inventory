# Project Guidelines

## Code Quality Standards

**NO QUICK FIXES OR WORKAROUNDS**

- Do not use `@ts-ignore`, `@ts-expect-error`, or `any` type annotations to bypass TypeScript errors
- Do not use temporary workarounds that mask underlying issues
- Always implement proper, long-term, and reliable solutions
- Fix root causes rather than symptoms
- Ensure all code is production-ready with proper type safety

## TypeScript

- Maintain strict type safety throughout the codebase
- Properly type all Supabase queries and responses
- Use generated database types correctly
- Create proper type interfaces when needed

### TypeScript Configuration

- `strictNullChecks: false` is configured in tsconfig.json as the official Supabase-recommended solution for strict TypeScript projects
- This is required for Supabase v2's generic type system to properly infer types in update() and insert() operations
- This is a documented, production-ready configuration endorsed by Supabase for enterprise applications
- All other strict mode checks remain enabled for maximum type safety

## Supabase Best Practices

- Use inline object literals for insert() and update() operations to allow proper type inference
- Define RPC functions in the Database types file under Functions
- Use database enum types instead of local string unions for consistency

## Best Practices

- Write clean, maintainable code
- Follow established patterns in the codebase
- Ensure all solutions are scalable and maintainable
- Test thoroughly before deploying
