# Add the following data into a log that can be included when filing a ticket
# to help developers recreate an issue. This can be enabled/disabled programmatically
# or just by adding `?debug=true` to the URL.
#
# - [x] recent HTTP errors
# - [x] all the JS exceptions that were thrown
# - [x] recent set of elements that were clicked
# - [x] how the URL recently changed

Clipboard = require 'clipboard'
listen = require 'good-listener'
debounce = require 'lodash/function/debounce'
map = require 'lodash/collection/map'
omit = require 'lodash/object/omit'

MAX_LOG_SIZE = 50

# The start config changes this setting. It allows for shorter logs since it does not include the JSON response in AJAX requests
IGNORE_AJAX_RESPONSE = false

OriginalXMLHttpRequest = window.XMLHttpRequest
originalOnError = window.onerror
originalOnPopState = window.onpopstate

originalConsoleMethods =
  error: console.error
  info: console.info
  log: console.log
  warn: console.warn

isStarted = false
clipboard = null
clickListener = null
replayCount = null
controlsDiv = null

LAST_EVENT_OF_TYPE = {} # Stores the last event of each type. Useful when the log is long
THE_LOG = null
PREVIOUS_PATH = window.location.toString()
_internalLog = (type, args...) ->
  replayCount?.textContent = THE_LOG.length
  # console.log type, args...
  THE_LOG.push([type, args...])
  LAST_EVENT_OF_TYPE[type] = args[...]
  # Discard the oldest entry
  if THE_LOG.length > MAX_LOG_SIZE
    THE_LOG.shift()

log = (type, args...) ->
  # History: Since there are no pushState events, we poll here to see if
  # there are any changes to the URL
  path = window.location.pathname
  if path isnt PREVIOUS_PATH
    PREVIOUS_PATH = path
    _internalLog('HISTORY:URL', window.location.toString())
  _internalLog(type, args...)


# Safari in private mode does not allow saving to localStorage or sessionStorage
setStorage = (key, value) ->
  try
    window.localStorage[key] = value
  catch e


# Wrap the XMLHttpRequest so we can report timeouts, errors, or success
class WrappedXMLHttpRequest
  constructor: ->
    @_xhr = new OriginalXMLHttpRequest()
    # Users can use `onreadystatechange` or `onload` (or both) but only report once
    @_xhr.onload = @_onload.bind(@)
    @_xhr.onerror = @_onerror.bind(@)

    Object.defineProperties @,
      onreadystatechange:
        get: => @_xhr.onreadystatechange
        set: (v) => @_xhr.onreadystatechange = v
      readyState: get: => @_xhr.readyState
      response: get: => @_xhr.response
      responseText: get: => @_xhr.responseText
      responseType:
        get: => @_xhr.responseType
        set: (v) => @_xhr.responseType = v
      responseXML: get: => @_xhr.responseXML
      status: get: => @_xhr.status
      statusText: get: => @_xhr.statusText
      # TODO: Use `ontimeout` and `abort` more in our code
      timeout:
        get: => @_xhr.timeout
        set: (v) => @_xhr.timeout = v
      ontimeout:
        get: => @_xhr.ontimeout
        set: (v) => @_xhr.ontimeout = v
      onload:
        get: => @_clientOnLoad
        set: (v) => @_clientOnLoad = v
      onerror:
        get: => @_clientOnError
        set: (v) => @_clientOnError = v
      upload: get: => @_xhr.upload
      withCredentials:
        get: => @_xhr.withCredentials
        set: (v) => @_xhr.withCredentials = v

  _onload: (args...) ->
    responseText = @responseText if @responseType is '' or @responseType is 'text'
    # Try to parse the responseText as JSON
    # if it fails, just use the text
    try
      responseText = JSON.parse(responseText)
    if IGNORE_AJAX_RESPONSE
      log('XHR:LOAD', @_method, @_url, @status)
    else
      log('XHR:LOAD', @_method, @_url, @status, responseText)
    @_clientOnLoad?(args...)

  _onerror: (args...) ->
    responseText = @responseText if @responseType is '' or @responseType is 'text'
    log('XHR:ERROR', @_method, @_url, @status, responseText)
    @_clientOnError?(args...)

  abort: (args...) -> @_xhr.abort(args...)
  open: (args...) ->
    # Save the method and URL for logging later
    [@_method, @_url] = args
    @_xhr.open(args...)
  getAllResponseHeaders: (args...) -> @_xhr.getAllResponseHeaders(args...)
  getResponseHeader: (args...) -> @_xhr.getResponseHeader(args...)
  overrideMimeType: (args...) -> @_xhr.overrideMimeType(args...)
  send: (args...) ->
    if typeof args[0] is 'string'
      @_data = args[0]
    log('XHR:START', @_method, @_url, @_data)
    @_xhr.send(args...)
  setRequestHeader: (args...) -> @_xhr.setRequestHeader(args...)


