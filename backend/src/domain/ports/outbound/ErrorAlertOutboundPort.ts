export type AlertCategory =
  | 'ORDER_FAILURE'
  | 'TICKET_FAILURE'
  | 'EMAIL_DELIVERY_FAILURE'
  | 'ADMIN_ACTION_FAILURE'
  | 'SYSTEM_ERROR';

export interface ErrorAlertContext {
  category: AlertCategory;
  operation: string;
  errorMessage: string;
  stack?: string;
  httpStatus?: number;
  metadata?: Record<string, unknown>;
}

export interface ErrorAlertResult {
  logged: boolean;
  emailSent: boolean;
  messageId?: string;
}

export interface ErrorAlertOutboundPort {
  reportError(context: ErrorAlertContext): Promise<ErrorAlertResult>;
}
