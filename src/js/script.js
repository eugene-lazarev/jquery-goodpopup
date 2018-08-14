(function($) {
    "use strict";

    var version = "2.0.0-beta.18";

    var plugin_suffix = "goodpopup";

    var popup_selector = ".js-goodpopup";
    var popup_inner_selector = ".js-goodpopup-inner-content";
    var popup_close_class = "js-goodpopup-close";
    var popup_close_png_class = "goodpopup-close__png";
    var popup_active_modificator = "goodpopup_visible";
    var popup_inner_destroy_modificator = "goodpopup-inner-content_destroyed";
    var popup_content_with_close_button_modificator = "goodpopup-inner-content-element_withclosebutton";
    var popup_content_full_width_modificator = "goodpopup-inner-content-element_fullwidth";
    var popup_content_hidden_modificator = "goodpopup-inner-content-element_hidden";
    var popup_content_hiddenfull_modificator = "goodpopup-inner-content-element_hiddenfull";
    var popup_content_pseudohidden_modificator = "goodpopup-inner-content-element_pseudohidden";

    var png_close_button_white = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAIVBMVEUAAAD////////////////////////////////////////PIev5AAAACnRSTlMAMO9gn88Q369Agi28KgAAAQtJREFUeAGl10FOw1AMRVEnaZLi/S8YoY/0ACMOUt/w1+cOOqlaa9ve51X/3nX2vVX24ftrwb573757FIZfhfhV2MqrbfkUls8TNs7z4MI8//Hgwjw/u10YPufV7cL0WT1RgO+6Thf+8M9CAf5RhQL9+ggFeBTgUYBHgR6FPupzR8OjAI8CPAvyLsC7AM+CvQvza0GBHgV77LB3wd4FexfsXbB/PWDvgr0L9i7Ys2Df/faCxy8vPArwKMCjIH8cKMhXoUCPAj0K9CjYo2CPgj0K9tnjtwI9Cudl74I9Crc8CkWPQu3wKNy17fCzMP402c9CfAr2KcSnAD8K8SnQpxCfgn0K8Sns9inEvwMkUkuut7bS3AAAAABJRU5ErkJggg==";
    var png_close_button_black = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAIVBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt0UjBAAAACnRSTlMAMO9gn88Q369Agi28KgAAAQtJREFUeAGl10FOw1AMRVEnaZLi/S8YoY/0ACMOUt/w1+cOOqlaa9ve51X/3nX2vVX24ftrwb573757FIZfhfhV2MqrbfkUls8TNs7z4MI8//Hgwjw/u10YPufV7cL0WT1RgO+6Thf+8M9CAf5RhQL9+ggFeBTgUYBHgR6FPupzR8OjAI8CPAvyLsC7AM+CvQvza0GBHgV77LB3wd4FexfsXbB/PWDvgr0L9i7Ys2Df/faCxy8vPArwKMCjIH8cKMhXoUCPAj0K9CjYo2CPgj0K9tnjtwI9Cudl74I9Crc8CkWPQu3wKNy17fCzMP402c9CfAr2KcSnAD8K8SnQpxCfgn0K8Sns9inEvwMkUkuut7bS3AAAAABJRU5ErkJggg==";

    var $popup;
    var $popup_inner;

    var is_open = false;

    var popups_list = {};
    var popups_queue = [];

    var scrollbar_width = 0;

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
            var width_without_scroll;
            var width_with_scroll;

            $outer = $("<div>").css("position", "absolute").css("visibility", "hidden").css("width", "100px").css("msOverflowStyle", "scrollbar");
            $("body").append($outer).promise().done(function() {
                width_without_scroll = $outer.outerWidth();
                $outer.css("overflow", "scroll");

                $inner = $("<div>").css("width", "100%");
                $outer.append($inner).promise().done(function() {
                    width_with_scroll = $inner.innerWidth();

                    $outer.remove();

                    scrollbar_width = width_without_scroll - width_with_scroll;
                });
            });
        },

        throwError: function(popup_id, error_type, additional_data) {
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

            switch(error_type) {
                case "NOT_FOUND":
                    showError("Popup template `" + popup_id + "` doesn't exist");
                    return popup_id;
                case "WRONG_OPTIONS":
                    showError("Wrong options object in method `setOptions` on popup `" + popup_id + "`");
                    return additional_data;
                default:
                    showTrace("Problem with popup");
                    return popup_id;
            }
        }
    };

    var dom = {
        closeButtonMarkup: function(is_full_width) {
            return '<span class="goodpopup-close js-goodpopup-close">' + (helpers.isSVGSupported ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" enable-background="new 0 0 16 16" class="goodpopup-close-svg"><path class="goodpopup-close-svg__path" d="m15.8 13.5l-5.4-5.5 5.5-5.4c.2-.2.2-.6 0-.8l-1.6-1.6c-.1-.1-.3-.2-.4-.2-.2 0-.3.1-.4.2l-5.5 5.4-5.5-5.4c-.1-.1-.2-.2-.4-.2s-.3.1-.4.2l-1.5 1.5c-.2.2-.2.6 0 .8l5.4 5.5-5.5 5.5c0 .1-.1.2-.1.4 0 .2.1.3.2.4l1.6 1.6c.1.1.2.1.4.1.1 0 .3-.1.4-.2l5.4-5.4 5.4 5.5c.1.1.3.2.4.2.1 0 .3-.1.4-.2l1.6-1.6c.1-.1.2-.3.2-.4 0-.2-.1-.3-.2-.4"></path></svg>' : '<img src="' + (is_full_width ? png_close_button_black : png_close_button_white) + '" alt="" class="' + popup_close_png_class + '"/>') + '</span>';
        },
        createPopupDOM: function() {
            var popup_html = '<div class="goodpopup js-goodpopup"><div class="goodpopup-inner"><div class="goodpopup-inner-content js-goodpopup-inner-content"></div></div></div>';

            return $(popup_html).appendTo("body").promise().done(function() {
                $popup = $(popup_selector);
                $popup_inner = $popup.find(popup_inner_selector);
            });
        },
        renderPopupContentDOM: function(popup_id, $template, template_data, has_close_button, is_full_width) {
            var $popup_content = $('<div class="goodpopup-inner-content-element ' + (has_close_button ? popup_content_with_close_button_modificator : '') + ' ' + (is_full_width ? popup_content_full_width_modificator : '') + '" data-popup-id="' + popup_id + '"></div>');
            $popup_content.append(dom.renderPopupContentTemplateDOM($template, template_data)).append(has_close_button ? dom.closeButtonMarkup(is_full_width) : "");
            return $popup_content;
        },
        renderPopupContentTemplateDOM: function($template, template_data) {
            var template_html;

            if ($template.filter("script[type='text/x-handlebars-template']").length > 0) {
                if (typeof window.Handlebars === "object") {
                    template_html = Handlebars.compile($template.html())(typeof template_data !== "object" ? {} : template_data);
                }
            } else {
                template_html = $template.clone().removeAttr("id").attr("data-id", $template.attr("id"));
            }

            return template_html;
        }
    };

    var handlers = {
        "handleKeydown": function(event) {
            var PopupInstance = this;
            var key_for_closing = PopupInstance.getOptions().keyCodeForClosing;

            for (var i = 0; i < key_for_closing.length; i++) {
                if (event.keyCode === key_for_closing[i]) {
                    Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.keydown);
                    break;
                }
            }

            return PopupInstance;
        },
        "handleOuterClick": function(event) {
            var PopupInstance = this;

            var $target = $(event.target);
            if (PopupInstance.getOptions().isOuterClickClosing && $target.parents(".js-goodpopup-inner-content").length === 0 && !$target.hasClass(popup_close_class)) {
                Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.click);
            }

            return PopupInstance;
        }
    };

    var Core = {
        "open": function() {
            var PopupInstance = this;

            if (is_open) {
                if (PopupInstance.isRendered()) {
                    if (PopupInstance.isHidden()) {
                        $.each(popups_list, function(name, popup) {
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
                    $.each(popups_list, function(name, popup) {
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

            if (!is_open || !PopupInstance.isRendered()) {
                return PopupInstance;
            }

            var isForcedClosing = isForced || false;

            if (popups_queue.length > 0) {
                if (isForcedClosing) {
                    for (var i = popups_queue.length; i > 0; i--) {
                        Core._destroyContent.call(popups_queue[i - 1]["instance"], false);
                    }
                    Core._destroyContent.call(PopupInstance, true);
                } else {
                    Core._destroyContent.call(PopupInstance, false, function() {
                        popups_queue[popups_queue.length - 1]["instance"].getOptions().callbackBeforeOpen.call(popups_queue[popups_queue.length - 1]["instance"]);
                        Core._show.call(popups_queue[popups_queue.length - 1]["instance"]);
                    });
                }
            } else {
                Core._destroyContent.call(PopupInstance, true);
            }

            return PopupInstance;
        },
        "dequeue": function() {
            var PopupInstance = this;

            if (!is_open || !PopupInstance.isHidden() || !PopupInstance.isRendered()) {
                return PopupInstance;
            }

            Core._destroyContent.call(this, false);

            return PopupInstance;
        },
        
        "_renderContent": function() {
            var PopupInstance = this;
            
            if (PopupInstance.isRendered() && !PopupInstance.getOptions().isIframe && !PopupInstance.getOptions().isPrerendered) {
                return PopupInstance;
            }

            var afterRender = function() {
                popups_list[PopupInstance.getPopupId()].$popupClose = popups_list[PopupInstance.getPopupId()].$popupContent.find("." + popup_close_class);
                popups_list[PopupInstance.getPopupId()].$popupClose.on("click." + plugin_suffix, function() {
                    Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.button);
                });

                $(document).off("keydown." + plugin_suffix).on("keydown." + plugin_suffix, function(event) { handlers.handleKeydown.call(PopupInstance, event); });
                $popup.off("click." + plugin_suffix).on("click." + plugin_suffix, function(event) { handlers.handleOuterClick.call(PopupInstance, event); });

                if (!is_open) {
                    var bodyWidth = $("body").width();
                    $("html").addClass("noscroll");

                    if ($("body").width() > bodyWidth) {
                        $("html").addClass("noscroll-margin").css("margin-right", (parseFloat($("html").css("margin-right")) + scrollbar_width) + "px");
                        $(".goodpopup-margin-right").each(function() {
                            var $this = $(this);
                            $this.css("margin-right", (parseFloat($this.css("margin-right")) + scrollbar_width) + "px");
                        });
                        $(".goodpopup-margin-left").each(function() {
                            var $this = $(this);
                            $this.css("margin-left", (parseFloat($this.css("margin-left")) - scrollbar_width) + "px");
                        });
                    }

                    if (helpers.whichTransitionEvent) {
                        $popup.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                            if (event.target === $popup[0]) {
                                $popup.off(helpers.whichTransitionEvent + ".plugin_suffix");
                                PopupInstance.getOptions().callbackAfterOpen.call(PopupInstance);
                            }
                        });
                    }
                    $popup.addClass(popup_active_modificator);
                    if (!helpers.whichTransitionEvent) {
                        PopupInstance.getOptions().callbackAfterOpen.call(PopupInstance);
                    }

                    popups_list[PopupInstance.getPopupId()].isRendered = true;
                    popups_list[PopupInstance.getPopupId()].isHidden = false;

                    is_open = true;
                } else {
                    if (helpers.whichTransitionEvent) {
                        popups_list[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                            if (event.target === popups_list[PopupInstance.getPopupId()].$popupContent[0]) {
                                popups_list[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".plugin_suffix");
                                PopupInstance.getOptions().callbackAfterOpen.call(PopupInstance);
                            }
                        });
                    }
                    setTimeout(function() {
                        popups_list[PopupInstance.getPopupId()].$popupContent.removeClass(popup_content_pseudohidden_modificator);
                    }, 1);
                    if (!helpers.whichTransitionEvent) {
                        PopupInstance.getOptions().callbackAfterOpen.call(PopupInstance);
                    }

                    popups_list[PopupInstance.getPopupId()].isRendered = true;
                    popups_list[PopupInstance.getPopupId()].isHidden = false;

                    is_open = true;
                }
            };

            if (!PopupInstance.getOptions().isPrerendered) {
                if (PopupInstance.getOptions().isDetachable || PopupInstance.getOptions().isIframe) {
                    if (popups_list[PopupInstance.getPopupId()].$popupContent.length === 0) {
                        popups_list[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate(), PopupInstance.getOptions().data, PopupInstance.getOptions().hasCloseButton, PopupInstance.getOptions().isFullWidth));
                    }
                } else {
                    popups_list[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate(), PopupInstance.getOptions().data, PopupInstance.getOptions().hasCloseButton, PopupInstance.getOptions().isFullWidth));
                }
            }

            if (is_open) {
                popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_content_pseudohidden_modificator);
            }

            if ((!PopupInstance.getOptions().isPrerendered && !PopupInstance.getOptions().isIframe) || (PopupInstance.getOptions().isIframe && !PopupInstance.isRendered())) {
                $popup_inner.append(popups_list[PopupInstance.getPopupId()].$popupContent).promise().done(function () {
                    afterRender();
                });
            } else {
                if (PopupInstance.getOptions().isPrerendered) {
                    PopupInstance.setOptions({
                        isPrerendered: false
                    });
                }
                popups_list[PopupInstance.getPopupId()].$popupContent.removeClass(popup_content_hidden_modificator + " " + popup_content_hiddenfull_modificator);
                afterRender();
            }

            return PopupInstance;
        },
        "_rerenderContent": function(afterRerender) {
            var PopupInstance = this;

            var $old_popup_content = popups_list[PopupInstance.getPopupId()].$popupContent;

            popups_list[PopupInstance.getPopupId()].$popupClose.off("click." + plugin_suffix);

            popups_list[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate(), PopupInstance.getOptions().data, PopupInstance.getOptions().hasCloseButton, PopupInstance.getOptions().isFullWidth));
            popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_content_hidden_modificator + " " + popup_content_hiddenfull_modificator);

            $old_popup_content.after(popups_list[PopupInstance.getPopupId()].$popupContent).promise().done(function() {
                $old_popup_content.remove();

                popups_list[PopupInstance.getPopupId()].$popupClose = popups_list[PopupInstance.getPopupId()].$popupContent.find("." + popup_close_class);

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

            for (var i = 0; i < popups_queue.length; i++) {
                if (popups_queue[i]["instance"] === PopupInstance) {
                    popups_queue.splice(i, 1);
                    break;
                }
            }

            var destroy;
            if (typeof (withShell) !== "undefined" && withShell) {
                destroy = function() {
                    if (!PopupInstance.getOptions().isIframe) {
                        if (PopupInstance.getOptions().isDetachable) {
                            popups_list[PopupInstance.getPopupId()].$popupContent.detach().removeClass(popup_content_hidden_modificator + " " + popup_content_hiddenfull_modificator + " " + popup_content_pseudohidden_modificator + " " + popup_inner_destroy_modificator);
                        } else {
                            popups_list[PopupInstance.getPopupId()].$popupContent.remove();
                            popups_list[PopupInstance.getPopupId()].$popupContent = $();
                        }
                    } else {
                        popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_content_hidden_modificator + " " + popup_content_hiddenfull_modificator).removeClass(popup_inner_destroy_modificator);
                        popups_list[PopupInstance.getPopupId()].isHidden = true;
                    }

                    PopupInstance.getOptions().callbackAfterClose.call(PopupInstance);
                };

                $popup.off("click." + plugin_suffix);
                $(document).off("keydown." + plugin_suffix);
                popups_list[PopupInstance.getPopupId()].$popupClose.off("click." + plugin_suffix);

                if (helpers.whichTransitionEvent) {
                    $popup.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                        if (event.target === $popup[0]) {
                            $popup.off(helpers.whichTransitionEvent + ".plugin_suffix");
                            destroy();
                        }
                    });
                }
                $popup.removeClass(popup_active_modificator);
                if (!helpers.whichTransitionEvent) {
                    destroy();
                }

                $("html").removeClass("noscroll");
                if ($("html").hasClass("noscroll-margin")) {
                    $("html").css("margin-right", (parseFloat($("html").css("margin-right")) - scrollbar_width) + "px").removeClass("noscroll-margin");
                    $(".goodpopup-margin-right").each(function() {
                        var $this = $(this);
                        $this.css("margin-right", (parseFloat($this.css("margin-right")) - scrollbar_width) + "px");
                    });
                    $(".goodpopup-margin-left").each(function() {
                        var $this = $(this);
                        $this.css("margin-left", (parseFloat($this.css("margin-left")) + scrollbar_width) + "px");
                    });
                }

                is_open = false;
                popups_list[PopupInstance.getPopupId()].isHidden = false;

                if (!PopupInstance.getOptions().isIframe) {
                    popups_list[PopupInstance.getPopupId()].isRendered = false;
                }
            } else {
                destroy = function() {
                    if (!PopupInstance.getOptions().isIframe) {
                        if (PopupInstance.getOptions().isDetachable) {
                            popups_list[PopupInstance.getPopupId()].$popupContent.detach().removeClass(popup_content_hidden_modificator + " " + popup_content_hiddenfull_modificator + " " + popup_content_pseudohidden_modificator + " " + popup_inner_destroy_modificator);
                        } else {
                            popups_list[PopupInstance.getPopupId()].$popupContent.remove();
                            popups_list[PopupInstance.getPopupId()].$popupContent = $();
                        }
                    } else {
                        popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_content_hidden_modificator + " " + popup_content_hiddenfull_modificator).removeClass(popup_inner_destroy_modificator);
                        popups_list[PopupInstance.getPopupId()].isHidden = true;
                    }

                    PopupInstance.getOptions().callbackAfterClose.call(PopupInstance);

                    if (typeof afterDestroy === "function") {
                        afterDestroy();
                    }
                };

                popups_list[PopupInstance.getPopupId()].$popupClose.off("click." + plugin_suffix);

                if (popups_list[PopupInstance.getPopupId()].isHidden) {
                    popups_list[PopupInstance.getPopupId()].isHidden = false;
                    if (!PopupInstance.getOptions().isIframe) {
                        popups_list[PopupInstance.getPopupId()].isRendered = false;
                    }

                    destroy();
                } else {
                    if (helpers.whichTransitionEvent) {
                        popups_list[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                            if (event.target === popups_list[PopupInstance.getPopupId()].$popupContent[0]) {
                                popups_list[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".plugin_suffix");
                                destroy();
                            }
                        });
                    }
                    popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_inner_destroy_modificator);
                    if (!helpers.whichTransitionEvent) {
                        destroy();
                    }

                    popups_list[PopupInstance.getPopupId()].isHidden = false;
                    if (!PopupInstance.getOptions().isIframe) {
                        popups_list[PopupInstance.getPopupId()].isRendered = false;
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

            for (var i = 0; i < popups_queue.length; i++) {
                if (popups_queue[i]["instance"] === PopupInstance) {
                    popups_queue.splice(i, 1);
                    break;
                }
            }

            function show() {
                var makeRetrieved = function() {
                    $(document).off("keydown." + plugin_suffix).on("keydown." + plugin_suffix, function(event) { handlers.handleKeydown.call(PopupInstance, event); });
                    $popup.off("click." + plugin_suffix).on("click." + plugin_suffix, function(event) { handlers.handleOuterClick.call(PopupInstance, event); });
                    popups_list[PopupInstance.getPopupId()].$popupClose.off("click." + plugin_suffix).on("click." + plugin_suffix, function() {
                        Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.button);
                    });

                    PopupInstance.getOptions().callbackAfterOpen.call(PopupInstance);
                };

                if (helpers.whichTransitionEvent) {
                    popups_list[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                        if (event.target === popups_list[PopupInstance.getPopupId()].$popupContent[0]) {
                            popups_list[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".plugin_suffix");
                            makeRetrieved();
                        }
                    });
                }
                setTimeout(function() {
                    popups_list[PopupInstance.getPopupId()].$popupContent.removeClass(popup_content_hiddenfull_modificator + " " + popup_content_hidden_modificator);
                }, 1);
                if (!helpers.whichTransitionEvent) {
                    makeRetrieved();
                }

                popups_list[PopupInstance.getPopupId()].isHidden = false;
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
                popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_content_hiddenfull_modificator);

                PopupInstance.getOptions().callbackAfterClose.call(PopupInstance);

                if (typeof afterHide === "function") {
                    afterHide();
                }
            }

            $(document).off("keydown." + plugin_suffix);
            $popup.off("click." + plugin_suffix);
            popups_list[PopupInstance.getPopupId()].$popupClose.off("click." + plugin_suffix);

            if (helpers.whichTransitionEvent) {
                popups_list[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                    if (event.target === popups_list[PopupInstance.getPopupId()].$popupContent[0]) {
                        popups_list[PopupInstance.getPopupId()].$popupContent.off(helpers.whichTransitionEvent + ".plugin_suffix");
                        makeStealed();
                    }
                });
            }
            popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_content_hidden_modificator);
            if (!helpers.whichTransitionEvent) {
                makeStealed();
            }

            popups_queue.push(popups_list[PopupInstance.getPopupId()]);
            popups_list[PopupInstance.getPopupId()].isHidden = true;
        }
    };


    /* Instance */
    var GoodPopup = function($template, optionsObject) {
        var PopupInstance = this;
        var popup_id = $template.attr("id");
        var options = optionsObject;

        /* Set API getters */
        this.getOptions = function() { return options; };
        this.getPopupId = function() { return popup_id; };
        this.getPopupContent = function() { return popups_list[PopupInstance.getPopupId()].$popupContent; };
        this.getTemplate = function() { return $template; };
        this.isRendered = function() { return popups_list[PopupInstance.getPopupId()].isRendered; };
        this.isHidden = function() { return popups_list[PopupInstance.getPopupId()].isHidden; };

        /* Set API setters */
        this.setOptions = function(optionsUpdated) {
            if ($.isPlainObject(optionsUpdated)) {
                if (optionsUpdated.hasOwnProperty("forceClosing") && !$.isPlainObject(optionsUpdated["forceClosing"])) {
                    return helpers.throwError(popup_id, "WRONG_OPTIONS", optionsUpdated);
                }

                if (optionsUpdated.hasOwnProperty("hasCloseButton") && optionsUpdated["hasCloseButton"] !== PopupInstance.getOptions().hasCloseButton && PopupInstance.getPopupContent()) {
                    if (optionsUpdated["hasCloseButton"]) {
                        popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_content_with_close_button_modificator).append(dom.closeButtonMarkup(PopupInstance.getOptions().isFullWidth));
                        popups_list[PopupInstance.getPopupId()].$popupClose = popups_list[PopupInstance.getPopupId()].$popupContent.find("." + popup_close_class);
                        popups_list[PopupInstance.getPopupId()].$popupClose.off("click." + plugin_suffix).on("click." + plugin_suffix, function() {
                            Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.button);
                        });
                    } else {
                        if (!popups_list[PopupInstance.getPopupId()].$popupClose || popups_list[PopupInstance.getPopupId()].$popupClose.length === 0) {
                            popups_list[PopupInstance.getPopupId()].$popupClose = popups_list[PopupInstance.getPopupId()].$popupContent.find("." + popup_close_class);
                        }
                        popups_list[PopupInstance.getPopupId()].$popupClose.remove();
                        popups_list[PopupInstance.getPopupId()].$popupContent.removeClass(popup_content_with_close_button_modificator);
                    }
                }

                if (optionsUpdated.hasOwnProperty("isFullWidth") && optionsUpdated["isFullWidth"] !== PopupInstance.getOptions().isFullWidth && PopupInstance.getPopupContent()) {
                    if (optionsUpdated["isFullWidth"]) {
                        popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_content_full_width_modificator);
                        popups_list[PopupInstance.getPopupId()].$popupContent.find("." + popup_close_png_class).attr("src", png_close_button_black);
                    } else {
                        popups_list[PopupInstance.getPopupId()].$popupContent.removeClass(popup_content_full_width_modificator);
                        popups_list[PopupInstance.getPopupId()].$popupContent.find("." + popup_close_png_class).attr("src", png_close_button_white);
                    }
                }

                if (optionsUpdated.hasOwnProperty("key_for_closing") && optionsUpdated["keyCodeForClosing"] !== PopupInstance.getOptions().keyCodeForClosing) {
                    if (typeof optionsUpdated["keyCodeForClosing"] === "number") {
                        optionsUpdated["keyCodeForClosing"] = [optionsUpdated["keyCodeForClosing"]];
                    }
                }

                options = $.extend({}, options, optionsUpdated);

                return PopupInstance;
            } else {
                return helpers.throwError(popup_id, "WRONG_OPTIONS", optionsUpdated);
            }
        };

        /* Set API methods */
        this.open = function() { return Core.open.call(this); };
        this.close = function(isForced) { return Core.close.call(this, isForced); };
        this.dequeue = function() { return Core.dequeue.call(this); };


        /* Check if pre-render is needed */
        if (PopupInstance.getOptions().isPrerendered) {
            popups_list[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate(), PopupInstance.getOptions().data, PopupInstance.getOptions().hasCloseButton, PopupInstance.getOptions().isFullWidth));
            popups_list[PopupInstance.getPopupId()].$popupClose = popups_list[PopupInstance.getPopupId()].$popupContent.find("." + popup_close_class);

            popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_content_hidden_modificator + " " + popup_content_hiddenfull_modificator);
            $popup_inner.append(popups_list[PopupInstance.getPopupId()].$popupContent);

            popups_list[PopupInstance.getPopupId()].isRendered = true;
            popups_list[PopupInstance.getPopupId()].isHidden = true;
        }

        /* Set data to DOM elements */
        PopupInstance.getTemplate().data("goodpopup", PopupInstance);

        return PopupInstance;
    };

    /* Global object */
    $.goodpopup = {
        getPopup: function(popup_id) {
            if (typeof popups_list[popup_id] !== "undefined" && typeof popups_list[popup_id]["instance"] !== "undefined") {
                return popups_list[popup_id]["instance"];
            } else {
                if (typeof popup_id !== "undefined") {
                    var $popup_template = $("#" + popup_id);

                    if ($popup_template.length === 0) {
                        return helpers.throwError(popup_id, "NOT_FOUND");
                    } else {
                        $popup_template.goodpopup();
                        return popups_list[popup_id]["instance"];
                    }
                } else {
                    return false;
                }
            }
        },
        getPopups: function() {
            return popups_list;
        },
        getQueue: function() {
            return popups_queue;
        },
        version: version
    };


    /* jQuery */
    $.fn.goodpopup = function(options) {
        return this.each(function(i, element) {
            var $element = $(element);
            var popup_id = $element.attr("id");
            var PopupInstance = typeof popups_list[popup_id] !== "undefined" && typeof popups_list[popup_id]["instance"] !== "undefined" ? popups_list[popup_id]["instance"] : undefined;

            if (typeof PopupInstance === "undefined") {
                popups_list[popup_id] = {
                    instance: undefined,
                    isRendered: false,
                    isHidden: false,
                    $popupClose: $(),
                    $popupContent: $()
                };
                popups_list[popup_id]["instance"] = new GoodPopup($element,
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
