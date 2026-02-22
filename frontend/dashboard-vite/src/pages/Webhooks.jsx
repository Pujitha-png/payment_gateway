import { useEffect, useState } from 'react';
import {
  getWebhookConfig,
  saveWebhookConfig,
  sendTestWebhook,
  getWebhookLogs,
  retryWebhook,
} from '../api/api';

export default function Webhooks() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadData() {
    try {
      const [configRes, logsRes] = await Promise.all([getWebhookConfig(), getWebhookLogs(10, 0)]);
      setWebhookUrl(configRes.data.webhook_url || '');
      setWebhookSecret(configRes.data.webhook_secret || '');
      setLogs(logsRes.data.data || []);
    } catch {
      setMessage('Unable to load webhook settings');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await saveWebhookConfig({ webhook_url: webhookUrl });
      setWebhookSecret(response.data.webhook_secret || webhookSecret);
      setMessage('Webhook configuration saved');
      await loadData();
    } catch {
      setMessage('Failed to save webhook configuration');
    } finally {
      setSaving(false);
    }
  }

  async function onRegenerateSecret() {
    try {
      const response = await saveWebhookConfig({ webhook_url: webhookUrl, regenerate_secret: true });
      setWebhookSecret(response.data.webhook_secret || '');
      setMessage('Webhook secret regenerated');
    } catch {
      setMessage('Failed to regenerate secret');
    }
  }

  async function onTestWebhook() {
    try {
      await sendTestWebhook();
      setMessage('Test webhook queued');
      await loadData();
    } catch (error) {
      setMessage(error?.response?.data?.error?.description || 'Failed to send test webhook');
    }
  }

  async function onRetry(webhookId) {
    try {
      await retryWebhook(webhookId);
      setMessage('Webhook retry scheduled');
      await loadData();
    } catch {
      setMessage('Failed to retry webhook');
    }
  }

  return (
    <div className="page fade-in">
      <div className="layout-wrap wide">
        <div data-testid="webhook-config" className="card info-card">
          <h2>Webhook Configuration</h2>

          <form data-testid="webhook-config-form" className="form section-gap" onSubmit={onSave}>
            <div>
              <label>Webhook URL</label>
              <input
                data-testid="webhook-url-input"
                type="url"
                placeholder="https://yoursite.com/webhook"
                className="input"
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
              />
            </div>

            <div className="credential-item">
              <label>Webhook Secret</label>
              <span data-testid="webhook-secret" className="credential-value">
                {webhookSecret || 'Not generated'}
              </span>
              <button
                data-testid="regenerate-secret-button"
                type="button"
                className="button-ghost"
                onClick={onRegenerateSecret}
              >
                Regenerate
              </button>
            </div>

            <button data-testid="save-webhook-button" type="submit" className="button-primary" disabled={saving}>
              Save Configuration
            </button>

            <button
              data-testid="test-webhook-button"
              type="button"
              className="button-ghost"
              onClick={onTestWebhook}
            >
              Send Test Webhook
            </button>
          </form>

          {message ? <p className="subtitle section-gap">{message}</p> : null}

          <h3 className="section-gap">Webhook Logs</h3>
          <div className="table-wrap">
            <table data-testid="webhook-logs-table" className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Last Attempt</th>
                  <th>Response Code</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} data-testid="webhook-log-item" data-webhook-id={log.id}>
                    <td data-testid="webhook-event">{log.event}</td>
                    <td data-testid="webhook-status">{log.status}</td>
                    <td data-testid="webhook-attempts">{log.attempts}</td>
                    <td data-testid="webhook-last-attempt">
                      {log.last_attempt_at ? new Date(log.last_attempt_at).toLocaleString('sv-SE') : '-'}
                    </td>
                    <td data-testid="webhook-response-code">{log.response_code ?? '-'}</td>
                    <td>
                      <button
                        data-testid="retry-webhook-button"
                        data-webhook-id={log.id}
                        type="button"
                        className="button-ghost"
                        onClick={() => onRetry(log.id)}
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6">No webhook logs yet</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
