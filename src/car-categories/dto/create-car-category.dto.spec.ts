import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCarCategoryDto } from './create-car-category.dto';

describe('CreateCarCategoryDto', () => {
  // Same options as the global ValidationPipe in main.ts
  const errorsFor = async (body: object) =>
    validate(plainToInstance(CreateCarCategoryDto, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it('accepts a name with optional Arabic fields', async () => {
    await expect(
      errorsFor({
        name: 'SUV',
        description: 'Family cars',
        nameAr: 'دفع رباعي',
        descriptionAr: 'سيارات عائلية',
      }),
    ).resolves.toHaveLength(0);
  });

  it('accepts a name alone', async () => {
    await expect(errorsFor({ name: 'SUV' })).resolves.toHaveLength(0);
  });

  it('requires the name', async () => {
    const errors = await errorsFor({ nameAr: 'دفع رباعي' });

    expect(errors.map((error) => error.property)).toEqual(['name']);
  });
});
