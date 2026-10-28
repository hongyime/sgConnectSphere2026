import { requireEnv, runtimeConfig } from '../config.js';
import type { SendLease, SendOutcome } from '../modules/notificationDispatcher/durable.js';

// One bounded provider attempt. HTTP 429 is explicitly retryable. Network/5xx
// ambiguity is retained for reconciliation instead of silently sending twice.
export async function sendDurableBrevoEmail(job: SendLease): Promise<SendOutcome> {
  const apiKey = requireEnv(runtimeConfig.brevoApiKey, 'BREVO_API_KEY');
  const senderEmail = requireEnv(runtimeConfig.emailFrom, 'EMAIL_FROM');
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'ConnectSphere', email: senderEmail },
        replyTo: runtimeConfig.emailReplyTo ? { email: runtimeConfig.emailReplyTo } : undefined,
        to: [{ email: job.to }], subject: job.subject, htmlContent: job.html,
        headers: { 'X-ConnectSphere-Notification-ID': job.notificationId },
      }),
    });
    if (response.status === 429) {
      await response.body?.cancel();
      return { kind: 'retry', code: 'provider_throttled' };
    }
    if (response.status >= 400 && response.status < 500) {
      await response.body?.cancel();
      return { kind: 'failed', code: 'provider_rejected' };
    }
    if (!response.ok) {
      await response.body?.cancel();
      return { kind: 'uncertain', code: 'provider_outcome_unknown' };
    }
    // Provider acceptance is sufficient; message metadata is optional and never
    // justifies another send. Limit its body before parsing or retaining it.
    const reader = response.body?.getReader();
    let text = '';
    try {
      let size = 0;
      const decoder = new TextDecoder();
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) return { kind: 'sent' };
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
      const value = JSON.parse(text) as { messageId?: unknown };
      return { kind: 'sent', messageId: typeof value.messageId === 'string' ? value.messageId.slice(0, 512) : undefined };
    } catch { return { kind: 'sent' }; }
    finally { await reader?.cancel().catch(() => undefined); }
  } catch { return { kind: 'uncertain', code: 'provider_outcome_unknown' }; }
}
