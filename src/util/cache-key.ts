export const getCacheKey = (prefix: string, key: string, operation: string) => {
    return prefix + '_' + operation + '_' + key
}
