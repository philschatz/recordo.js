# Why?

Creating useful bug reports should be dead-simple.

Normal people don't open a debugging console when testing. They just _"do stuff and then it breaks"_. This records the stuff they did and what they said/got from the server to help when filing bugs. It does everything except push the <kbd>Report an Issue</kbd> button for them.

[Demo it in action here](http://philschatz.com/gh-board/?collect=true) (note the little `[[##]]` in the **bottom-right**)

# How?

1. Add `?collect=true` to the end of any URL to start collecting a replay log.
2. _(...do stuff until you find a bug...)_
3. Click the <kbd>Copy</kbd> button in the **bottom-right corner** of the page to copy the log (plus your browser info) to your clipboard.
4. Create a ticket in your issue tracker and paste the log

![image](https://cloud.githubusercontent.com/assets/253202/11760961/6681ce34-a07e-11e5-9dbf-33ca8d19a2cd.png)

## Control Panel

When you hover over the `[[23]]` (number of messages recorded), the control panel opens up:

![image](https://cloud.githubusercontent.com/assets/253202/11760962/72fbc8ea-a07e-11e5-8380-3756ebfa10b1.png)

## What are the buttons for?

- <kbd>X</kbd> Stop all the logging and instrumentation
- <kbd>Clear</kbd> clear the log (if you are starting a new test)
- <kbd>Copy</kbd> copy the log and :sparkles: _Browser Info_ :sparkles:  to the clipboard (and eventually the exact manifest/config of the server)


# For Developer Folks

Something like the following will then be on your clipboard which you can paste into the ticket tracker of your choice (it also contains the request/response JSON with the server):

```js
browser: {os: "MacIntel", userAgent: "Mozilla/5.0..."},
window: [800, 600],
log: [
  ["USER:CLICK", "div.collapse.navbar-collapse"]
  ["XHR:START", "GET", "/api/tasks/226"]
  ["XHR:LOAD",  "GET", "/api/tasks/226", 200, "{'id':...}"]   // <-- request query and POST body
  ["USER:CLICK", "button.async-button.continue[type='button']>span", "Continue"]
  ["HISTORY:URL", "/courses/3/tasks/226/steps/2/"]   // <-- user going to a different page
  ["XHR:START", "GET", "/api/steps/3653"]
  ["XHR:LOAD", "GET", "/api/steps/3653", 200, "{'id':'3653',...}"] // <-- response JSON
  ["USER:CLICK", "div.answer-letter"]
  ["HISTORY:POP", "/courses/3/tasks/226/steps/1/"]   // <-- clicked browser back button
  ["UNCAUGHT", "data is undefined", "index.js", 1000, 10]  // <-- uncaught JS errors
  ["HISTORY:UNLOAD"]    //  <-- Either refresh was clicked or the user went to another page
  ["WINDOW:SIZE", 800, 600]  //  <-- user resized the window
  ["CONSOLE:LOG", "Some message", 4, [1, true]]
]
```

# Does it work on ??? browser/OS?

Since it's part of the webpage it will. You'll be creating bug reports on mobile devices in no time!

# Install

1. `npm install --save recordo`
2. Add the Javascript file
  - For simple sites:
    1. add `<script src="node_modules/recordo/dist/recordo.js"></script>`
    2. call `window.__Recordo.initialize(); __Recordo.start()`
  - For browserify projects:
    - add `require('recordo').initialize()` to the code
    - if you do not want the code in production, wrap it in `"production" !== process.env.NODE_ENV`
      and pass that env variable in a way that Uglify can optimize it out
3. Add the CSS file
  - For LessCSS: add `@import (inline) '~recordo/recordo.css';`

## Development

1. run `npm start`
2. point your browser to `http://localhost:8080`

# TODO:

- [x] Log _all_ `console` messages
- [x] Log window resizes
