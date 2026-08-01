const envConfig = require('../config/env.config');
const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');
const HTTP_STATUS = require('../constants/httpStatusCodes');

class FxDeskProService {
  constructor() {
    this.baseUrl = envConfig.fxDeskProBaseUrl;
    this.timeoutMs = envConfig.fxDeskProTimeoutMs;
    this.maxRetries = 2;
  }

  /**
   * Private helper method to send HTTP requests with timeout and exponential backoff retry.
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl.replace(/\/$/, '')}${endpoint}`;
    let lastError = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        if (attempt > 0) {
          const backoffMs = Math.pow(2, attempt - 1) * 300; // 300ms, 600ms
          logger.info(`[FX Desk Pro] Retrying request to ${endpoint} (Attempt ${attempt}/${this.maxRetries}) after ${backoffMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        } else {
          logger.info(`[FX Desk Pro] Requesting ${endpoint}`);
        }

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(envConfig.internalServiceKey ? { 'x-service-key': envConfig.internalServiceKey } : {}),
            ...(options.headers || {}),
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new ApiError(
            response.status,
            `FX Desk Pro HTTP error ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();
        logger.info(`[FX Desk Pro] Successful response from ${endpoint}`);
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        const isAbort = error.name === 'AbortError';
        const errorMessage = isAbort
          ? `Request timed out after ${this.timeoutMs}ms`
          : error.message;

        logger.warn(`[FX Desk Pro] Request failed (${endpoint}) - Attempt ${attempt + 1}: ${errorMessage}`);
        lastError = error;

        // Do not retry on client errors (4xx)
        if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
          break;
        }
      }
    }

    logger.error(`[FX Desk Pro] All request attempts failed for ${endpoint}: ${lastError.message}`);
    throw new ApiError(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      `Unable to communicate with FX Desk Pro service at ${this.baseUrl}: ${lastError.message}`
    );
  }

  /**
   * Check connection status to FX Desk Pro service.
   * Returns metadata without throwing if unreachable.
   */
  async checkConnection() {
    const timestamp = new Date().toISOString();
    try {
      const healthData = await this.fetchHealth();
      return {
        connected: true,
        baseUrl: this.baseUrl,
        lastChecked: timestamp,
        details: healthData,
      };
    } catch (error) {
      return {
        connected: false,
        baseUrl: this.baseUrl,
        lastChecked: timestamp,
        error: error.message,
      };
    }
  }

  /**
   * Fetch system health status from FX Desk Pro.
   */
  async fetchHealth() {
    return await this._request('/api/health');
  }

  /**
   * Fetch active trading signals from FX Desk Pro (Read-Only).
   */
  async fetchActiveSignals() {
    try {
      return await this._request('/api/signals/active');
    } catch (err) {
      return await this._request('/api/signals');
    }
  }

  /**
   * Fetch completed signal outcomes from FX Desk Pro using opaque cursor.
   */
  async fetchCompletedOutcomes(cursor = '', limit = 100) {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return await this._request(`/api/signals/outcomes${queryString}`);
  }
}

module.exports = new FxDeskProService();
