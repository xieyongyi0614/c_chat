import { Request } from 'express';
import { UsersTypes } from './users-types';

export interface JwtRequest extends Request {
  user: UsersTypes.GetUserInfoResponse;
}