# Log all uncaught errors
loggedOnError = (msg, url, line, column, err) ->
  log('UNCAUGHT', msg, url, line, column, err)
  originalOnError?(msg, url, line, column, err)


# If the user presses the back or foreward browser buttons then log it!
loggedOnPopState = (evt) ->
  try
    # Make sure evt.state is serializable. Otherwise, don't use it
    JSON.stringify(evt.state)

  log('HISTORY:POP', window.location.pathname, evt.state)
  originalOnPopState?(evt)


loggedOnResize = ->
  # Throttle resizes because the events fire quicker than the user
  {innerWidth, innerHeight} = window
  log('WINDOW:SIZE', innerWidth, innerHeight)

loggedOnResize = debounce(loggedOnResize, 1000)


loggedConsole = (type) -> (args...) ->
  serializableArgs = map args, (arg) ->
    if arg instanceof Error
      "Error(#{arg.message})"
    else
      # Try to serialize the arg. If it works, great!
      try
        JSON.stringify(arg)
        arg
      catch e
        "UNSERIALIZABLE_#{'' + arg}"

  originalConsoleMethods[type].bind(console)(args...)
  log("CONSOLE:#{type.toUpperCase()}", serializableArgs)


generateSelector = (target) ->
  selector = [target.tagName.toLowerCase()]
  for i in [0...target.attributes.length]
    attr = target.attributes.item(i)
    if attr.name is 'class'
      selector.push(".#{attr.value.split(' ').join('.')}")
    else if attr.name is 'id'
      selector.push("##{attr.value}")
    else if attr.name isnt 'data-reactid' # skip the react attribute
      selector.push("[#{attr.name}='#{attr.value}']")
  selector.join('')


logClickHandler = (evt) ->
  {target} = evt

  return if target.classList.contains('-recordo') # Do not log clicks on the replay buttons

  selector = generateSelector(target)
  # React frequently injects spans that have nothing on them.
  # If that is the case then use the parent selector
  if selector is 'span'
    target = target.parentElement
    selector = generateSelector(target) + '>span'

  extra = undefined

  switch target.tagName.toLowerCase()
    when 'input' then extra = target.value
    else
      extra = target.innerText

  # For long strings of text, shorten them with `...` in the middle
  if extra
    len = extra.length
    if len > 30
      extra = "#{extra.substring(0,13)}...#{extra.substring(len-13,len)}"

  # Build up a unique selector
  log('USER:CLICK', selector, extra)


clear = ->
  THE_LOG.splice(0, THE_LOG.length)

generateClipboard = ->
  info =
    current_url: window.location.toString()
    current_window: [window.innerWidth, window.innerHeight]
    browser:
      os: navigator.oscpu or navigator.platform
      userAgent: navigator.userAgent
    log: THE_LOG

  # If the log is long then send the last event of all the types
  # TODO: store these in localStorage too
  unless THE_LOG.length < MAX_LOG_SIZE
    typesInTheLog = map THE_LOG, ([type]) -> type
    info.lastEvents = omit(LAST_EVENT_OF_TYPE, typesInTheLog)

  info


