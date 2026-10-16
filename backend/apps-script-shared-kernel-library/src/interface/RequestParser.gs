var RequestParser = {
  parse: function (event) {
    if (!event || !event.postData || typeof event.postData.contents !== 'string') {
      throw ApiError.validation('Request body is required');
    }
    var request = RequestParser.parseJson(event.postData.contents);
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      throw ApiError.validation('Request body must be a JSON object');
    }
    return request;
  },

  parseJson: function (text) {
    try {
      return JSON.parse(text);
    } catch (err) {
      throw ApiError.validation('Request body must be valid JSON');
    }
  }
};
