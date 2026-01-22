import { z } from 'zod';

const schema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  latitude: z.number(),
});

const result = schema.safeParse({
  birthDate: 'invalid',
  latitude: 37.5665,
});

console.log('Success:', result.success);
if (!result.success) {
  console.log('Error object:', result.error);
  console.log('Error.errors:', result.error.errors);
  console.log('Type of errors:', typeof result.error.errors);
  console.log('Is array:', Array.isArray(result.error.errors));
}