injectButtons = ->
  return unless isStarted
  controlsDiv = document.querySelector('.-recordo-controls')
  # Create a button if one does not already exist
  unless controlsDiv
    controlsDiv = document.createElement('div')
    controlsDiv.classList.add('-recordo')
    controlsDiv.classList.add('-recordo-controls')
    document.body.appendChild(controlsDiv)

  stopBtn = document.querySelector('.-recordo-stop')
  # Create a button if one does not already exist
  unless stopBtn
    stopBtn = document.createElement('button')
    stopBtn.classList.add('-recordo')
    stopBtn.classList.add('-recordo-stop')
    stopBtn.textContent = 'X'
    stopBtn.title = 'Stop Recordo Entirely. You will need to restart by adding ?collect=true to the URL'
    controlsDiv.appendChild(stopBtn)

  clearBtn = document.querySelector('.-recordo-clear-log')
  # Create a button if one does not already exist
  unless clearBtn
    clearBtn = document.createElement('button')
    clearBtn.classList.add('-recordo')
    clearBtn.classList.add('-recordo-clear-log')
    clearBtn.textContent = 'Clear'
    clearBtn.title = 'Clear the log. Useful when starting a new test'
    controlsDiv.appendChild(clearBtn)

  copyBtn = document.querySelector('.-recordo-copy-to-clipboard')
  # Create a button if one does not already exist
  unless copyBtn
    copyBtn = document.createElement('button')
    copyBtn.classList.add('-recordo')
    copyBtn.classList.add('-recordo-copy-to-clipboard')
    copyBtn.textContent = 'Copy'
    copyBtn.title = '''
      Copies the log to the clipboard.
      In Safari you need to click this and then press Press ⌘-C to copy to the clipboard
    '''
    controlsDiv.appendChild(copyBtn)

  replayCount = document.querySelector('.-recordo-count')
  unless replayCount
    replayCount = document.createElement('span')
    replayCount.classList.add('-recordo')
    replayCount.classList.add('-recordo-count')
    replayCount.textContent = THE_LOG.length
    controlsDiv.appendChild(replayCount)

  # Add a button to copy to clipboard
  clipboard = new Clipboard copyBtn,
    text: -> '```json\n' + JSON.stringify(generateClipboard(), null, 2) + '\n```'

  clearBtn.addEventListener 'click', ->
    # Clear the log without making a new array (because it's a global var)
    clear()
    delete window.localStorage['__RECORDO_LOG']
    replayCount.textContent = THE_LOG.length

  stopBtn.addEventListener 'click', -> stop()


start = (config = {}) ->
  IGNORE_AJAX_RESPONSE = !!config.ignoreAjaxResponse
  return if isStarted

  # Load the THE_LOG from localStorage if available (this helps with pages going to a login page and then coming back)
  if window.localStorage['__RECORDO_LOG']
    THE_LOG = JSON.parse(window.localStorage['__RECORDO_LOG'])
  else
    THE_LOG = []

  window.XMLHttpRequest = WrappedXMLHttpRequest
  window.onerror = loggedOnError
  window.onpopstate = loggedOnPopState

  clickListener = listen('*:not(.-recordo)', 'click', logClickHandler)

  injectButtons()

  window.addEventListener 'unhandledrejection', (event) ->
  	log('UNHANDLED_REJECTION', ['' + event.reason, '' + event.reason.stack])

  window.addEventListener 'beforeunload', ->
    return unless isStarted
    log('HISTORY:UNLOAD')
    setStorage('__RECORDO_LOG', JSON.stringify(THE_LOG))

  window.addEventListener 'resize', ->
    return unless isStarted
    loggedOnResize()
  loggedOnResize() # Store the initiala size

  # Wrap the console methods
  console.error = loggedConsole('error')
  console.info = loggedConsole('info')
  console.log = loggedConsole('log')
  console.warn = loggedConsole('warn')

  _internalLog('HISTORY:URL', window.location.toString())

  isStarted = true
  # Safari in private mode does not allow saving to localStorage or sessionStorage
  setStorage('__RECORDO_AUTO_START', true)

stop = ->
  clear()
  window.XMLHttpRequest = OriginalXMLHttpRequest
  window.onerror = originalOnError
  window.onpopstate = originalOnPopState
  clipboard.destroy()
  clickListener.destroy()

  # Restore the original console methods
  console.error = originalConsoleMethods.error
  console.info = originalConsoleMethods.info
  console.log = originalConsoleMethods.log
  console.warn = originalConsoleMethods.warn


  delete window.localStorage['__RECORDO_AUTO_START']
  delete window.localStorage['__RECORDO_LOG']
  controlsDiv.remove()
  isStarted = false


initialize = (config) ->
  # If the URL has the special `?debug=true` the start automatically
  if /collect=true/.test(window.location.search)
    start(config)
  else if /collect=false/.test(window.location.search)
    stop(config)

  start(config) if window.localStorage['__RECORDO_AUTO_START']

module.exports = {
  initialize
  start
  injectButtons
  log
  stop
  clear
  generateClipboard
  getLog: -> THE_LOG
  isStarted: -> isStarted
}
