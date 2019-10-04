class ServerError extends Error {
  constructor(message, code, comment) {
    if (message instanceof Error && message.response) {
      code = message.response.statusCode;
      comment = message.response.body[1];
      message = message.response.body[0];
    }

    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.code = code || 500;
    this.comment = comment;
  }
}

module.exports = ServerError;
