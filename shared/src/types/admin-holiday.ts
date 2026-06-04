import type { HolidayType } from '../enums';

export interface AdminHoliday {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  region: string | null;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
