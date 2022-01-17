export const getCacheKey = (...args: string[]) => {
    return args.join("_")
}

