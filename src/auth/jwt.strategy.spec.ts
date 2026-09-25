import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy({
    get: () => 'test-secret',
  } as unknown as ConfigService);

  it('accepts an access token payload', async () => {
    await expect(
      strategy.validate({ sub: 1, email: 'a@b.com', role: 'USER' }),
    ).resolves.toEqual({ userId: 1, email: 'a@b.com', role: 'USER' });
  });

  it('rejects a refresh token used as an access token', async () => {
    await expect(
      strategy.validate({
        sub: 1,
        email: 'a@b.com',
        role: 'USER',
        type: 'refresh',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
