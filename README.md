# Хороший попап
jQuery-плагин с хорошей разметкой попапа.

## Сборка
`npm install && grunt`

## Установка
```html
<!-- Зависимости: jQuery и Handlebars -->
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.0.0/jquery.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.5/handlebars.min.js"></script>

<!-- Плагин -->
<script src="build/js/script.min.js"></script>
<link href="build/css/style.min.css" rel="stylesheet" type="text/css"/>
```

## Использование
Добавьте в конец страницы шаблон handlebars, содержащий *внутреннюю* разметку попапа, используя уникальный `id`:
```html
<script id="goodpopup" type="text/x-handlebars-template">
    <div>
        <h1>Hello world</h1>
    </div>
</script>
```
В любой момент покажите попап, используя `id` шаблона:
```javascript
$.popup("goodpopup").show()
```
А потом скройте:
```javascript
$.popup("goodpopup").hide()
```

## API
Экземпляр попапа (далее `popup_instance`) можно получить двумя способами:

1. Обратиться к `data-popup` у DOM-элемента handlebars-шаблона (т.е. тега `<script>` с нужным `id`);
2. Посмотреть в `$.popup.getPopups()`.

### Опции
Могут быть установлены тремя способами:

1. Через data-атрибуты у шаблона (т.е. тега `<script>`);
2. Через метод `updateOptions` (см. ниже);
3. При ручной инициализации попапа: `$("script[type='text/x-handlebars-template']").popup({})`.

#### `isDetachable`
Тип: `boolean`
По умолчанию `false`

Определяет, нужно ли сохранять содержимое попапа при его скрытии (т.е. использовать метод `detach` вместо `remove`).

#### `isOuterClickClosing`
Тип: `boolean`
По умолчанию `true`

Определяет, нужно ли закрывать попап по клику вне зоны содержимого попапа (в область фона).


### Коллбеки
Передаются как опции. Вызываются в нужный момент.

#### `callbackBeforeShow`
Вызывается перед тем, как попап будет показан.

#### `callbackAfterShow`
Вызывается после того, как попап будет показан.

#### `callbackBeforeHide`
Вызывается перед тем, как попап будет скрыт.

#### `callbackAfterHide`
Вызывается после того, как попап будет скрыт.


### Методы
#### `popup_instance.show()`
Показать попап.

#### `popup_instance.hide()`
Спрятать попап.

#### `popup_instance.isVisible()`
Показывается ли в данный момент попап.

#### `popup_instance.updateOptions({})`
Обновить опции.

#### `popup_instance.getOptions()`
Возвращает объект со всеми опциями.

#### `popup_instance.getPopupContent()`
Возвращает jQuery-объект с разметкой содержимого попапа (всё, что было в шаблоне, положенное в родителя — `div`).


## Лицензия
[MIT License](LICENSE.md)
