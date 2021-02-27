# GoodPopup
Responsive jQuery-plugin with brilliant outside markup and stable behaviour.  
No inner markup. Create your inner popup markup as good as you can.

## Demo
https://eugene-lazarev.github.io/jquery-goodpopup/

## Build
`npm install && grunt`

## Quick install
```html
<!-- Dependencies: jQuery... -->
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>  
<!-- ...and Handlebars (not required; include only when you use its templates system for popups) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.11/handlebars.min.js"></script>

<!-- GoodPopup: JS & CSS -->
<script src="jquery.goodpopup/js/script.min.js"></script>
<link href="jquery.goodpopup/css/style.min.css" rel="stylesheet" type="text/css"/>
```

## How to use
### Basic example
#### With Handlebars template
Append handlebars-template with unique `id` as *inner content* of your popup:
```html
<script id="goodpopup1" type="text/x-handlebars-template">
    <div>
        <h1>Hello world</h1>
    </div>
</script>
```
Get your popup and open it:
```javascript
$.goodpopup.getPopup("goodpopup1").open()
```
And then close it:
```javascript
$.goodpopup.getPopup("goodpopup1").close()
```
#### With regular block
Add `id` attribute to any element in your DOM to be able to open it as popup content:
```html
<div id="goodpopup2">
    <h1>Hello world — 2</h1>
</div>
```
Get your popup and open it:
```javascript
$.goodpopup.getPopup("goodpopup2").open()
```
And then close it:
```javascript
$.goodpopup.getPopup("goodpopup2").close()
```

### API
GoodPopup instance (`popup_instance` further) could be collected these ways:

1. Get from global object using its `id`: `$.goodpopup.getPopup("goodpopup1")`;
2. Get from template‘s DOM-element using `$("#goodpopup1").data("goodpopup")`;
3. Find it in a list from `$.goodpopup.getPopups()`.

#### Options
Options could be set these ways:

1. Using data-attributes in template‘s DOM-element (for example, `data-is-detachable="true"` for option `isDetachable`);
2. Using method `popup_instance.setOptions()` (see below);
3. When init a template manually (for example, `$("#dynamic-popup").goodpopup({ isDetachable: true })`.

##### `isDetachable`
Type: `boolean`  
Default value: `false`

Assigns method `detach` instead of `remove` when hiding a popup. This allows to preserve the popup‘s content.

##### `isOuterClickClosing`
Type: `boolean`  
Default value: `true`

Specifies if popup will be closed when clicking outside its content.

##### `keyCodeForClosing`
Type: `number`, `array`  
Default value: `[27]`

Specifies the keys for closing popup. Must be a number or an array of numbers.  
Default value represents *Esc* button.  
Please refer to [keycode.info](https://keycode.info) website to find out keys codes.
Use `false` value if you need to cancel popup‘s closing from keyboard.

##### `closeButton`
Type: `string`
Default value: `""`

Specifies the [jQuery-style selector](https://api.jquery.com/category/selectors/) of item(s), click on which triggers popup’s closing.

##### `isPrerendered`
Type: `boolean`  
Default value: `false`

Specifies if the plugin should render the popup‘s content right after plugin‘s initialization (normally, the popup‘s content renders just before opening).  
Make sense only if this option sets before plugin‘s initialization. Please set it using data-attribute in template‘s DOM-element.

##### `isIframe`
Type: `boolean`  
Default value: `false`

Specifies if the popup‘s content should stay in DOM after a popup will be closed.  
Extremely useful if the popup‘s content contains any iframe. If this option is set to `false`, the iframe will be reloaded each time when the popup opens (this is DOM‘s default behaviour for any browser when iframe moves through the DOM).

##### `forceClosing`
Type: `object`  
Default value:
```javascript
{
    click: true,
    keydown: true,
    button: false
}
```
When you opens a popup after popup, plugin creates the queue of popups which was closed but are waiting to be opened after current popup will be closed. „Force-closing“ option closes all popups including current popup and all popups which was closed and which are waiting in the queue. In this case, callback functions will be called for each closing popup in the order from the last to the first closed popup.  
Set `true` to any value for „force-closing“ after event is happened:
- `click` — a click outside the popup‘s content (works only if option `isOuterClickClosing` set to `true`);
- `keydown` — a key which set in `keyCodeForClosing` has pressed;
- `button` — a click on popup‘s close button (works only for elements matching `closeButton` option selector).


#### Callbacks
They are set the same way as other options.  
They are executing just when it is expected.

##### `callbackBeforeOpen`
Calling before a popup will be opened.

##### `callbackAfterOpen`
Calling after a popup was opened.

##### `callbackBeforeClose`
Calling before a popup will be closed.

##### `callbackAfterClose`
Calling after a popup was closed.


#### Additional data
##### `data`
Handlebars allows to use additional data object to render it inside template.  
You can set it *before `popup_instance.open()`*. For example:
```javascript
$.goodpopup.getPopup("goodpopup1").setOptions({ data: { header: "Hello world" } }).open();
```
It other way, you can use special literals in regular HTML, which you want to use as popup’s template.
Any literals matching pattern `${}` will be rendered with same data’s item. For example:
```html
<div id="goodpopup3">
    <h1>${header}</h1>
</div>
```
```javascript
$.goodpopup.getPopup("goodpopup3").setOptions({ data: { header: "Hello world — 3" } }).open();
```


#### Methods
##### `popup_instance.open()`
Open a popup.

##### `popup_instance.close(true)`
Close a popup.  
First argument is boolean and specifies „force-closing“ for all popups. If it is set to `false` (default), only this popup will be closed. If it is set to `true`, this popup and all popups in the queue will be closed immediately.

##### `popup_instance.dequeue()`
Remove this popup from the queue of previous opened popups.

##### `popup_instance.isRendered()`
Returns a boolean that indicates if the popup‘s content is rendered.

##### `popup_instance.isHidden()`
Returns a boolean that indicates if popup is hidden now.

##### `popup_instance.setOptions({})`
Set new options object.

##### `popup_instance.getOptions()`
Returns an object with all set options.

##### `popup_instance.getPopupContent()`
Returns a jQuery-object of the popup‘s content appended into a parent element — `<div class="goodpopup-inner-content-element">`.

##### `popup_instance.getPopupId()`
Returns a string that presents an `id` of this popup.

##### `popup_instance.getTemplate()`
Returns a jQuery-object of DOM-element from which this popup‘s content is rendered (DOM-element with suited `id`).


### Global object `$.goodpopup`
Contains methods to manipulate popups.

#### `$.goodpopup.getPopup(popup_name)`
Returns `popup_instance` for popup with `popup_name`.

#### `$.goodpopup.getPopups()`
Returns an array with all available popups (excluding popups that will be created from non-handlebars blocks which was never opened).

#### `$.goodpopup.getQueue()`
Returns an array of the queue containing previously opened popups which had beed hidden because a new popup was opened. You can remove any popup from this queue using method `popup_instance.dequeue()`.


## License
[MIT License](LICENSE.md)
