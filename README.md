# Хороший попап
jQuery-плагин с хорошей разметкой попапа.

## Демо
https://eugene-lazarev.github.io/good-popup/

## Сборка
`npm install && grunt`

## Установка
```html
<!-- Зависимости: jQuery и Handlebars -->
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.5/handlebars.min.js"></script>

<!-- Плагин -->
<script src="build/js/script.min.js"></script>
<link href="build/css/style.min.css" rel="stylesheet" type="text/css"/>
```

## Использование
### Базовый пример
Добавьте в конец страницы шаблон handlebars, содержащий *внутреннюю* разметку попапа, используя уникальный `id`:
```html
<script id="goodpopup1" type="text/x-handlebars-template">
    <div>
        <h1>Hello world</h1>
    </div>
</script>
```
В любой момент откройте попап, используя `id` шаблона:
```javascript
$.goodpopup("goodpopup1").open()
```
А потом закройте:
```javascript
$.goodpopup("goodpopup1").close()
```

### API
Экземпляр попапа (далее `popup_instance`) можно получить тремя способами:

1. Взять напрямую по имени: `$.goodpopup("goodpopup1")`;
2. Обратиться к `data-popup` у DOM-элемента handlebars-шаблона (т.е. тега `<script>` с нужным `id`);
3. Посмотреть в `$.goodpopup.getPopups()`.

#### Опции
Могут быть установлены тремя способами:

1. Через data-атрибуты у шаблона (т.е. тега `<script>`);
2. Через метод `popup_instance.setOptions()` (см. ниже);
3. При ручной инициализации попапа: `$("script[type='text/x-handlebars-template']").goodpopup({})`.

##### `isDetachable`
Тип: `boolean`  
По умолчанию `false`  

Определяет, нужно ли сохранять содержимое попапа при его скрытии (т.е. использовать метод `detach` вместо `remove`).

##### `isOuterClickClosing`
Тип: `boolean`  
По умолчанию `true`  

Определяет, нужно ли закрывать попап по клику вне зоны содержимого попапа (в область фона).

##### `keyCodeForClosing`
Тип: `number`, `array`  
По умолчанию `27`  

Указывает, по нажатию каких клавиш закрывать все открытые попапы. Может быть числом или массивом чисел.  
Значение по умолчанию соответствует кнопке *Esc*.  
Посмотреть коды разных клавиш можно, например, на сайте [keycode.info](http://keycode.info).  
Чтобы оключить закрытие всех открытых попапов по нажатию клавиш, передайте значение `false`.

##### `forceClosing`
Тип: `object`  
По умолчанию:
```javascript
{
    click: true,
    keydown: true,
    button: false
}
```
Каждое значение определяет, нужно ли по соответствующему событию закрыть все открытые попапы единовременно (`true`), либо же закрыть открытый попап и показать открывавшийся до этого (`false`).
- `click` — клик вне зоны содержимого попапа (работает при установленной опции `isOuterClickClosing: true`);
- `keydown` — нажатие клавиш, определённых в опции `keyCodeForClosing`;
- `button` — клик по «крестику».


#### Коллбеки
Устанавливаются как опции. Вызываются в нужный момент.

##### `callbackBeforeOpen`
Вызывается перед тем, как попап будет открыт.

##### `callbackAfterOpen`
Вызывается после того, как попап будет открыт.

##### `callbackBeforeClose`
Вызывается перед тем, как попап будет закрыт.

##### `callbackAfterClose`
Вызывается после того, как попап будет закрыт.


#### Дополнительные данные
##### `data`
Handlebars позволяет использовать объект с данными для дополнительной гибкости при рендеринге шаблона.  
Вы можете в любой момент *до вызова `popup_instance.open()`* передать эти данные, установив опцию `data`. Это обычный объект.


#### Методы
##### `popup_instance.open()`
Открыть попап.

##### `popup_instance.close(true)`
Закрыть попап.  
Аргумент показывает, нужно ли закрыть все открытые попапы единовременно (`true`), либо же закрыть открытый попап и показать открывавшийся до этого (значение по умолчанию, `false`).

##### `popup_instance.isRendered()`
Показывается ли в данный момент попап.

##### `popup_instance.isHided()`
Скрыт ли в данный момент попап.

##### `popup_instance.setOptions({})`
Установить новые опции.

##### `popup_instance.getOptions()`
Возвращает объект со всеми опциями.

##### `popup_instance.getPopupContent()`
Возвращает jQuery-объект с разметкой содержимого попапа (всё, что было в шаблоне, положенное в родителя — `<div class="goodpopup-inner-content-element">`).

##### `popup_instance.getPopupId()`
Возвращает `id` попапа.


## Лицензия
[MIT License](LICENSE.md)
