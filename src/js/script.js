(function($) {
    "use strict";

    var version = "2.0.0-beta.19";

    var plugin_suffix = "goodpopup";

    var popup_selector = ".js-goodpopup";
    var popup_inner_selector = ".js-goodpopup-inner-content";
    var popup_active_modificator = "goodpopup_visible";
    var popup_inner_destroy_modificator = "goodpopup-inner-content_destroyed";
    var popup_content_full_width_modificator = "goodpopup-inner-content-element_fullwidth";
    var popup_content_hidden_modificator = "goodpopup-inner-content-element_hidden";
    var popup_content_hiddenfull_modificator = "goodpopup-inner-content-element_hiddenfull";
    var popup_content_pseudohidden_modificator = "goodpopup-inner-content-element_pseudohidden";

    var $popup;
    var $popup_inner;

    var is_open = false;

    var popups_list = {};
    var popups_queue = [];

    var scrollbar_width = 0;

    var helpers = {
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
                    showError("Popup template `" + popup_id + "` doesn’t exist");
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
        createPopupDOM: function() {
            var popup_html = '<div class="goodpopup js-goodpopup"><div class="goodpopup-inner"><div class="goodpopup-inner-content js-goodpopup-inner-content"></div></div></div>';

            return $(popup_html).appendTo("body").promise().done(function() {
                $popup = $(popup_selector);
                $popup_inner = $popup.find(popup_inner_selector);
            });
        },
        renderPopupContentDOM: function(popup_id, $template, template_data, is_full_width) {
            var $popup_content = $('<div class="goodpopup-inner-content-element ' + ' ' + (is_full_width ? popup_content_full_width_modificator : '') + '" data-popup-id="' + popup_id + '"></div>');
            $popup_content.append(dom.renderPopupContentTemplateDOM($template, template_data));
            return $popup_content;
        },
        renderPopupContentTemplateDOM: function($template, template_data) {
            var template_dom;

            var template_html;
            var template_html_literals;

            if ($template.filter("script[type='text/x-handlebars-template']").length > 0) {
                if (typeof window.Handlebars === "object") {
                    template_dom = Handlebars.compile($template.html())(typeof template_data !== "object" ? {} : template_data);
                }
            } else {
                template_html = $template.html();
                template_html_literals = template_html.match(/\${([^}]*)}/g);

                if (template_html_literals) {
                    for (var i = 0; i < template_html_literals.length; i++) {
                        if (template_data.hasOwnProperty(template_html_literals[i].substring(2, template_html_literals[i].length - 1))) {
                            template_html = template_html.replace(template_html_literals[i], template_data[template_html_literals[i].substring(2, template_html_literals[i].length - 1)]);
                        } else {
                            template_html = template_html.replace(template_html_literals[i], "");
                        }
                    }
                }

                template_dom = $(template_html);
            }

            return template_dom;
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
            if (PopupInstance.getOptions().isOuterClickClosing && $target.parents(popup_inner_selector).length === 0) {
                Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.click);
            }

            return PopupInstance;
        },
        "handleCloseButtonClick": function() {
            var PopupInstance = this;

            Core.close.call(PopupInstance, PopupInstance.getOptions().forceClosing.button);

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
                $(document).off("keydown." + plugin_suffix).on("keydown." + plugin_suffix, function(event) { handlers.handleKeydown.call(PopupInstance, event); });
                $popup.off("click." + plugin_suffix).on("click." + plugin_suffix, function(event) { handlers.handleOuterClick.call(PopupInstance, event); });

                if (PopupInstance.getOptions().closeButton) {
                    PopupInstance.getPopupContent().find(PopupInstance.getOptions().closeButton).off("click." + plugin_suffix).on("click." + plugin_suffix, function(event) { handlers.handleCloseButtonClick.call(PopupInstance, event); });
                }

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
                        popups_list[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate(), PopupInstance.getOptions().data, PopupInstance.getOptions().isFullWidth));
                    }
                } else {
                    popups_list[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate(), PopupInstance.getOptions().data, PopupInstance.getOptions().isFullWidth));
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

            popups_list[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate(), PopupInstance.getOptions().data, PopupInstance.getOptions().isFullWidth));
            popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_content_hidden_modificator + " " + popup_content_hiddenfull_modificator);

            $old_popup_content.after(popups_list[PopupInstance.getPopupId()].$popupContent).promise().done(function() {
                $old_popup_content.remove();

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

                if (PopupInstance.getOptions().closeButton) {
                    PopupInstance.getPopupContent().find(PopupInstance.getOptions().closeButton).off("click." + plugin_suffix);
                }

                $popup.off("click." + plugin_suffix);
                $(document).off("keydown." + plugin_suffix);

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

                    if (PopupInstance.getOptions().closeButton) {
                        PopupInstance.getPopupContent().find(PopupInstance.getOptions().closeButton).off("click." + plugin_suffix).on("click." + plugin_suffix, function(event) { handlers.handleCloseButtonClick.call(PopupInstance, event); });
                    }

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

            if (PopupInstance.getOptions().closeButton) {
                PopupInstance.getPopupContent().find(PopupInstance.getOptions().closeButton).off("click." + plugin_suffix);
            }

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

                if (optionsUpdated.hasOwnProperty("isFullWidth") && optionsUpdated["isFullWidth"] !== PopupInstance.getOptions().isFullWidth && PopupInstance.getPopupContent()) {
                    if (optionsUpdated["isFullWidth"]) {
                        popups_list[PopupInstance.getPopupId()].$popupContent.addClass(popup_content_full_width_modificator);
                    } else {
                        popups_list[PopupInstance.getPopupId()].$popupContent.removeClass(popup_content_full_width_modificator);
                    }
                }

                if (optionsUpdated.hasOwnProperty("keyCodeForClosing") && optionsUpdated["keyCodeForClosing"] !== PopupInstance.getOptions().keyCodeForClosing) {
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
            popups_list[PopupInstance.getPopupId()].$popupContent = $(dom.renderPopupContentDOM(PopupInstance.getPopupId(), PopupInstance.getTemplate(), PopupInstance.getOptions().data, PopupInstance.getOptions().isFullWidth));

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

                            keyCodeForClosing: [27],
                            closeButton: "",

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
