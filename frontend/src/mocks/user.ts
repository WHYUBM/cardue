/**
 * MOCK: Fake account and notification preferences used to give the Settings
 * page something to render. There is no authentication and no persistence yet;
 * replace this module once the backend exposes the current user.
 */
import type { NotificationPreferences, User } from '../types'

/** MOCK: Stand-in for the signed-in user. */
export const mockUser: User = {
  id: 'u1',
  name: 'Andrea Rossi',
  email: 'andrea.rossi@example.com',
}

/** MOCK: Preferences shown as already saved on the Settings page. */
export const mockNotificationPreferences: NotificationPreferences = {
  pushEnabled: true,
  daysBefore: 15,
}

/** Reminder lead times the user can choose between. */
export const DAYS_BEFORE_OPTIONS = [7, 15, 30, 60]
