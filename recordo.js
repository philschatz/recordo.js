var Clipboard, MAX_LOG_SIZE, OriginalXMLHttpRequest, PREVIOUS_PATH, REPLAY_LOG, WrappedXMLHttpRequest, clearLog, clickListener, clipboard, controlsDiv, generateSelector, isStarted, listen, log, logClickHandler, loggedOnError, loggedOnPopState, originalOnError, originalOnPopState, replayCount, start, stop,
  slice = [].slice;

Clipboard = require('clipboard');

listen = require('good-listener');

MAX_LOG_SIZE = 100;

OriginalXMLHttpRequest = window.XMLHttpRequest;

originalOnError = window.onerror;

originalOnPopState = window.onpopstate;

isStarted = false;

clipboard = null;

clickListener = null;

replayCount = null;

controlsDiv = null;

REPLAY_LOG = null;

PREVIOUS_PATH = window.location.pathname;

log = function() {
  var _internalLog, args, path, type;
  type = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  _internalLog = function() {
    var args, type;
    type = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    if (replayCount != null) {
      replayCount.textContent = REPLAY_LOG.length;
    }
    REPLAY_LOG.push([type].concat(slice.call(args)));
    if (REPLAY_LOG.length > MAX_LOG_SIZE) {
      return REPLAY_LOG.shift();
    }
  };
  path = window.location.pathname;
  if (path !== PREVIOUS_PATH) {
    PREVIOUS_PATH = path;
    _internalLog('HISTORY', 'CHANGE', window.location.pathname);
  }
  return _internalLog.apply(null, [type].concat(slice.call(args)));
};

WrappedXMLHttpRequest = (function() {
  function WrappedXMLHttpRequest() {
    this._xhr = new OriginalXMLHttpRequest();
    this._xhr.onload = this._onload.bind(this);
    this._xhr.onerror = this._onerror.bind(this);
    Object.defineProperties(this, {
      onreadystatechange: {
        get: (function(_this) {
          return function() {
            return _this._xhr.onreadystatechange;
          };
        })(this),
        set: (function(_this) {
          return function(v) {
            return _this._xhr.onreadystatechange = v;
          };
        })(this)
      },
      readyState: {
        get: (function(_this) {
          return function() {
            return _this._xhr.readyState;
          };
        })(this)
      },
      response: {
        get: (function(_this) {
          return function() {
            return _this._xhr.response;
          };
        })(this)
      },
      responseText: {
        get: (function(_this) {
          return function() {
            return _this._xhr.responseText;
          };
        })(this)
      },
      responseType: {
        get: (function(_this) {
          return function() {
            return _this._xhr.responseType;
          };
        })(this),
        set: (function(_this) {
          return function(v) {
            return _this._xhr.responseType = v;
          };
        })(this)
      },
      responseXML: {
        get: (function(_this) {
          return function() {
            return _this._xhr.responseXML;
          };
        })(this)
      },
      status: {
        get: (function(_this) {
          return function() {
            return _this._xhr.status;
          };
        })(this)
      },
      statusText: {
        get: (function(_this) {
          return function() {
            return _this._xhr.statusText;
          };
        })(this)
      },
      timeout: {
        get: (function(_this) {
          return function() {
            return _this._xhr.timeout;
          };
        })(this),
        set: (function(_this) {
          return function(v) {
            return _this._xhr.timeout = v;
          };
        })(this)
      },
      ontimeout: {
        get: (function(_this) {
          return function() {
            return _this._xhr.ontimeout;
          };
        })(this),
        set: (function(_this) {
          return function(v) {
            return _this._xhr.ontimeout = v;
          };
        })(this)
      },
      onload: {
        get: (function(_this) {
          return function() {
            return _this._clientOnLoad;
          };
        })(this),
        set: (function(_this) {
          return function(v) {
            return _this._clientOnLoad = v;
          };
        })(this)
      },
      onerror: {
        get: (function(_this) {
          return function() {
            return _this._clientOnError;
          };
        })(this),
        set: (function(_this) {
          return function(v) {
            return _this._clientOnError = v;
          };
        })(this)
      },
      upload: {
        get: (function(_this) {
          return function() {
            return _this._xhr.upload;
          };
        })(this)
      },
      withCredentials: {
        get: (function(_this) {
          return function() {
            return _this._xhr.withCredentials;
          };
        })(this),
        set: (function(_this) {
          return function(v) {
            return _this._xhr.withCredentials = v;
          };
        })(this)
      }
    });
  }

  WrappedXMLHttpRequest.prototype._onload = function() {
    var args, responseText;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if (this.responseType === '' || this.responseType === 'text') {
      responseText = this.responseText;
    }
    log('XHR', 'load', this._method, this._url, this.status, responseText);
    return typeof this._clientOnLoad === "function" ? this._clientOnLoad.apply(this, args) : void 0;
  };

  WrappedXMLHttpRequest.prototype._onerror = function() {
    var args, responseText;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if (this.responseType === '' || this.responseType === 'text') {
      responseText = this.responseText;
    }
    log('XHR', 'error', this._method, this._url, this.status, responseText);
    return typeof this._clientOnError === "function" ? this._clientOnError.apply(this, args) : void 0;
  };

  WrappedXMLHttpRequest.prototype.abort = function() {
    var args, ref;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return (ref = this._xhr).abort.apply(ref, args);
  };

  WrappedXMLHttpRequest.prototype.open = function() {
    var args, ref;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    this._method = args[0], this._url = args[1];
    return (ref = this._xhr).open.apply(ref, args);
  };

  WrappedXMLHttpRequest.prototype.getAllResponseHeaders = function() {
    var args, ref;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return (ref = this._xhr).getAllResponseHeaders.apply(ref, args);
  };

  WrappedXMLHttpRequest.prototype.getResponseHeader = function() {
    var args, ref;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return (ref = this._xhr).getResponseHeader.apply(ref, args);
  };

  WrappedXMLHttpRequest.prototype.overrideMimeType = function() {
    var args, ref;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return (ref = this._xhr).overrideMimeType.apply(ref, args);
  };

  WrappedXMLHttpRequest.prototype.send = function() {
    var args, ref;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if (typeof args[0] === 'string') {
      this._data = args[0];
    }
    log('XHR', 'start', this._method, this._url, this._data);
    return (ref = this._xhr).send.apply(ref, args);
  };

  WrappedXMLHttpRequest.prototype.setRequestHeader = function() {
    var args, ref;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return (ref = this._xhr).setRequestHeader.apply(ref, args);
  };

  return WrappedXMLHttpRequest;

})();

