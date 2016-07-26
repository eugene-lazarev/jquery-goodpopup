(function($) {
    "use strict";

    var plugin_suffix = "goodpopup";

    var popup_selector = ".js-goodpopup";
    var popup_inner_selector = ".js-goodpopup-inner-content";
    var popup_close_selector = ".js-goodpopup__close";
    var popup_active_modificator = "goodpopup_visible";
    var popup_inner_destroy_modificator = "goodpopup-inner-content_destroyed";
    var popup_content_stealed_modificator = "goodpopup-inner-content-element_stealed";
    var popup_content_stealedfull_modificator = "goodpopup-inner-content-element_stealedfull";
    var popup_content_pseudostealed_modificator = "goodpopup-inner-content-element_pseudostealed";

    var $popup;
    var $popup_inner;
    
    var is_open = false;

    var popups_list = {};
    var stealed_popups_list = [];
    
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
        return '<div class="goodpopup-inner-content-element">' + Handlebars.compile(template_html)(typeof template_data !== "object" ? {} : template_data) + '<span class="goodpopup__close js-goodpopup__close"></span>' + '</div>';
    }

    $.fn.goodpopup = function(options) {
        return this.each(function(i, element) {
            var $this = $(element),
                this_id = $this.attr("id"),
                PopupInstance = popups_list[this_id];

            if (typeof PopupInstance === "undefined") {
                popups_list[this_id] = new GoodPopup($this, $.extend({}, $.fn.goodpopup.defaults, options, $this.data()));
            } else {
                PopupInstance.setOptions(options);
            }
        });
    };

    $.fn.goodpopup.defaults = {
        callbackBeforeOpen: function() {},
        callbackAfterOpen: function() {},

        callbackBeforeClose: function() {},
        callbackAfterClose: function() {},
        
        callbackBeforeRender: function() {},
        callbackAfterRender: function() {},
        
        callbackBeforeDestroy: function() {},
        callbackAfterDestroy: function() {},
        
        callbackBeforeShow: function() {},
        callbackAfterShow: function() {},

        callbackBeforeHide: function() {},
        callbackAfterHide: function() {},

        isDetachable: false,
        isOuterClickClosing: true,

        keyCodeForClosing: 27,
        
        data: {}
    };

    function GoodPopup($template, options_set) {
        var self = this;
        var template_html = $template.html();
        var popup_id = $template.attr("id");
        var options = options_set;

        var is_rendered = false;
        var is_hided = false;

        var $popup_close;
        var $popup_content;


        /* Helpers */
        function handleKeydown(event) {
            var keyForClosing = self.getOptions().keyCodeForClosing;
            
            if (typeof keyForClosing === "number") {
                self.setOptions({
                    keyCodeForClosing: [keyForClosing]
                });
                keyForClosing = self.getOptions().keyCodeForClosing
            }
            
            for (var i = 0; i < keyForClosing.length; i++) {
                if (event.keyCode === keyForClosing[i]) {
                    self.close.call(self, true);
                }
            }
        }

        function handleOuterClick(event) {
            if (options.isOuterClickClosing && $(event.target).parents(".js-goodpopup-inner-content").length === 0) {
                self.close.call(self, true);
            }
        }
        
        
        /* API */
        this.open = function() {
            if (is_open) {
                if (this.isRendered()) {
                    if (this.isHided()) {
                        $.each(popups_list, function(name, value) {
                            if (value.isRendered() && !value.isHided()) {
                                value._hide(function() {
                                    self._show.call(self);
                                });
                                return false;
                            }
                        });
                    } else {
                        return this;
                    }
                } else {
                    $.each(popups_list, function(name, value) {
                        if (value.isRendered() && !value.isHided()) {
                            value._hide(function() {
                                self._renderContent.call(self);
                            });
                            return false;
                        }
                    });
                }
            } else {
                options.callbackBeforeOpen.call(this);
                self._renderContent.call(self);
            }
        };
        
        this.close = function(forced_closing) {
            if (!is_open || !this.isRendered()) {
                return this;
            }

            var is_forced_closing = forced_closing || false;
            
            if (stealed_popups_list.length > 0) {
                if (is_forced_closing) {
                    options.callbackBeforeClose.call(self);
                    for (var i = stealed_popups_list.length; i > 0; i--) {
                        stealed_popups_list[i - 1]._destroyContent(false);
                    }
                    this._destroyContent(true);
                } else {
                    this._destroyContent(false, function() {
                        stealed_popups_list[stealed_popups_list.length - 1]._show.call(self);
                    });
                }
            } else {
                options.callbackBeforeClose.call(self);
                this._destroyContent(true);
            }
            
            return this;
        };

        this.isRendered = function() {
            return is_rendered;
        };

        this.isHided = function() {
            return is_hided;
        };

        this.setOptions = function(options_updated) {
            $.extend(options, options_updated);

            return this;
        };

        this.getOptions = function() {
            return options;
        };

        this.getPopupContent = function() {
            return $popup_content;
        };

        this.getPopupId = function() {
            return popup_id;
        };
        
        
        /* Other methods */        
        this._renderContent = function() {
            if (this.isRendered()) {
                return this;
            }

            options.callbackBeforeRender.call(this);

            if (options.isDetachable) {
                if (typeof $popup_content === "undefined") {
                    $popup_content = $(renderPopupContentDOM(template_html, options.data));
                }
            } else {
                $popup_content = $(renderPopupContentDOM(template_html, options.data));
            }

            if (is_open) {
                $popup_content.addClass(popup_content_pseudostealed_modificator);
            }

            $popup_inner.append($popup_content).promise().done(function() {
                $popup_close = $popup_content.find(popup_close_selector);
                $popup_close.on("click." + plugin_suffix, function() {
                    self.close();
                });

                $(document).off("keydown." + plugin_suffix).on("keydown." + plugin_suffix, handleKeydown);
                $popup.off("click." + plugin_suffix).on("click." + plugin_suffix, handleOuterClick);

                if (!is_open) {
                    $popup.addClass(popup_active_modificator);
                    options.callbackAfterOpen.call(self);

                    is_rendered = true;
                    is_open = true;

                    options.callbackAfterRender.call(self);
                } else {
                    var makeVisible = function() {
                        options.callbackAfterRender.call(self);
                    };

                    if (whichTransitionEvent) {
                        $popup_content.off(whichTransitionEvent + ".plugin_suffix").one(whichTransitionEvent + ".plugin_suffix", function() {
                            makeVisible.call(self);
                        });
                    }
                    setTimeout(function() {
                        $popup_content.removeClass(popup_content_pseudostealed_modificator);
                    }, 1);
                    if (!whichTransitionEvent) {
                        makeVisible.call(self);
                    }

                    is_rendered = true;
                    is_open = true;
                }
            });

            return this;
        };

        this._rerenderContent = function(afterRerender) {
            options.callbackBeforeRender.call(this);

            var $old_popup_content = $popup_content;

            $popup_close.off("click." + plugin_suffix);

            $popup_content = $(renderPopupContentDOM(template_html, options.data));
            $popup_content.addClass(popup_content_stealed_modificator + " " + popup_content_stealedfull_modificator);

            $old_popup_content.after($popup_content).promise().done(function() {
                $old_popup_content.remove();

                $popup_close = $popup_content.find(popup_close_selector);

                options.callbackAfterRender.call(self);

                if (typeof afterRerender === "function") {
                    afterRerender();
                }
            });
            
            return this;
        };

        this._destroyContent = function(with_shell, afterDestroy) {
            if (!self.isRendered()) {
                return this;
            }

            options.callbackBeforeDestroy.call(this);

            if (typeof (with_shell) !== "undefined" && with_shell) {
                var destroy = function() {
                    if (options.isDetachable) {
                        $popup_content.detach().removeClass(popup_content_stealed_modificator + " " + popup_content_stealedfull_modificator + " " + popup_content_pseudostealed_modificator + " " + popup_inner_destroy_modificator);
                    } else {
                        $popup_content.remove();
                    }

                    options.callbackAfterDestroy.call(self);
                    options.callbackAfterClose.call(self);
                };

                $popup.off("click." + plugin_suffix);
                $(document).off("keydown." + plugin_suffix);
                $popup_close.off("click." + plugin_suffix);

                if (whichTransitionEvent) {
                    $popup.off(whichTransitionEvent + ".plugin_suffix").one(whichTransitionEvent + ".plugin_suffix", function() {
                        destroy.call(self);
                    });
                }
                $popup.removeClass(popup_active_modificator);
                if (!whichTransitionEvent) {
                    destroy.call(self);
                }

                is_open = false;
                is_hided = false;
                is_rendered = false;
            } else {
                var destroy = function() {
                    if (options.isDetachable) {
                        $popup_content.detach().removeClass(popup_content_stealed_modificator + " " + popup_content_stealedfull_modificator + " " + popup_content_pseudostealed_modificator + " " + popup_inner_destroy_modificator);
                    } else {
                        $popup_content.remove();
                    }

                    options.callbackAfterDestroy.call(self);
                    
                    if (typeof afterDestroy === "function") {
                        afterDestroy();
                    }
                };

                $popup_close.off("click." + plugin_suffix);
                
                if (is_hided) {
                    is_hided = false;
                    is_rendered = false;

                    destroy.call(self);
                } else {
                    if (whichTransitionEvent) {
                        $popup.off(whichTransitionEvent + ".plugin_suffix").one(whichTransitionEvent + ".plugin_suffix", function() {
                            destroy.call(self);
                        });
                    }
                    $popup_content.addClass(popup_inner_destroy_modificator);
                    if (!whichTransitionEvent) {
                        destroy.call(self);
                    }

                    is_hided = false;
                    is_rendered = false;
                }
            }

            for (var i = 0; i < stealed_popups_list.length; i++) {
                if (stealed_popups_list[i] === this) {
                    stealed_popups_list.splice(i, 1);
                    break;
                }
            }
            
            return this;
        };

        this._show = function() {
            if (!is_hided) {
                return this;
            }

            options.callbackBeforeShow.call(self);
            
            function show() {
                var makeRetrieved = function() {
                    $(document).off("keydown." + plugin_suffix).on("keydown." + plugin_suffix, handleKeydown);
                    $popup.off("click." + plugin_suffix).on("click." + plugin_suffix, handleOuterClick);
                    $popup_close.off("click." + plugin_suffix).on("click." + plugin_suffix, function() {
                        self.close();
                    });

                    options.callbackAfterShow.call(self);
                };

                if (whichTransitionEvent) {
                    $popup_inner.off(whichTransitionEvent + ".plugin_suffix").one(whichTransitionEvent + ".plugin_suffix", function() {
                        makeRetrieved.call(self);
                    });
                }
                $popup_content.removeClass(popup_content_stealedfull_modificator).removeClass(popup_content_stealed_modificator);
                if (!whichTransitionEvent) {
                    makeRetrieved.call(self);
                }

                is_hided = false;

                for (var i = 0; i < stealed_popups_list.length; i++) {
                    if (stealed_popups_list[i] === this) {
                        stealed_popups_list.splice(i, 1);
                        break;
                    }
                }
            }

            if (!options.isDetachable) {
                self._rerenderContent.call(self, function() {
                    show.call(self);
                });
            } else {
                show.call(self);
            }

            return this;
        };
        
        this._hide = function(afterHide) {
            if (is_hided) {
                return this;
            }

            function makeStealed() {
                $popup_content.addClass(popup_content_stealedfull_modificator);

                options.callbackAfterHide.call(self);

                if (typeof afterHide === "function") {
                    afterHide();
                }
            }

            options.callbackBeforeHide.call(self);

            $(document).off("keydown." + plugin_suffix);
            $popup.off("click." + plugin_suffix);
            $popup_close.off("click." + plugin_suffix);

            if (whichTransitionEvent) {
                $popup_inner.off(whichTransitionEvent + ".plugin_suffix").one(whichTransitionEvent + ".plugin_suffix", function() {
                    makeStealed.call(self);
                });
            }
            $popup_content.addClass(popup_content_stealed_modificator);
            if (!whichTransitionEvent) {
                makeStealed.call(self);
            }

            stealed_popups_list.push(this);
            is_hided = true;

            return this;
        };


        /* Set data to DOM elements */
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
