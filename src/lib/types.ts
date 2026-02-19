import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user';

export interface NotificationPreferences {
  emailEnabled: boolean;
  onStatusChange?: boolean;
  onNewAssignment?: boolean;
  dueSoonReminderDays?: number;
  onOverdue?: boolean;
}

export interface ReportSettings {
  frequency: 'daily' | 'weekly' | 'never';
}

export interface TasksViewPreferences {
  hideCompleted?: boolean;
}

export interface AppUser {
  id?: string; // Document ID might not be present if reading from public_users where doc id is uid
  uid: string; // Firebase Auth UID
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  notificationPreferences?: NotificationPreferences;
  reportSettings?: ReportSettings;
  viewPreference?: 'list' | 'kanban';
  tasksViewPreferences?: TasksViewPreferences;
  // Presence fields
  status?: 'online' | 'offline';
  lastSeen?: Timestamp;
  // Admin Fields
  accountStatus?: 'active' | 'locked';
}

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TargetQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface Subtask {
  id: string;
  name: string;
  isCompleted: boolean;
}

export interface Task {
  id:string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate: Timestamp;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  subtasks: Subtask[];
  assigneeId: string;
  assigneeName: string;
  path: string;
  taskTemplateId?: string;
  finalReportNumber?: string;
  order?: number;
  equipmentId?: string;
  equipmentName?: string;
  rin?: string;
  binderLocation?: string;
  department?: string;
  validationType?: string;
  // Quarterly Planning Fields
  startDate?: Timestamp;
  targetQuarter?: TargetQuarter;
  delayReason?: string;
  isDelayApproved?: boolean;
  // Resource Planning
  estimatedDays?: number;
  // Risk Management
  mitigationPlan?: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  estimatedDays?: number;
  subtasks: {
    name: string;
  }[];
}

export interface Document {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  uploaderId: string;
  uploaderName: string;
  createdAt: Timestamp;
  path: string; // From useCollection
}

export interface TeamEvent {
  id: string;
  path: string;
  title: string;
  description?: string;
  start: Timestamp;
  end: Timestamp;
  participantIds: string[];
  creatorId: string;
  creatorName: string;
}

export interface Notification {
  id: string;
  path: string;
  userId: string;
  message: string;
  createdAt: Timestamp;
  isRead: boolean;
  link?: string;
}

export interface Equipment {
  id: string;
  path: string;
  name: string;
  rin: string;
  lastRevalidationDate?: string;
  validationDueDate: string;
}

/**
 * Context type for shared dashboard data
 */
export interface DashboardContextValue {
  allTasks: Task[] | null;
  allUsers: AppUser[] | null;
  isLoading: boolean;
  error: Error | null;
}