loggedOnError = function(msg, url, line, column, err) {
  log('UNCAUGHT', msg, url, line, column, err);
  return typeof originalOnError === "function" ? originalOnError(msg, url, line, column, err) : void 0;
};

loggedOnPopState = function(evt) {
  try {
    JSON.stringify(evt.state);
  } catch (_error) {}
  log('HISTORY', 'POP', window.location.pathname, evt.state);
  return typeof originalOnPopState === "function" ? originalOnPopState(evt) : void 0;
};

generateSelector = function(target) {
  var attr, i, j, ref, selector;
  selector = [target.tagName.toLowerCase()];
  for (i = j = 0, ref = target.attributes.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
    attr = target.attributes.item(i);
    if (attr.name === 'class') {
      selector.push("." + (attr.value.split(' ').join('.')));
    } else if (attr.name === 'id') {
      selector.push("#" + attr.value);
    } else if (attr.name !== 'data-reactid') {
      selector.push("[" + attr.name + "='" + attr.value + "']");
    }
  }
  return selector.join('');
};

logClickHandler = function(evt) {
  var extra, selector, target;
  target = evt.target;
  if (target.classList.contains('-recordo')) {
    return;
  }
  selector = generateSelector(target);
  if (selector === 'span') {
    target = target.parentElement;
    selector = generateSelector(target) + '>span';
  }
  extra = void 0;
  switch (target.tagName.toLowerCase()) {
    case 'button':
      extra = target.innerText;
      break;
    case 'input':
      extra = target.value;
      break;
    case 'a':
      extra = target.href;
  }
  return log('CLICK', selector, extra);
};

clearLog = function() {
  return REPLAY_LOG.splice(0, REPLAY_LOG.length);
};

