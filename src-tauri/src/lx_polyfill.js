globalThis.console = new Proxy({}, { get: () => () => {} });

globalThis.lx = {
  EVENT_NAMES: {
    request: "request",
    inited: "inited",
    updateAlert: "updateAlert",
  },
  version: "2.0.0",
  env: "desktop",

  send: function (eventName, data) {
    if (eventName === "inited" && data && data.sources) {
      const map = {};
      for (const [source, info] of Object.entries(data.sources)) {
        if (Array.isArray(info.qualitys)) {
          map[source] = info.qualitys;
        }
      }
      lx._qualities = map;
    }
  },

  on: function (eventName, handler) {
    if (eventName === "request") {
      lx._requestHandler = handler;
    }
  },

  request: function (url, options, callback) {
    const headers = options && options.headers ? options.headers : {};
    try {
      const resp = JSON.parse(lx._doHttp(url, headers));
      callback(null, resp);
    } catch (e) {
      callback(e, null);
    }
  },
};
