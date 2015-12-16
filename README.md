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
[
  ["CLICK", "div.collapse.navbar-collapse"]
  ["XHR", "start", "GET", "/api/tasks/226"]
  ["XHR", "load",  "GET", "/api/tasks/226", 200, "{'id':...}"] # <-- request query and POST body
  ["CLICK", "button.async-button.continue[type='button']>span", "Continue"]
  ["HISTORY", "change", "/courses/3/tasks/226/steps/2/"]  # <-- user going to a different page
  ["XHR", "start", "GET", "/api/steps/3653"]
  ["XHR", "load", "GET", "/api/steps/3653", 200, "{'id':'3653',...}"] # <-- response JSON
  ["CLICK", "div.answer-letter"]
  ["HISTORY", "pop","/courses/3/tasks/226/steps/1/"]   # <-- clicked browser back button
  ["UNCAUGHT", "data is undefined", "index.js", 1000, 10] # <-- uncaught JS errors
  ["HISTORY", "unload"]    # <-- Either refresh was clicked or the user went to another page

# TODO:
  ["CONSOLE", "ERROR", "React: Caught Exception nullpointer..."]
  ["WINDOW", "RESIZE", 800, 600]  # <-- user resized the window
]
```

# Does it work on ??? browser/OS?

Since it's part of the webpage it will. You'll be creating bug reports on mobile devices in no time!

# Install

1. `npm install --save recordo`
2. add `require('recordo').initialize()` to the code


# TODO:

- [ ] Log _all_ `console` messages
- [ ] Log window resizes
