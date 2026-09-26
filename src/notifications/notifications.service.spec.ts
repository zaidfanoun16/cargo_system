import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const notificationsRepository = {
    create: jest.fn((data) => data),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const usersRepository = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: notificationsRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('sends one notification to every admin', async () => {
    usersRepository.find.mockResolvedValue([{ id: 1 }, { id: 4 }]);

    await service.notifyAdmins('NEW_RESERVATION', { reservationId: 7 });

    expect(usersRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'ADMIN' } }),
    );
    expect(notificationsRepository.save).toHaveBeenCalledWith([
      { userId: 1, type: 'NEW_RESERVATION', data: { reservationId: 7 } },
      { userId: 4, type: 'NEW_RESERVATION', data: { reservationId: 7 } },
    ]);
  });

  it('never breaks what caused the notification', async () => {
    notificationsRepository.save.mockRejectedValueOnce(new Error('db down'));

    await expect(
      service.notify(1, 'RESERVATION_CONFIRMED'),
    ).resolves.toBeUndefined();
  });

  it('lists the latest notifications with the unread count', async () => {
    notificationsRepository.find.mockResolvedValue([{ id: 2 }, { id: 1 }]);
    notificationsRepository.count.mockResolvedValue(1);

    await expect(service.list(1)).resolves.toEqual({
      items: [{ id: 2 }, { id: 1 }],
      unreadCount: 1,
    });
    expect(notificationsRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1 }, take: 30 }),
    );
  });

  it("does not mark someone else's notification as read", async () => {
    notificationsRepository.findOne.mockResolvedValue(null);

    await expect(service.markRead(5, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(notificationsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 5, userId: 1 },
    });
  });

  it('marks a notification as read once', async () => {
    const notification = { id: 5, userId: 1, readAt: null as Date | null };
    notificationsRepository.findOne.mockResolvedValue(notification);

    await service.markRead(5, 1);

    expect(notification.readAt).toBeInstanceOf(Date);
    expect(notificationsRepository.save).toHaveBeenCalledTimes(1);
  });

  it('marks all unread notifications of the user as read', async () => {
    await expect(service.markAllRead(1)).resolves.toEqual({ unreadCount: 0 });

    const [where, changes] = notificationsRepository.update.mock.calls[0];
    expect(where.userId).toBe(1);
    expect(changes.readAt).toBeInstanceOf(Date);
  });
});
