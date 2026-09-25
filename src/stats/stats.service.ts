import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ReservationStatus } from '../reservations/enums/reservation-status.enum';

// Reservations that bring in money
const EARNING_STATUSES = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.COMPLETED,
];

@Injectable()
export class StatsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // Dashboard numbers for the admin
  async getStats() {
    const [
      totals,
      reservationsByStatus,
      revenueByMonth,
      topCars,
      occupancy,
    ] = await Promise.all([
      this.getTotals(),
      this.getReservationsByStatus(),
      this.getRevenueByMonth(),
      this.getTopCars(),
      this.getOccupancyThisMonth(),
    ]);

    return {
      totals,
      reservationsByStatus,
      revenueByMonth,
      topCars,
      occupancy,
    };
  }

  private async getTotals() {
    const [row] = await this.dataSource.query(
      `
        SELECT
          (SELECT COUNT(*) FROM "users" WHERE "isEmailVerified" = true) AS "users",
          (SELECT COUNT(*) FROM "cars") AS "cars",
          (SELECT COUNT(*) FROM "reservations") AS "reservations",
          (SELECT COALESCE(SUM("totalPrice"), 0) FROM "reservations"
            WHERE "status" = ANY($1)) AS "revenue"
      `,
      [EARNING_STATUSES],
    );

    // PostgreSQL returns counts and sums as strings
    return {
      users: Number(row.users),
      cars: Number(row.cars),
      reservations: Number(row.reservations),
      revenue: Number(row.revenue),
    };
  }

  // Every status is listed, with 0 when there are none
  private async getReservationsByStatus() {
    const rows: { status: ReservationStatus; count: string }[] =
      await this.dataSource.query(`
        SELECT "status", COUNT(*) AS "count"
        FROM "reservations"
        GROUP BY "status"
      `);

    const result = Object.fromEntries(
      Object.values(ReservationStatus).map((status) => [status, 0]),
    ) as Record<ReservationStatus, number>;

    for (const row of rows) {
      result[row.status] = Number(row.count);
    }

    return result;
  }

  // Revenue for each of the last 12 months (including this one), by the
  // month the reservation starts. Months without revenue are included as 0.
  private async getRevenueByMonth() {
    const rows: { month: string; revenue: string; reservations: string }[] =
      await this.dataSource.query(
        `
          SELECT
            TO_CHAR(DATE_TRUNC('month', "startDate"), 'YYYY-MM') AS "month",
            SUM("totalPrice") AS "revenue",
            COUNT(*) AS "reservations"
          FROM "reservations"
          WHERE "status" = ANY($1)
            AND "startDate" >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
            AND "startDate" < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
          GROUP BY 1
        `,
        [EARNING_STATUSES],
      );

    const byMonth = new Map(rows.map((row) => [row.month, row]));

    const now = new Date();
    const months: { month: string; revenue: number; reservations: number }[] =
      [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const row = byMonth.get(month);

      months.push({
        month,
        revenue: Number(row?.revenue ?? 0),
        reservations: Number(row?.reservations ?? 0),
      });
    }

    return months;
  }

  // The 5 cars with the most confirmed or completed reservations
  private async getTopCars() {
    const rows: {
      id: number;
      brand: string;
      brandAr: string | null;
      model: string;
      modelAr: string | null;
      reservations: string;
      revenue: string;
    }[] = await this.dataSource.query(
      `
        SELECT
          c."id",
          c."brand",
          c."brandAr",
          c."model",
          c."modelAr",
          COUNT(r."id") AS "reservations",
          SUM(r."totalPrice") AS "revenue"
        FROM "reservations" r
        JOIN "cars" c ON c."id" = r."carId"
        WHERE r."status" = ANY($1)
        GROUP BY c."id"
        ORDER BY COUNT(r."id") DESC, SUM(r."totalPrice") DESC
        LIMIT 5
      `,
      [EARNING_STATUSES],
    );

    return rows.map((row) => ({
      id: row.id,
      car: `${row.brand} ${row.model}`,
      brand: row.brand,
      brandAr: row.brandAr,
      model: row.model,
      modelAr: row.modelAr,
      reservations: Number(row.reservations),
      revenue: Number(row.revenue),
    }));
  }

  // Share of this month's car-days that are booked. Only the part of each
  // reservation that falls inside this month counts, and inactive cars
  // are left out because they cannot be rented.
  private async getOccupancyThisMonth() {
    const [row] = await this.dataSource.query(
      `
        WITH "month" AS (
          SELECT
            DATE_TRUNC('month', NOW()) AS "start",
            DATE_TRUNC('month', NOW()) + INTERVAL '1 month' AS "end"
        )
        SELECT
          (SELECT COUNT(*) FROM "cars" WHERE "status" <> 'INACTIVE') AS "cars",
          EXTRACT(DAY FROM (SELECT "end" - "start" FROM "month")) AS "days",
          (
            SELECT COALESCE(SUM(
              GREATEST(0, EXTRACT(EPOCH FROM (
                LEAST(r."endDate", m."end") - GREATEST(r."startDate", m."start")
              )) / 86400)
            ), 0)
            FROM "reservations" r, "month" m
            WHERE r."status" = ANY($1)
          ) AS "bookedDays"
      `,
      [EARNING_STATUSES],
    );

    const cars = Number(row.cars);
    const days = Number(row.days);
    const bookedDays = Number(row.bookedDays);
    const availableDays = cars * days;

    return {
      bookedDays: Math.round(bookedDays * 10) / 10,
      availableDays,
      percentage:
        availableDays === 0
          ? 0
          : Math.round((bookedDays / availableDays) * 1000) / 10,
    };
  }
}
