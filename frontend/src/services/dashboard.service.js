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
