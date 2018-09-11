class ServerError extends Error {
  constructor(message, code, comment) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.code = code || 500;
    this.comment = comment;
  }
}

module.exports = ServerError;