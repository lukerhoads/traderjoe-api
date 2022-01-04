interface ResError {
    errorCode: number
    errorMessage: string
}

export const formatRes = (data: any, error?: ResError) => {
    return {
        data: data,
        status: {
            timestamp: Date.now().toString(),
            error_code: error?.errorCode,
            error_message: error?.errorMessage,
        },
    }
}
