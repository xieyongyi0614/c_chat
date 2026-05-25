import { to } from 'await-to-js';
import type { HttpClient } from '../http/httpClient';

export abstract class BaseService {
  protected httpClient: HttpClient;
  protected apiTool = to;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }
}
