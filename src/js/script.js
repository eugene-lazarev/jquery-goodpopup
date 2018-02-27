(function($) {
    "use strict";

    var version = "2.0.0-beta.16";

    var pluginSuffix = "goodpopup";

    var popupSelector = ".js-goodpopup";
    var popupInnerSelector = ".js-goodpopup-inner-content";
    var popupCloseClass = "js-goodpopup-close";
    var popupClosePngClass = "goodpopup-close__png";
    var popupActiveModificator = "goodpopup_visible";
    var popupInnerDestroyModificator = "goodpopup-inner-content_destroyed";
    var popupContentWithCloseButtonModificator = "goodpopup-inner-content-element_withclosebutton";
    var popupContentFullWidthModificator = "goodpopup-inner-content-element_fullwidth";
    var popupContentHidedModificator = "goodpopup-inner-content-element_hided";
    var popupContentHidedfullModificator = "goodpopup-inner-content-element_hidedfull";
    var popupContentPseudohidedModificator = "goodpopup-inner-content-element_pseudohided";

    var pngCloseButtonWhite = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAIVBMVEUAAAD////////////////////////////////////////PIev5AAAACnRSTlMAMO9gn88Q369Agi28KgAAAQtJREFUeAGl10FOw1AMRVEnaZLi/S8YoY/0ACMOUt/w1+cOOqlaa9ve51X/3nX2vVX24ftrwb573757FIZfhfhV2MqrbfkUls8TNs7z4MI8//Hgwjw/u10YPufV7cL0WT1RgO+6Thf+8M9CAf5RhQL9+ggFeBTgUYBHgR6FPupzR8OjAI8CPAvyLsC7AM+CvQvza0GBHgV77LB3wd4FexfsXbB/PWDvgr0L9i7Ys2Df/faCxy8vPArwKMCjIH8cKMhXoUCPAj0K9CjYo2CPgj0K9tnjtwI9Cudl74I9Crc8CkWPQu3wKNy17fCzMP402c9CfAr2KcSnAD8K8SnQpxCfgn0K8Sns9inEvwMkUkuut7bS3AAAAABJRU5ErkJggg==";
    var pngCloseButtonBlack = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAIVBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt0UjBAAAACnRSTlMAMO9gn88Q369Agi28KgAAAQtJREFUeAGl10FOw1AMRVEnaZLi/S8YoY/0ACMOUt/w1+cOOqlaa9ve51X/3nX2vVX24ftrwb573757FIZfhfhV2MqrbfkUls8TNs7z4MI8//Hgwjw/u10YPufV7cL0WT1RgO+6Thf+8M9CAf5RhQL9+ggFeBTgUYBHgR6FPupzR8OjAI8CPAvyLsC7AM+CvQvza0GBHgV77LB3wd4FexfsXbB/PWDvgr0L9i7Ys2Df/faCxy8vPArwKMCjIH8cKMhXoUCPAj0K9CjYo2CPgj0K9tnjtwI9Cudl74I9Crc8CkWPQu3wKNy17fCzMP402c9CfAr2KcSnAD8K8SnQpxCfgn0K8Sns9inEvwMkUkuut7bS3AAAAABJRU5ErkJggg==";

    var $popup;
    var $popupInner;

    var isOpen = false;

    var popupsList = {};
    var hiddenPopupsList = [];

    var scrollbarWidth = 0;

    var helpers = {
        isSVGSupported: (function() {
            function checkSVGSupport() {
                /* https://css-tricks.com/a-complete-guide-to-svg-fallbacks/ */
                var div = document.createElement("div");
                div.innerHTML = "<svg/>";
                return ((div.firstChild && div.firstChild.namespaceURI) === "http://www.w3.org/2000/svg");
            }
            
            return !!((typeof Modernizr === "object" && typeof Modernizr.inlinesvg === "boolean" && Modernizr.inlinesvg) || checkSVGSupport());
        })(),
        whichTransitionEvent: (function() {
            var t;
            var el = document.createElement("div");
            var transitions = {
                "transition": "transitionend",
                "OTransition": "oTransitionEnd",
                "MozTransition": "transitionend",
                "MSTransition" : "msTransitionEnd",
                "WebkitTransition": "webkitTransitionEnd"
            };
    
            for (t in transitions) {
                if (typeof el.style[t] !== "undefined") {
                    return transitions[t];
                }
            }
    
            return false;
        })(),

        calculateScrollbarWidth: function() {
            var $outer;
            var $inner;
            var widthNoScroll;
            var widthWithScroll;

            $outer = $("<div>").css("position", "absolute").css("visibility", "hidden").css("width", "100px").css("msOverflowStyle", "scrollbar");
            $("body").append($outer).promise().done(function() {
                widthNoScroll = $outer.outerWidth();
                $outer.css("overflow", "scroll");

                $inner = $("<div>").css("width", "100%");
                $outer.append($inner).promise().done(function() {
                    widthWithScroll = $inner.innerWidth();

                    $outer.remove();

                    scrollbarWidth = widthNoScroll - widthWithScroll;
                });
            });
        },

        throwError: function(popupId, errorType, additionalData) {
            function showError(text) {
                if (typeof console !== "undefined" && typeof console.error === "function") {
                    console.error(text);
                } else {
                    alert(text);
                }
            }

            function showTrace(text) {
                if (typeof console !== "undefined" && typeof console.trace === "function") {
                    console.trace(text);
                } else {
                    alert(text);
                }
            }

            switch(errorType) {
                case "NOT_FOUND":
                    var $popupTemplate = $("#" + popupId);

                    if ($popupTemplate.length > 0) {
                        showError("Please initialize popup `" + popupId + "`: `$('#" + popupId + "').goodpopup();`");
                        return $popupTemplate;
                    } else {
                        showError("Popup template `" + popupId + "` doesn't exist");
                        return popupId;
                    }
                case "WRONG_OPTIONS":
                    showError("Wrong options object in method `setOptions` on popup `" + popupId + "`");
                    return additionalData;
                default:
                    showTrace("Problem with popup");
                    return popupId;
            }
        }
    };

    var dom = {
        closeButtonMarkup: function(isFullWidth) {
            return '<span class="goodpopup-close js-goodpopup-close">' + (helpers.isSVGSupported ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" enable-background="new 0 0 16 16" class="goodpopup-close-svg"><path class="goodpopup-close-svg__path" d="m15.8 13.5l-5.4-5.5 5.5-5.4c.2-.2.2-.6 0-.8l-1.6-1.6c-.1-.1-.3-.2-.4-.2-.2 0-.3.1-.4.2l-5.5 5.4-5.5-5.4c-.1-.1-.2-.2-.4-.2s-.3.1-.4.2l-1.5 1.5c-.2.2-.2.6 0 .8l5.4 5.5-5.5 5.5c0 .1-.1.2-.1.4 0 .2.1.3.2.4l1.6 1.6c.1.1.2.1.4.1.1 0 .3-.1.4-.2l5.4-5.4 5.4 5.5c.1.1.3.2.4.2.1 0 .3-.1.4-.2l1.6-1.6c.1-.1.2-.3.2-.4 0-.2-.1-.3-.2-.4"></path></svg>' : '<img src="' + (isFullWidth ? pngCloseButtonBlack : pngCloseButtonWhite) + '" alt="" class="' + popupClosePngClass + '"/>') + '</span>';
        },
        createPopupDOM: function() {
            var popupHTML = '<div class="goodpopup js-goodpopup"><div class="goodpopup-inner"><div class="goodpopup-inner-content js-goodpopup-inner-content"></div></div></div>';

            return $(popupHTML).appendTo("body").promise().done(function() {
                $popup = $(popupSelector);
                $popupInner = $popup.find(popupInnerSelector);
            });
        },
        renderPopupContentDOM: function(popupId, templateHTML, templateData, hasCloseButton, isFullWidth) {
            return '<div class="goodpopup-inner-content-element ' + (hasCloseButton ? popupContentWithCloseButtonModificator : '') + ' ' + (isFullWidth ? popupContentFullWidthModificator : '') + '" data-popup-id="' + popupId + '">' + dom.renderPopupContentTemplateDOM(templateHTML, templateData, hasCloseButton, isFullWidth) + '</div>';
        },
        renderPopupContentTemplateDOM: function(templateHTML, templateData, hasCloseButton, isFullWidth) {
            return Handlebars.compile(templateHTML)(typeof templateData !== "object" ? {} : templateData) + (hasCloseButton ? dom.closeButtonMarkup(isFullWidth) : '')
        }
    };



    var handlers = {
        "handleKeydown": function(event) {
            var PopupInstance = this;

            var keyForClosing = PopupInstance.getOptions().keyCodeForClosing;

            for (var i = 0; i < keyForClosing.length; i++) {
                if (event.keyCode === keyForClosing[i]) {
                    Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.keydown);
                    break;
                }
            }

            return PopupInstance;
        },
        "handleOuterClick": function(event) {
            var PopupInstance = this;

            var $target = $(event.target);
            if (PopupInstance.getOptions().isOuterClickClosing && $target.parents(".js-goodpopup-inner-content").length === 0 && !$target.hasClass(popupCloseClass)) {
                Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.click);
            }

            return PopupInstance;
        }
    };

    var Core = {
        "open": function() {
            var PopupInstance = this;

            if (isOpen) {
                if (PopupInstance.isRendered()) {
                    if (PopupInstance.isHidden()) {
                        $.each(popupsList, function(name, popup) {
                            if (popup["instance"].isRendered() && !popup["instance"].isHidden()) {
                                Core._hide.call(popup["instance"], function() {
                                    PopupInstance.getOptions().callbackBeforeOpen.call(PopupInstance);
                                    Core._show.call(PopupInstance);
                                });
                                return false;
                            }
                        });
                    } else {
                        return PopupInstance;
                    }
                } else {
                    $.each(popupsList, function(name, popup) {
                        if (popup["instance"].isRendered() && !popup["instance"].isHidden()) {
                            Core._hide.call(popup["instance"], function() {
                                PopupInstance.getOptions().callbackBeforeOpen.call(PopupInstance);
                                Core._renderContent.call(PopupInstance);
                            });
                            return false;
                        }
                    });
                }
            } else {
                PopupInstance.getOptions().callbackBeforeOpen.call(PopupInstance);
                Core._renderContent.call(PopupInstance);
            }

            return PopupInstance;
        },
        "close": function(isForced) {
            var PopupInstance = this;

            if (!isOpen || !PopupInstance.isRendered()) {
                return PopupInstance;
            }

            var isForcedClosing = isForced || false;

            if (hiddenPopupsList.length > 0) {
                if (isForcedClosing) {
                    for (var i = hiddenPopupsList.length; i > 0; i--) {
                        Core._destroyContent.call(hiddenPopupsList[i - 1]["instance"], false);
                    }
                    Core._destroyContent.call(PopupInstance, true);
                } else {
                    Core._destroyContent.call(PopupInstance, false, function() {
                        hiddenPopupsList[hiddenPopupsList.length - 1]["instance"].getOptions().callbackBeforeOpen.call(hiddenPopupsList[hiddenPopupsList.length - 1]["instance"]);
                        Core._show.call(hiddenPopupsList[hiddenPopupsList.length - 1]["instance"]);
                    });
                }
            } else {
                Core._destroyContent.call(PopupInstance, true);
            }

            return PopupInstance;
        },
        
        "_renderContent": function() {
            var PopupInstance = this;
            
            if (PopupInstance.isRendered() && !PopupInstance.getOptions().isIframe && !PopupInstance.getOptions().isPrerendered) {
                return PopupInstance;
            }

            var afterRender = function() {
                popupsList[PopupInstance.getPopupId()].$popupClose = popupsList[PopupInstance.getPopupId()].$popupContent.find("." + popupCloseClass);
                popupsList[PopupInstance.getPopupId()].$popupClose.on("click." + pluginSuffix, function() {
                    Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.button);
                });

                $(document).off("keydown." + pluginSuffix).on("keydown." + pluginSuffix, function(event) { handlers.handleKeydown.call(PopupInstance, event); });
                $popup.off("click." + pluginSuffix).on("click." + pluginSuffix, function(event) { handlers.handleOuterClick.call(PopupInstance, event); });

                if (!isOpen) {
                    var bodyWidth = $("body").width();
                    $("html").addClass("noscroll");

                    if ($("body").width() > bodyWidth) {
                        $("html").addClass("noscroll-margin").css("margin-right", (parseFloat($("html").css("margin-right")) + scrollbarWidth) + "px");
                    }

                    if (helpers.whichTransitionEvent) {
                        $popup.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                            if (event.target === $popup[0]) {
                                $popup.off(helpers.whichTransitionEvent + ".pluginSuffix");
                                PopupInstance.getOptions().callbackAfterOpen.call(PopupInstance);
                            }
                        });
                    }
                    $popup.addClass(popupActiveModificator);
                    if (!helpers.whichTransitionEvent) {
                        PopupInstance.getOptions().callbackAfterOpen.call(PopupInstance);
                    }

                    popupsList[PopupInstance.getPopupId()].isRendered = true;
                    popupsList[PopupInstance.getPopupId()].isHidden = false;

                    isOpen = true;
                } else {
                    if (helpers.whichTransitionEvent) {
                        popupsList[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                            if (event.target === popupsList[PopupInstance.getPopupId()].$popupContent[0]) {
                                popupsList[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix");
                                PopupInstance.getOptions().callbackAfterOpen.call(PopupInstance);
                            }
                        });
                    }
                    setTimeout(function() {
                        popupsList[PopupInstance.getPopupId()].$popupContent.removeClass(popupContentPseudohidedModificator);
                    }, 1);
                    if (!helpers.whichTransitionEvent) {
                        PopupInstance.getOptions().callbackAfterOpen.call(PopupInstance);
                    }

                    popupsList[PopupInstance.getPopupId()].isRendered = true;
                    popupsList[PopupInstance.getPopupId()].isHidden = false;

                    isOpen = true;
                }
            };

            if (!PopupInstance.getOptions().isPrerendered) {
                if (PopupInstance.getOptions().isDetachable || PopupInstance.getOptions().isIframe) {
                    if (popupsList[PopupInstance.getPopupId()].$popupContent.length === 0) {
                        popupsList[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate().html(), PopupInstance.getOptions().data, PopupInstance.getOptions().hasCloseButton, PopupInstance.getOptions().isFullWidth));
                    }
                } else {
                    popupsList[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate().html(), PopupInstance.getOptions().data, PopupInstance.getOptions().hasCloseButton, PopupInstance.getOptions().isFullWidth));
                }
            }

            if (isOpen) {
                popupsList[PopupInstance.getPopupId()].$popupContent.addClass(popupContentPseudohidedModificator);
            }

            if ((!PopupInstance.getOptions().isPrerendered && !PopupInstance.getOptions().isIframe) || (PopupInstance.getOptions().isIframe && !PopupInstance.isRendered())) {
                $popupInner.append(popupsList[PopupInstance.getPopupId()].$popupContent).promise().done(function () {
                    afterRender();
                });
            } else {
                if (PopupInstance.getOptions().isPrerendered) {
                    PopupInstance.setOptions({
                        isPrerendered: false
                    });
                }
                popupsList[PopupInstance.getPopupId()].$popupContent.removeClass(popupContentHidedModificator + " " + popupContentHidedfullModificator);
                afterRender();
            }

            return PopupInstance;
        },
        "_rerenderContent": function(afterRerender) {
            var PopupInstance = this;

            var $oldPopupContent = popupsList[PopupInstance.getPopupId()].$popupContent;

            popupsList[PopupInstance.getPopupId()].$popupClose.off("click." + pluginSuffix);

            popupsList[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate().html(), PopupInstance.getOptions().data, PopupInstance.getOptions().hasCloseButton, PopupInstance.getOptions().isFullWidth));
            popupsList[PopupInstance.getPopupId()].$popupContent.addClass(popupContentHidedModificator + " " + popupContentHidedfullModificator);

            $oldPopupContent.after(popupsList[PopupInstance.getPopupId()].$popupContent).promise().done(function() {
                $oldPopupContent.remove();

                popupsList[PopupInstance.getPopupId()].$popupClose = popupsList[PopupInstance.getPopupId()].$popupContent.find("." + popupCloseClass);

                if (typeof afterRerender === "function") {
                    afterRerender();
                }
            });

            return PopupInstance;
        },
        "_destroyContent": function(withShell, afterDestroy) {
            var PopupInstance = this;

            if (!PopupInstance.isRendered()) {
                return PopupInstance;
            }

            PopupInstance.getOptions().callbackBeforeClose.call(PopupInstance);

            for (var i = 0; i < hiddenPopupsList.length; i++) {
                if (hiddenPopupsList[i]["instance"] === PopupInstance) {
                    hiddenPopupsList.splice(i, 1);
                    break;
                }
            }

            var destroy;
            if (typeof (withShell) !== "undefined" && withShell) {
                destroy = function() {
                    if (!PopupInstance.getOptions().isIframe) {
                        if (PopupInstance.getOptions().isDetachable) {
                            popupsList[PopupInstance.getPopupId()].$popupContent.detach().removeClass(popupContentHidedModificator + " " + popupContentHidedfullModificator + " " + popupContentPseudohidedModificator + " " + popupInnerDestroyModificator);
                        } else {
                            popupsList[PopupInstance.getPopupId()].$popupContent.remove();
                            popupsList[PopupInstance.getPopupId()].$popupContent = $();
                        }
                    } else {
                        popupsList[PopupInstance.getPopupId()].$popupContent.addClass(popupContentHidedModificator + " " + popupContentHidedfullModificator).removeClass(popupInnerDestroyModificator);
                    }

                    PopupInstance.getOptions().callbackAfterClose.call(PopupInstance);
                };

                $popup.off("click." + pluginSuffix);
                $(document).off("keydown." + pluginSuffix);
                popupsList[PopupInstance.getPopupId()].$popupClose.off("click." + pluginSuffix);

                if (helpers.whichTransitionEvent) {
                    $popup.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                        if (event.target === $popup[0]) {
                            $popup.off(helpers.whichTransitionEvent + ".pluginSuffix");
                            destroy();
                        }
                    });
                }
                $popup.removeClass(popupActiveModificator);
                if (!helpers.whichTransitionEvent) {
                    destroy();
                }

                $("html").removeClass("noscroll");
                if ($("html").hasClass("noscroll-margin")) {
                    $("html").css("margin-right", (parseFloat($("html").css("margin-right")) - scrollbarWidth) + "px").removeClass("noscroll-margin");
                }

                isOpen = false;
                popupsList[PopupInstance.getPopupId()].isHidden = false;

                if (!PopupInstance.getOptions().isIframe) {
                    popupsList[PopupInstance.getPopupId()].isRendered = false;
                }
            } else {
                destroy = function() {
                    if (!PopupInstance.getOptions().isIframe) {
                        if (PopupInstance.getOptions().isDetachable) {
                            popupsList[PopupInstance.getPopupId()].$popupContent.detach().removeClass(popupContentHidedModificator + " " + popupContentHidedfullModificator + " " + popupContentPseudohidedModificator + " " + popupInnerDestroyModificator);
                        } else {
                            popupsList[PopupInstance.getPopupId()].$popupContent.remove();
                            popupsList[PopupInstance.getPopupId()].$popupContent = $();
                        }
                    } else {
                        popupsList[PopupInstance.getPopupId()].$popupContent.addClass(popupContentHidedModificator + " " + popupContentHidedfullModificator).removeClass(popupInnerDestroyModificator);
                    }

                    PopupInstance.getOptions().callbackAfterClose.call(PopupInstance);

                    if (typeof afterDestroy === "function") {
                        afterDestroy();
                    }
                };

                popupsList[PopupInstance.getPopupId()].$popupClose.off("click." + pluginSuffix);

                if (popupsList[PopupInstance.getPopupId()].isHidden) {
                    popupsList[PopupInstance.getPopupId()].isHidden = false;
                    if (!PopupInstance.getOptions().isIframe) {
                        popupsList[PopupInstance.getPopupId()].isRendered = false;
                    }

                    destroy();
                } else {
                    if (helpers.whichTransitionEvent) {
                        popupsList[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                            if (event.target === popupsList[PopupInstance.getPopupId()].$popupContent[0]) {
                                popupsList[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix");
                                destroy();
                            }
                        });
                    }
                    popupsList[PopupInstance.getPopupId()].$popupContent.addClass(popupInnerDestroyModificator);
                    if (!helpers.whichTransitionEvent) {
                        destroy();
                    }

                    popupsList[PopupInstance.getPopupId()].isHidden = false;
                    if (!PopupInstance.getOptions().isIframe) {
                        popupsList[PopupInstance.getPopupId()].isRendered = false;
                    }
                }
            }

            return PopupInstance;
        },

        "_show": function() {
            var PopupInstance = this;

            if (!PopupInstance.isHidden()) {
                return PopupInstance;
            }

            for (var i = 0; i < hiddenPopupsList.length; i++) {
                if (hiddenPopupsList[i]["instance"] === PopupInstance) {
                    hiddenPopupsList.splice(i, 1);
                    break;
                }
            }

            function show() {
                var makeRetrieved = function() {
                    $(document).off("keydown." + pluginSuffix).on("keydown." + pluginSuffix, function(event) { handlers.handleKeydown.call(PopupInstance, event); });
                    $popup.off("click." + pluginSuffix).on("click." + pluginSuffix, function(event) { handlers.handleOuterClick.call(PopupInstance, event); });
                    popupsList[PopupInstance.getPopupId()].$popupClose.off("click." + pluginSuffix).on("click." + pluginSuffix, function() {
                        Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.button);
                    });

                    PopupInstance.getOptions().callbackAfterOpen.call(PopupInstance);
                };

                if (helpers.whichTransitionEvent) {
                    popupsList[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                        if (event.target === popupsList[PopupInstance.getPopupId()].$popupContent[0]) {
                            popupsList[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix");
                            makeRetrieved();
                        }
                    });
                }
                setTimeout(function() {
                    popupsList[PopupInstance.getPopupId()].$popupContent.removeClass(popupContentHidedfullModificator + " " + popupContentHidedModificator);
                }, 1);
                if (!helpers.whichTransitionEvent) {
                    makeRetrieved();
                }

                popupsList[PopupInstance.getPopupId()].isHidden = false;
            }

            if (!PopupInstance.getOptions().isDetachable && !PopupInstance.getOptions().isIframe) {
                Core._rerenderContent.call(PopupInstance, function() {
                    show();
                });
            } else {
                show();
            }

            return PopupInstance;
        },
        "_hide": function(afterHide) {
            var PopupInstance = this;

            if (PopupInstance.isHidden()) {
                return PopupInstance;
            }

            PopupInstance.getOptions().callbackBeforeClose.call(PopupInstance);

            function makeStealed() {
                popupsList[PopupInstance.getPopupId()].$popupContent.addClass(popupContentHidedfullModificator);

                PopupInstance.getOptions().callbackAfterClose.call(PopupInstance);

                if (typeof afterHide === "function") {
                    afterHide();
                }
            }

            $(document).off("keydown." + pluginSuffix);
            $popup.off("click." + pluginSuffix);
            popupsList[PopupInstance.getPopupId()].$popupClose.off("click." + pluginSuffix);

            if (helpers.whichTransitionEvent) {
                popupsList[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                    if (event.target === popupsList[PopupInstance.getPopupId()].$popupContent[0]) {
                        popupsList[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix");
                        makeStealed();
                    }
                });
            }
            popupsList[PopupInstance.getPopupId()].$popupContent.addClass(popupContentHidedModificator);
            if (!helpers.whichTransitionEvent) {
                makeStealed();
            }

            hiddenPopupsList.push(popupsList[PopupInstance.getPopupId()]);
            popupsList[PopupInstance.getPopupId()].isHidden = true;

            return PopupInstance;
        }
    };


    /* Instance */
    var GoodPopup = function($template, optionsObject) {
        var PopupInstance = this;
        var popupID = $template.attr("id");
        var options = optionsObject;

        /* Set API getters */
        this.getOptions = function() { return options; };
        this.getPopupId = function() { return popupID; };
        this.getPopupContent = function() { return popupsList[PopupInstance.getPopupId()].$popupContent; };
        this.getTemplate = function() { return $template; };
        this.isRendered = function() { return popupsList[PopupInstance.getPopupId()].isRendered; };
        this.isHidden = function() { return popupsList[PopupInstance.getPopupId()].isHidden; };

        /* Set API setters */
        this.setOptions = function(optionsUpdated) {
            if ($.isPlainObject(optionsUpdated)) {
                if (optionsUpdated.hasOwnProperty("forceClosing") && !$.isPlainObject(optionsUpdated["forceClosing"])) {
                    return helpers.throwError(popupID, "WRONG_OPTIONS", optionsUpdated);
                }

                if (optionsUpdated.hasOwnProperty("hasCloseButton") && optionsUpdated["hasCloseButton"] !== PopupInstance.getOptions().hasCloseButton && PopupInstance.getPopupContent()) {
                    if (optionsUpdated["hasCloseButton"]) {
                        popupsList[PopupInstance.getPopupId()].$popupContent.addClass(popupContentWithCloseButtonModificator).append(dom.closeButtonMarkup(PopupInstance.getOptions().isFullWidth));
                        popupsList[PopupInstance.getPopupId()].$popupClose = popupsList[PopupInstance.getPopupId()].$popupContent.find("." + popupCloseClass);
                        popupsList[PopupInstance.getPopupId()].$popupClose.off("click." + pluginSuffix).on("click." + pluginSuffix, function() {
                            Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.button);
                        });
                    } else {
                        if (!popupsList[PopupInstance.getPopupId()].$popupClose || popupsList[PopupInstance.getPopupId()].$popupClose.length === 0) {
                            popupsList[PopupInstance.getPopupId()].$popupClose = popupsList[PopupInstance.getPopupId()].$popupContent.find("." + popupCloseClass);
                        }
                        popupsList[PopupInstance.getPopupId()].$popupClose.remove();
                        popupsList[PopupInstance.getPopupId()].$popupContent.removeClass(popupContentWithCloseButtonModificator);
                    }
                }

                if (optionsUpdated.hasOwnProperty("isFullWidth") && optionsUpdated["isFullWidth"] !== PopupInstance.getOptions().isFullWidth && PopupInstance.getPopupContent()) {
                    if (optionsUpdated["isFullWidth"]) {
                        popupsList[PopupInstance.getPopupId()].$popupContent.addClass(popupContentFullWidthModificator);
                        popupsList[PopupInstance.getPopupId()].$popupContent.find("." + popupClosePngClass).attr("src", pngCloseButtonBlack);
                    } else {
                        popupsList[PopupInstance.getPopupId()].$popupContent.removeClass(popupContentFullWidthModificator);
                        popupsList[PopupInstance.getPopupId()].$popupContent.find("." + popupClosePngClass).attr("src", pngCloseButtonWhite);
                    }
                }

                if (optionsUpdated.hasOwnProperty("keyForClosing") && optionsUpdated["keyCodeForClosing"] !== PopupInstance.getOptions().keyCodeForClosing) {
                    if (typeof optionsUpdated["keyCodeForClosing"] === "number") {
                        optionsUpdated["keyCodeForClosing"] = [optionsUpdated["keyCodeForClosing"]];
                    }
                }

                options = $.extend({}, options, optionsUpdated);

                return PopupInstance;
            } else {
                return helpers.throwError(popupID, "WRONG_OPTIONS", optionsUpdated);
            }
        };

        /* Set API methods */
        this.open = function() { return Core.open.call(this); };
        this.close = function(isForced) { return Core.close.call(this, isForced); };


        /* Check if pre-render is needed */
        if (PopupInstance.getOptions().isPrerendered) {
            popupsList[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate().html(), PopupInstance.getOptions().data, PopupInstance.getOptions().hasCloseButton, PopupInstance.getOptions().isFullWidth));
            popupsList[PopupInstance.getPopupId()].$popupClose = popupsList[PopupInstance.getPopupId()].$popupContent.find("." + popupCloseClass);

            popupsList[PopupInstance.getPopupId()].$popupContent.addClass(popupContentHidedModificator + " " + popupContentHidedfullModificator);
            $popupInner.append(popupsList[PopupInstance.getPopupId()].$popupContent);

            popupsList[PopupInstance.getPopupId()].isRendered = true;
            popupsList[PopupInstance.getPopupId()].isHidden = true;
        }

        /* Set data to DOM elements */
        PopupInstance.getTemplate().data("goodpopup", PopupInstance);

        return PopupInstance;
    };

    /* Global object */
    $.goodpopup = {
        getPopup: function(popupId) {
            if (typeof popupsList[popupId] !== "undefined" && typeof popupsList[popupId]["instance"] !== "undefined") {
                return popupsList[popupId]["instance"];
            } else {
                if (typeof popupId !== "undefined") {
                    return helpers.throwError(popupId, "NOT_FOUND");
                } else {
                    return false;
                }
            }
        },
        getPopups: function() {
            return popupsList;
        },
        version: version
    };


    /* jQuery */
    $.fn.goodpopup = function(options) {
        return this.each(function(i, element) {
            var $element = $(element);
            var popupId = $element.attr("id");
            var PopupInstance = typeof popupsList[popupId] !== "undefined" && typeof popupsList[popupId]["instance"] !== "undefined" ? popupsList[popupId]["instance"] : undefined;

            if (typeof PopupInstance === "undefined") {
                popupsList[popupId] = {
                    instance: undefined,
                    isRendered: false,
                    isHidden: false,
                    $popupClose: $(),
                    $popupContent: $()
                };
                popupsList[popupId]["instance"] = new GoodPopup($element,
                    $.extend(
                        {},
                        {
                            /* Defaults */
                            callbackBeforeOpen: function() {},
                            callbackAfterOpen: function() {},

                            callbackBeforeClose: function() {},
                            callbackAfterClose: function() {},

                            isPrerendered: false,
                            isIframe: false,

                            isDetachable: false,
                            isOuterClickClosing: true,
                            isFullWidth: false,
                            hasCloseButton: true,

                            keyCodeForClosing: [27],

                            forceClosing: {
                                click: true,
                                keydown: true,
                                button: false
                            },

                            data: {}
                        },
                        options,
                        $element.data()
                    )
                );
            } else {
                PopupInstance.setOptions.call(PopupInstance, options);
            }
        });
    };

    /* Autoload */
    var initPopupTemplates = function() {
        helpers.calculateScrollbarWidth();
        dom.createPopupDOM().done(function() {
            $("script[type='text/x-handlebars-template']").goodpopup();
        });
    };
    $(initPopupTemplates);
}(jQuery));
