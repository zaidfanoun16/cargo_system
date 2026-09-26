import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';

import {
  Notification,
  NotificationData,
  NotificationType,
} from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

// How many notifications the bell menu shows
const LIST_LIMIT = 30;

// Notifications older than this are deleted
const KEEP_DAYS = 60;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // Notify one user. A notification is extra information, so a failure
  // is only logged and never breaks what caused it.
  async notify(userId: number, type: NotificationType, data: NotificationData = {}) {
    try {
      await this.notificationsRepository.save(
        this.notificationsRepository.create({ userId, type, data }),
      );
    } catch (error) {
      this.logger.warn(
        `Could not notify user ${userId} (${type}): ${(error as Error).message}`,
      );
    }
  }

  // Notify every admin, e.g. about a new booking request
  async notifyAdmins(type: NotificationType, data: NotificationData = {}) {
    try {
      const admins = await this.usersRepository.find({
        select: { id: true },
        where: { role: 'ADMIN' },
      });

      if (admins.length === 0) {
        return;
      }

      await this.notificationsRepository.save(
        admins.map((admin) =>
          this.notificationsRepository.create({ userId: admin.id, type, data }),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `Could not notify admins (${type}): ${(error as Error).message}`,
      );
    }
  }

  // The latest notifications of a user, newest first, and how many are
  // unread
  async list(userId: number) {
    const [items, unreadCount] = await Promise.all([
      this.notificationsRepository.find({
        where: { userId },
        order: { createdAt: 'DESC', id: 'DESC' },
        take: LIST_LIMIT,
      }),
      this.notificationsRepository.count({
        where: { userId, readAt: IsNull() },
      }),
    ]);

    return { items, unreadCount };
  }

  async markRead(id: number, userId: number) {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });

    // Someone else's notification looks the same as a missing one
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationsRepository.save(notification);
    }

    return notification;
  }

  async markAllRead(userId: number) {
    await this.notificationsRepository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );

    return { unreadCount: 0 };
  }

  // Every day, delete notifications older than KEEP_DAYS
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deleteOldNotifications() {
    const { affected } = await this.notificationsRepository.delete({
      createdAt: LessThan(new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000)),
    });

    if (affected) {
      this.logger.log(`Deleted ${affected} old notification(s)`);
    }

    return affected ?? 0;
  }
}
