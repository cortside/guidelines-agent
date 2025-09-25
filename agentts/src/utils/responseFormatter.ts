import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
}

export class ResponseFormatter {
  static success<T>(res: Response, data: T, statusCode: number = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    code?: string
  ): void {
    const response: ApiResponse = {
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString(),
    };
    
    res.status(statusCode).json(response);
  }
}
