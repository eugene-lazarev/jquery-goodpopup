(function($) {
    "use strict";

    var plugin_suffix = "popup";

    var popup_selector = ".js-popup";
    var popup_inner_selector = ".js-popup-inner-content";
    var popup_close_selector = ".js-popup__close";
    var popup_active_modificator = "popup_visible";

    var $popup;
    var $popup_inner;

    var popups_list = {};

    function throwError(popup_name, error_type) {
        switch(error_type) {
            case "NOT_FOUND":
                console.error("Popup template `" + popup_name + "` was not inited yet");
                break;
            default:
                console.trace("Problem with popup");
                break;
        }
        return false;
    }

    function createPopupDOM() {
        var popup_html = '<div class="popup js-popup"><div class="popup-inner"><div class="popup-inner-content js-popup-inner-content"></div></div></div>';

        return $(popup_html).appendTo("body").promise().done(function() {
            $popup = $(popup_selector);
            $popup_inner = $popup.find(popup_inner_selector);
        });
    }

    function makePopupContentDOM(template_html, template_data) {
        return '<div>' + Handlebars.compile(template_html)(typeof template_data !== "object" ? {} : template_data) + '<span class="popup__close js-popup__close"></span>' + '</div>';
    }

    $.fn.popup = function(options) {
        return this.each(function(i, element) {
            var $this = $(element),
                this_id = $this.attr("id"),
                PopupInstance = popups_list[this_id];

            if (typeof PopupInstance === "undefined") {
                popups_list[this_id] = new Popup($this, $.extend({}, $.fn.popup.defaults, options, $this.data()));
            } else {
                PopupInstance.updateOptions(options);
            }
        });
    };

    $.fn.popup.defaults = {
        callbackBeforeOpen: function() {},
        callbackAfterOpen: function() {},
        callbackBeforeHide: function() {},
        callbackAfterHide: function() {},

        isDetachable: false,
        isOuterClickClosing: true
    };

    function Popup($template, options_set) {
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
            if (options.isOuterClickClosing && $(event.target).parents(".js-popup-inner-content").length === 0) {
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

            options.callbackBeforeOpen.call(self);

            if (options.isDetachable) {
                if (typeof $popup_content === "undefined") {
                    $popup_content = $(makePopupContentDOM(template_html));
                }
            } else {
                $popup_content = $(makePopupContentDOM(template_html));
            }

            $popup_inner.append($popup_content).promise().done(function() {
                $popup_close = $popup.find(popup_close_selector);

                $(document).on("keydown." + plugin_suffix, handleKeydown);
                $popup.on("click." + plugin_suffix, handleOuterClick);
                $popup_close.on("click." + plugin_suffix, self.hide);

                $popup.addClass(popup_active_modificator);
                is_visible = true;

                options.callbackAfterOpen.call(self);
            });

            return this;
        };

        this.hide = function() {
            if (!self.isVisible()) {
                return this;
            }

            options.callbackBeforeHide.call(self);

            $popup_close.off("click." + plugin_suffix);
            $popup.off("click." + plugin_suffix);
            $(document).off("keydown." + plugin_suffix);

            $popup.removeClass(popup_active_modificator);

            if (options.isDetachable) {
                $popup_content.detach();
            } else {
                $popup_content.remove();
            }

            is_visible = false;

            options.callbackAfterHide.call(self);

            return this;
        };

        this.updateOptions = function(options_updated) {
            $.extend(options, options_updated);

            return this;
        };

        this.isVisible = function() {
            return is_visible;
        };

        this.getOptions = function() {
            return options;
        };

        this.getPopupContent = function() {
            return $popup_content;
        };

        /* Set data to DOM element (template script) */
        $template.data("popup", this);

        return this;
    }

    $.popup = function(popup_name) {
        if (typeof popups_list[popup_name] !== "undefined") {
            return popups_list[popup_name];
        } else {
            throwError(popup_name, "NOT_FOUND");
        }

        return this;
    };

    $.popup.getPopups = function() {
        return popups_list;
    };


    /* Init */
    var initPopupTemplates = function() {
        $("script[type='text/x-handlebars-template']").popup();
    };

    createPopupDOM().done(initPopupTemplates);
}(jQuery));
