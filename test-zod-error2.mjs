import { z } from 'zod';

const schema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  latitude: z.number(),
});

const result = schema.safeParse({
  birthDate: 'invalid',
  latitude: 37.5665,
});

if (!result.success) {
  console.log('Error keys:', Object.keys(result.error));
  console.log('Error.issues:', result.error.issues);
  console.log('Error.format:', result.error.format);
  console.log('Error message:', result.error.message);
}