start = function(config) {
  var clearBtn, copyBtn, stopBtn;
  if (config == null) {
    config = {};
  }
  if (isStarted) {
    return;
  }
  if (window.localStorage['__REPLAY_LOG']) {
    REPLAY_LOG = JSON.parse(window.localStorage['__REPLAY_LOG']);
  } else {
    REPLAY_LOG = [];
  }
  window.__REPLAY_LOG = REPLAY_LOG;
  window.XMLHttpRequest = WrappedXMLHttpRequest;
  window.onerror = loggedOnError;
  window.onpopstate = loggedOnPopState;
  clickListener = listen('*:not(.-recordo)', 'click', logClickHandler);
  controlsDiv = document.querySelector('.-recordo-controls');
  if (!controlsDiv) {
    controlsDiv = document.createElement('div');
    controlsDiv.classList.add('-recordo');
    controlsDiv.classList.add('-recordo-controls');
    document.body.appendChild(controlsDiv);
  }
  stopBtn = document.querySelector('.-recordo-stop');
  if (!stopBtn) {
    stopBtn = document.createElement('button');
    stopBtn.classList.add('-recordo');
    stopBtn.classList.add('-recordo-stop');
    stopBtn.textContent = 'X';
    stopBtn.title = 'Stop ReplayLog Entirely. You will need to restart by adding ?collect=true to the URL';
    controlsDiv.appendChild(stopBtn);
  }
  clearBtn = document.querySelector('.-recordo-clear-log');
  if (!clearBtn) {
    clearBtn = document.createElement('button');
    clearBtn.classList.add('-recordo');
    clearBtn.classList.add('-recordo-clear-log');
    clearBtn.textContent = 'Clear';
    clearBtn.title = 'Clear the log. Useful when starting a new test';
    controlsDiv.appendChild(clearBtn);
  }
  copyBtn = document.querySelector('.-recordo-copy-to-clipboard');
  if (!copyBtn) {
    copyBtn = document.createElement('button');
    copyBtn.classList.add('-recordo');
    copyBtn.classList.add('-recordo-copy-to-clipboard');
    copyBtn.textContent = 'Copy';
    copyBtn.title = 'Copies the log to the clipboard.\nIn Safari you need to click this and then press Press ⌘-C to copy to the clipboard';
    controlsDiv.appendChild(copyBtn);
  }
  replayCount = document.querySelector('.-recordo-count');
  if (!replayCount) {
    replayCount = document.createElement('span');
    replayCount.classList.add('-recordo');
    replayCount.classList.add('-recordo-count');
    replayCount.textContent = REPLAY_LOG.length;
    controlsDiv.appendChild(replayCount);
  }
  clipboard = new Clipboard(copyBtn, {
    text: function() {
      return JSON.stringify(REPLAY_LOG);
    }
  });
  clearBtn.addEventListener('click', function() {
    clearLog();
    delete window.localStorage['__REPLAY_LOG'];
    return replayCount.textContent = REPLAY_LOG.length;
  });
  stopBtn.addEventListener('click', function() {
    return stop();
  });
  window.addEventListener('beforeunload', function() {
    if (!isStarted) {
      return;
    }
    log('HISTORY', 'UNLOAD');
    return window.localStorage['__REPLAY_LOG'] = JSON.stringify(REPLAY_LOG);
  });
  isStarted = true;
  return window.localStorage['__REPLAY_AUTO_START'] = true;
};

stop = function() {
  clearLog();
  delete window.__REPLAY_LOG;
  window.XMLHttpRequest = OriginalXMLHttpRequest;
  window.onerror = originalOnError;
  window.onpopstate = originalOnPopState;
  clipboard.destroy();
  clickListener.destroy();
  delete window.localStorage['__REPLAY_AUTO_START'];
  delete window.localStorage['__REPLAY_LOG'];
  controlsDiv.remove();
  return isStarted = false;
};

if (/collect=true/.test(window.location.search)) {
  start();
} else if (/collect=false/.test(window.location.search)) {
  stop();
}

if (window.localStorage['__REPLAY_AUTO_START']) {
  start();
}

module.exports = {
  start: start,
  stop: stop,
  isStarted: function() {
    return isStarted;
  }
};
