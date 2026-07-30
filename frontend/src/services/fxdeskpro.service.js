import { fetchApi } from './api';
import { API_ENDPOINTS } from '../utils/constants';

export const testFxDeskProConnection = async () => {
  return await fetchApi(API_ENDPOINTS.FX_DESK_PRO_TEST, {
    method: 'POST',
  });
};
