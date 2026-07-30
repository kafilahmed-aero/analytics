import { fetchApi } from './api';
import { API_ENDPOINTS } from '../utils/constants';

export const getHealth = async () => {
  return await fetchApi(API_ENDPOINTS.HEALTH);
};
