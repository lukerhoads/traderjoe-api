import { isProd } from '../config'

interface ResError {
    errorCode: number
    errorMessage?: string
    errorTrace?: string
}

interface ResponseStatus {
    timestamp: string
    error_code?: number
    error_message?: string
    error_trace?: string
}

interface SystemResponse {
    data: any
    status: ResponseStatus
}

export const formatRes = (data: any, error?: ResError): SystemResponse => {
    return {
        data: data,
        status: {
            timestamp: Date.now().toString(),
            error_code: error?.errorCode,
            error_message: error?.errorMessage,
            error_trace: isProd ? error?.errorTrace : undefined,
        },
    }
}
