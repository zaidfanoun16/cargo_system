import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto phoneNumber', () => {
  const errorsFor = async (phoneNumber: unknown) => {
    const dto = plainToInstance(CreateUserDto, {
      fullName: 'A',
      email: 'a@b.com',
      password: 'password123',
      phoneNumber,
    });

    const errors = await validate(dto);
    return errors.filter((error) => error.property === 'phoneNumber');
  };

  it.each(['+970591234567', '+972521234567', '+962791234567', '+970 59-123-4567'])(
    'accepts %s',
    async (phoneNumber) => {
      await expect(errorsFor(phoneNumber)).resolves.toHaveLength(0);
    },
  );

  it.each([
    ['without the country code', '0591234567'],
    ['too short', '+97059123'],
    ['missing', undefined],
  ])('rejects a number %s', async (_case, phoneNumber) => {
    await expect(errorsFor(phoneNumber)).resolves.toHaveLength(1);
  });
});
