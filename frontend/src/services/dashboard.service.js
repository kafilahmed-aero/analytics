import { fetchApi } from './api';
import { API_ENDPOINTS } from '../utils/constants';

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });
  const str = query.toString();
  return str ? `?${str}` : '';
};

export const getDashboardSummary = async () => {
  return await fetchApi(API_ENDPOINTS.DASHBOARD_SUMMARY);
};

export const getDashboardChannels = async (params = {}) => {
  const queryString = buildQueryString(params);
  return await fetchApi(`${API_ENDPOINTS.DASHBOARD_CHANNELS}${queryString}`);
};

export const resetAnalyticsApi = async () => {
  return await fetchApi(API_ENDPOINTS.ANALYTICS_RESET, { method: 'POST' });
};

export const backupAnalyticsApi = async () => {
  return await fetchApi(API_ENDPOINTS.ANALYTICS_BACKUP, { method: 'POST' });
};

export const restoreAnalyticsApi = async () => {
  return await fetchApi(API_ENDPOINTS.ANALYTICS_RESTORE, { method: 'POST' });
};
