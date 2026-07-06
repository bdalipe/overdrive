function wrapRepositoryError(operation, error) {
    const message = error?.message ?? String(error);
    const wrapped = new Error(`Repository ${operation} failed: ${message}`);
    wrapped.cause = error;
    return wrapped;
}

module.exports = { wrapRepositoryError };
