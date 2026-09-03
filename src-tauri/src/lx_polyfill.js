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

  request: async function (url, options, callback) {
    try {
      const headers = options && options.headers ? JSON.stringify(options.headers) : "{}";
      const rawRes = await lx._doHttp(url, headers);
      const resp = JSON.parse(rawRes);

      callback(null, resp);
    } catch (e) {
      callback(e, null);
    }
  },
};
