export interface EmailStep {
  type: 'email';
  template: string;
  delay?: number;
}

export interface NotificationStep {
  type: 'notification';
  title: string;
  message: string;
}

export interface TaskStep {
  type: 'task';
  title: string;
  assignedToRole: string;
}

export interface WaitStep {
  type: 'wait';
  days: number;
}

export type SequenceStep = EmailStep | NotificationStep | TaskStep | WaitStep;

export interface AutomationJob {
  event: string;
  payload: Record<string, unknown>;
}

export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  templateData: Record<string, unknown>;
}

export interface RenewalJob {
  type: 'check' | 'remind';
  memberId?: string;
}
