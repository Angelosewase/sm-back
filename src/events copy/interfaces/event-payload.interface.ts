export interface EventPayload {
  eventType: string;
  eventName: string;
  description: string;
  details?: Record<string, any>;
  triggeredBy?: string; // User ID
  resourceId?: string;
  resourceType?: string;
  school?: string; // School ID
  ipAddress?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'critical';
}
