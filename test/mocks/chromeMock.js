// Mock Chrome Extension APIs for testing
const chromeMock = {
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    lastError: null,
    id: "test-extension-id",
    getURL: jest.fn((path) => `chrome-extension://test-extension-id/${path}`),
  },

  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        const result = Array.isArray(keys)
          ? keys.reduce((acc, key) => {
              acc[key] = null;
              return acc;
            }, {})
          : { [keys]: null };
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      clear: jest.fn((callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
    sync: {
      get: jest.fn((keys, callback) => {
        const result = Array.isArray(keys)
          ? keys.reduce((acc, key) => {
              acc[key] = null;
              return acc;
            }, {})
          : { [keys]: null };
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      clear: jest.fn((callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
  },

  tabs: {
    query: jest.fn((queryInfo, callback) => {
      const tabs = [
        {
          id: 1,
          url: "https://example.com",
          title: "Example",
          active: true,
        },
      ];
      if (callback) callback(tabs);
      return Promise.resolve(tabs);
    }),
    sendMessage: jest.fn((tabId, message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
  },

  webRequest: {
    onBeforeRequest: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onBeforeSendHeaders: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onSendHeaders: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onHeadersReceived: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onResponseStarted: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onCompleted: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onErrorOccurred: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },

  notifications: {
    create: jest.fn((notificationId, options, callback) => {
      if (callback) callback(notificationId || "notification-id");
      return Promise.resolve(notificationId || "notification-id");
    }),
    clear: jest.fn((notificationId, callback) => {
      if (callback) callback(true);
      return Promise.resolve(true);
    }),
  },
};

export default chromeMock;
