(function($) {
    "use strict";

    var plugin_suffix = "goodpopup";

    var popup_selector = ".js-goodpopup";
    var popup_inner_selector = ".js-goodpopup-inner-content";
    var popup_close_selector = ".js-goodpopup__close";
    var popup_active_modificator = "goodpopup_visible";

    var $popup;
    var $popup_inner;

    var popups_list = {};
    
    var whichTransitionEvent = (function() {
        var t;
        var el = document.createElement("div");
        var transitions = {
            "transition": "transitionend",
            "OTransition": "oTransitionEnd",
            "MozTransition": "transitionend",
            "WebkitTransition": "webkitTransitionEnd"
        };

        for (t in transitions) {
            if (typeof el.style[t] !== "undefined") {
                return transitions[t];
            }
        }
        
        return false;
    })();

    function throwError(popup_name, error_type) {
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
                showError("Popup template `" + popup_name + "` was not inited yet");
                break;
            default:
                showTrace("Problem with popup");
                break;
        }

        return false;
    }

    function createPopupDOM() {
        var popup_html = '<div class="goodpopup js-goodpopup"><div class="goodpopup-inner"><div class="goodpopup-inner-content js-goodpopup-inner-content"></div></div></div>';

        return $(popup_html).appendTo("body").promise().done(function() {
            $popup = $(popup_selector);
            $popup_inner = $popup.find(popup_inner_selector);
        });
    }

    function renderPopupContentDOM(template_html, template_data) {
        return '<div>' + Handlebars.compile(template_html)(typeof template_data !== "object" ? {} : template_data) + '<span class="goodpopup__close js-goodpopup__close"></span>' + '</div>';
    }

    $.fn.goodpopup = function(options) {
        return this.each(function(i, element) {
            var $this = $(element),
                this_id = $this.attr("id"),
                PopupInstance = popups_list[this_id];

            if (typeof PopupInstance === "undefined") {
                popups_list[this_id] = new GoodPopup($this, $.extend({}, $.fn.goodpopup.defaults, options, $this.data()));
            } else {
                PopupInstance.updateOptions(options);
            }
        });
    };

    $.fn.goodpopup.defaults = {
        callbackBeforeShow: function() {},
        callbackAfterShow: function() {},
        callbackBeforeHide: function() {},
        callbackAfterHide: function() {},

        isDetachable: false,
        isOuterClickClosing: true,
        
        data: {}
    };

    function GoodPopup($template, options_set) {
        var self = this;
        var template_html = $template.html();
        var options = options_set;

        var is_visible = false;

        var $popup_close;
        var $popup_content;


        /* Helpers */
        function handleKeydown(event) {
            if (event.keyCode === 27) {
                self.hide.call(self);
            }
        }

        function handleOuterClick(event) {
            if (options.isOuterClickClosing && $(event.target).parents(".js-goodpopup-inner-content").length === 0) {
                self.hide.call(self);
            }
        }


        /* API */
        this.show = function() {
            if (self.isVisible()) {
                return this;
            }

            $.each(popups_list, function(name, value) {
                if (value.isVisible()) {
                    value.hide();
                }
            });

            options.callbackBeforeShow.call(self);

            if (options.isDetachable) {
                if (typeof $popup_content === "undefined") {
                    $popup_content = $(renderPopupContentDOM(template_html, options.data));
                }
            } else {
                $popup_content = $(renderPopupContentDOM(template_html, options.data));
            }

            $popup_inner.append($popup_content).promise().done(function() {
                $popup_close = $popup.find(popup_close_selector);

                $(document).on("keydown." + plugin_suffix, handleKeydown);
                $popup.on("click." + plugin_suffix, handleOuterClick);
                $popup_close.on("click." + plugin_suffix, self.hide);

                $popup.addClass(popup_active_modificator);
                is_visible = true;

                options.callbackAfterShow.call(self);
            });

            return this;
        };

        this.hide = function() {
            if (!self.isVisible()) {
                return this;
            }
            
            function makeHiding() {
                if (options.isDetachable) {
                    $popup_content.detach();
                } else {
                    $popup_content.remove();
                }

                is_visible = false;

                options.callbackAfterHide.call(self);
            }

            options.callbackBeforeHide.call(self);

            $popup_close.off("click." + plugin_suffix);
            $popup.off("click." + plugin_suffix);
            $(document).off("keydown." + plugin_suffix);
            
            if (whichTransitionEvent) {
                $popup.off(whichTransitionEvent + ".plugin_suffix").one(whichTransitionEvent + ".plugin_suffix", function() {
                    makeHiding.call(self);
                });
            }
            $popup.removeClass(popup_active_modificator);
            if (!whichTransitionEvent) {
                makeHiding();
            }
            
            return this;
        };

        this.isVisible = function() {
            return is_visible;
        };

        this.updateOptions = function(options_updated) {
            $.extend(options, options_updated);

            return this;
        };

        this.getOptions = function() {
            return options;
        };

        this.getPopupContent = function() {
            return $popup_content;
        };


        /* Set data to DOM element (template script) */
        $template.data("goodpopup", this);

        return this;
    }

    $.goodpopup = function(popup_name) {
        if (typeof popups_list[popup_name] !== "undefined") {
            return popups_list[popup_name];
        } else {
            throwError(popup_name, "NOT_FOUND");
        }

        return this;
    };

    $.goodpopup.getPopups = function() {
        return popups_list;
    };


    /* Init */
    var initPopupTemplates = function() {
        $("script[type='text/x-handlebars-template']").goodpopup();
    };

    createPopupDOM().done(initPopupTemplates);
}(jQuery));
