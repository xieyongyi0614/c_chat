import { ApiClient } from '../../utils/axios/service/apiService';
import { addActionHandler } from '../util';
// import { IpcCallMethod } from '@c_chat/shared-types';
console.log('auth');
addActionHandler('SignIn', async () => {
  const res = await ApiClient.auth.login({ email: '1796709584@qq.com', password: '123456' });
  console.log(res, 'signIn');
});
